import type { Block } from "payload";

import { linkFields, optionalLinkFields } from "../fields/link";

function localizedText(name: string, required = false) {
	return {
		name,
		type: "text" as const,
		localized: true,
		required,
	};
}

function localizedTextarea(name: string, required = false) {
	return {
		name,
		type: "textarea" as const,
		localized: true,
		required,
	};
}

export const pageBlocks: Block[] = [
	{
		slug: "hero",
		interfaceName: "HeroBlock",
		fields: [
			localizedText("eyebrow"),
			localizedText("headline", true),
			localizedTextarea("subheadline"),
			{
				name: "variant",
				type: "select",
				defaultValue: "centered-stack",
				options: [
					{ label: "Centered stack", value: "centered-stack" },
					{
						label: "Split — media right",
						value: "split-right-media",
					},
					{ label: "Split — media left", value: "split-left-media" },
				],
			},
			linkFields("primaryCta"),
			optionalLinkFields("secondaryCta"),
			{
				name: "image",
				type: "upload",
				relationTo: "media",
			},
		],
	},
	{
		slug: "logoCloud",
		interfaceName: "LogoCloudBlock",
		fields: [
			localizedText("headline"),
			{
				name: "variant",
				type: "select",
				defaultValue: "logos",
				options: [
					{ label: "Logos", value: "logos" },
					{ label: "Cards", value: "cards" },
				],
			},
			{
				name: "logos",
				type: "array",
				fields: [
					{
						name: "image",
						type: "upload",
						relationTo: "media",
						required: true,
					},
					{
						name: "alt",
						type: "text",
						required: true,
					},
				],
			},
		],
	},
	{
		slug: "featureGrid",
		interfaceName: "FeatureGridBlock",
		fields: [
			localizedText("headline"),
			localizedTextarea("description"),
			{
				name: "features",
				type: "array",
				fields: [
					localizedText("title", true),
					localizedTextarea("description"),
					{
						name: "icon",
						type: "upload",
						relationTo: "media",
					},
				],
			},
		],
	},
	{
		slug: "featureSplit",
		interfaceName: "FeatureSplitBlock",
		fields: [
			localizedText("headline"),
			localizedTextarea("body"),
			optionalLinkFields("cta"),
			{
				name: "image",
				type: "upload",
				relationTo: "media",
			},
			{
				name: "imagePosition",
				type: "select",
				defaultValue: "right",
				options: [
					{ label: "Left", value: "left" },
					{ label: "Right", value: "right" },
				],
			},
		],
	},
	{
		slug: "stats",
		interfaceName: "StatsBlock",
		fields: [
			localizedText("headline"),
			localizedTextarea("description"),
			{
				name: "variant",
				type: "select",
				defaultValue: "default",
				options: [
					{ label: "Default", value: "default" },
					{ label: "Cards", value: "cards" },
					{ label: "Timeline", value: "timeline" },
				],
			},
			{
				name: "items",
				type: "array",
				fields: [
					localizedText("value", true),
					localizedText("label", true),
				],
			},
		],
	},
	{
		slug: "pricingTable",
		interfaceName: "PricingTableBlock",
		fields: [
			localizedText("headline"),
			{
				name: "plans",
				type: "array",
				fields: [
					localizedText("name", true),
					localizedText("price", true),
					localizedTextarea("description"),
					optionalLinkFields("cta"),
				],
			},
		],
	},
	{
		slug: "testimonials",
		interfaceName: "TestimonialsBlock",
		fields: [
			localizedText("headline"),
			{
				name: "items",
				type: "array",
				fields: [
					localizedTextarea("quote", true),
					localizedText("author", true),
					localizedText("role"),
				],
			},
		],
	},
	{
		slug: "faq",
		interfaceName: "FaqBlock",
		fields: [
			localizedText("headline"),
			{
				name: "items",
				type: "array",
				fields: [
					localizedText("question", true),
					localizedTextarea("answer", true),
				],
			},
		],
	},
	{
		slug: "cta",
		interfaceName: "CtaBlock",
		fields: [
			localizedText("headline", true),
			localizedTextarea("description"),
			linkFields("primaryCta"),
			optionalLinkFields("secondaryCta"),
		],
	},
	{
		slug: "richText",
		interfaceName: "RichTextBlock",
		fields: [
			{
				name: "content",
				type: "richText",
				localized: true,
				required: true,
			},
		],
	},
	{
		slug: "formEmbed",
		interfaceName: "FormEmbedBlock",
		fields: [
			localizedText("headline"),
			localizedTextarea("description"),
			{
				name: "formId",
				type: "text",
				admin: {
					description:
						"HubSpot form id override; falls back to site settings.",
				},
			},
		],
	},
	{
		slug: "contactSection",
		interfaceName: "ContactSectionBlock",
		fields: [
			localizedText("headline"),
			localizedTextarea("description"),
			{
				name: "items",
				type: "array",
				fields: [
					localizedText("label", true),
					localizedTextarea("value", true),
					{
						name: "href",
						type: "text",
						admin: {
							description: "tel:, mailto:, or external URL",
						},
					},
				],
			},
			{
				name: "mapEmbedUrl",
				type: "text",
				admin: {
					description: "Google Maps embed iframe src URL",
				},
			},
		],
	},
	{
		slug: "agentTeaser",
		interfaceName: "AgentTeaserBlock",
		fields: [
			localizedText("headline", true),
			localizedTextarea("description"),
			optionalLinkFields("cta"),
		],
	},
	{
		slug: "comparisonTable",
		interfaceName: "ComparisonTableBlock",
		fields: [
			localizedText("headline", true),
			localizedText("leftTitle", true),
			localizedText("rightTitle", true),
			{
				name: "rows",
				type: "array",
				fields: [
					localizedText("left", true),
					localizedText("right", true),
				],
			},
		],
	},
	{
		slug: "resourceList",
		interfaceName: "ResourceListBlock",
		fields: [
			localizedText("headline"),
			optionalLinkFields("cta"),
			{
				name: "items",
				type: "array",
				fields: [
					localizedText("title", true),
					localizedTextarea("excerpt"),
					{
						name: "href",
						type: "text",
						required: true,
					},
					{
						name: "image",
						type: "upload",
						relationTo: "media",
					},
				],
			},
		],
	},
	{
		slug: "leadershipGrid",
		interfaceName: "LeadershipGridBlock",
		fields: [
			localizedText("headline"),
			{
				name: "members",
				type: "array",
				fields: [
					localizedText("name", true),
					localizedText("role", true),
					localizedTextarea("bio"),
					{
						name: "photo",
						type: "upload",
						relationTo: "media",
					},
				],
			},
		],
	},
];
