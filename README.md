# Raindrop marketing site

Production-ready marketing site for Raindrop-style positioning (AI-native Source-to-Pay). One Next.js repo with an embedded Payload CMS admin, multilingual frontend, and SQLite database for local development.

**This is not a Themefisher Cloudpeak code clone and not a paragraph-for-paragraph copy of raindrop.com.** Cloudpeak and raindrop.com are visual and information-architecture references only. Copy and components in this repo are original or CMS-managed placeholders.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS v4, semantic CSS variables (light/dark) |
| CMS | Payload 3 embedded at `/admin`, SQLite locally |
| i18n | next-intl — 11 locales, locale prefix always on |
| Forms | HubSpot embed when configured; local fallback → `POST /api/leads` |
| Agent | “Rain” floating widget — GraphQL when configured, demo replies otherwise |
| Import | Python scraper → markdown + layout YAML → Payload seed |

## Prerequisites

- Node.js 20.9+
- npm
- Python 3 (optional — only needed to re-scrape pages from raindrop.com)

## Quick start

```bash
npm install
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
PAYLOAD_SECRET=any-long-random-string
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=changeme
```

Then seed and run:

```bash
npm run db:seed
npm run dev
```

| URL | Purpose |
| --- | --- |
| [http://localhost:3200/en](http://localhost:3200/en) | Public site (English) |
| [http://localhost:3200/admin](http://localhost:3200/admin) | Payload admin |

Default admin login (from seed):

- **Email:** `admin@example.com` (override with `SEED_ADMIN_EMAIL`)
- **Password:** `changeme` (override with `SEED_ADMIN_PASSWORD`)

Change these before any shared or production environment.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server on port **3200** |
| `npm run build` | Production build |
| `npm run start` | Production server on port 3200 |
| `npm run db:seed` | Seed admin, site settings, media, imported pages, sample blog/case study |
| `npm run generate:types` | Regenerate `src/payload/payload-types.ts` after schema changes |
| `npm run generate:importmap` | Regenerate Payload admin import map |
| `npm run lint` | ESLint |
| `npm run ci:migrate` | Run Payload DB migrations (production Postgres) |
| `npm run ci` | Migrate + production build (used by Netlify) |

## Importing pages from raindrop.com

Marketing pages are scraped from [raindrop.com](https://www.raindrop.com), converted into CMS block layouts, and seeded into Payload. This keeps the local site aligned with the reference IA without hardcoding page content in React.

### Workflow

```bash
# Scrape one page (or omit slug to scrape all nav pages)
python3 scripts/scrape-raindrop-nav.py why-raindrop

# Load markdown, images, and layout blocks into Payload
npm run db:seed

# Verify locally
open http://localhost:3200/en/why-raindrop
```

Scrape multiple slugs in one run:

```bash
python3 scripts/scrape-raindrop-nav.py home why-raindrop ai-native-procurement
```

### What the scraper produces

| Output | Location |
| --- | --- |
| Page markdown + layout YAML | `src/content/imported/<slug>.md` |
| Downloaded images | `src/assets/imported/<slug>/` |
| Site-wide favicons, etc. | `src/assets/imported/_site/` |

Each imported markdown file has YAML front matter with:

- `slug`, `title`, `description`, `source_url`
- `layout` — ordered list of CMS blocks (`featureSplit`, `comparisonTable`, `stats`, …)
- `images` — local asset paths mapped to Payload media on seed

Nested slugs use double underscores in filenames, e.g. `why-raindrop/ai-powered` → `why-raindrop__ai-powered.md`.

### Layout builders

Page-specific layout logic lives in `scripts/scrape-raindrop-nav.py`. Each slug can register a dedicated `layout_for_*()` function that maps raw HTML into structured blocks. Pages without a dedicated builder fall back to a generic extractor (which may include footer noise — add a dedicated builder when cloning a new page).

Dedicated layouts exist for pages including:

- `home`, `why-raindrop`, `why-raindrop/ai-powered`, `agentic-procurement`, `ai-native-procurement`
- `contact`, `company/*` team pages
- `resources/*` list pages (articles, case studies, videos, podcasts, news, recognition)
- `solutions/*` platform, modules, and business-function pages

After changing a layout builder, re-scrape the slug and re-seed.

### Seed behavior

`npm run db:seed` (via `src/payload/seed/import-markdown.ts`):

1. Uploads referenced images from `/src/assets` (including `/src/assets/imported/`)
2. Converts each `layout` section into Payload page blocks
3. Upserts pages by slug and publishes imported pages

If seed fails with `SQLITE_BUSY`, stop the dev server and retry.

### Supported CMS block types

| Block | Used for |
| --- | --- |
| `hero` | Page heroes (variant: centered stack, split media) |
| `featureSplit` | Two-column copy + image sections |
| `featureGrid` | Card grids (values, lifecycle steps, role benefits) |
| `comparisonTable` | Side-by-side Raindrop vs legacy / traditional comparisons |
| `stats` | Metric cards and stat rows |
| `testimonials` | Analyst and customer quotes |
| `logoCloud` | Partner, customer, and analyst logos |
| `resourceList` | Article/video grids with thumbnails |
| `leadershipGrid` | Team and advisor headshots |
| `contactSection` | Phone, email, address, map |
| `faq` | Accordion Q&A |
| `cta` | Demo / contact call-to-action bands |
| `richText`, `formEmbed`, `agentTeaser`, `pricingTable` | Misc sections |

Block components render in `src/components/blocks/`.

## Environment variables

See `.env.example`. Nothing secret should be committed.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URI` | SQLite path (default `file:./payload.sqlite`) |
| `PAYLOAD_SECRET` | Required for Payload and seed |
| `SEED_ADMIN_EMAIL` | Admin email created on first `db:seed` (default `admin@example.com`) |
| `SEED_ADMIN_PASSWORD` | Admin password created on first `db:seed` (default `changeme`) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (metadata, sitemap, OG) |
| `NEXT_PUBLIC_HUBSPOT_PORTAL_ID` | HubSpot tracking + forms (optional) |
| `NEXT_PUBLIC_HUBSPOT_DEMO_FORM_ID` | Default demo/contact form id (optional) |
| `GRAPHQL_ENDPOINT` | Agent widget GraphQL URL (optional) |

Site Settings in Payload can override HubSpot portal/form ids and the GraphQL endpoint per environment.

## Payload admin

1. Open [http://localhost:3200/admin](http://localhost:3200/admin)
2. Sign in with the seeded admin user:
   - **Email:** `admin@example.com` (or your `SEED_ADMIN_EMAIL`)
   - **Password:** `changeme` (or your `SEED_ADMIN_PASSWORD`)
3. Edit **Site Settings** for nav, footer, logos, default theme, HubSpot/agent flags
4. Edit **Pages**, **Posts**, and **Case Studies** for content

After changing collections or blocks in code:

```bash
npm run generate:types
npm run generate:importmap
```

In development, draft pages are visible on the frontend. Publish pages in admin before production.

## Theme and locale

**Theme** — Header toggle switches light/dark. Preference is stored in `localStorage`. Default theme comes from Payload **Site Settings** (`defaultTheme`: light, dark, or system).

**Locale** — Header language dropdown switches among 11 locales (`en`, `es`, `fr`, `de`, `zh-TW`, `zh-CN`, `ja`, `ko`, `it`, `pt`, `pt-BR`). URLs always include the locale prefix, e.g. `/en/solutions`, `/es/demo`.

Static UI strings live in `messages/*.json`. CMS fields (nav labels, page blocks) are localized in Payload.

## Assets

All brand images, logos, icons, and legal files live in **`/src/assets`**. Scraped page images land in **`/src/assets/imported/`**. Do not add a parallel asset tree under `/public` or download replacements from third-party sites.

Full inventory, import patterns, and seed behavior: [`src/assets/README.md`](src/assets/README.md).

## Integrations

**HubSpot** — When `NEXT_PUBLIC_HUBSPOT_PORTAL_ID` is set, the tracking script loads on every page. Demo and contact pages (and `formEmbed` blocks) render the HubSpot form when portal + form ids are available; otherwise a local lead form posts to `/api/leads` (logged server-side).

**Rain agent** — Enable in **Site Settings → agentEnabled**. The floating “Ask Rain” button calls `GRAPHQL_ENDPOINT` with a placeholder `Chat` mutation when set; otherwise demo replies are shown.

## SEO

- Per-page metadata from Payload SEO fields (title, description, OG image)
- Default OG image from `/src/assets/images/icon_512x512.png`
- [http://localhost:3200/sitemap.xml](http://localhost:3200/sitemap.xml)
- [http://localhost:3200/robots.txt](http://localhost:3200/robots.txt)

## Project layout

```
scripts/
└── scrape-raindrop-nav.py     # Scrape raindrop.com → markdown + layout + images

src/
├── app/
│   ├── (frontend)/[locale]/   # Public routes (home, CMS pages, blog, customers)
│   ├── (payload)/             # Payload admin + REST/GraphQL API
│   ├── api/leads/             # Local form fallback
│   ├── sitemap.ts
│   └── robots.ts
├── assets/                    # Brand files + imported scrape assets
├── components/                # blocks, layout, forms, agent, pages
├── content/imported/          # Scraped markdown + layout YAML (seed input)
├── i18n/                      # next-intl routing and navigation
├── lib/                       # payload, hubspot, graphql, seo helpers
├── payload/                   # Payload config, collections, seed, blocks
└── styles/globals.css         # Design tokens + Tailwind v4 @theme
messages/                      # Locale JSON for static UI copy
```

## Main routes

| Path | Source |
| --- | --- |
| `/` → `/en` | Homepage — Payload `home` page (CMS blocks) |
| `/[locale]/[...slug]` | CMS pages (`why-raindrop`, `solutions/*`, `contact`, `legal/privacy`, …) |
| `/[locale]/blog` | Blog index + Payload posts |
| `/[locale]/customers` | Case studies index + Payload case studies |

Most marketing pages under `/en/why-raindrop`, `/en/solutions`, `/en/resources`, and `/en/company` are imported from raindrop.com via the scraper and seeded into Payload.

## Deploy to Netlify

The repo includes `netlify.toml` and a GitHub Actions workflow (`.github/workflows/netlify.yml`) that lint and build on every PR and push to `main`.

### 1. Create the Netlify site

1. [Create a new site](https://app.netlify.com/start) from this GitHub repository.
2. Netlify detects Next.js automatically — build settings come from `netlify.toml`:
   - **Build command:** `npm run ci` (migrate → build)
   - **Node version:** 20 (via `.nvmrc` / `netlify.toml`)

### 2. Add Postgres

SQLite is local-only. Production on Netlify requires Postgres:

- **Netlify DB (Neon)** — add via Netlify **Extensions → Neon**, or
- **Supabase** — use the [Supabase Netlify integration](https://docs.netlify.com/integrations/supabase/), or
- Any hosted Postgres — paste the connection string manually.

The app uses Postgres when `DATABASE_URL` or `NETLIFY_DATABASE_URL` is set; otherwise it falls back to SQLite (`src/payload/database.ts`).

### 3. Environment variables

Set these in **Site configuration → Environment variables** (Production + Deploy previews as needed):

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes (prod) | Postgres connection string |
| `PAYLOAD_SECRET` | Yes | Long random string (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_SITE_URL` | Yes | e.g. `https://your-site.netlify.app` |
| `SEED_ADMIN_EMAIL` | Seed only | For one-time `db:seed` |
| `SEED_ADMIN_PASSWORD` | Seed only | Change after first login |

### 4. Migrations and seed

Before the first production deploy, generate migrations against Postgres:

```bash
DATABASE_URL="postgres://..." npm run payload migrate:create
# Commit src/migrations/
```

After the first successful deploy, seed content once from your machine:

```bash
DATABASE_URL="postgres://..." PAYLOAD_SECRET="..." NEXT_PUBLIC_SITE_URL="https://..." npm run db:seed
```

### 5. Media uploads

Seeded/imported assets from `src/assets` work after seed. **Runtime admin uploads** need remote storage (Netlify’s filesystem is not persistent). Configure an S3-compatible adapter such as `@payloadcms/storage-s3` before relying on admin media uploads in production.

### CI vs Netlify builds

- **GitHub Actions** — validates lint + build on PRs (SQLite, no secrets required).
- **Netlify** — runs `npm run ci` on every push to `main` (or your production branch) using production env vars.

Do not enable both Netlify auto-deploy **and** a separate GitHub Action that also deploys to Netlify, or you will get duplicate production builds.

## Production notes

```bash
npm run build
npm run start
```

- Set `NEXT_PUBLIC_SITE_URL` to your production domain
- Use a strong `PAYLOAD_SECRET` and change the seeded admin password
- Publish CMS content (drafts are not shown in production builds)
- Set `DATABASE_URL` for any serverless/hosted deploy (Netlify, Vercel, etc.)

## License

Private — Raindrop/Octupi internal use unless otherwise specified.
