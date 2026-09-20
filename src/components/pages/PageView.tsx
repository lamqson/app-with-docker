import { RenderBlocks } from "@/components/blocks/RenderBlocks";
import { GlowBackground } from "@/components/layout/GlowBackground";
import { PageStructuredData } from "@/components/seo/PageStructuredData";
import type { Page } from "@/payload/payload-types";

type PageViewProps = {
	page: Page;
	showTitle?: boolean;
};

const PAGE_GLOW_SLUGS = new Set([
	"why-raindrop",
	"why-raindrop/ai-powered",
	"why-raindrop/our-expertise",
	"why-raindrop/customer-success-stories",
	"agentic-procurement",
	"ai-native-procurement",
	"resources",
	"resources/articles",
	"resources/case-studies",
	"resources/raindrop-news",
	"resources/videos",
	"resources/podcasts",
	"resources/recognition",
	"solutions",
	"solutions/platform",
	"solutions/platform/key-components",
	"solutions/platform/intake-orchestration",
	"solutions/raindrop-integrates-anywhere",
	"solutions/modules",
	"solutions/modules/supplier-management",
	"solutions/modules/sourcing",
	"solutions/modules/contract-lifecycle-management",
	"solutions/modules/eprocurement",
	"solutions/modules/e-invoicing",
	"solutions/modules/ap-automation",
	"solutions/modules/rainpay",
	"solutions/modules/analytics",
	"solutions/modules/rainsign",
	"solutions/by-business-function",
	"solutions/by-business-function/executives",
	"solutions/by-business-function/finance-teams",
	"solutions/by-business-function/procurement-teams",
	"solutions/by-business-function/it-and-compliance-teams",
	"solutions/by-business-function/legal-teams",
	"company",
	"company/raindrop-team",
	"company/advisor-team",
	"company/partners",
	"company/press-kit",
	"contact",
]);

export function PageView({ page, showTitle = true }: PageViewProps) {
	const hasBlocks = Boolean(page.blocks?.length);
	const shouldShowTitle = showTitle && !hasBlocks;
	const usePageGlow = PAGE_GLOW_SLUGS.has(page.slug);

	const content = page.blocks?.length ? (
		<RenderBlocks blocks={page.blocks} />
	) : (
		<section className="section-block">
			<div className="mx-auto max-w-3xl px-8">
				<p className="text-foreground-muted">
					{page.title} content is being prepared. Edit this page in
					Payload admin to add blocks and copy.
				</p>
			</div>
		</section>
	);

	return (
		<div
			className={
				usePageGlow
					? "relative isolate min-h-screen overflow-hidden"
					: undefined
			}
		>
			<PageStructuredData page={page} />
			{usePageGlow ? <GlowBackground variant="page" priority /> : null}
			<div className={usePageGlow ? "relative z-0" : undefined}>
				{shouldShowTitle ? (
					<section className="section-block pb-0">
						<div className="mx-auto max-w-7xl px-8">
							<h1 className="text-4xl md:text-5xl">
								{page.title}
							</h1>
						</div>
					</section>
				) : null}
				{content}
			</div>
		</div>
	);
}
