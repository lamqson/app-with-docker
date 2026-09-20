# Brand assets (`/src/assets`)

Single source of truth for Raindrop marketing images, logos, icons, and legal documents in this repo.

**All visual assets for the public site and Payload CMS must come from here.** Do not add a second asset root under `/public`, download stock photos, or pull binaries from raindrop.com or Themefisher.

---

## Rules

1. **Reuse filenames as-is** — import paths should stay stable so components, seeds, and CMS references do not break.
2. **Static imports in the frontend** — use `@/assets/...` (see [Usage](#usage-in-the-frontend)).
3. **Payload media** — upload from disk in the seed script (`npm run db:seed`); never seed remote URLs.
4. **Missing assets** — if a section needs a file that is not listed below, use a labeled placeholder in the UI and add the filename here when the file arrives. Do not invent or generate replacements.
5. **Next.js `<Image>`** — give every image explicit `width`/`height`, or `fill` plus a meaningful `alt`. SVG logos use `unoptimized` when needed for correct sizing.

---

## Directory layout

```
src/assets/
├── README.md
├── images/
│   ├── icon.png                    # Favicon / app icon (32×32 source)
│   ├── icon_192x192.png            # PWA / manifest icon
│   ├── icon_512x512.png            # PWA / manifest icon
│   ├── raindrop_logo.svg           # Mark only — light backgrounds
│   ├── raindrop_logo_white.svg     # Mark only — dark backgrounds
│   ├── raindrop_full_logo.svg      # Full wordmark — light backgrounds (header)
│   ├── raindrop_full_logo_white.svg# Full wordmark — dark backgrounds (header)
│   ├── rd-glow.webp                # Hero background glow
│   └── home/
│       ├── rain-base.webp          # Platform / agentic section visual
│       ├── rain-in-action.webp     # Hero product shot
│       ├── value-authentic.webp    # Values grid
│       ├── value-built.webp        # Values grid
│       ├── value-commitments.webp  # Values grid
│       └── logo-*.webp             # Customer logo cloud (8 files)
└── legal/
    ├── RaindropAcceptableUsePolicy.pdf
    ├── RaindropDataProcessingAgreement.pdf
    ├── Raindrop_SaaS_Agreement-v2.5.pdf
    └── Raindrop-Mutual-NDA.docx
```

---

## Inventory

### Logos & icons (`images/`)

| File | Purpose |
|------|---------|
| `raindrop_full_logo.svg` | Header logo on light theme |
| `raindrop_full_logo_white.svg` | Header logo on dark theme |
| `raindrop_logo.svg` | Compact mark — light backgrounds |
| `raindrop_logo_white.svg` | Compact mark — dark backgrounds |
| `icon.png` | Favicon (used in root layout metadata) |
| `icon_192x192.png` | Manifest / PWA icon (reserved) |
| `icon_512x512.png` | Manifest / PWA icon; seeded to Payload |
| `rd-glow.webp` | Decorative hero glow behind headline |

### Homepage (`images/home/`)

| File | Purpose |
|------|---------|
| `rain-in-action.webp` | Hero primary product visual |
| `rain-base.webp` | Agentic / platform section visual |
| `value-authentic.webp` | Values grid card |
| `value-built.webp` | Values grid card |
| `value-commitments.webp` | Values grid card |
| `logo-container-store.webp` | Logo cloud |
| `logo-insight-global.webp` | Logo cloud |
| `logo-lands-end.webp` | Logo cloud |
| `logo-pottery-barn.webp` | Logo cloud |
| `logo-sephora.webp` | Logo cloud |
| `logo-williams-sonoma.webp` | Logo cloud |
| `logo-workwear.webp` | Logo cloud |
| `logo-world-market.webp` | Logo cloud |

### Legal (`legal/`)

Published PDFs/DOCX for download or legal pages. **Not yet uploaded by the Payload seed** — wire these in when `/legal/*` routes are built.

| File | Document |
|------|----------|
| `RaindropAcceptableUsePolicy.pdf` | Acceptable Use Policy |
| `RaindropDataProcessingAgreement.pdf` | Data Processing Agreement (DPA) |
| `Raindrop_SaaS_Agreement-v2.5.pdf` | SaaS Agreement v2.5 |
| `Raindrop-Mutual-NDA.docx` | Mutual NDA |

---

## Usage in the frontend

Import with the `@/` alias (maps to `src/`):

```tsx
import logo from '@/assets/images/raindrop_full_logo.svg';
import heroGlow from '@/assets/images/rd-glow.webp';
import Image from 'next/image';

<Image src={logo} alt="Raindrop" width={140} height={32} unoptimized />
<Image src={heroGlow} alt="" fill className="object-contain" priority />
```

TypeScript module declarations for `.svg`, `.webp`, and `.png` live in `src/types/assets.d.ts`.

### Current consumers

| Asset | Used in |
|-------|---------|
| `raindrop_full_logo*.svg` | `src/components/layout/BrandLogo.tsx` |
| `icon.png` | `src/app/(frontend)/[locale]/layout.tsx` (favicon) |
| `rd-glow.webp`, `rain-in-action.webp` | `src/components/blocks/Hero.tsx` |
| `rain-base.webp` | `src/components/blocks/AgenticSection.tsx` |
| `value-*.webp` | `src/components/blocks/ValuesGrid.tsx` |
| `logo-*.webp` | `src/components/blocks/LogoCloud.tsx` |

---

## Payload CMS integration

The seed script (`src/payload/seed/index.ts`, run via `npm run db:seed`) uploads these files into the **Media** collection and wires them into **Site Settings** and draft pages:

- **Site settings:** `logoLight` → `raindrop_full_logo.svg`, `logoDark` → `raindrop_full_logo_white.svg`
- **Homepage draft:** Hero block (`rain-in-action.webp`), LogoCloud block (all eight customer logos)
- **Also seeded:** mark SVGs, icons, glow, platform/value images (available in admin for block pickers)

Uploaded files are stored on disk in `/media/` (gitignored). The seed reads only from this folder — it does not copy assets into `/public`.

To re-seed after adding files:

1. Add the file under `src/assets/` using the naming conventions above.
2. Append an entry to `SEED_MEDIA` in `src/payload/seed/index.ts`.
3. Run `npm run db:seed` (idempotent — skips existing filenames).

---

## Adding new assets

1. Place the file in the appropriate subfolder (`images/`, `images/home/`, or `legal/`).
2. Update this README inventory table.
3. Import in a component **or** add to `SEED_MEDIA` if editors should pick it in Payload.
4. Prefer `.webp` for photos, `.svg` for logos, `.png` for icons.

Do **not** duplicate the same asset under `/public`. If a public URL is required (e.g. `robots.txt` companion), reference or copy from here in build/seed logic only.
