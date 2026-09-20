import fs from "node:fs";
import path from "node:path";

import { richTextBlock, richTextFromParagraphs } from "./content";

export type ImportedImage = {
	id: string;
	src: string;
	alt: string;
	role: string;
	sourceUrl: string;
	reused?: boolean;
	downloadFailed?: boolean;
};

export type LayoutSection = Record<string, unknown> & { type: string };

export type ImportedDocument = {
	sourceUrl: string;
	title: string;
	description: string;
	h1: string;
	slug: string;
	body: string;
	importStatus?: string;
	layout: LayoutSection[];
	images: ImportedImage[];
};

const IMPORT_DIR = path.resolve(process.cwd(), "src/content/imported");

function unquote(value: string): string {
	const trimmed = value.trim();
	if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
		return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, "\n");
	}
	return trimmed;
}

function parseScalar(line: string): string | number | boolean {
	const value = unquote(line.trim());
	if (value === "true") return true;
	if (value === "false") return false;
	if (/^\d+$/.test(value)) return Number(value);
	return value;
}

function parseYamlBlock(
	lines: string[],
	startIndex: number,
): { value: unknown; nextIndex: number } {
	const first = lines[startIndex];
	const baseIndent = first.search(/\S/);

	if (first.trim().startsWith("-")) {
		const items: unknown[] = [];
		let index = startIndex;
		while (index < lines.length) {
			const line = lines[index];
			if (!line.trim()) {
				index += 1;
				continue;
			}
			const indent = line.search(/\S/);
			if (indent < baseIndent) break;
			if (!line.trim().startsWith("-")) break;

			const afterDash = line.trim().slice(1).trim();
			if (!afterDash) {
				const nested = parseYamlBlock(lines, index + 1);
				items.push(nested.value);
				index = nested.nextIndex;
				continue;
			}

			if (afterDash.includes(":")) {
				const obj: Record<string, unknown> = {};
				const [key, ...rest] = afterDash.split(":");
				const inline = rest.join(":").trim();
				if (inline) {
					obj[key.trim()] = parseScalar(inline);
					items.push(obj);
					index += 1;
					continue;
				}
				index += 1;
				while (index < lines.length) {
					const nestedLine = lines[index];
					if (!nestedLine.trim()) {
						index += 1;
						continue;
					}
					const nestedIndent = nestedLine.search(/\S/);
					if (nestedIndent <= indent) break;
					const nestedKeyMatch = nestedLine
						.trim()
						.match(/^([^:]+):\s*(.*)$/);
					if (!nestedKeyMatch) break;
					const [, nestedKey, nestedValue] = nestedKeyMatch;
					if (nestedValue) {
						obj[nestedKey.trim()] = parseScalar(nestedValue);
						index += 1;
						continue;
					}
					const nested = parseYamlBlock(lines, index);
					obj[nestedKey.trim()] = nested.value;
					index = nested.nextIndex;
				}
				items.push(obj);
				continue;
			}

			items.push(parseScalar(afterDash));
			index += 1;
		}
		return { value: items, nextIndex: index };
	}

	const obj: Record<string, unknown> = {};
	let index = startIndex;
	while (index < lines.length) {
		const line = lines[index];
		if (!line.trim()) {
			index += 1;
			continue;
		}
		const indent = line.search(/\S/);
		if (indent < baseIndent) break;
		const match = line.trim().match(/^([^:]+):\s*(.*)$/);
		if (!match) break;
		const [, key, inlineValue] = match;
		if (inlineValue) {
			obj[key.trim()] = parseScalar(inlineValue);
			index += 1;
			continue;
		}
		const nested = parseYamlBlock(lines, index + 1);
		obj[key.trim()] = nested.value;
		index = nested.nextIndex;
	}
	return { value: obj, nextIndex: index };
}

function parseFrontMatter(raw: string): {
	meta: Record<string, unknown>;
	body: string;
} {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) {
		return { meta: {}, body: raw };
	}

	const lines = match[1].split("\n");
	const meta: Record<string, unknown> = {};
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];
		if (!line.trim()) {
			index += 1;
			continue;
		}
		const keyMatch = line.match(/^([^:]+):\s*(.*)$/);
		if (!keyMatch) {
			index += 1;
			continue;
		}
		const [, key, inlineValue] = keyMatch;
		if (inlineValue) {
			meta[key.trim()] = parseScalar(inlineValue);
			index += 1;
			continue;
		}
		const nested = parseYamlBlock(lines, index + 1);
		meta[key.trim()] = nested.value;
		index = nested.nextIndex;
	}

	return { meta, body: match[2].trim() };
}

function assetPathToKey(src: string): string {
	const normalized = src.replace(/^\/src\/assets\//, "");
	return normalized;
}

function resolveImageId(
	imageRef: unknown,
	images: ImportedImage[],
	mediaByPath: Map<string, number>,
): number | undefined {
	if (!imageRef) return undefined;
	const ref = String(imageRef);
	const record =
		images.find((image) => image.id === ref) ??
		images.find((image) => image.src.includes(ref));
	if (!record || record.downloadFailed) return undefined;
	return mediaByPath.get(assetPathToKey(record.src));
}

function resolveLogoImages(
	imageRefs: unknown,
	images: ImportedImage[],
	mediaByPath: Map<string, number>,
) {
	const refs = Array.isArray(imageRefs) ? imageRefs : [];
	if (refs.length === 0) {
		return [
			"images/home/logo-container-store.webp",
			"images/home/logo-insight-global.webp",
			"images/home/logo-lands-end.webp",
			"images/home/logo-pottery-barn.webp",
			"images/home/logo-sephora.webp",
			"images/home/logo-williams-sonoma.webp",
			"images/home/logo-workwear.webp",
			"images/home/logo-world-market.webp",
		].flatMap((assetPath) => {
			const mediaId = mediaByPath.get(assetPath);
			if (!mediaId) return [];
			return [
				{
					image: mediaId,
					alt: path.basename(assetPath, path.extname(assetPath)),
				},
			];
		});
	}

	return refs.flatMap((ref) => {
		const mediaId = resolveImageId(ref, images, mediaByPath);
		if (!mediaId) return [];
		const record = images.find((image) => image.id === String(ref));
		return [{ image: mediaId, alt: record?.alt ?? String(ref) }];
	});
}

function bodyToParagraphs(body: string): string[] {
	const lines = body.split("\n");
	const paragraphs: string[] = [];
	let buffer: string[] = [];

	const flush = () => {
		if (!buffer.length) return;
		const text = buffer.join(" ").replace(/\s+/g, " ").trim();
		if (text) paragraphs.push(text);
		buffer = [];
	};

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("<!--")) continue;
		if (trimmed.startsWith("#")) {
			flush();
			paragraphs.push(trimmed.replace(/^#+\s*/, "").trim());
			continue;
		}
		if (trimmed.startsWith("- ")) {
			flush();
			paragraphs.push(trimmed.slice(2));
			continue;
		}
		buffer.push(trimmed);
	}
	flush();
	return paragraphs;
}

export function documentFromMarkdown(
	raw: string,
	file: string,
): ImportedDocument {
	const { meta, body } = parseFrontMatter(raw);
	const imagesRaw = Array.isArray(meta.images) ? meta.images : [];
	const layoutRaw = Array.isArray(meta.layout) ? meta.layout : [];

	return {
		sourceUrl: String(meta.source_url || ""),
		title: String(meta.title || meta.h1 || file.replace(/\.md$/, "")),
		description: String(meta.description || ""),
		h1: String(meta.h1 || meta.title || ""),
		slug: String(
			meta.slug || file.replace(/\.md$/, "").replace(/__/g, "/"),
		),
		body,
		importStatus: meta.status ? String(meta.status) : undefined,
		layout: layoutRaw as LayoutSection[],
		images: imagesRaw.map((image) => {
			const record = image as Record<string, unknown>;
			return {
				id: String(record.id || ""),
				src: String(record.src || ""),
				alt: String(record.alt || ""),
				role: String(record.role || "ui"),
				sourceUrl: String(record.source_url || ""),
				reused: Boolean(record.reused),
				downloadFailed: Boolean(record.download_failed),
			};
		}),
	};
}

export function loadImportedDocuments(): ImportedDocument[] {
	if (!fs.existsSync(IMPORT_DIR)) return [];

	return fs
		.readdirSync(IMPORT_DIR)
		.filter((file) => file.endsWith(".md"))
		.map((file) =>
			documentFromMarkdown(
				fs.readFileSync(path.join(IMPORT_DIR, file), "utf8"),
				file,
			),
		);
}

function normalizeLink(
	value: unknown,
): { label?: string; href: string } | undefined {
	if (!value || typeof value !== "object") return undefined;
	const record = value as Record<string, unknown>;
	const href = String(record.href || "").trim();
	const label = String(record.label || "").trim();
	if (!href) return undefined;
	return { href, label: label || undefined };
}

const DEMO_CTA = {
	href: "/contact/get-started",
	label: "Request a Demo",
} as const;

function layoutSectionToBlock(
	section: LayoutSection,
	doc: ImportedDocument,
	mediaByPath: Map<string, number>,
) {
	switch (section.type) {
		case "hero":
			return {
				blockType: "hero" as const,
				variant:
					(section.variant as
						| "centered-stack"
						| "split-right-media"
						| "split-left-media") || "centered-stack",
				eyebrow: section.eyebrow as string | undefined,
				headline: (section.headline as string) || doc.h1,
				subheadline: section.subheadline as string | undefined,
				primaryCta: normalizeLink(section.primaryCta) ?? DEMO_CTA,
				secondaryCta: normalizeLink(section.secondaryCta),
				image: resolveImageId(section.image, doc.images, mediaByPath),
			};
		case "logoCloud":
			return {
				blockType: "logoCloud" as const,
				headline:
					(section.headline as string) ||
					"Trusted by industry leaders",
				variant:
					(section.variant as "logos" | "cards" | undefined) ??
					"logos",
				logos: resolveLogoImages(
					section.images,
					doc.images,
					mediaByPath,
				),
			};
		case "featureGrid":
			return {
				blockType: "featureGrid" as const,
				headline: section.headline as string | undefined,
				description: section.description as string | undefined,
				features: Array.isArray(section.items)
					? section.items.map((item) => {
							const record = item as Record<string, unknown>;
							return {
								title: String(record.title || ""),
								description: String(record.description || ""),
								icon: resolveImageId(
									record.image,
									doc.images,
									mediaByPath,
								),
							};
						})
					: [],
			};
		case "featureSplit": {
			const headline = section.headline as string | undefined;
			return {
				blockType: "featureSplit" as const,
				headline: headline === "" ? undefined : (headline ?? doc.h1),
				body: (section.body as string) || "",
				imagePosition:
					section.media === "left"
						? ("left" as const)
						: ("right" as const),
				image: resolveImageId(section.image, doc.images, mediaByPath),
				cta: normalizeLink(section.cta),
			};
		}
		case "stats":
			return {
				blockType: "stats" as const,
				headline: section.headline as string | undefined,
				description: section.description as string | undefined,
				variant:
					(section.variant as
						"default" | "cards" | "timeline" | undefined) ??
					"default",
				items: Array.isArray(section.items)
					? section.items.map((item) => {
							const record = item as Record<string, unknown>;
							return {
								value: String(record.value || ""),
								label: String(record.label || ""),
							};
						})
					: [],
			};
		case "testimonials":
			return {
				blockType: "testimonials" as const,
				headline: section.headline as string | undefined,
				items: Array.isArray(section.items)
					? section.items.map((item) => {
							const record = item as Record<string, unknown>;
							return {
								quote: String(record.quote || ""),
								author: String(
									record.author || "Raindrop customer",
								),
								role: String(record.role || ""),
							};
						})
					: [],
			};
		case "faq":
			return {
				blockType: "faq" as const,
				headline: (section.headline as string) || "FAQ",
				items: Array.isArray(section.items)
					? section.items.map((item) => {
							const record = item as Record<string, unknown>;
							return {
								question: String(record.question || ""),
								answer: String(record.answer || ""),
							};
						})
					: [],
			};
		case "cta":
			return {
				blockType: "cta" as const,
				headline: (section.headline as string) || "Request a Demo",
				description: section.description as string | undefined,
				primaryCta: normalizeLink(section.primaryCta) ?? DEMO_CTA,
				secondaryCta: normalizeLink(section.secondaryCta),
			};
		case "comparisonTable":
			return {
				blockType: "comparisonTable" as const,
				headline: (section.headline as string) || "Comparison",
				leftTitle: (section.leftTitle as string) || "Traditional AI",
				rightTitle:
					(section.rightTitle as string) || "Agentic AI in Raindrop",
				rows: Array.isArray(section.rows)
					? section.rows.map((item) => {
							const record = item as Record<string, unknown>;
							return {
								left: String(record.left || ""),
								right: String(record.right || ""),
							};
						})
					: [],
			};
		case "resourceList": {
			const headline = section.headline as string | undefined;
			return {
				blockType: "resourceList" as const,
				headline:
					headline === "" ? undefined : (headline ?? "Resources"),
				cta: normalizeLink(section.cta),
				items: Array.isArray(section.items)
					? section.items.map((item) => {
							const record = item as Record<string, unknown>;
							return {
								title: String(record.title || ""),
								excerpt: String(record.excerpt || ""),
								href: String(record.href || ""),
								image: resolveImageId(
									record.image,
									doc.images,
									mediaByPath,
								),
							};
						})
					: [],
			};
		}
		case "leadershipGrid":
			return {
				blockType: "leadershipGrid" as const,
				headline: (section.headline as string) || undefined,
				members: Array.isArray(section.members)
					? section.members.map((item) => {
							const record = item as Record<string, unknown>;
							return {
								name: String(record.name || ""),
								role: String(record.role || ""),
								bio: String(record.bio || ""),
								photo: resolveImageId(
									record.image,
									doc.images,
									mediaByPath,
								),
							};
						})
					: [],
			};
		case "formEmbed":
			return {
				blockType: "formEmbed" as const,
				headline:
					(section.headline as string) || doc.h1 || "Request a Demo",
				description: doc.description,
			};
		case "contactSection":
			return {
				blockType: "contactSection" as const,
				headline: (section.headline as string) || doc.h1 || "Contact",
				description: (section.description as string) || undefined,
				mapEmbedUrl: (section.mapEmbedUrl as string) || undefined,
				items: Array.isArray(section.items)
					? section.items.map((item) => {
							const record = item as Record<string, unknown>;
							return {
								label: String(record.label || ""),
								value: String(record.value || ""),
								href: String(record.href || "") || undefined,
							};
						})
					: [],
			};
		case "richText":
			return richTextBlock(
				(section.headline as string) || doc.h1,
				bodyToParagraphs((section.body as string) || doc.body),
			);
		default:
			return null;
	}
}

function stripEmptyLinks(
	block: NonNullable<ReturnType<typeof layoutSectionToBlock>>,
) {
	const next = { ...block } as Record<string, unknown>;
	for (const key of ["primaryCta", "secondaryCta", "cta"]) {
		const value = next[key];
		if (!value || typeof value !== "object") continue;
		const href = String(
			(value as Record<string, unknown>).href || "",
		).trim();
		if (!href) delete next[key];
	}
	return next as NonNullable<ReturnType<typeof layoutSectionToBlock>>;
}

export function blocksFromImported(
	doc: ImportedDocument,
	mediaByPath: Map<string, number>,
) {
	if (doc.layout.length > 0) {
		const blocks = doc.layout
			.map((section) => layoutSectionToBlock(section, doc, mediaByPath))
			.filter(
				(block): block is NonNullable<typeof block> => block !== null,
			)
			.map((block) => stripEmptyLinks(block))
			.filter((block) => {
				if (block.blockType === "testimonials") {
					return Array.isArray(block.items) && block.items.length > 0;
				}
				if (block.blockType === "faq") {
					return Array.isArray(block.items) && block.items.length > 0;
				}
				if (block.blockType === "resourceList") {
					return Array.isArray(block.items) && block.items.length > 0;
				}
				return true;
			});

		if (blocks.length > 0) {
			return blocks;
		}
	}

	const paragraphs = bodyToParagraphs(doc.body);
	return [
		richTextBlock(
			doc.h1 || doc.title,
			paragraphs.length ? paragraphs : [doc.description],
		),
	];
}

export function isPublishedImport(
	slug: string,
	importStatus?: string,
): boolean {
	if (importStatus === "needs-manual") return false;
	return true;
}

export function collectImportedAssetPaths(
	documents: ImportedDocument[],
): string[] {
	const paths = new Set<string>();
	for (const doc of documents) {
		for (const image of doc.images) {
			if (image.downloadFailed || image.reused || !image.src?.trim()) continue;
			paths.add(assetPathToKey(image.src));
		}
	}
	return [...paths];
}
