import Image from "next/image";
import type { ReactNode } from "react";

import { InlineMarkdown } from "@/components/ui/InlineMarkdown";
import { Link } from "@/i18n/navigation";
import { isPopulatedMedia, normalizeMediaUrl } from "@/lib/payload/media";
import type {
	AgentTeaserBlock,
	ComparisonTableBlock,
	CtaBlock,
	FaqBlock,
	FeatureGridBlock,
	FeatureSplitBlock,
	PricingTableBlock,
	ResourceListBlock,
	StatsBlock,
	TestimonialsBlock,
} from "@/payload/payload-types";

export function FeatureGridSection({ block }: { block: FeatureGridBlock }) {
	return (
		<section className="section-block">
			<div className="mx-auto max-w-7xl px-8">
				{block.headline ? (
					<h2 className="section-intro text-3xl md:text-4xl">
						{block.headline}
					</h2>
				) : null}
				{block.description ? (
					<div className="mx-auto mb-10 max-w-3xl text-center text-foreground-muted whitespace-pre-line">
						<InlineMarkdown>{block.description}</InlineMarkdown>
					</div>
				) : null}
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{block.features?.map((feature) => {
						const icon = isPopulatedMedia(feature.icon)
							? feature.icon
							: null;
						const largeIcon = Boolean(
							icon?.width && icon.width > 120,
						);
						return (
							<article
								key={feature.id ?? feature.title}
								className="surface-card p-6"
							>
								{icon?.url ? (
									<Image
										src={normalizeMediaUrl(icon.url)}
										alt={icon.alt || feature.title}
										width={icon.width ?? 48}
										height={icon.height ?? 48}
										className={
											largeIcon
												? "mb-4 h-24 w-auto max-w-full object-contain"
												: "mb-4 size-12 object-contain"
										}
									/>
								) : null}
								<h3 className="text-xl">{feature.title}</h3>
								{feature.description ? (
									<p className="mt-2 text-sm text-foreground-muted whitespace-pre-line">
										<InlineMarkdown>
											{feature.description}
										</InlineMarkdown>
									</p>
								) : null}
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}

export function FeatureSplitSection({ block }: { block: FeatureSplitBlock }) {
	const image = isPopulatedMedia(block.image) ? block.image : null;
	const imageFirst = block.imagePosition === "left";
	const hasImage = Boolean(image?.url);

	const copy = (
		<>
			{block.headline ? (
				<h2 className="text-3xl md:text-4xl">{block.headline}</h2>
			) : null}
			{block.body ? (
				<p className="mt-4 whitespace-pre-line text-foreground-muted">
					<InlineMarkdown>{block.body}</InlineMarkdown>
				</p>
			) : null}
			{block.cta?.href ? (
				<Link href={block.cta.href} className="btn-primary mt-8">
					{block.cta.label ?? "Learn more"}
				</Link>
			) : null}
		</>
	);

	if (!hasImage) {
		const centered = !block.headline?.trim();
		return (
			<section className="section-block">
				<div
					className={`mx-auto max-w-3xl px-8 ${centered ? "text-center" : ""}`}
				>
					{copy}
				</div>
			</section>
		);
	}

	const isImageOnly =
		!block.headline?.trim() && !block.body?.trim() && !block.cta?.href;
	if (isImageOnly) {
		return (
			<section className="section-block">
				<div className="mx-auto max-w-4xl px-8">
					<div className="surface-card overflow-hidden p-2">
						<Image
							src={normalizeMediaUrl(image!.url!)}
							alt={image!.alt || "Recognition"}
							width={image!.width ?? 1024}
							height={image!.height ?? 519}
							className="w-full rounded-3xl"
						/>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="section-block">
			<div className="mx-auto grid max-w-7xl items-center gap-10 px-8 lg:grid-cols-2">
				<div className={imageFirst ? "lg:order-2" : undefined}>
					{copy}
				</div>
				<div
					className={`surface-card overflow-hidden p-2 ${imageFirst ? "lg:order-1" : ""}`}
				>
					<Image
						src={normalizeMediaUrl(image!.url!)}
						alt={image!.alt || block.headline || "Feature image"}
						width={image!.width ?? 800}
						height={image!.height ?? 600}
						className="w-full rounded-3xl"
					/>
				</div>
			</div>
		</section>
	);
}

export function ComparisonTableSection({
	block,
}: {
	block: ComparisonTableBlock;
}) {
	return (
		<section className="section-block">
			<div className="mx-auto max-w-5xl px-8">
				<h2 className="section-intro mb-10 text-3xl md:text-4xl">
					{block.headline}
				</h2>
				<div className="surface-card overflow-hidden">
					<div className="grid grid-cols-2 border-b border-border bg-background-muted text-sm font-semibold uppercase tracking-wide text-foreground">
						<div className="px-6 py-4">{block.leftTitle}</div>
						<div className="border-l border-border px-6 py-4">
							{block.rightTitle}
						</div>
					</div>
					{block.rows?.map((row) => (
						<div
							key={row.id ?? `${row.left}-${row.right}`}
							className="grid grid-cols-2 border-b border-border last:border-b-0"
						>
							<div className="px-6 py-4 text-foreground-muted">
								{row.left}
							</div>
							<div className="border-l border-border px-6 py-4 text-foreground">
								{row.right}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function parseStatLabel(label: string) {
	const parts = label
		.split("\n")
		.map((part) => part.trim())
		.filter(Boolean);
	if (parts.length >= 3) {
		return {
			type: parts[0],
			detail: parts[1],
			category: parts.slice(2).join("\n"),
		};
	}
	return { type: "", detail: "", category: label };
}

export function StatsSection({ block }: { block: StatsBlock }) {
	const variant = block.variant ?? "default";
	const isCardVariant = variant === "cards" || variant === "timeline";

	if (isCardVariant) {
		return (
			<section className="section-block">
				<div className="mx-auto max-w-7xl px-8">
					{block.headline ? (
						<h2 className="section-intro mb-6 text-3xl md:text-4xl">
							{block.headline}
						</h2>
					) : null}
					{block.description ? (
						<p className="mx-auto mb-10 max-w-3xl text-center text-foreground-muted">
							<InlineMarkdown>{block.description}</InlineMarkdown>
						</p>
					) : null}
					<div
						className={
							variant === "timeline"
								? "grid gap-4 md:grid-cols-3"
								: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
						}
					>
						{block.items?.map((item) => {
							const parsed = parseStatLabel(item.label);
							return (
								<div
									key={
										item.id ?? `${item.value}-${item.label}`
									}
									className="rounded-2xl bg-[#00195E] p-6 text-center"
								>
									<p className="font-display text-4xl leading-none text-[#02DCCE] md:text-5xl">
										{item.value}
									</p>
									{parsed.type ? (
										<p className="mt-2 text-xs font-medium tracking-[0.2em] text-white uppercase">
											{parsed.type}
										</p>
									) : null}
									{parsed.detail ? (
										<p className="mt-3 text-sm leading-snug text-white">
											{parsed.detail}
										</p>
									) : null}
									{parsed.category ? (
										<p className="mt-3 text-xs tracking-[0.15em] text-[#02DCCE] uppercase">
											{parsed.category}
										</p>
									) : null}
								</div>
							);
						})}
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="section-block border-y border-border">
			{block.headline ? (
				<h2 className="section-intro mb-10 text-3xl md:text-4xl">
					{block.headline}
				</h2>
			) : null}
			<div className="mx-auto grid max-w-7xl gap-8 px-8 sm:grid-cols-2 lg:grid-cols-4">
				{block.items?.map((item) => (
					<div key={item.id ?? item.label} className="text-center">
						<p className="text-4xl text-foreground">{item.value}</p>
						<p className="mt-2 text-foreground-muted">
							{item.label}
						</p>
					</div>
				))}
			</div>
		</section>
	);
}

export function PricingSection({ block }: { block: PricingTableBlock }) {
	return (
		<section className="section-block">
			<div className="mx-auto max-w-7xl px-8">
				{block.headline ? (
					<h2 className="section-intro text-3xl md:text-4xl">
						{block.headline}
					</h2>
				) : null}
				<div className="grid gap-6 lg:grid-cols-3">
					{block.plans?.map((plan) => (
						<article
							key={plan.id ?? plan.name}
							className="surface-card flex flex-col p-8"
						>
							<h3 className="text-2xl">{plan.name}</h3>
							<p className="mt-2 text-3xl text-brand">
								{plan.price}
							</p>
							{plan.description ? (
								<p className="mt-4 grow text-foreground-muted">
									<InlineMarkdown>
										{plan.description}
									</InlineMarkdown>
								</p>
							) : null}
							{plan.cta?.href ? (
								<Link
									href={plan.cta.href}
									className="btn-primary mt-8"
								>
									{plan.cta.label ?? "Get started"}
								</Link>
							) : null}
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

export function CmsTestimonialsSection({
	block,
}: {
	block: TestimonialsBlock;
}) {
	return (
		<section className="section-block">
			<div className="mx-auto max-w-7xl px-8">
				{block.headline ? (
					<h2 className="section-intro text-3xl md:text-4xl">
						{block.headline}
					</h2>
				) : null}
				<div className="grid gap-6 lg:grid-cols-2">
					{block.items?.map((item) => (
						<blockquote
							key={item.id ?? item.author}
							className="surface-card rounded-4xl border-l-[10px] border-l-brand p-8"
						>
							<p className="text-xl text-foreground">
								&ldquo;{item.quote}&rdquo;
							</p>
							<footer className="mt-6">
								<p className="font-medium text-foreground">
									{item.author}
								</p>
								{item.role ? (
									<p className="text-sm text-foreground-muted">
										{item.role}
									</p>
								) : null}
							</footer>
						</blockquote>
					))}
				</div>
			</div>
		</section>
	);
}

export function FaqSection({ block }: { block: FaqBlock }) {
	return (
		<section className="section-block">
			<div className="mx-auto max-w-3xl px-8">
				{block.headline ? (
					<h2 className="mb-8 text-center text-3xl md:text-4xl">
						{block.headline}
					</h2>
				) : null}
				<div className="space-y-4">
					{block.items?.map((item) => (
						<details
							key={item.id ?? item.question}
							className="surface-card group p-5"
						>
							<summary className="cursor-pointer list-none text-lg text-foreground marker:content-none">
								{item.question}
							</summary>
							<p className="mt-3 text-foreground-muted">
								<InlineMarkdown>{item.answer}</InlineMarkdown>
							</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}

export function CtaBlockSection({ block }: { block: CtaBlock }) {
	return (
		<section className="section-block">
			<div className="mx-auto max-w-7xl px-8">
				<div className="surface-card relative overflow-hidden rounded-4xl border border-border bg-surface-elevated p-10 md:p-14">
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--hero-glow),transparent_70%)]"
					/>
					<div className="relative text-center">
						<h2 className="text-3xl md:text-4xl">
							{block.headline}
						</h2>
						{block.description ? (
							<p className="mx-auto mt-4 max-w-2xl text-foreground-muted">
								<InlineMarkdown>
									{block.description}
								</InlineMarkdown>
							</p>
						) : null}
						<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
							{block.primaryCta?.href ? (
								<Link
									href={block.primaryCta.href}
									className="btn-primary"
								>
									{block.primaryCta.label ?? "Request a Demo"}
								</Link>
							) : null}
							{block.secondaryCta?.href ? (
								<Link
									href={block.secondaryCta.href}
									className="btn-secondary"
								>
									{block.secondaryCta.label ?? "Learn more"}
								</Link>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function ResourceLink({
	href,
	className,
	children,
}: {
	href: string;
	className?: string;
	children: ReactNode;
}) {
	if (href.startsWith("http://") || href.startsWith("https://")) {
		return (
			<a
				href={href}
				className={className}
				target="_blank"
				rel="noreferrer"
			>
				{children}
			</a>
		);
	}

	return (
		<Link href={href} className={className}>
			{children}
		</Link>
	);
}

export function ResourceListSection({ block }: { block: ResourceListBlock }) {
	return (
		<section className="section-block">
			<div className="mx-auto max-w-7xl px-8">
				{block.headline ? (
					<h2 className="section-intro text-3xl md:text-4xl">
						{block.headline}
					</h2>
				) : null}
				<ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{block.items?.map((item) => {
						const image = isPopulatedMedia(item.image)
							? item.image
							: null;
						return (
							<li
								key={item.id ?? `${item.href}-${item.title}`}
								className="flex"
							>
								<ResourceLink
									href={item.href}
									className="surface-card group flex w-full flex-col overflow-hidden transition-opacity hover:opacity-90"
								>
									<div className="relative flex h-[300px] items-center justify-center bg-[#00195E] p-4">
										{image?.url ? (
											<Image
												src={normalizeMediaUrl(
													image.url,
												)}
												alt={image.alt || item.title}
												width={image.width ?? 640}
												height={image.height ?? 360}
												className="max-h-full max-w-full object-contain"
											/>
										) : (
											<span className="text-sm text-foreground-muted">
												Resource
											</span>
										)}
									</div>
									<div className="flex flex-1 flex-col p-5">
										<h3 className="text-lg leading-snug text-foreground">
											{item.title}
										</h3>
										{item.excerpt ? (
											<p className="mt-3 line-clamp-3 text-sm text-foreground-muted">
												{item.excerpt}
											</p>
										) : null}
									</div>
								</ResourceLink>
							</li>
						);
					})}
				</ul>
				{block.cta?.href ? (
					<div className="mt-10 text-center">
						<Link href={block.cta.href} className="btn-secondary">
							{block.cta.label ?? "See all resources"}
						</Link>
					</div>
				) : null}
			</div>
		</section>
	);
}

export function AgentTeaserSection({ block }: { block: AgentTeaserBlock }) {
	return (
		<section className="section-block">
			<div className="mx-auto max-w-3xl px-8 text-center">
				<h2 className="text-3xl md:text-4xl">{block.headline}</h2>
				{block.description ? (
					<p className="mt-4 text-foreground-muted">
						<InlineMarkdown>{block.description}</InlineMarkdown>
					</p>
				) : null}
				{block.cta?.href ? (
					<Link href={block.cta.href} className="btn-primary mt-8">
						{block.cta.label ?? "Meet Rain"}
					</Link>
				) : null}
			</div>
		</section>
	);
}
