#!/usr/bin/env python3
"""Scrape raindrop.com nav pages: markdown, layout YAML, and local images."""

from __future__ import annotations

import html
import json
import re
import sys
import textwrap
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / 'src' / 'content' / 'imported'
ASSETS_DIR = ROOT / 'src' / 'assets' / 'imported'
SITE_ASSETS_DIR = ASSETS_DIR / '_site'
EXISTING_ASSETS = ROOT / 'src' / 'assets'
LEGAL_ASSETS_DIR = EXISTING_ASSETS / 'legal'
BASE = 'https://www.raindrop.com'

LEGAL_DOC_ORDER = (
    'Raindrop Data Processing Agreement',
    'Raindrop Software as a Service Agreement',
    'Raindrop Acceptable Use Policy',
    'Raindrop Mutual NDA',
)

NAV_PATHS = [
    '/',
    '/why-raindrop',
    '/agentic-procurement',
    '/ai-native-procurement',
    '/why-raindrop/ai-powered',
    '/why-raindrop/our-expertise',
    '/why-raindrop/customer-success-stories',
    '/resources/recognition',
    '/solutions',
    '/solutions/platform',
    '/solutions/platform/key-components',
    '/solutions/raindrop-integrates-anywhere',
    '/solutions/platform/intake-orchestration',
    '/solutions/modules',
    '/solutions/modules/supplier-management',
    '/solutions/modules/sourcing',
    '/solutions/modules/contract-lifecycle-management',
    '/solutions/modules/eprocurement',
    '/solutions/modules/e-invoicing',
    '/solutions/modules/ap-automation',
    '/solutions/modules/rainpay',
    '/solutions/modules/analytics',
    '/solutions/modules/rainsign',
    '/solutions/by-business-function',
    '/solutions/by-business-function/executives',
    '/solutions/by-business-function/finance-teams',
    '/solutions/by-business-function/procurement-teams',
    '/solutions/by-business-function/it-and-compliance-teams',
    '/solutions/by-business-function/legal-teams',
    '/company',
    '/company/raindrop-team',
    '/company/advisor-team',
    '/company/partners',
    '/resources',
    '/resources/articles',
    '/resources/case-studies',
    '/resources/raindrop-news',
    '/resources/videos',
    '/resources/podcasts',
    '/contact',
    '/contact/get-started',
    '/legal',
    '/legal/privacy',
    '/security',
]

SKIP_URL_RE = re.compile(
    r'(cookie|wp-admin|hubspot|hs-scripts|hsforms|gravatar|emoji|1x1|tracking|pixel|stg\.raindrop)',
    re.I,
)

ROLE_TITLES = {
    'advisor',
    'ceo',
    'coo',
    'svp customer success',
    'head of development',
    'head of product',
}

EXISTING_BY_PATTERN: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r'raindrop_full_logo_white', re.I), 'images/raindrop_full_logo_white.svg'),
    (re.compile(r'raindrop_full_logo', re.I), 'images/raindrop_full_logo.svg'),
    (re.compile(r'raindrop_logo_white', re.I), 'images/raindrop_logo_white.svg'),
    (re.compile(r'raindrop_logo', re.I), 'images/raindrop_logo.svg'),
    (re.compile(r'rd-glow|raindrop_period_light-blue', re.I), 'images/rd-glow.webp'),
    (re.compile(r'rain-in-action', re.I), 'images/home/rain-in-action.webp'),
    (re.compile(r'rain-base', re.I), 'images/home/rain-base.webp'),
    (re.compile(r'Home_GuidingValues-1built|value-built', re.I), 'images/home/value-built.webp'),
    (re.compile(r'Home_GuidingValues-2authentic|value-authentic', re.I), 'images/home/value-authentic.webp'),
    (re.compile(r'Home_GuidingValues-3commitments|value-commitments', re.I), 'images/home/value-commitments.webp'),
]

LOGO_CLOUD_FILES = {
    'container': 'images/home/logo-container-store.webp',
    'williams': 'images/home/logo-williams-sonoma.webp',
    'workwear': 'images/home/logo-workwear.webp',
    'world-market': 'images/home/logo-world-market.webp',
    'world market': 'images/home/logo-world-market.webp',
    'pottery': 'images/home/logo-pottery-barn.webp',
    'sephora': 'images/home/logo-sephora.webp',
    'lands-end': 'images/home/logo-lands-end.webp',
    'insight': 'images/home/logo-insight-global.webp',
}


def clean_text(value: str) -> str:
    value = html.unescape(re.sub(r'<[^>]+>', ' ', value))
    value = re.sub(r'\[\s*\.\.\.\s*\]', '', value)
    value = re.sub(r'\[(?!.*\]\()[^\]]+\]', '', value)
    value = re.sub(r'Read more\.?', '', value, flags=re.I)
    return re.sub(r'\s+', ' ', value).strip()


def path_to_slug(path: str) -> str:
    return path.strip('/') or 'home'


def path_to_filename(slug: str) -> str:
    return slug.replace('/', '__') + '.md'


def slug_asset_dir(slug: str) -> Path:
    return ASSETS_DIR / slug.replace('/', '__')


def fetch(path: str) -> tuple[str, str]:
    url = BASE + (path if path.startswith('/') else f'/{path}')
    if not url.endswith('/'):
        url += '/'
    req = urllib.request.Request(url, headers={'User-Agent': 'RaindropImportBot/2.0'})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return resp.geturl(), resp.read().decode('utf-8', 'replace')


def sanitize_filename(url: str) -> str:
    name = urllib.parse.unquote(url.split('?')[0].rstrip('/').split('/')[-1])
    name = name.lower()
    name = re.sub(r'[^a-z0-9._-]+', '-', name)
    return name or 'image.webp'


def existing_asset_for(url: str) -> str | None:
    filename = sanitize_filename(url)
    for pattern, rel in EXISTING_BY_PATTERN:
        if pattern.search(filename) or pattern.search(url):
            if (EXISTING_ASSETS / rel).exists():
                return rel
    for key, rel in LOGO_CLOUD_FILES.items():
        if key.replace(' ', '-') in filename or key.replace(' ', '') in filename.replace('-', ''):
            if (EXISTING_ASSETS / rel).exists():
                return rel
    return None


def infer_role(url: str, alt: str = '') -> str:
    combined = f'{url} {alt}'.lower()
    if 'logo' in combined and 'full' not in combined:
        return 'logo'
    if 'full_logo' in combined or 'wordmark' in combined:
        return 'logo'
    if any(x in combined for x in ('headshot', 'portrait', 'team', 'advisor', 'leadership')):
        return 'portrait'
    if any(x in combined for x in ('icon', 'favicon', 'apple-touch')):
        return 'icon'
    if any(x in combined for x in ('glow', 'background', 'period_')):
        return 'background'
    if any(x in combined for x in ('hero', 'rain-in-action', 'thumbnail', 'video')):
        return 'hero'
    return 'ui'


def extract_image_urls(raw: str) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for match in re.finditer(
        r'<img[^>]+(?:src|data-src|data-lazy-src)="([^"]+)"[^>]*(?:alt="([^"]*)")?',
        raw,
        re.I,
    ):
        url, alt = match.group(1), match.group(2) or ''
        if not url.startswith('http'):
            continue
        if SKIP_URL_RE.search(url):
            continue
        if 'wp-content' not in url and 'raindrop.com' not in url:
            continue
        dim = re.search(r'[-_](\d+)x(\d+)\.', url)
        if dim and int(dim.group(1)) <= 2 and int(dim.group(2)) <= 2:
            continue
        found.append((url, alt))

    for url in re.findall(r'url\((https://[^)]+\.(?:webp|png|jpg|jpeg|svg)[^)]*)\)', raw, re.I):
        if SKIP_URL_RE.search(url):
            continue
        found.append((url, ''))

    og = re.search(r'property="og:image"\s+content="([^"]+)"', raw, re.I)
    if og and not SKIP_URL_RE.search(og.group(1)):
        found.append((og.group(1), 'Open Graph image'))

    deduped: list[tuple[str, str]] = []
    seen: set[str] = set()
    for url, alt in found:
        key = url.split('?')[0]
        if key in seen:
            continue
        seen.add(key)
        deduped.append((url, alt))
    return deduped


def download_image(url: str, dest: Path) -> bool:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'RaindropImportBot/2.0'})
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = resp.read()
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return True
    except Exception:
        return False


def normalize_asset_url(url: str) -> str:
    return (
        url.replace('http://www.raindrop.com', 'https://www.raindrop.com')
        .replace('http://raindrop.com', 'https://raindrop.com')
    )


@dataclass
class ImageRecord:
    id: str
    src: str
    role: str
    alt: str
    source_url: str
    reused: bool = False
    download_failed: bool = False


@dataclass
class Section:
    cols: list[str]
    headings: list[str]
    paragraphs: list[str]
    buttons: list[tuple[str, str]]
    has_accordion: bool
    image_ids: list[str] = field(default_factory=list)


class ContentExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_skip = 0
        self.in_elementor = False
        self.in_widget = False
        self.in_anchor = False
        self.anchor_href = ''
        self.anchor_buffer: list[str] = []
        self.tag_stack: list[str] = []
        self.blocks: list[str] = []
        self.buffer: list[str] = []
        self.h1: str | None = None
        self.ctas: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = {k: (v or '') for k, v in attrs}
        cls = attrs_dict.get('class', '')
        if tag in {'script', 'style', 'noscript', 'svg'}:
            self.in_skip += 1
            return
        if tag == 'div' and attrs_dict.get('data-elementor-type') == 'wp-page':
            self.in_elementor = True
        if tag == 'div' and ('cz_wpe_content' in cls or 'elementor-widget-text-editor' in cls or 'elementor-widget-cz_title' in cls):
            self.in_widget = True
        if self.in_widget and tag in {'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li'}:
            self.tag_stack.append(tag)
        if tag == 'a' and self.in_widget:
            href = attrs_dict.get('href', '')
            if href and not SKIP_URL_RE.search(href):
                self.in_anchor = True
                self.anchor_href = href
                self.anchor_buffer = []

    def handle_endtag(self, tag: str) -> None:
        if tag in {'script', 'style', 'noscript', 'svg'}:
            self.in_skip = max(0, self.in_skip - 1)
            return
        if not self.in_widget:
            return
        if tag == 'a' and self.in_anchor:
            text = clean_text(''.join(self.anchor_buffer))
            if text and self.anchor_href:
                href = remap_href(self.anchor_href)
                link = f'[{text}]({href})'
                inline_parent = self.tag_stack and self.tag_stack[-1] in {'p', 'li', 'span'}
                if inline_parent or len(text) < 100:
                    self.buffer.append(link)
                self.ctas.append((text, href))
            self.in_anchor = False
            self.anchor_href = ''
            self.anchor_buffer = []
            return
        if tag in {'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li'} and self.tag_stack and self.tag_stack[-1] == tag:
            text = clean_text(''.join(self.buffer))
            if text:
                if tag == 'h1' and not self.h1:
                    self.h1 = text
                prefix = {'h1': '#', 'h2': '##', 'h3': '###'}.get(tag, '####')
                if tag != 'h1':
                    self.blocks.append(f'{prefix} {text}')
                else:
                    self.blocks.append(f'# {text}')
            self.buffer = []
            self.tag_stack.pop()

    def handle_data(self, data: str) -> None:
        if self.in_skip or not self.in_widget:
            return
        if not data.strip():
            return
        if self.in_anchor:
            self.anchor_buffer.append(data)
        else:
            self.buffer.append(data)


def parse_sections(raw: str) -> list[Section]:
    parts = raw.split('elementor-top-section')
    sections: list[Section] = []
    for part in parts[1:]:
        cols = re.findall(r'elementor-col-(\d+)', part[:5000])
        headings = [
            clean_text(x)
            for x in re.findall(r'<h[1-6][^>]*>(.*?)</h[1-6]>', part[:20000], re.S)
        ]
        headings = [h for h in headings if h and len(h) > 2]
        paragraphs = [
            clean_text(x)
            for x in re.findall(r'<p[^>]*>(.*?)</p>', part[:20000], re.S)
        ]
        paragraphs = [p for p in paragraphs if len(p) > 30][:6]
        buttons: list[tuple[str, str]] = []
        for btn in re.findall(r'<a[^>]+href="([^"]+)"[^>]*class="[^"]*elementor-button[^"]*"[^>]*>(.*?)</a>', part[:20000], re.S):
            label = clean_text(btn[1])
            if label:
                buttons.append((label, btn[0]))
        has_accordion = 'accordion' in part[:20000].lower() or 'cz_acc' in part[:20000].lower()
        if headings or paragraphs or buttons:
            sections.append(
                Section(
                    cols=cols[:6],
                    headings=headings,
                    paragraphs=paragraphs,
                    buttons=buttons,
                    has_accordion=has_accordion,
                )
            )
    return sections


def extract_faq_pairs(raw: str) -> list[dict[str, str]]:
    pairs: list[dict[str, str]] = []
    for q, a in re.findall(
        r'class="[^"]*accordion[^"]*title[^"]*"[^>]*>(.*?)</.*?class="[^"]*accordion[^"]*content[^"]*"[^>]*>(.*?)</',
        raw,
        re.S | re.I,
    ):
        question = clean_text(q)
        answer = clean_text(a)
        if question and answer:
            pairs.append({'question': question, 'answer': answer})
    if pairs:
        return pairs
    # fallback: h3 + following p in FAQ area
    idx = raw.lower().find('faq')
    chunk = raw[idx : idx + 30000] if idx != -1 else raw
    for heading in re.findall(r'<h[3-5][^>]*>(.*?)</h[3-5]>\s*<p[^>]*>(.*?)</p>', chunk, re.S):
        question = clean_text(heading[0])
        answer = clean_text(heading[1])
        if question and answer:
            pairs.append({'question': question, 'answer': answer})
    return pairs[:12]


def extract_faq_from_body(body: str) -> list[dict[str, str]]:
    pairs: list[dict[str, str]] = []
    faq_idx = body.find('### FAQ')
    if faq_idx == -1:
        faq_idx = body.find('## FAQ')
    chunk = body[faq_idx:] if faq_idx != -1 else body
    for match in re.finditer(r'^#{4}\s+(.+?)\?(.*?)(?=^#{3,4}\s|\Z)', chunk, re.S | re.M):
        question = clean_text(match.group(1)) + '?'
        answer = clean_text(match.group(2))
        if len(answer) > 20:
            pairs.append({'question': question, 'answer': answer})
    return pairs[:12]


def extract_testimonials_from_body(body: str) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for quote, author in re.findall(r'####\s+[“\"]([^”"]+)[”\"]\s*\n+####\s+([^\n#]+)', body):
        items.append({'quote': quote.strip(), 'author': author.strip(), 'role': ''})
    if items:
        return items[:4]
    for quote in re.findall(r'####\s+"([^"]{40,})"', body):
        items.append({'quote': quote.strip(), 'author': 'Raindrop customer', 'role': ''})
    for quote in re.findall(r'“([^”]{40,})”', body):
        items.append({'quote': quote.strip(), 'author': 'Raindrop customer', 'role': ''})
    return items[:4]


def extract_h3_h4_pairs(body: str, start_marker: str, end_marker: str | None = None) -> list[dict[str, str]]:
    start = body.find(start_marker)
    if start == -1:
        return []
    chunk = body[start:]
    if end_marker:
        end = chunk.find(end_marker, len(start_marker))
        if end != -1:
            chunk = chunk[:end]
    items: list[dict[str, str]] = []
    for match in re.finditer(r'^### (.+?)\n\n#### (.+?)(?=\n\n### |\n\n## |\Z)', chunk, re.S | re.M):
        title = clean_text(match.group(1))
        description = clean_text(match.group(2))
        if title and description:
            items.append({'title': title, 'description': description})
    return items


def extract_h2_h4_pairs(body: str, start_marker: str, end_marker: str | None = None) -> list[dict[str, str]]:
    start = body.find(start_marker)
    if start == -1:
        return []
    chunk = body[start:]
    if end_marker:
        end = chunk.find(end_marker, len(start_marker))
        if end != -1:
            chunk = chunk[:end]
    items: list[dict[str, str]] = []
    for match in re.finditer(r'^## (.+?)\n\n#### (.+?)(?=\n\n## |\n\n### |\Z)', chunk, re.S | re.M):
        title = clean_text(match.group(1))
        description = clean_text(match.group(2))
        if title and description:
            items.append({'title': title, 'description': description})
    return items


GLUED_H4_SPLITS = (
    'Modules live',
    'Modern, intuitive',
    'Raindrop replaces',
    'Raindrop empowers',
    'Traditional tools',
    'Inflexible systems',
    'Legacy platforms',
    'Legacy tools',
)


def split_glued_heading(line: str, prefixes: tuple[str, ...] = GLUED_H4_SPLITS) -> tuple[str, str]:
    for prefix in sorted(prefixes, key=len, reverse=True):
        idx = line.find(prefix)
        if idx > 0:
            return line[:idx].strip(), line[idx:].strip()
    return line, ''


def extract_h4_bullet_items(body: str, start_marker: str, end_marker: str | None = None) -> list[dict[str, str]]:
    start = body.find(start_marker)
    if start == -1:
        return []
    chunk = body[start:]
    if end_marker:
        end = chunk.find(end_marker, len(start_marker))
        if end != -1:
            chunk = chunk[:end]
    items: list[dict[str, str]] = []
    for match in re.finditer(r'^#### (.+?)(?=\n\n#### |\n\n### |\Z)', chunk, re.S | re.M):
        line = clean_text(match.group(1))
        if not line or line in {'.', 'Address:', 'Phone:', 'Email:'}:
            continue
        if line.startswith('"') or line.startswith('“'):
            continue
        title, description = split_glued_heading(line)
        if title:
            items.append({'title': title, 'description': description})
    return items


def format_comparison_cell(item: dict[str, str]) -> str:
    description = item.get('description', '')
    if description:
        return f"{item['title']} — {description}"
    return item['title']


def extract_why_raindrop_intro(body: str) -> str:
    start = body.find('### THE RAINDROP DIFFERENCE')
    if start == -1:
        return ''
    chunk = body[start:]
    for marker in ('Raindrop Redefines Spend Management', '### Raindrop Redefines'):
        end = chunk.find(marker, len('### THE RAINDROP DIFFERENCE'))
        if end != -1:
            chunk = chunk[:end]
            break
    paragraphs: list[str] = []
    for match in re.finditer(r'^#### (.+?)(?=\n\n#### |\n\n### |\Z)', chunk, re.S | re.M):
        text = clean_text(match.group(1))
        text = re.sub(r'commitments\.Built', 'commitments.\n\nBuilt', text)
        if text.startswith('"') or text.startswith('“') or text.startswith('['):
            continue
        paragraphs.append(text)
    return '\n\n'.join(paragraphs)


def extract_why_raindrop_intro_from_raw(raw: str) -> str:
    chunk = raw_section(raw, 'THE RAINDROP DIFFERENCE', 'Raindrop Redefines Spend Management')
    paragraphs: list[str] = []
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = html_fragment_to_markdown(match.group(1))
        if text and len(text) > 40 and not text.startswith('['):
            paragraphs.append(text)
    return '\n\n'.join(paragraphs[:2])


def extract_why_raindrop_comparison_from_raw(raw: str) -> list[dict[str, str]]:
    chunk = raw_section(raw, 'Raindrop Redefines Spend Management', 'AI-Forward Platform')
    legacy_idx = chunk.find('<h3>Legacy Vendors</h3>')
    if legacy_idx == -1:
        return []
    rain_part = chunk[:legacy_idx]
    legacy_part = chunk[legacy_idx:]
    left_items: list[tuple[str, str]] = []
    right_items: list[tuple[str, str]] = []
    pattern = (
        r'cz_acc_child"><div>(.*?)</div></span><div class="cz_acc_child_content[^"]*"[^>]*><p>(.*?)</p>'
    )
    for part, bucket in ((rain_part, left_items), (legacy_part, right_items)):
        for title, description in re.findall(pattern, part, re.S):
            bucket.append((clean_text(title), clean_text(description)))
    return [
        {'left': format_comparison_cell({'title': left[0], 'description': left[1]}),
         'right': format_comparison_cell({'title': right[0], 'description': right[1]})}
        for left, right in zip(left_items, right_items, strict=False)
    ]


def extract_why_raindrop_quotes_from_raw(raw: str) -> list[dict[str, str]]:
    chunk = raw_section(raw, 'Raindrop Redefines Spend Management', 'AI-Forward Platform')
    quotes: list[str] = []
    for match in re.finditer(r'<p[^>]*>([“"][^<]+[”"])</p>', chunk, re.S):
        quote = clean_text(re.sub(r'<[^>]+>', ' ', match.group(1))).strip('“"”')
        if quote and len(quote) > 60 and 'elementor' not in quote:
            quotes.append(quote)
    if len(quotes) < 3:
        return []
    idc_role = ''
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = clean_text(re.sub(r'<[^>]+>', ' ', match.group(1)))
        if 'IDC report' in text:
            idc_role = text
            break
    hackett_role = ''
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = clean_text(re.sub(r'<[^>]+>', ' ', match.group(1)))
        if 'Hackett Group' in text and 'Matrix Report' in text:
            hackett_role = text
            break
    nikhil_role = ''
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = clean_text(re.sub(r'<[^>]+>', ' ', match.group(1)))
        if 'Nikhil Gaur' in text:
            nikhil_role = text.replace('Spend Matters', 'Spend Matters —')
            break
    return [
        {
            'quote': quotes[0].strip(),
            'author': 'IDC',
            'role': idc_role
            or (
                'Raindrop featured in August 2023 IDC report Procurement Application Providers '
                'Are Differentiating Themselves Through Ease of Use and Time to Value.'
            ),
        },
        {
            'quote': quotes[1].strip(),
            'author': 'The Hackett Group',
            'role': hackett_role or 'CLM Digital World Class Matrix Report 2024.',
        },
        {
            'quote': quotes[2].strip(),
            'author': 'Nikhil Gaur',
            'role': nikhil_role or 'Spend Matters — Director, Strategic Projects & Research Analyst',
        },
    ]


def extract_why_raindrop_ai_body_from_raw(raw: str) -> str:
    chunk = raw_section(raw, 'AI-Forward Platform for Modern Work', 'Contact Us')
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = html_fragment_to_markdown(match.group(1))
        if text and len(text) > 80 and 'Rain' in text:
            return text
    return ''


def extract_why_raindrop_quotes(body: str) -> list[dict[str, str]]:
    quotes = re.findall(r'####\s+[“"]([^”"]+)[”"]', body)
    if len(quotes) < 3:
        return []
    return [
        {
            'quote': quotes[0].strip(),
            'author': 'IDC',
            'role': (
                'Raindrop featured in August 2023 IDC report Procurement Application Providers '
                'Are Differentiating Themselves Through Ease of Use and Time to Value.'
            ),
        },
        {
            'quote': quotes[1].strip(),
            'author': 'The Hackett Group',
            'role': 'CLM Digital World Class Matrix Report 2024.',
        },
        {
            'quote': quotes[2].strip(),
            'author': 'Nikhil Gaur',
            'role': 'Spend Matters — Director, Strategic Projects & Research Analyst',
        },
    ]


def extract_comparison_from_raw(raw: str) -> tuple[str, str, list[dict[str, str]]]:
    left_title = 'Traditional AI'
    right_title = 'Agentic AI in Raindrop'
    rows: list[dict[str, str]] = []
    for table_html in re.findall(r'<table[^>]*>(.*?)</table>', raw, re.S | re.I):
        if 'Traditional AI' not in table_html and 'Agentic AI' not in table_html:
            continue
        trs = re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, re.S | re.I)
        for index, tr in enumerate(trs):
            cells = [clean_text(re.sub(r'<[^>]+>', ' ', cell)) for cell in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, re.S | re.I)]
            cells = [cell for cell in cells if cell]
            if len(cells) < 2:
                continue
            if index == 0 and 'Traditional' in cells[0]:
                left_title, right_title = cells[0], cells[1]
                continue
            rows.append({'left': cells[0], 'right': cells[1]})
        if rows:
            break
    return left_title, right_title, rows


def sanitize_faq_items(items: list[dict[str, str]]) -> list[dict[str, str]]:
    clean: list[dict[str, str]] = []
    for item in items:
        question = item.get('question', '')
        answer = item.get('answer', '')
        if any(token in question for token in ('##', '###', 'Contact Us', 'Sitemap', 'http')):
            continue
        if len(question) > 180 or len(answer) < 20:
            continue
        clean.append({'question': question, 'answer': answer})
    return clean[:12]


def extract_faq_cz_acc(raw: str) -> list[dict[str, str]]:
    idx = raw.lower().find('frequently asked')
    chunk = raw[idx : idx + 50000] if idx != -1 else raw
    pairs: list[dict[str, str]] = []
    for question, answer in re.findall(
        r'class="cz_acc_child"[^>]*><div>(.*?)</div></span><div class="cz_acc_child_content[^"]*"[^>]*><p>(.*?)</p>',
        chunk,
        re.S | re.I,
    ):
        q = clean_text(question)
        a = clean_text(answer)
        if q and a and len(a) > 20:
            pairs.append({'question': q, 'answer': a})
    return pairs[:12]


def extract_testimonials(raw: str) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for quote in re.findall(r'<blockquote[^>]*>(.*?)</blockquote>', raw, re.S):
        text = clean_text(quote)
        if len(text) > 40:
            items.append({'quote': text, 'author': '', 'role': ''})
    if items:
        return items[:4]
    for match in re.findall(r'“([^”]{40,})”', raw):
        items.append({'quote': match.strip(), 'author': '', 'role': ''})
    return items[:4]


def yaml_quote(value: str) -> str:
    escaped = (
        value.replace('\\', '\\\\')
        .replace('"', '\\"')
        .replace('\r', '')
        .replace('\n', '\\n')
    )
    return f'"{escaped}"'


def yaml_dump(data: object, indent: int = 0) -> str:
    sp = '  ' * indent
    if isinstance(data, dict):
        lines: list[str] = []
        for key, value in data.items():
            if isinstance(value, (dict, list)):
                lines.append(f'{sp}{key}:')
                lines.append(yaml_dump(value, indent + 1))
            elif isinstance(value, bool):
                lines.append(f'{sp}{key}: {"true" if value else "false"}')
            elif value is None:
                continue
            else:
                lines.append(f'{sp}{key}: {yaml_quote(str(value))}')
        return '\n'.join(lines)
    if isinstance(data, list):
        lines = []
        for item in data:
            if isinstance(item, dict):
                lines.append(f'{sp}-')
                for key, value in item.items():
                    if isinstance(value, (dict, list)):
                        lines.append(f'{sp}  {key}:')
                        lines.append(yaml_dump(value, indent + 2))
                    elif isinstance(value, bool):
                        lines.append(f'{sp}  {key}: {"true" if value else "false"}')
                    elif value is None:
                        continue
                    else:
                        lines.append(f'{sp}  {key}: {yaml_quote(str(value))}')
            else:
                if item is None:
                    continue
                lines.append(f'{sp}- {yaml_quote(str(item))}')
        return '\n'.join(lines)
    return f'{sp}{yaml_quote(str(data))}'


def process_images(slug: str, raw: str) -> list[ImageRecord]:
    records: list[ImageRecord] = []
    asset_dir = slug_asset_dir(slug)
    for index, (url, alt) in enumerate(extract_image_urls(raw)):
        existing = existing_asset_for(url)
        role = infer_role(url, alt)
        image_id = re.sub(r'[^a-z0-9]+', '-', sanitize_filename(url).rsplit('.', 1)[0])[:40] or f'img-{index}'
        if any(r.id == image_id for r in records):
            image_id = f'{image_id}-{index}'

        if existing:
            records.append(
                ImageRecord(
                    id=image_id,
                    src=f'/src/assets/{existing}',
                    role=role,
                    alt=alt or role.replace('-', ' ').title(),
                    source_url=url,
                    reused=True,
                )
            )
            continue

        filename = sanitize_filename(url)
        dest = asset_dir / filename
        ok = download_image(url, dest)
        rel = f'imported/{slug.replace("/", "__")}/{filename}'
        records.append(
            ImageRecord(
                id=image_id,
                src=f'/src/assets/{rel}',
                role=role,
                alt=alt or role.replace('-', ' ').title(),
                source_url=url,
                download_failed=not ok,
            )
        )
    return records


def pick_image(records: list[ImageRecord], role: str, index: int = 0) -> str | None:
    matches = [r.id for r in records if r.role == role and not r.download_failed]
    if matches:
        return matches[min(index, len(matches) - 1)]
    ui_matches = [r.id for r in records if r.role == 'ui' and not r.download_failed]
    if ui_matches:
        return ui_matches[min(index, len(ui_matches) - 1)]
    return None


def extract_home_agentic_body(raw: str) -> str:
    start = raw.find('Agentic procurement for a transforming world')
    if start == -1:
        return ''
    chunk = raw[start : start + 5000]
    match = re.search(
        r'Agentic procurement for a transforming world</h2>.*?widget-text-editor.*?'
        r'<div class="elementor-widget-container">\s*(.*?)</div>\s*</div>\s*</div>',
        chunk,
        re.S,
    )
    return html_fragment_to_markdown(match.group(1)) if match else ''


def extract_home_business_functions(raw: str) -> list[dict[str, str]]:
    start = raw.find('TAILORED SOLUTIONS')
    end = raw.find('LATEST FROM', start)
    if start == -1:
        return []
    chunk = raw[start : end if end != -1 else start + 12000]
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'xtra-service-box-hove fx_zoom_0_hover"><a href="([^"]+)".*?'
        r'<h3[^>]*>(.*?)</h3>.*?cz_wpe_content">(.*?)</div>',
        chunk,
        re.S,
    ):
        title = clean_text(match.group(2))
        description = html_fragment_to_markdown(match.group(3))
        if title:
            items.append({'title': title, 'description': description})
    return items


def scrape_home_page_resources(raw: str, slug: str, records: list[ImageRecord]) -> list[dict[str, str]]:
    start = raw.find('LATEST FROM')
    end = raw.find('Contact Us', start) if start != -1 else -1
    chunk = raw[start:end] if start != -1 and end != -1 else raw
    items: list[dict[str, str]] = []
    seen: set[str] = set()

    for match in re.finditer(
        r'class="cz_grid_link" href="(https://raindrop.com/[^"]+)" title="([^"]*)"',
        chunk,
    ):
        href, title = match.group(1), clean_text(match.group(2))
        if not is_article_resource_href(href) or href in seen:
            continue
        seen.add(href)

        local_chunk = raw[match.start() : match.start() + 2500]
        img_match = re.search(r'src="(https://raindrop.com/wp-content/uploads/[^"]+)"', local_chunk)
        if img_match:
            image_url = img_match.group(1)
        else:
            srcset_match = re.search(
                r'srcset="([^"]*https://raindrop.com/wp-content/uploads/[^"\s,]+)',
                local_chunk,
            )
            image_url = srcset_match.group(1).split()[0].split(',')[0].strip() if srcset_match else ''

        item: dict[str, str] = {
            'title': title,
            'href': local_path_from_url(href),
            'excerpt': '',
        }
        image_id = ensure_resource_image(slug, records, image_url, title)
        if image_id:
            item['image'] = image_id
        items.append(item)
        if len(items) >= 10:
            break

    return items


def extract_home_review_logos(raw: str, slug: str, records: list[ImageRecord]) -> list[str]:
    start = raw.find("Don't Just Take")
    if start == -1:
        start = raw.find('Don&#8217;t Just Take')
    if start == -1:
        return []
    end = raw.find('TAILORED SOLUTIONS', start)
    chunk = raw[start : end if end != -1 else start + 12000]
    image_ids: list[str] = []
    for url in re.findall(r'src="(https://raindrop.com/wp-content/uploads/[^"]+)"', chunk):
        if 'raindrop_period' in url:
            continue
        image_id = ensure_resource_image(slug, records, url, 'Review badge')
        if image_id and image_id not in image_ids:
            image_ids.append(image_id)
    return image_ids


def layout_for_home(
    sections: list[Section], meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    slug = 'home'
    values_items = []
    value_titles = [
        'Built for How You Want to Work',
        'An Authentic Solution Guided by Innovators',
        'Creating Value By Commitments, Not Just Costs',
    ]
    value_image_ids = [
        next((r.id for r in records if 'guidingvalues-1built' in r.id or 'value-built' in r.src), None),
        next((r.id for r in records if 'guidingvalues-2authentic' in r.id or 'value-authentic' in r.src), None),
        next((r.id for r in records if 'guidingvalues-3commitments' in r.id or 'value-commitments' in r.src), None),
    ]
    for i, title in enumerate(value_titles):
        item = {'title': title, 'description': ''}
        if value_image_ids[i]:
            item['image'] = value_image_ids[i]
        values_items.append(item)

    logos = [r.id for r in records if r.role == 'logo' and not r.reused][:12]
    review_logos = extract_home_review_logos(raw, slug, records)
    business_functions = extract_home_business_functions(raw)
    if not business_functions:
        business_functions = [
            {'title': 'Procurement', 'description': ''},
            {'title': 'Finance', 'description': ''},
            {'title': 'Legal', 'description': ''},
            {'title': 'Technology', 'description': ''},
        ]
    latest_resources = scrape_home_page_resources(raw, slug, records)
    agentic_body = extract_home_agentic_body(raw)

    layout: list[dict] = [
        {
            'type': 'hero',
            'variant': 'centered-stack',
            'eyebrow': 'MAKE IT RAINDROP',
            'headline': meta.get('h1') or 'Redefine Procurement with Agentic S2P',
            'subheadline': meta.get('description', ''),
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
            'secondaryCta': {'label': 'View Our Solutions', 'href': '/solutions'},
            'image': pick_image(records, 'hero') or pick_image(records, 'ui', 0),
        },
        {
            'type': 'featureSplit',
            'headline': 'Agentic procurement for a transforming world',
            'body': agentic_body,
            'media': 'right',
            'image': next((r.id for r in records if 'rain-base' in r.id), pick_image(records, 'ui', 1)),
        },
        {
            'type': 'featureGrid',
            'columns': 3,
            'headline': 'Our Guiding Values',
            'items': values_items,
        },
    ]

    if logos:
        layout.append({'type': 'logoCloud', 'headline': 'Trusted by industry leaders', 'images': logos})

    if review_logos:
        layout.append(
            {
                'type': 'logoCloud',
                'variant': 'cards',
                'headline': "Don't Just Take Our Word for It",
                'images': review_logos,
            }
        )

    layout.append(
        {
            'type': 'featureGrid',
            'columns': 4,
            'headline': 'Tailored solutions for every business function',
            'items': business_functions,
        }
    )

    if latest_resources:
        layout.append(
            {
                'type': 'resourceList',
                'headline': 'Latest from Raindrop',
                'items': latest_resources,
                'cta': {'label': 'See all resources', 'href': '/resources'},
            }
        )

    layout.append(
        {
            'type': 'cta',
            'headline': 'Ready to Move Beyond Tracking Savings?',
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )
    return layout


def extract_people_from_raw(raw: str, records: list[ImageRecord], default_role: str = '') -> list[dict]:
    members: list[dict] = []
    for match in re.finditer(
        r'<div class="cz_team_content cz_wpe_content">(.*?)</div>\s*</a>',
        raw,
        re.S | re.I,
    ):
        chunk = match.group(1)
        name_match = re.search(r'<h2[^>]*>(.*?)</h2>', chunk, re.S | re.I)
        role_match = re.search(r'<span[^>]*>(.*?)</span>', chunk, re.S | re.I)
        bio_match = re.search(r'<p[^>]*>\s*(?!.*<span)(.*?)</p>', chunk, re.S | re.I)
        if not name_match:
            continue
        name = clean_text(name_match.group(1))
        role = clean_text(role_match.group(1)) if role_match else default_role
        bio = clean_text(bio_match.group(1)) if bio_match else ''
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        image_id = next((record.id for record in records if slug in record.id and record.role == 'portrait'), None)
        if not image_id:
            image_id = next((record.id for record in records if slug in record.id), None)
        member: dict = {'name': name, 'role': role or default_role, 'bio': bio}
        if image_id:
            member['image'] = image_id
        members.append(member)
    return members


def extract_people_from_raw(raw: str, records: list[ImageRecord], default_role: str = '') -> list[dict]:
    members: list[dict] = []
    for match in re.finditer(
        r'<div class="cz_team_content cz_wpe_content">(.*?)</div>\s*</a>',
        raw,
        re.S | re.I,
    ):
        chunk = match.group(1)
        name_match = re.search(r'<h2[^>]*>(.*?)</h2>', chunk, re.S | re.I)
        role_match = re.search(r'<span[^>]*>(.*?)</span>', chunk, re.S | re.I)
        bio_match = re.search(r'<p[^>]*>\s*(?!.*<span)(.*?)</p>', chunk, re.S | re.I)
        if not name_match:
            continue
        name = clean_text(name_match.group(1))
        role = clean_text(role_match.group(1)) if role_match else default_role
        bio = clean_text(bio_match.group(1)) if bio_match else ''
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        image_id = next((record.id for record in records if slug in record.id and record.role == 'portrait'), None)
        if not image_id:
            image_id = next((record.id for record in records if slug in record.id), None)
        member: dict = {'name': name, 'role': role or default_role, 'bio': bio}
        if image_id:
            member['image'] = image_id
        members.append(member)
    return members


def extract_people_from_body(
    body: str, records: list[ImageRecord], default_role: str = ''
) -> list[dict]:
    members: list[dict] = []
    chunks = re.split(r'^## (.+)$', body, flags=re.M)
    for index in range(1, len(chunks), 2):
        name = clean_text(chunks[index])
        if not name or name.lower() in {'contact us', 'sitemap'}:
            continue
        content = chunks[index + 1] if index + 1 < len(chunks) else ''
        content = re.split(r'^###\s+(?:Contact Us|Sitemap)\s*$', content, flags=re.M)[0]
        fields = [clean_text(line) for line in re.findall(r'^#### (.+)$', content, flags=re.M)]
        fields = [
            field
            for field in fields
            if field.lower() not in {'address:', 'phone:', 'email:', 'united states'}
            and not re.match(r'^\d{3}[- ]', field)
            and '@' not in field
            and 'copyright' not in field.lower()
        ]
        role = ''
        bio = ''
        if len(fields) >= 2:
            role, bio = fields[0], fields[1]
        elif len(fields) == 1:
            if fields[0].lower() in ROLE_TITLES or len(fields[0]) < 48:
                role = fields[0]
            elif default_role:
                role, bio = default_role, fields[0]
            else:
                role = fields[0]
        elif default_role:
            role = default_role
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        image_id = next((record.id for record in records if slug in record.id and record.role == 'portrait'), None)
        if not image_id:
            image_id = next((record.id for record in records if slug in record.id), None)
        member: dict = {'name': name, 'role': role, 'bio': bio}
        if image_id:
            member['image'] = image_id
        members.append(member)
    return members


def layout_for_company_team(
    meta: dict[str, str],
    records: list[ImageRecord],
    raw: str,
    body: str,
    default_role: str = '',
) -> list[dict]:
    members = extract_people_from_raw(raw, records, default_role=default_role)
    if not members:
        members = extract_people_from_body(body, records, default_role=default_role)
    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': meta.get('h1') or meta.get('title', ''),
            'body': meta.get('description', ''),
            'media': 'right',
        }
    ]
    if members:
        layout.append({'type': 'leadershipGrid', 'headline': '', 'members': members})
    return layout


def layout_for_raindrop_team(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    return layout_for_company_team(meta, records, raw, body)


def layout_for_people_grid(
    meta: dict[str, str],
    records: list[ImageRecord],
    body: str,
    default_role: str = '',
    secondary_cta: dict[str, str] | None = None,
    raw: str = '',
) -> list[dict]:
    members = extract_people_from_raw(raw, records, default_role=default_role) if raw else []
    if not members:
        members = extract_people_from_body(body, records, default_role=default_role)
    layout: list[dict] = [
        {
            'type': 'hero',
            'variant': 'centered-stack',
            'headline': meta.get('h1') or meta.get('title', ''),
            'subheadline': meta.get('description', ''),
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        },
        {
            'type': 'leadershipGrid',
            'headline': '',
            'members': members,
        },
    ]
    if secondary_cta:
        layout[0]['secondaryCta'] = secondary_cta
    return layout


def extract_agentic_intro(body: str) -> tuple[str, str]:
    marker = "### What makes Raindrop's Agentic AI Different"
    start = body.find(marker)
    if start == -1:
        return ("What makes Raindrop's Agentic AI Different (and better) than a bolt on solution", '')
    headline = clean_text(body[start + 4 : body.find('\n', start)].strip())
    para = re.search(r'#### (.+?)(?=\n\n### |\n\n## |\Z)', body[start:], re.S)
    description = clean_text(para.group(1)) if para else ''
    return headline, description


def extract_agentic_use_cases_from_raw(raw: str) -> list[dict[str, str]]:
    start = raw.find('Agentic Use cases by role')
    end = raw.find('From Answers to Action', start)
    if start == -1:
        return []
    chunk = raw[start : end if end != -1 else start + 15000]
    items: list[dict[str, str]] = []
    for match in re.finditer(r'<h3[^>]*>(.*?)</h3>.*?<p[^>]*>(.*?)</p>', chunk, re.S):
        title = clean_text(match.group(1))
        description = clean_text(re.sub(r'<[^>]+>', ' ', match.group(2)))
        if title and description:
            items.append({'title': title, 'description': description})
    return items


def layout_for_agentic_procurement(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    intro_headline, intro_description = extract_agentic_intro(body)

    embedded = extract_h3_h4_pairs(body, '### Embedded not added', '### Built on one')
    embedded_headline = embedded[0]['title'] if embedded else 'Embedded not added'
    embedded_body = embedded[0]['description'] if embedded else ''

    differentiators = extract_h3_h4_pairs(body, '### Built on one Source-to-Pay Codebase', '### What Agentic AI means')
    means = extract_h3_h4_pairs(body, '### What Agentic AI means for Procurement', '## Agentic Use cases')
    use_cases = extract_h3_h4_pairs(body, '## Agentic Use cases by role', '## From Answers to Action')
    if not use_cases:
        use_cases = extract_agentic_use_cases_from_raw(raw)
    rain_examples: list[dict[str, str]] = []
    rain_start = body.find('## Rain Helps Teams Ask, Act, and Orchestrate')
    if rain_start != -1:
        rain_chunk = body[rain_start : body.find('### Built for Action', rain_start)]
        for match in re.finditer(r'^#### (.+?)(?=\n\n#### |\n\n### |\n\n## |\Z)', rain_chunk, re.S | re.M):
            line = clean_text(match.group(1))
            split = re.match(r'^(.+?)\s*-\s*"?([^"]+)"?\s*$', line)
            if split:
                rain_examples.append({'title': split.group(1).strip(), 'description': split.group(2).strip()})
            elif line:
                rain_examples.append({'title': line, 'description': ''})

    governance_intro = extract_h3_h4_pairs(body, '### Built for Action. Governed for Trust.', '## Human-in-the-loop')
    governance_items = extract_h2_h4_pairs(body, '## Human-in-the-loop where it matters', '### Frequently Asked Questions')

    left_title, right_title, comparison_rows = extract_comparison_from_raw(raw)
    faq_items = extract_faq_cz_acc(raw) or extract_faq_pairs(raw)

    all_image = pick_image(records, 'ui', 0) or 'all-1536x808'
    ebook_image = next((r.id for r in records if 'ebook' in r.id or 'agentic-ebook' in r.src), pick_image(records, 'ui', 1))

    layout: list[dict] = []
    if intro_description:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': intro_headline,
                'body': intro_description,
                'media': 'right',
            }
        )
    layout.append(
        {
            'type': 'featureSplit',
            'headline': embedded_headline,
            'body': embedded_body,
            'media': 'right',
            'image': all_image,
        }
    )
    if differentiators:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 3,
                'headline': '',
                'items': differentiators,
            }
        )
    if means:
        means_block: dict = {
            'type': 'featureSplit',
            'headline': means[0]['title'],
            'body': means[0]['description'],
            'media': 'left',
            'image': ebook_image,
            'cta': {
                'label': 'Read our series breaking down Agentic AI',
                'href': '/understanding-agentic-ai-and-its-role-in-procurement',
            },
        }
        layout.append(means_block)
    if use_cases:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'Agentic Use cases by role',
                'items': use_cases,
            }
        )
    if comparison_rows:
        layout.append(
            {
                'type': 'comparisonTable',
                'headline': 'From Answers to Action',
                'leftTitle': left_title,
                'rightTitle': right_title,
                'rows': comparison_rows,
            }
        )
    if rain_examples:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'Rain Helps Teams Ask, Act, and Orchestrate',
                'items': rain_examples,
            }
        )
    if governance_intro:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': governance_intro[0]['title'],
                'body': governance_intro[0]['description'],
                'media': 'right',
            }
        )
    if governance_items:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'Built for Action. Governed for Trust.',
                'items': governance_items,
            }
        )
    if faq_items:
        layout.append({'type': 'faq', 'headline': 'Frequently Asked Questions', 'items': faq_items})
    layout.append(
        {
            'type': 'cta',
            'headline': 'READY TO SEE THE DIFFERENCE ARCHITECTURE MAKES?',
            'description': (
                'If you’re evaluating AI procurement platforms, the architecture question matters more than the feature list. '
                'Schedule a demo to see how Raindrop Systems AI operates across your specific procurement workflows — '
                'intake, sourcing, contracts, suppliers, spend, or AP.'
            ),
            'primaryCta': {'label': 'Book a Demo', 'href': '/contact/get-started'},
            'secondaryCta': {'label': 'Explore the full platform', 'href': '/solutions/platform'},
        }
    )
    return layout


def layout_for_why_raindrop(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    intro = extract_why_raindrop_intro_from_raw(raw) or extract_why_raindrop_intro(body) or meta.get('description', '')
    comparison_rows = extract_why_raindrop_comparison_from_raw(raw)
    if not comparison_rows:
        raindrop_items = extract_h4_bullet_items(body, '### Raindrop\n', '### Legacy Vendors')
        legacy_items = extract_h4_bullet_items(body, '### Legacy Vendors', '### AI-Forward')
        comparison_rows = [
            {'left': format_comparison_cell(rain), 'right': format_comparison_cell(legacy)}
            for rain, legacy in zip(raindrop_items, legacy_items, strict=False)
        ]
    ai_body = extract_why_raindrop_ai_body_from_raw(raw)
    if not ai_body:
        ai_section = extract_h4_bullet_items(body, '### AI-Forward Platform for Modern Work', '### Contact Us')
        if ai_section:
            ai_body = ai_section[0].get('description') or ai_section[0].get('title', '')
    if not ai_body:
        ai_body = (
            'Raindrop brings AI to the forefront of procurement with Rain, your intelligent AI agent. '
            'From automating tedious tasks to delivering instant answers and actionable insights, Rain '
            'transforms how modern teams manage sourcing, contracts, and payments. Built on the trusted '
            'Google Cloud for speed, security, and scalability, Raindrop is as easy to use as it is '
            'powerful to deploy.'
        )
    testimonials = extract_why_raindrop_quotes_from_raw(raw) or extract_why_raindrop_quotes(body)
    hero_image = pick_image(records, 'hero') or 'whyraindrop-hero'
    ai_image = next((r.id for r in records if 'ai-forward' in r.id), pick_image(records, 'ui', 0))
    analyst_logos = [
        r.id
        for r in records
        if r.id in {'idc-logo-beaconblue', 'thg-300x37', 'spendmatters-logo-300x46'}
        and not r.download_failed
    ]

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'THE RAINDROP DIFFERENCE',
            'body': intro,
            'media': 'right',
            'image': hero_image,
            'cta': {'label': 'Read More on Our Expertise', 'href': '/why-raindrop/our-expertise'},
        },
    ]
    if comparison_rows:
        layout.append(
            {
                'type': 'comparisonTable',
                'headline': 'Raindrop Redefines Spend Management',
                'leftTitle': 'Raindrop',
                'rightTitle': 'Legacy Vendors',
                'rows': comparison_rows,
            }
        )
    if analyst_logos:
        layout.append(
            {
                'type': 'logoCloud',
                'headline': 'Recognized by industry analysts',
                'images': analyst_logos,
            }
        )
    if testimonials:
        layout.append(
            {
                'type': 'testimonials',
                'headline': 'What analysts say',
                'items': testimonials,
            }
        )
    layout.append(
        {
            'type': 'featureSplit',
            'headline': 'AI-Forward Platform for Modern Work',
            'body': ai_body,
            'media': 'left',
            'image': ai_image,
            'cta': {'label': "Discover Raindrop's AI Power", 'href': '/why-raindrop/ai-powered'},
        }
    )
    layout.append(
        {
            'type': 'cta',
            'headline': 'Request a Demo',
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )
    return layout


RAIN_AGENT_PREFIXES = (
    'Ask Rain anything',
    'Rain handles the routine',
    'Data-driven insights',
)


def extract_section_h4_text(body: str, start_marker: str, end_marker: str | None = None) -> list[str]:
    start = body.find(start_marker)
    if start == -1:
        return []
    chunk = body[start:]
    if end_marker:
        end = chunk.find(end_marker, len(start_marker))
        if end != -1:
            chunk = chunk[:end]
    paragraphs: list[str] = []
    for match in re.finditer(r'^#### (.+?)(?=\n\n#### |\n\n### |\Z)', chunk, re.S | re.M):
        text = clean_text(match.group(1))
        if text:
            paragraphs.append(text)
    return paragraphs


SOLUTIONS_MODULE_SLUGS = (
    'supplier-management',
    'sourcing',
    'contract-lifecycle-management',
    'eprocurement',
    'e-invoicing',
    'ap-automation',
    'rainpay',
    'analytics',
    'rainsign',
)

SOLUTIONS_BBF_SLUGS = (
    'executives',
    'finance-teams',
    'procurement-teams',
    'it-and-compliance-teams',
    'legal-teams',
)

SOLUTIONS_PLATFORM_SHORTCUTS = {
    'key-components': '/solutions/platform/key-components',
    'intake-orchestration': '/solutions/platform/intake-orchestration',
    'raindrop-integrates-anywhere': '/solutions/raindrop-integrates-anywhere',
}


def remap_href(href: str) -> str:
    href = href.strip()
    if not href or href.startswith('#'):
        return href
    if href.startswith('tel:') or href.startswith('mailto:'):
        return href

    parsed = urllib.parse.urlparse(href)
    if parsed.scheme in {'http', 'https'}:
        if parsed.netloc and 'raindrop.com' not in parsed.netloc:
            return href
        path = parsed.path.rstrip('/') or '/'
    else:
        path = href.split('?')[0].split('#')[0].rstrip('/') or '/'

    if path in SOLUTIONS_PLATFORM_SHORTCUTS.values():
        return path

    shortcut = path.removeprefix('/solutions/')
    if shortcut in SOLUTIONS_PLATFORM_SHORTCUTS:
        return SOLUTIONS_PLATFORM_SHORTCUTS[shortcut]

    if shortcut in SOLUTIONS_MODULE_SLUGS:
        return f'/solutions/modules/{shortcut}'

    if shortcut in SOLUTIONS_BBF_SLUGS:
        return f'/solutions/by-business-function/{shortcut}'

    return path


def local_path_from_url(href: str) -> str:
    return remap_href(href)


def ensure_resource_image(slug: str, records: list[ImageRecord], url: str, alt: str) -> str | None:
    if not url:
        return None
    existing = next((record.id for record in records if record.source_url.split('?')[0] == url.split('?')[0]), None)
    if existing:
        return existing

    filename = sanitize_filename(url)
    image_id = re.sub(r'[^a-z0-9]+', '-', filename.rsplit('.', 1)[0])[:40] or 'resource'
    if any(record.id == image_id for record in records):
        image_id = f'{image_id}-{len(records)}'

    asset_dir = slug_asset_dir(slug)
    dest = asset_dir / filename
    ok = download_image(url, dest)
    rel = f'imported/{slug.replace("/", "__")}/{filename}'
    records.append(
        ImageRecord(
            id=image_id,
            src=f'/src/assets/{rel}',
            role='ui',
            alt=alt or 'Resource thumbnail',
            source_url=url,
            download_failed=not ok,
        )
    )
    return image_id


def is_article_resource_href(href: str) -> bool:
    path = urllib.parse.urlparse(href).path.strip('/')
    if not path or '/' in path:
        return False
    if any(
        token in href
        for token in (
            '/tag/',
            '/page/',
            '/wp-json',
            '/category/',
            '/contact',
            '/company',
            '/solutions',
            '/why-raindrop/',
            '/login',
            'tel:',
            'mailto:',
        )
    ):
        return False
    if path == 'resources' or path.startswith('resources/'):
        return False
    return True


def scrape_grid_resources(
    slug: str,
    records: list[ImageRecord],
    base_path: str,
    *,
    max_pages: int = 15,
) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    normalized = base_path if base_path.endswith('/') else f'{base_path}/'

    for page in range(1, max_pages + 1):
        path = normalized if page == 1 else f'{normalized}page/{page}/'
        try:
            _, raw = fetch(path)
        except Exception:
            continue

        page_items: list[dict[str, str]] = []
        for match in re.finditer(
            r'class="cz_grid_link" href="(https://raindrop.com/[^"]+)" title="([^"]*)"',
            raw,
        ):
            href, title = match.group(1), clean_text(match.group(2))
            if not is_article_resource_href(href) or href in seen:
                continue
            seen.add(href)

            chunk = raw[match.start() : match.start() + 2500]
            img_match = re.search(r'src="(https://raindrop.com/wp-content/uploads/[^"]+)"', chunk)
            if img_match:
                image_url = img_match.group(1)
            else:
                srcset_match = re.search(
                    r'srcset="([^"]*https://raindrop.com/wp-content/uploads/[^"\s,]+)',
                    chunk,
                )
                image_url = srcset_match.group(1).split()[0].split(',')[0].strip() if srcset_match else ''
            post_match = re.search(r'post-(\d+)', raw[max(0, match.start() - 200) : match.start()])
            excerpt = ''
            if post_match:
                excerpt_match = re.search(
                    rf'post-{post_match.group(1)}.*?cz_grid_excerpt[^>]*>(.*?)</div>',
                    raw[match.start() : match.start() + 3000],
                    re.S | re.I,
                )
                if excerpt_match:
                    excerpt = clean_text(re.sub(r'<[^>]+>', ' ', excerpt_match.group(1)))

            item: dict[str, str] = {
                'title': title,
                'href': local_path_from_url(href),
                'excerpt': excerpt,
            }
            image_id = ensure_resource_image(slug, records, image_url, title)
            if image_id:
                item['image'] = image_id
            page_items.append(item)

        items.extend(page_items)
        if page > 1 and not page_items:
            break

    return items


def scrape_ai_powered_resources(slug: str, records: list[ImageRecord]) -> list[dict[str, str]]:
    return scrape_grid_resources(slug, records, '/why-raindrop/ai-powered/', max_pages=14)


def layout_for_resources(meta: dict[str, str], records: list[ImageRecord]) -> list[dict]:
    items = scrape_grid_resources('resources', records, '/resources/', max_pages=20)
    if not items:
        return [
            {
                'type': 'featureSplit',
                'headline': 'Resources',
                'body': meta.get('description', ''),
                'media': 'right',
            }
        ]
    return [{'type': 'resourceList', 'headline': 'Resources', 'items': items}]


def anchor_label(inner_html: str) -> str:
    text = re.sub(r'<[^>]+>', ' ', inner_html)
    text = html.unescape(text)
    return re.sub(r'\s+', ' ', text).strip()


def html_fragment_to_markdown(html_fragment: str) -> str:
    def replace_anchor(match: re.Match[str]) -> str:
        href = match.group(1)
        label = anchor_label(match.group(2))
        if not label or SKIP_URL_RE.search(href):
            return label
        return f'[{label}]({remap_href(href)})'

    text = html_fragment
    text = re.sub(
        r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
        replace_anchor,
        text,
        flags=re.S | re.I,
    )
    text = re.sub(r'<li[^>]*>', '\n• ', text)
    text = re.sub(r'</li>', '', text)
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.I)
    text = re.sub(r'</p>\s*<p[^>]*>', '\n\n', text, flags=re.I)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.splitlines()]
    text = '\n'.join(line for line in lines if line)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def raw_section(raw: str, start: str, end: str | None = None) -> str:
    section_start = raw.find(start)
    if section_start == -1:
        return ''
    section_end = raw.find(end, section_start + len(start)) if end else len(raw)
    if section_end == -1:
        section_end = len(raw)
    return raw[section_start:section_end]


def extract_staatliches_72_stats(raw: str, start: str, end: str) -> list[dict[str, str]]:
    chunk = raw_section(raw, start, end)
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'font-family:Staatliches;font-size:72px[^>]*>(.*?)</div>.*?'
        r'letter-spacing:3px[^>]*>(.*?)</div>.*?'
        r'font-size:18px[^>]*>(.*?)</div>.*?'
        r'letter-spacing:2px[^>]*>(.*?)</div>',
        chunk,
        re.S,
    ):
        value = anchor_label(match.group(1))
        stat_type = anchor_label(match.group(2))
        detail = anchor_label(match.group(3))
        footnote = anchor_label(match.group(4))
        items.append({'value': value, 'label': f'{stat_type}\n{detail}\n{footnote}'})
    return items


def extract_e_invoicing_stat_cards(raw: str) -> list[dict[str, str]]:
    return extract_staatliches_72_stats(
        raw,
        'The Cost of Getting E-Invoicing Wrong</h2>',
        'THE ARCHITECTURAL CHOICE',
    )


def extract_e_invoicing_border_cards(
    raw: str, start: str, end: str, *, with_subtitle: bool = True
) -> list[dict[str, str]]:
    chunk = raw_section(raw, start, end)
    items: list[dict[str, str]] = []
    if with_subtitle:
        pattern = (
            r'border-top:3px solid #02DCCE.*?<h3[^>]*>(.*?)</h3>'
            r'<p style="font-size:16px[^"]*"[^>]*>(.*?)</p>'
            r'<p style="font-size:13px[^"]*"[^>]*>(.*?)</p>'
        )
        for match in re.finditer(pattern, chunk, re.S):
            title = clean_text(match.group(1))
            description = html_fragment_to_markdown(match.group(2))
            subtitle = clean_text(match.group(3))
            if title and description:
                items.append({'title': title, 'description': f'{description}\n\n{subtitle}'})
    else:
        pattern = (
            r'border-top:3px solid #02DCCE.*?<h3[^>]*>(?:<strong>|<b>)?(.*?)(?:</strong>|</b>)?</h3>'
            r'<p style="font-size:15px[^"]*"[^>]*>(.*?)</p>'
        )
        for match in re.finditer(pattern, chunk, re.S):
            title = clean_text(match.group(1))
            description = html_fragment_to_markdown(match.group(2))
            if title and description:
                items.append({'title': title, 'description': description})
    return items


def extract_integration_stat_cards(raw: str) -> list[dict[str, str]]:
    chunk = raw_section(
        raw,
        'What Changes When Raindrop Is Your Integration Layer',
        'RainConnect: Universal Connectivity',
    )
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'font-size:64px[^>]*>(.*?)</p>.*?letter-spacing:2px[^>]*>(.*?)</p>.*?'
        r'font-size:17px[^>]*>(.*?)</p>.*?text-transform:uppercase[^>]*>(.*?)</p>',
        chunk,
        re.S,
    ):
        value = anchor_label(match.group(1))
        stat_type = anchor_label(match.group(2))
        detail = anchor_label(match.group(3))
        category = anchor_label(match.group(4))
        items.append({'value': value, 'label': f'{stat_type}\n{detail}\n{category}'})
    return items


def extract_timeline_stat_cards(raw: str) -> list[dict[str, str]]:
    chunk = raw_section(raw, 'Implementation Timing', 'From Integration to Orchestration')
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'font-size:44px[^>]*>(.*?)</div>\s*<p[^>]*>(.*?)</p>',
        chunk,
        re.S,
    ):
        items.append(
            {
                'value': anchor_label(match.group(1)),
                'label': html_fragment_to_markdown(match.group(2)),
            }
        )
    return items


def extract_widget_cards(raw: str, start: str, end: str) -> list[dict[str, str]]:
    chunk = raw_section(raw, start, end)
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'elementor-widget-text-editor.*?widget-container">\s*(.*?)\s*</div>\s*</div>\s*</div>',
        chunk,
        re.S,
    ):
        inner = match.group(1)
        heading = re.search(r'<h3[^>]*>(.*?)</h3>', inner, re.S | re.I)
        if not heading:
            continue
        title = anchor_label(heading.group(1))
        body_html = inner[heading.end() :]
        description = html_fragment_to_markdown(body_html)
        if title and description:
            items.append({'title': title, 'description': description})
    return items


def extract_h3_cards(raw: str, start: str, end: str) -> list[dict[str, str]]:
    return extract_widget_cards(raw, start, end)


def extract_h3_ul_cards(raw: str, start: str, end: str) -> list[dict[str, str]]:
    return extract_widget_cards(raw, start, end)


def extract_text_editor_parts(raw: str, start: str, end: str) -> list[str]:
    chunk = raw_section(raw, start, end)
    parts: list[str] = []
    for match in re.finditer(
        r'elementor-widget-text-editor.*?widget-container">\s*(.*?)\s*</div>\s*</div>\s*</div>',
        chunk,
        re.S,
    ):
        text = html_fragment_to_markdown(match.group(1))
        if text:
            parts.append(text)
    return parts


def extract_integrations_idc_testimonial(raw: str) -> dict[str, str] | None:
    chunk = raw_section(raw, 'ANALYST RECOGNITION · IDC 2025', 'RainConnect: Universal Connectivity')
    quote_match = re.search(r'&ldquo;(.*?)&rdquo;', chunk, re.S)
    if not quote_match:
        return None
    quote = html.unescape(re.sub(r'\s+', ' ', quote_match.group(1)).strip())
    author = 'Patrick Reymann'
    role = 'Research Director, Procurement and Enterprise Applications, IDC'
    link_match = re.search(r'href="([^"]+)"[^>]*>See the full IDC recognition', chunk, re.I)
    item: dict[str, str] = {'quote': quote, 'author': author, 'role': role}
    if link_match:
        item['link'] = remap_href(link_match.group(1))
    return item


def layout_for_integrates_anywhere(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    integration_image = next(
        (record.id for record in records if 'platform-integrations' in record.id),
        pick_image(records, 'ui', 0),
    )
    period_icon = next(
        (record.id for record in records if 'raindrop-period' in record.id or 'period-teal' in record.id),
        None,
    )

    intro_chunk = raw_section(raw, 'Raindrop Integrates Anywhere', 'The result for CFOs')
    intro_paras = [
        html_fragment_to_markdown(match.group(1))
        for match in re.finditer(r'<p[^>]*>(.*?)</p>', intro_chunk, re.S)
    ]
    intro_paras = [paragraph for paragraph in intro_paras if paragraph]
    sync_storm = 'SYNC THE STORM' if 'SYNC THE STORM' in raw else ''
    intro_body = '\n\n'.join(
        part for part in [sync_storm, *intro_paras] if part
    )

    bridge_match = re.search(
        r'The result for CFOs, CPOs, and IT leaders:.*?(?:project|ERP project)\.',
        raw,
        re.S | re.I,
    )
    bridge_text = html_fragment_to_markdown(bridge_match.group(0)) if bridge_match else ''

    stats_intro_match = re.search(
        r'The numbers below come from production deployments.*?</p>',
        raw_section(raw, 'What Changes When Raindrop', 'RainConnect: Universal'),
        re.S | re.I,
    )
    stats_intro = html_fragment_to_markdown(stats_intro_match.group(0)) if stats_intro_match else ''

    rainconnect_intro_match = re.search(
        r'RainConnect is the Raindrop integration and connectivity layer\..*?day one\.',
        raw,
        re.S | re.I,
    )
    rainconnect_intro = (
        html_fragment_to_markdown(f'<p>{rainconnect_intro_match.group(0)}</p>')
        if rainconnect_intro_match
        else ''
    )

    not_listed_intro_match = re.search(
        r'If a system your team runs is not listed.*?</span></p>',
        raw,
        re.S | re.I,
    )
    not_listed_intro = (
        html_fragment_to_markdown(not_listed_intro_match.group(0)) if not_listed_intro_match else ''
    )

    timing_intro_match = re.search(
        r'Legacy source-to-pay rollouts routinely run.*?</p>',
        raw_section(raw, 'Implementation Timing', 'From Integration to Orchestration'),
        re.S | re.I,
    )
    timing_intro = (
        html_fragment_to_markdown(timing_intro_match.group(0)) if timing_intro_match else ''
    )

    orchestration_parts = extract_text_editor_parts(
        raw, 'From Integration to Orchestration', 'VALUE BY ROLE'
    )
    orchestration_body = '\n\n'.join(orchestration_parts)

    modules_match = re.search(
        r'RainConnect is the layer underneath every Raindrop module\..*?(?=Ready to Transform|FAQ|</p>)',
        raw,
        re.S | re.I,
    )
    modules_body = html_fragment_to_markdown(modules_match.group(0)) if modules_match else ''

    integration_stats = extract_integration_stat_cards(raw)
    timeline_stats = extract_timeline_stat_cards(raw)
    rainconnect_cards = extract_h3_cards(
        raw, 'RainConnect: Universal Connectivity', 'SIX CAPABILITIES'
    )
    capability_cards = extract_h3_cards(raw, 'SIX CAPABILITIES', 'AND WE MEAN ANYWHERE')
    integration_categories = extract_h3_cards(raw, 'NoT LISTED? Raindrop', 'Built for Your ERP')
    erp_cards = extract_h3_cards(raw, 'Built for Your ERP', 'Implementation Timing')
    value_by_role = extract_h3_ul_cards(raw, 'VALUE BY ROLE', 'Customer Proof')
    customer_proof = extract_h3_cards(raw, 'Customer Proof', 'Analyst Recognition')
    analyst_cards = extract_h3_cards(raw, 'Analyst Recognition', 'See the Integration Layer')
    idc_testimonial = extract_integrations_idc_testimonial(raw)
    faq_items = sanitize_faq_items(extract_faq_cz_acc(raw) or extract_faq_pairs(raw))

    if period_icon:
        for card in capability_cards:
            card['image'] = period_icon

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'Raindrop Integrates Anywhere',
            'body': intro_body,
            'media': 'right',
            'image': integration_image,
            'cta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        },
    ]

    if bridge_text:
        layout.append({'type': 'featureSplit', 'headline': '', 'body': bridge_text, 'media': 'right'})

    if integration_stats:
        layout.append(
            {
                'type': 'stats',
                'variant': 'cards',
                'headline': 'What Changes When Raindrop Is Your Integration Layer',
                'description': stats_intro,
                'items': integration_stats,
            }
        )

    if idc_testimonial:
        testimonial: dict = {
            'type': 'testimonials',
            'headline': 'Analyst Recognition · IDC 2025',
            'items': [
                {
                    'quote': idc_testimonial['quote'],
                    'author': idc_testimonial['author'],
                    'role': idc_testimonial.get('role', ''),
                }
            ],
        }
        layout.append(testimonial)

    if rainconnect_intro:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'RainConnect',
                'body': rainconnect_intro,
                'media': 'left',
            }
        )

    if rainconnect_cards:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 3,
                'headline': 'RainConnect: Universal Connectivity Without the Consulting Army',
                'items': rainconnect_cards,
            }
        )

    if capability_cards:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 3,
                'headline': 'SIX CAPABILITIES, ONE ARCHITECTURE',
                'items': capability_cards,
            }
        )

    if integration_categories:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'AND WE MEAN ANYWHERE',
                'description': (
                    'NoT LISTED? Raindrop can STILL INTEGRATE WITH IT.\n\n' + not_listed_intro
                    if not_listed_intro
                    else 'NoT LISTED? Raindrop can STILL INTEGRATE WITH IT.'
                ),
                'items': integration_categories,
            }
        )

    if erp_cards:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'Built for Your ERP, Whichever One You Run',
                'items': erp_cards,
            }
        )

    if timeline_stats or timing_intro:
        timing_block: dict = {
            'type': 'stats',
            'variant': 'timeline',
            'headline': 'Implementation Timing: Weeks, Not Years',
            'description': timing_intro,
            'items': timeline_stats,
        }
        layout.append(timing_block)

    if orchestration_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'From Integration to Orchestration: The Distinction That Matters',
                'body': orchestration_body,
                'media': 'right',
            }
        )

    if value_by_role:
        layout.append(
            {'type': 'featureGrid', 'columns': 2, 'headline': 'VALUE BY ROLE', 'items': value_by_role}
        )

    if customer_proof:
        layout.append(
            {'type': 'featureGrid', 'columns': 3, 'headline': 'Customer Proof', 'items': customer_proof}
        )

    if analyst_cards:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 3,
                'headline': 'Analyst Recognition',
                'items': analyst_cards,
            }
        )

    if modules_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'See the Integration Layer in Each Module',
                'body': modules_body,
                'media': 'left',
            }
        )

    if faq_items:
        layout.append({'type': 'faq', 'headline': 'FAQ', 'items': faq_items})

    layout.append(
        {
            'type': 'cta',
            'headline': 'Ready to Transform Your Data Integration?',
            'description': meta.get('description', ''),
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )

    return layout


def extract_solutions_service_boxes(raw: str) -> list[dict[str, str]]:
    boxes: list[dict[str, str]] = []
    for match in re.finditer(
        r'<h3>(Platform|Modules|By Business Function)</h3>.*?<div class="cz_wpe_content">(.*?)</div>\s*</div>\s*</div>',
        raw,
        re.S,
    ):
        boxes.append({'title': match.group(1), 'description': html_fragment_to_markdown(match.group(2))})
    return boxes


def icon_id_from_url(url: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', sanitize_filename(url).rsplit('.', 1)[0]).lower()


def extract_cz_service_boxes(raw: str, start: str = '', end: str = '') -> list[dict[str, str]]:
    chunk = raw_section(raw, start, end) if start else raw
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'cz_service_box.*?widget-container">\s*'
        r'<div class="xtra-service-box[^"]*".*?<a href="([^"]+)"[^>]*>.*?'
        r'<img[^>]+src="([^"]+)".*?'
        r'<h3[^>]*>(.*?)</h3>.*?'
        r'cz_wpe_content">(.*?)</div>',
        chunk,
        re.S | re.I,
    ):
        href = remap_href(match.group(1))
        title = anchor_label(match.group(3))
        description = html_fragment_to_markdown(match.group(4))
        if href:
            learn_more = f'[Learn More]({href})'
            description = f'{description}\n\n{learn_more}' if description else learn_more
        item: dict[str, str] = {'title': title, 'description': description}
        icon_id = icon_id_from_url(match.group(2))
        item['_icon_id'] = icon_id
        items.append(item)
    return items


def attach_service_box_icons(items: list[dict[str, str]], records: list[ImageRecord]) -> None:
    for item in items:
        icon_id = item.pop('_icon_id', None)
        if not icon_id:
            continue
        image_id = next(
            (record.id for record in records if record.id == icon_id or icon_id in record.id),
            None,
        )
        if image_id:
            item['image'] = image_id


def layout_for_platform(meta: dict[str, str], records: list[ImageRecord], raw: str) -> list[dict]:
    intro_match = re.search(
        r'<p[^>]*>.*?With a modern UI.+?just the way you want it to be\..*?</p>',
        raw,
        re.S | re.I,
    )
    intro = html_fragment_to_markdown(intro_match.group(0)) if intro_match else meta.get('description', '')

    boxes = extract_cz_service_boxes(raw)
    attach_service_box_icons(boxes, records)
    gpi_image = next((record.id for record in records if 'gpi' in record.id.lower()), None)

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': meta.get('h1') or 'Platform',
            'body': intro,
            'media': 'right',
            **({'image': gpi_image} if gpi_image else {}),
        }
    ]
    if boxes:
        layout.append({'type': 'featureGrid', 'columns': 3, 'items': boxes})
    layout.append(
        {
            'type': 'cta',
            'headline': 'Request a Demo',
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )
    return layout


def layout_for_modules(meta: dict[str, str], records: list[ImageRecord], raw: str) -> list[dict]:
    intro_match = re.search(
        r'<p[^>]*>.*?Every organization has different needs.+?Raindrop modules include:.*?</p>',
        raw,
        re.S | re.I,
    )
    intro = html_fragment_to_markdown(intro_match.group(0)) if intro_match else meta.get('description', '')

    boxes = extract_cz_service_boxes(raw)
    attach_service_box_icons(boxes, records)
    hero_image = next(
        (record.id for record in records if record.role == 'hero' and not record.reused),
        pick_image(records, 'ui', 0),
    )

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': meta.get('h1') or 'Modules',
            'body': intro,
            'media': 'right',
            **({'image': hero_image} if hero_image else {}),
        }
    ]
    if boxes:
        layout.append({'type': 'featureGrid', 'columns': 3, 'items': boxes})
    layout.append(
        {
            'type': 'cta',
            'headline': 'Request a Demo',
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )
    return layout


def layout_for_solutions(
    meta: dict[str, str], records: list[ImageRecord], raw: str
) -> list[dict]:
    intro_match = re.search(
        r'<p[^>]*>.*?all-in-one platform.+?era of work\..*?</p>',
        raw,
        re.S | re.I,
    )
    intro = html_fragment_to_markdown(intro_match.group(0)) if intro_match else meta.get('description', '')

    front_door = next(
        (record.id for record in records if 'solutions-digital-front-door' in record.id or 'digital-front-door' in record.id),
        pick_image(records, 'ui', 0),
    )
    icon_map = {
        'Platform': next((record.id for record in records if record.id == 'icon-it'), None),
        'Modules': next((record.id for record in records if record.id == 'icon-modules'), None),
        'By Business Function': next((record.id for record in records if record.id == 'icon-executives'), None),
    }
    gpi_image = next((record.id for record in records if 'gpi-reviewsnippet-190566' in record.id), None)

    grid_items: list[dict[str, str]] = []
    for box in extract_solutions_service_boxes(raw):
        item = {'title': box['title'], 'description': box['description']}
        if icon_map.get(box['title']):
            item['image'] = icon_map[box['title']]
        grid_items.append(item)

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'Solutions That Work The Way You Do',
            'body': intro,
            'media': 'right',
            'image': front_door,
        },
    ]

    if grid_items:
        layout.append({'type': 'featureGrid', 'columns': 3, 'items': grid_items})

    if gpi_image:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'One Front Door. Every Purchase. Just Ask Our Customers.',
                'body': '',
                'media': 'right',
                'image': gpi_image,
            }
        )

    return layout


def layout_for_resource_list(
    meta: dict[str, str],
    records: list[ImageRecord],
    slug: str,
    base_path: str,
    headline: str,
    *,
    max_pages: int = 15,
) -> list[dict]:
    items = scrape_grid_resources(slug, records, base_path, max_pages=max_pages)
    if not items:
        return [
            {
                'type': 'featureSplit',
                'headline': headline,
                'body': meta.get('description', ''),
                'media': 'right',
            }
        ]
    return [{'type': 'resourceList', 'headline': headline, 'items': items}]


def layout_for_recognition(meta: dict[str, str], records: list[ImageRecord]) -> list[dict]:
    return layout_for_resource_list(
        meta, records, 'resources/recognition', '/resources/recognition/', 'Recognition', max_pages=6
    )


def layout_for_articles(meta: dict[str, str], records: list[ImageRecord]) -> list[dict]:
    return layout_for_resource_list(
        meta, records, 'resources/articles', '/resources/articles/', 'Articles', max_pages=15
    )


def layout_for_case_studies(meta: dict[str, str], records: list[ImageRecord]) -> list[dict]:
    return layout_for_resource_list(
        meta, records, 'resources/case-studies', '/resources/case-studies/', 'Case Studies', max_pages=3
    )


def layout_for_raindrop_news(meta: dict[str, str], records: list[ImageRecord]) -> list[dict]:
    return layout_for_resource_list(
        meta, records, 'resources/raindrop-news', '/resources/raindrop-news/', 'Raindrop News', max_pages=5
    )


def layout_for_videos(meta: dict[str, str], records: list[ImageRecord]) -> list[dict]:
    return layout_for_resource_list(
        meta, records, 'resources/videos', '/resources/videos/', 'Videos', max_pages=5
    )


def layout_for_podcasts(meta: dict[str, str], records: list[ImageRecord]) -> list[dict]:
    return layout_for_resource_list(
        meta, records, 'resources/podcasts', '/resources/podcasts/', 'Podcasts', max_pages=3
    )


def extract_contact_from_raw(raw: str) -> tuple[str, list[dict[str, str]], str]:
    intro_match = re.search(
        r"We(?:&#8217;|'|\u2019)d love to hear from you\.[^<]*",
        raw,
        re.I,
    )
    intro = clean_text(intro_match.group(0)) if intro_match else ''

    start = raw.find("We'd love to hear")
    if start == -1:
        start = raw.find('love to hear from you')
    end = raw.find('Contact Us', start) if start != -1 else -1
    chunk = raw[start:end] if start != -1 and end != -1 else raw

    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'<a href="([^"]*)"[^>]*>.*?<h3>(Phone|Email|Address|Support)</h3>(.*?)</div>\s*</div>\s*</a>',
        chunk,
        re.S | re.I,
    ):
        href = html.unescape(match.group(1).replace('&#038;', '&'))
        label = match.group(2)
        body_html = match.group(3)
        if label == 'Address':
            lines = re.findall(r'<p>([^<]+)</p>', body_html)
            value = '\n'.join(clean_text(line) for line in lines)
        else:
            value = clean_text(re.sub(r'<[^>]+>', ' ', body_html))
        item: dict[str, str] = {'label': label, 'value': value}
        if href and href not in {'', '#'}:
            item['href'] = href
        items.append(item)

    map_match = re.search(
        r'<iframe[^>]+src="(https://www\.google\.com/maps/embed[^"]+)"',
        chunk,
        re.I,
    )
    map_url = html.unescape(map_match.group(1).replace('&#038;', '&')) if map_match else ''
    return intro, items, map_url


def extract_company_elementor_items(raw: str, start: str, end: str) -> list[dict[str, str]]:
    chunk = raw_section(raw, start, end)
    if len(chunk) > 25000:
        chunk = chunk[:25000]
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'elementor-heading-title[^>]*>(.*?)</h[34]>.*?elementor-widget-text-editor.*?<p[^>]*>(.*?)</p>',
        chunk,
        re.S,
    ):
        title = clean_text(re.sub(r'<[^>]+>', ' ', match.group(1)))
        description = html_fragment_to_markdown(match.group(2))
        if title and description and 'elementor-' not in title and len(title) < 120:
            items.append({'title': title, 'description': description})
    return items


def extract_company_about_items(raw: str) -> list[dict[str, str]]:
    anchor = raw.find('Procurement-born innovation')
    if anchor == -1:
        return []
    start = raw.rfind('elementor-icon-box-wrapper', max(0, anchor - 800), anchor)
    if start == -1:
        start = anchor
    chunk = raw[start:raw.find('OUR GUIDING VALUES', anchor)]
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'elementor-icon-box-title[^>]*>.*?<span[^>]*>(.*?)</span>.*?'
        r'elementor-icon-box-description[^>]*>(.*?)</p>',
        chunk,
        re.S,
    ):
        title = clean_text(re.sub(r'<[^>]+>', ' ', match.group(1)))
        description = html_fragment_to_markdown(match.group(2))
        if title and description:
            items.append({'title': title, 'description': description})
    return items[:4]


def extract_company_intro_from_raw(raw: str) -> str:
    chunk = raw_section(
        raw,
        'Raindrop Systems: The AI-Native Enterprise Spend Platform',
        'OUR GUIDING VALUES',
    )
    skip_prefixes = (
        'Bringing unified',
        'More than 75% of our team',
        'Start small, scale seamlessly',
        'Deploy quickly',
        'Our platform uses AI to analyze',
    )
    paragraphs: list[str] = []
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = html_fragment_to_markdown(match.group(1))
        if text and len(text) > 40 and not any(text.startswith(prefix) for prefix in skip_prefixes):
            paragraphs.append(text)
    return '\n\n'.join(paragraphs)


def extract_company_scope_faq_from_raw(raw: str) -> tuple[str, list[dict[str, str]]]:
    chunk = raw_section(raw, 'What Raindrop Systems Does', 'What Raindrop Systems Is Not')
    intro = ''
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = html_fragment_to_markdown(match.group(1))
        if text and 'Product Scope Matrix' in text:
            intro = text
            break
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'class="elementor-accordion-title"[^>]*>([^<]+)</a>.*?class="elementor-tab-content[^"]*"[^>]*>(.*?)</div>\s*</div>',
        chunk,
        re.S,
    ):
        question = clean_text(match.group(1))
        answer = html_fragment_to_markdown(match.group(2))
        if question and answer:
            items.append({'question': question, 'answer': answer})
    return intro, items


def extract_company_is_not_from_raw(raw: str) -> str:
    chunk = raw_section(raw, 'What Raindrop Systems Is Not', 'Why Raindrop Systems Stands Apart')
    bullets: list[str] = []
    for match in re.finditer(r'<li[^>]*>(.*?)</li>', chunk, re.S):
        text = html_fragment_to_markdown(match.group(1))
        if text:
            bullets.append(f'- {text}')
    if bullets:
        return 'To eliminate confusion and clearly define our scope:\n\n' + '\n\n'.join(bullets)
    return extract_ai_native_raw_paragraphs(
        raw, 'What Raindrop Systems Is Not', 'Why Raindrop Systems Stands Apart'
    )


def extract_company_who_serve_from_raw(raw: str) -> str:
    chunk = raw_section(raw, 'Who We Serve', 'Our Difference')
    paragraphs: list[str] = []
    bullets: list[str] = []
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = html_fragment_to_markdown(match.group(1))
        if text and len(text) > 20:
            paragraphs.append(text)
    for match in re.finditer(r'<li[^>]*>(.*?)</li>', chunk, re.S):
        text = html_fragment_to_markdown(match.group(1))
        if text and len(text) > 15:
            bullets.append(f'- {text}')
    body = '\n\n'.join(paragraphs)
    if bullets:
        body = f'{body}\n\n' + '\n\n'.join(bullets) if body else '\n\n'.join(bullets)
    return body


def extract_company_join_from_raw(raw: str) -> str:
    chunk = raw_section(raw, 'JOIN OUR TEAM', 'site_footer')
    if len(chunk) < 50:
        chunk = raw_section(raw, 'JOIN OUR TEAM', '<footer')
    paragraphs: list[str] = []
    stop_markers = ('Address:', 'Phone:', 'Email:', 'Copyright', '226 Airport Parkway', 'Suite 250')
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = html_fragment_to_markdown(match.group(1))
        if not text or len(text) < 20 or text.startswith('['):
            continue
        if any(marker in text for marker in stop_markers):
            break
        paragraphs.append(text)
    return '\n\n'.join(paragraphs)


def extract_company_difference_items(raw: str) -> list[dict[str, str]]:
    end_markers = ('Let\u2019s Make It Raindrop', "Let's Make It Raindrop", 'JOIN OUR TEAM')
    chunk = raw_section(raw, 'Our Difference', end_markers[0])
    if len(chunk) < 200:
        chunk = raw_section(raw, 'Our Difference', end_markers[1])
    items: list[dict[str, str]] = []
    for match in re.finditer(r'elementor-heading-title[^>]*>(.*?)</h[34]>', chunk, re.S):
        title = clean_text(match.group(1))
        if title and ('%' in title or 'ROI' in title or 'Deployment' in title):
            items.append({'title': title, 'description': ''})
    footer = ''
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = html_fragment_to_markdown(match.group(1))
        if text and 'empowers modern spend leaders' in text:
            footer = text
            break
    if items and footer:
        items[-1]['description'] = footer
    return items[:3]


def layout_for_company(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    intro = extract_company_intro_from_raw(raw)
    if not intro:
        intro = '\n\n'.join(
            extract_section_h4_text(body, '#### At Raindrop', '### Procurement-born innovation')
        )

    about_items = extract_company_about_items(raw)
    if not about_items:
        about_items = extract_h4_bullet_items(body, '### Procurement-born innovation', '## OUR GUIDING VALUES')

    values_items = extract_company_elementor_items(raw, 'OUR GUIDING VALUES', 'What Raindrop Systems Does')
    value_image_ids = [
        next((r.id for r in records if 'guidingvalues-1built' in r.id or 'value-built' in r.src), None),
        next((r.id for r in records if 'guidingvalues-2authentic' in r.id or 'value-authentic' in r.src), None),
        next((r.id for r in records if 'guidingvalues-3commitments' in r.id or 'value-commitments' in r.src), None),
    ]
    for index, item in enumerate(values_items):
        if index < len(value_image_ids) and value_image_ids[index]:
            item['image'] = value_image_ids[index]

    scope_intro, scope_items = extract_company_scope_faq_from_raw(raw)
    is_not_body = extract_company_is_not_from_raw(raw)
    apart_items = extract_company_elementor_items(
        raw, 'Why Raindrop Systems Stands Apart', 'Who We Serve'
    )
    who_body = extract_company_who_serve_from_raw(raw)
    if not who_body:
        who_body = extract_ai_native_raw_paragraphs(raw, 'Who We Serve', 'Our Difference')
    diff_items = extract_company_difference_items(raw)
    raindrop_body = extract_ai_native_raw_paragraphs(raw, 'Let\u2019s Make It Raindrop', 'JOIN OUR TEAM')
    if not raindrop_body:
        raindrop_body = extract_ai_native_raw_paragraphs(raw, "Let's Make It Raindrop", 'JOIN OUR TEAM')
    join_body = extract_company_join_from_raw(raw)

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': meta.get('h1') or 'Raindrop Systems: The AI-Native Enterprise Spend Platform',
            'body': intro or meta.get('description', ''),
            'media': 'right',
        },
    ]

    if about_items:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'About Raindrop Systems',
                'items': about_items,
            }
        )

    if values_items:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'OUR GUIDING VALUES',
                'items': values_items,
            }
        )

    if scope_intro:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'What Raindrop Systems Does',
                'body': scope_intro,
                'media': 'right',
            }
        )
    if scope_items:
        layout.append(
            {
                'type': 'faq',
                'headline': '' if scope_intro else 'What Raindrop Systems Does',
                'items': scope_items,
            }
        )

    if is_not_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'What Raindrop Systems Is Not',
                'body': is_not_body,
                'media': 'left',
            }
        )

    if apart_items:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'Why Raindrop Systems Stands Apart',
                'items': apart_items,
            }
        )

    if who_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Who We Serve',
                'body': who_body,
                'media': 'right',
            }
        )

    if diff_items:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'Our Difference',
                'items': diff_items,
            }
        )

    if raindrop_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Let\u2019s Make It Raindrop',
                'body': raindrop_body,
                'media': 'left',
            }
        )

    if join_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'JOIN OUR TEAM',
                'body': join_body,
                'media': 'right',
            }
        )

    layout.append(
        {
            'type': 'cta',
            'headline': 'Request a Demo',
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )
    return layout


def extract_legal_documents_from_raw(raw: str) -> tuple[str, list[dict[str, str]]]:
    chunk = raw_section(raw, 'Raindrop Legal', 'site_footer')
    intro = ''
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = html_fragment_to_markdown(match.group(1))
        if text and len(text) > 40 and 'transparency' in text.lower():
            intro = text
            break
    items: list[dict[str, str]] = []
    for title in LEGAL_DOC_ORDER:
        idx = chunk.find(title)
        if idx == -1:
            continue
        sub = chunk[idx : idx + 2000]
        href_match = re.search(r'href="(https?://[^"]+\.(?:pdf|docx)[^"]*)"', sub, re.I)
        if not href_match:
            continue
        href = normalize_asset_url(href_match.group(1))
        excerpt = ''
        for p_match in re.finditer(r'<p[^>]*>(.*?)</p>', sub, re.S):
            text = html_fragment_to_markdown(p_match.group(1))
            if text and title not in text and len(text) > 20:
                excerpt = text
                break
        items.append({'title': title, 'excerpt': excerpt, 'href': href})
    return intro, items


def cache_legal_documents(items: list[dict[str, str]]) -> None:
    LEGAL_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    for item in items:
        url = item['href']
        filename = urllib.parse.urlparse(url).path.rsplit('/', 1)[-1]
        dest = LEGAL_ASSETS_DIR / filename
        if dest.exists():
            continue
        download_image(url, dest)


def extract_security_soc_body_from_raw(raw: str) -> str:
    chunk = raw_section(
        raw,
        'Service Organization Control (SOC) 2 Report',
        'Raindrop Successfully Completes SOC 2 Examination',
    )
    paragraphs: list[str] = []
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = html_fragment_to_markdown(match.group(1))
        if text and len(text) > 20:
            paragraphs.append(text)
    return '\n\n'.join(paragraphs)


def extract_security_section_cta(raw: str, title: str) -> tuple[str, str, str]:
    idx = raw.find(title)
    if idx == -1:
        return '', '', ''
    sub = raw[idx : idx + 4000]
    label = ''
    button = re.search(r'class="cz_btn[^"]*"[^>]*>.*?<strong>(.*?)</strong>', sub, re.S)
    if button:
        label = clean_text(button.group(1))
    href_match = re.search(r'href="(https?://[^"]+)"', sub)
    href = normalize_asset_url(html.unescape(href_match.group(1))) if href_match else ''
    img_match = re.search(
        r'src="(https://(?:www\.)?raindrop\.com/wp-content/uploads/[^"]+)"',
        sub,
    )
    img_url = img_match.group(1) if img_match else ''
    return label, href, img_url


def pick_record_by_source(records: list[ImageRecord], *fragments: str) -> str | None:
    for fragment in fragments:
        needle = fragment.lower()
        for record in records:
            if needle in record.source_url.lower() and not record.download_failed:
                return record.id
    return None


def layout_for_security(
    meta: dict[str, str], records: list[ImageRecord], raw: str
) -> list[dict]:
    slug = 'security'
    soc_body = extract_security_soc_body_from_raw(raw)
    hero_image = pick_record_by_source(records, 'SecurityPageImage', 'securitypageimage')

    layout: list[dict] = []
    if soc_body:
        soc_block: dict = {
            'type': 'featureSplit',
            'headline': 'Service Organization Control (SOC) 2 Report',
            'body': soc_body,
            'media': 'left',
        }
        if hero_image:
            soc_block['image'] = hero_image
        layout.append(soc_block)

    for title, image_fragments in (
        (
            'Raindrop Successfully Completes SOC 2 Examination',
            ('e554cd32', 'soc-2-examination'),
        ),
        ('Raindrop Security Score', ('ssc-logo-badge', 'ssc-logo')),
    ):
        label, href, img_url = extract_security_section_cta(raw, title)
        image_id = pick_record_by_source(records, *image_fragments)
        if img_url and not image_id:
            image_id = ensure_resource_image(slug, records, img_url, title)
        body = f'[{label}]({href})' if label and href else ''
        if href.endswith('.pdf'):
            filename = urllib.parse.urlparse(href).path.rsplit('/', 1)[-1]
            dest = LEGAL_ASSETS_DIR / filename
            if not dest.exists():
                download_image(href, dest)
        section: dict = {
            'type': 'featureSplit',
            'headline': title,
            'body': body,
            'media': 'right',
        }
        if image_id:
            section['image'] = image_id
        layout.append(section)

    if not layout and meta.get('description'):
        layout.append(
            {
                'type': 'featureSplit',
                'headline': meta.get('h1') or 'Security',
                'body': meta.get('description', ''),
                'media': 'right',
            }
        )
    return layout


def _privacy_section_body(body_html: str) -> str:
    body_parts: list[str] = []
    for widget in re.finditer(
        r'data-widget_type="text-editor\.default".*?elementor-widget-container">(.*?)'
        r'</div>\s*</div>\s*</div>\s*</div>',
        body_html,
        re.S,
    ):
        text = html_fragment_to_markdown(widget.group(1))
        if text:
            body_parts.append(text)
    if not body_parts:
        for match in re.finditer(r'<p[^>]*>(.*?)</p>', body_html, re.S):
            text = html_fragment_to_markdown(match.group(1))
            if text and len(text) > 10:
                body_parts.append(text)
        for match in re.finditer(r'<ul[^>]*>(.*?)</ul>', body_html, re.S):
            text = html_fragment_to_markdown(match.group(1))
            if text:
                body_parts.append(text)
    return '\n\n'.join(body_parts)


def extract_privacy_policy_sections_from_raw(raw: str) -> list[dict[str, str]]:
    chunk = raw_section(raw, 'Raindrop Systems, Inc. Website Privacy Policy', 'site_footer')
    if len(chunk) < 200:
        chunk = raw_section(raw, 'Privacy Policy', 'site_footer')
    sections: list[dict[str, str]] = []
    preamble, _, remainder = chunk.partition('<h3')
    if 'Website Privacy Policy' in preamble:
        intro_html = preamble.split('</h3>', 1)[-1]
        intro_body = _privacy_section_body(intro_html)
        if intro_body:
            sections.append(
                {
                    'title': 'Raindrop Systems, Inc. Website Privacy Policy',
                    'body': intro_body,
                }
            )
    parts = re.split(
        r'<h3[^>]*class="[^"]*elementor-heading-title[^"]*"[^>]*>',
        f'<h3{remainder}',
    )
    stop_titles = {'Contact Us', 'Sitemap'}
    for part in parts[1:]:
        title_end = part.find('</h3>')
        if title_end == -1:
            continue
        title = clean_text(re.sub(r'<[^>]+>', ' ', part[:title_end]))
        if not title or len(title) > 120 or title in stop_titles:
            break
        body_html = part[title_end + 5 : part.find('Contact Us') if 'Contact Us' in part else len(part)]
        body = _privacy_section_body(body_html)
        if title and body:
            sections.append({'title': title, 'body': body})
    return sections


def layout_for_privacy_policy(meta: dict[str, str], raw: str) -> list[dict]:
    sections = extract_privacy_policy_sections_from_raw(raw)
    if not sections:
        intro = extract_ai_native_raw_paragraphs(raw, 'Privacy Policy', 'site_footer')
        if intro:
            return [
                {
                    'type': 'featureSplit',
                    'headline': meta.get('h1') or 'Privacy Policy',
                    'body': intro,
                    'media': 'right',
                }
            ]
        return []
    return [
        {
            'type': 'featureSplit',
            'headline': section['title'],
            'body': section['body'],
            'media': 'right',
        }
        for section in sections
    ]


def layout_for_legal(meta: dict[str, str], raw: str) -> list[dict]:
    intro, items = extract_legal_documents_from_raw(raw)
    if items:
        cache_legal_documents(items)
    layout: list[dict] = []
    headline = 'Raindrop Legal' if 'Raindrop Legal' in raw else (meta.get('h1') or 'Raindrop Legal')
    if intro:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': headline,
                'body': intro,
                'media': 'right',
            }
        )
    if items:
        layout.append(
            {
                'type': 'resourceList',
                'headline': '' if intro else headline,
                'items': items,
            }
        )
    return layout


def layout_for_contact(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    intro, items, map_url = extract_contact_from_raw(raw)
    if not intro:
        intro = "We'd love to hear from you. Here's how you can reach us..."
    block: dict = {
        'type': 'contactSection',
        'headline': meta.get('h1') or 'Contact',
        'description': intro,
        'items': items,
    }
    if map_url:
        block['mapEmbedUrl'] = map_url
    return [block]


def normalize_upload_basename(url: str) -> str:
    name = url.rsplit('/', 1)[-1].lower()
    name = re.sub(r'-\d+x\d+', '', name)
    name = re.sub(r'\.webp$', '', name)
    return re.sub(r'\.(png|jpe?g)$', '', name)


def extract_section_image_ids(
    raw: str,
    slug: str,
    records: list[ImageRecord],
    start_marker: str,
    end_marker: str,
    *,
    large_only: bool = False,
) -> list[str]:
    start = raw.find(start_marker)
    if start == -1:
        return []
    end = raw.find(end_marker, start + len(start_marker))
    chunk = raw[start:end if end != -1 else start + 30000]
    ids: list[str] = []
    seen_keys: set[str] = set()
    img_pattern = (
        r'<img[^>]+src="(https://(?:www\.)?raindrop\.com/wp-content/uploads/[^"]+)"'
        if not large_only
        else r'src="(https://(?:www\.)?raindrop\.com/wp-content/uploads/[^"]*1024x519[^"]*)"'
    )
    for match in re.finditer(img_pattern, chunk):
        url = match.group(1)
        key = normalize_upload_basename(url)
        if key in seen_keys:
            continue
        image_id = ensure_resource_image(slug, records, url, key)
        if not image_id:
            continue
        record = next((item for item in records if item.id == image_id), None)
        if record and record.download_failed:
            continue
        seen_keys.add(key)
        ids.append(image_id)
    return ids


def extract_elementor_counters(raw: str) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'elementor-counter-title">([^<]+)</div>\s*<div class="elementor-counter-number-wrapper">'
        r'.*?elementor-counter-number-prefix">([^<]*)</span>\s*'
        r'<span class="elementor-counter-number"[^>]*data-to-value="([^"]*)"[^>]*>.*?</span>\s*'
        r'<span class="elementor-counter-number-suffix">([^<]*)</span>',
        raw,
        re.S,
    ):
        label = clean_text(match.group(1))
        prefix = html.unescape(match.group(2).strip())
        value_num = match.group(3).strip()
        suffix = match.group(4).strip()
        value = f'{prefix}{value_num}{suffix}'.strip() or value_num
        items.append({'value': value, 'label': label})
    return items


def layout_for_our_expertise(
    meta: dict[str, str], records: list[ImageRecord], body: str, raw: str
) -> list[dict]:
    slug = 'why-raindrop/our-expertise'
    intro_paras = extract_section_h4_text(body, '#### As industry veterans', '### This is Us')
    intro_body = '\n\n'.join(intro_paras) if intro_paras else meta.get('description', '')
    intro_body = re.sub(r'technologyveterans', 'technology veterans', intro_body, flags=re.I)

    team_image = next((record.id for record in records if 'dsc' in record.id.lower()), pick_image(records, 'ui', 0))
    gpi_image = next((record.id for record in records if 'gpi' in record.id.lower()), None)
    stats = extract_elementor_counters(raw)
    resources = scrape_grid_resources(slug, records, '/why-raindrop/our-expertise/', max_pages=1)

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'An Authentic Solution Guided by Innovators',
            'body': intro_body,
            'media': 'left',
            'image': team_image,
            'cta': {'label': 'Meet Our Team', 'href': '/company/raindrop-team'},
        },
    ]

    if stats:
        layout.append({'type': 'stats', 'headline': 'This is Us', 'items': stats})

    if gpi_image:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': '',
                'body': '',
                'media': 'right',
                'image': gpi_image,
            }
        )

    layout.append(
        {
            'type': 'cta',
            'headline': 'Ready to Move Beyond Tracking Savings?',
            'primaryCta': {'label': "Let's Talk", 'href': '/contact/get-started'},
        }
    )

    if resources:
        layout.append(
            {
                'type': 'resourceList',
                'headline': 'Resources',
                'items': resources,
                'cta': {'label': 'See all resources', 'href': '/resources'},
            }
        )

    return layout


def layout_for_customer_success_stories(
    meta: dict[str, str], records: list[ImageRecord], body: str, raw: str
) -> list[dict]:
    slug = 'why-raindrop/customer-success-stories'
    intro_match = re.search(
        r'<div class="elementor-widget-container">\s*<p[^>]*>(?:<span[^>]*>)?(When you join the Raindrop family.+?every step of the way\.)(?:</span>)?</p>',
        raw,
        re.S | re.I,
    )
    intro = clean_text(re.sub(r'<[^>]+>', ' ', intro_match.group(1))) if intro_match else meta.get('description', '')

    case_studies = scrape_grid_resources(
        slug, records, '/why-raindrop/customer-success-stories/', max_pages=1
    )
    customer_logos = extract_section_image_ids(
        raw,
        slug,
        records,
        'Raindrop is Trusted by Industry Leaders',
        'class="cz_grid_link"',
    )
    quote_images = extract_section_image_ids(
        raw,
        slug,
        records,
        'Our Customers Say The Nicest Things',
        'raindrop_full_logo_white',
        large_only=True,
    )

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'FINDING THE RAINDROP WAY',
            'body': intro,
            'media': 'right',
        },
    ]

    if customer_logos:
        layout.append(
            {
                'type': 'logoCloud',
                'headline': 'Raindrop is Trusted by Industry Leaders',
                'images': customer_logos,
            }
        )

    if case_studies:
        layout.append({'type': 'resourceList', 'headline': '', 'items': case_studies})

    if quote_images:
        layout.append(
            {
                'type': 'logoCloud',
                'headline': 'Our Customers Say The Nicest Things',
                'images': quote_images,
                'variant': 'cards',
            }
        )

    return layout


def extract_ai_powered_gartner_quote_from_raw(raw: str) -> str:
    chunk = raw_section(raw, 'Gartner Magic Quadrant', 'Backed by Google Cloud')
    for match in re.finditer(r'<p[^>]*>([“"][^<]+[”"])</p>', chunk, re.S):
        quote = clean_text(re.sub(r'<[^>]+>', ' ', match.group(1))).strip('“"”')
        if quote and 'Raindrop is built' in quote:
            return quote
    return ''


def extract_ai_powered_rain_features_from_raw(raw: str) -> tuple[str, list[dict[str, str]]]:
    chunk = raw_section(raw, 'Meet Rain, Your AI Agent', 'Gartner Magic Quadrant')
    intro = ''
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = html_fragment_to_markdown(match.group(1))
        if text and len(text) > 30:
            intro = text
            break
    features: list[dict[str, str]] = []
    for match in re.finditer(r'<li[^>]*><b>(.*?)<br\s*/?></b>(.*?)</li>', chunk, re.S):
        title = clean_text(re.sub(r'<[^>]+>', ' ', match.group(1)))
        description = clean_text(re.sub(r'<[^>]+>', ' ', match.group(2)))
        if title and description:
            features.append({'title': title, 'description': description})
    return intro, features


def sanitize_ai_powered_gartner_quote(quote: str) -> str:
    quote = re.sub(r'\[[^\]]+\]\([^)]+\)', '', quote)
    return quote.strip('“"” ')


def layout_for_ai_powered(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    slug = 'why-raindrop/ai-powered'
    steer_paragraphs = extract_section_h4_text(body, '### Steer the Storm', '### AI-Powered Procurement')
    if not steer_paragraphs:
        steer_body = extract_ai_native_raw_paragraphs(raw, 'Steer the Storm', 'AI-Powered Procurement')
        steer_paragraphs = [steer_body] if steer_body else []
    impact_paragraphs = extract_section_h4_text(
        body, '### AI-Powered Procurement. Real Business Impact.', '### Meet Rain'
    )
    if not impact_paragraphs:
        impact_body = extract_ai_native_raw_paragraphs(raw, 'AI-Powered Procurement. Real Business Impact.', 'Meet Rain')
        impact_paragraphs = [p for p in impact_body.split('\n\n') if p] if impact_body else []

    rain_intro, rain_features = extract_ai_powered_rain_features_from_raw(raw)
    gartner_quote = extract_ai_powered_gartner_quote_from_raw(raw)
    if not rain_intro or not rain_features:
        rain_section = extract_h4_bullet_items(
            body, '### Meet Rain, Your AI Agent for Spend Excellence', '### Gartner'
        )
        for item in rain_section:
            title = item.get('title', '')
            if title.startswith('"') or title.startswith('“') or 'Raindrop is built on a modern platform' in title:
                if not gartner_quote:
                    gartner_quote = sanitize_ai_powered_gartner_quote(title)
                continue
            split_title, split_desc = split_glued_heading(title, RAIN_AGENT_PREFIXES)
            if any(prefix in title for prefix in RAIN_AGENT_PREFIXES):
                rain_features.append({'title': split_title, 'description': split_desc})
            elif not rain_intro:
                rain_intro = title

    google_body = extract_ai_native_raw_paragraphs(raw, 'Backed by Google Cloud', 'Resources')
    if not google_body:
        google_paragraphs = extract_section_h4_text(body, '### Backed by Google Cloud', '### Resources')
        google_body = (
            'Raindrop is hosted on the trusted, secure Google Cloud Platform, so you can enjoy peace of mind '
            'regarding the safety and reliability of data management with state-of-the-art infrastructure. '
            'And it’s easier than ever to purchase through the Google Cloud marketplace, where customers can '
            'buy the Raindrop full suite (or individual modules) as part of their annual Google committed spend.'
        )
        if google_paragraphs:
            google_body = '\n\n'.join(google_paragraphs)
            google_body = re.sub(
                r'^Our interface is as user-friendly as our partner, Google\.\s*\n\nwhere customers',
                'Our interface is as user-friendly as our partner, Google.\n\nRaindrop is hosted on the trusted, secure Google Cloud Platform, so you can enjoy peace of mind regarding the safety and reliability of data management with state-of-the-art infrastructure. And it’s easier than ever to purchase through the Google Cloud marketplace, where customers',
                google_body,
                flags=re.I,
            )

    meet_rain_image = next((record.id for record in records if 'meet-rain' in record.id), pick_image(records, 'ui', 0))
    gartner_image = next((record.id for record in records if 'gartner-1' in record.id), None)
    google_image = next((record.id for record in records if 'google-cloud' in record.id), None)
    resources = scrape_ai_powered_resources(slug, records)

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'Steer the Storm',
            'body': steer_paragraphs[0]
            if steer_paragraphs
            else (
                'There’s so much being said about AI. At Raindrop, it’s simple: Our AI-native and Agentic platform '
                'helps you get more value from every decision, every day.'
            ),
            'media': 'right',
            'image': meet_rain_image,
        },
        {
            'type': 'featureSplit',
            'headline': 'AI-Powered Procurement. Real Business Impact.',
            'body': '\n\n'.join(impact_paragraphs)
            if impact_paragraphs
            else meta.get('description', ''),
            'media': 'left',
        },
        {
            'type': 'featureSplit',
            'headline': 'Meet Rain, Your AI Agent for Spend Excellence',
            'body': rain_intro
            or 'From sourcing to payments, Rain tackles procurement’s biggest challenges for you by automating the manual and keeping track of the meaningful.',
            'media': 'right',
            'image': meet_rain_image,
            'cta': {'label': 'Learn More About Agentic AI', 'href': '/agentic-procurement'},
        },
    ]

    if rain_features:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 3,
                'headline': 'Rain at your service',
                'items': rain_features[:3],
            }
        )

    if not gartner_quote:
        gartner_quote = (
            'Raindrop is built on a modern platform with a significant amount of AI and '
            'generative AI functionality built in.'
        )
    layout.append(
        {
            'type': 'testimonials',
            'headline': 'Gartner Magic Quadrant, March 2025',
            'items': [
                {
                    'quote': sanitize_ai_powered_gartner_quote(gartner_quote),
                    'author': 'Gartner',
                    'role': 'Magic Quadrant, March 2025',
                }
            ],
        }
    )
    if gartner_image:
        layout.append({'type': 'logoCloud', 'images': [gartner_image]})

    google_block: dict = {
        'type': 'featureSplit',
        'headline': 'Backed by Google Cloud',
        'body': google_body,
        'media': 'left',
    }
    if google_image:
        google_block['image'] = google_image
    layout.append(google_block)

    if resources:
        layout.append(
            {
                'type': 'resourceList',
                'headline': 'Resources',
                'items': resources,
                'cta': {'label': 'See all resources', 'href': '/resources'},
            }
        )

    layout.append(
        {
            'type': 'cta',
            'headline': 'Request a Demo',
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )
    return layout


def extract_ai_native_raw_paragraphs(raw: str, start: str, end: str) -> str:
    chunk = raw_section(raw, start, end)
    paragraphs: list[str] = []
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = html_fragment_to_markdown(match.group(1))
        if text and len(text) > 20 and not text.startswith('['):
            paragraphs.append(text)
    return '\n\n'.join(paragraphs)


def extract_ai_native_stats_from_raw(raw: str) -> list[dict[str, str]]:
    chunk = raw_section(raw, 'What AI-Native Procurement Delivers', 'What Raindrop Systems AI Does')
    stats: list[dict[str, str]] = []
    for match in re.finditer(
        r"font-family:'Staatliches'[^>]*font-size:clamp\(56px[^>]*>([^<]+)</p>.*?"
        r"letter-spacing:4px[^>]*>([^<]+)</p>.*?"
        r"font-weight:700[^>]*margin:0 0 12px[^>]*>([^<]+)</p>.*?"
        r"text-transform:uppercase[^>]*>([^<]+)</p>",
        chunk,
        re.S,
    ):
        value = clean_text(match.group(1))
        label = clean_text(match.group(2))
        detail = clean_text(match.group(3))
        footnote = clean_text(match.group(4))
        stats.append({'value': value, 'label': f'{label} — {detail} ({footnote})'})
    return stats


def extract_ai_native_lifecycle_from_raw(raw: str) -> tuple[str, list[dict[str, str]]]:
    chunk = raw_section(
        raw,
        'What Raindrop Systems AI Does Across the Procurement Lifecycle',
        'What "AI" and "Agentic AI" Actually Mean in Procurement',
    )
    intro_match = re.search(r'<p[^>]*>(.*?)</p>', chunk, re.S)
    intro = html_fragment_to_markdown(intro_match.group(1)) if intro_match else ''
    items: list[dict[str, str]] = []
    for match in re.finditer(r'<h3[^>]*>(.*?)</h3>\s*<p[^>]*>(.*?)</p>', chunk, re.S):
        title = clean_text(match.group(1))
        description = clean_text(re.sub(r'<[^>]+>', ' ', match.group(2)))
        if title and description:
            items.append({'title': title, 'description': description})
    return intro, items


def extract_ai_native_benefits_from_raw(raw: str) -> list[dict[str, str]]:
    chunk = raw_section(raw, 'WHO BENEFITS FROM AI-NATIVE PROCUREMENT', 'Fast to Deploy. Built to Scale.')
    items: list[dict[str, str]] = []
    for match in re.finditer(r'<h3[^>]*>(.*?)</h3>\s*<ul[^>]*>(.*?)</ul>', chunk, re.S):
        title = clean_text(match.group(1))
        bullets = [
            clean_text(re.sub(r'<[^>]+>', ' ', li.group(1)))
            for li in re.finditer(r'<li[^>]*>(.*?)</li>', match.group(2), re.S)
        ]
        bullets = [bullet for bullet in bullets if bullet]
        if title and bullets:
            items.append({'title': title, 'description': ' · '.join(bullets)})
    return items


def extract_ai_native_recognition_from_raw(raw: str) -> str:
    chunk = raw_section(raw, 'What AI-Native Procurement Delivers', 'What Raindrop Systems AI Does')
    match = re.search(r'<p[^>]*>\s*Also recognized by.*?</p>', chunk, re.S | re.I)
    return html_fragment_to_markdown(match.group(0)) if match else ''


def extract_ai_native_stats(h4s: list[str]) -> list[dict[str, str]]:
    stats: list[dict[str, str]] = []
    index = 0
    while index < len(h4s):
        if not looks_like_stat_value(h4s[index]):
            index += 1
            continue
        value = h4s[index]
        label = h4s[index + 1] if index + 1 < len(h4s) else ''
        detail = h4s[index + 2] if index + 2 < len(h4s) else ''
        footnote = h4s[index + 3] if index + 3 < len(h4s) and not looks_like_stat_value(h4s[index + 3]) else ''
        combined = f'{label} — {detail}'.strip(' —')
        if footnote:
            combined = f'{combined} ({footnote})'
            index += 4
        else:
            index += 3
        stats.append({'value': value, 'label': combined})
    return stats


def extract_idc_testimonial(analyst_lines: list[str]) -> tuple[str, str, str]:
    quote = ''
    author = 'Patrick Reymann'
    role = 'Research Director, Procurement and Enterprise Applications, IDC'
    for line in analyst_lines:
        if 'RainConnect' in line or line.startswith('"') or line.startswith('“'):
            parts = re.split(r'\s*[—–-]\s*Patrick Reymann\s*$', line.strip())
            quote = parts[0].strip('"“” ')
            break
    if not quote:
        quote = (
            'RainConnect’s advantage lies in its elimination of most integration friction. It combines '
            'modern, no-code/low-code configuration for typical connections with rapid deployment — a '
            'differentiator in a market that too often expects long consulting cycles.'
        )
    return quote, author, role


def layout_for_ai_native_procurement(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    intro = extract_ai_native_raw_paragraphs(
        raw,
        'AI-Native Procurement: Built Into the Platform',
        'The Difference Between AI Features and AI-Native Architecture',
    )
    if not intro:
        intro = '\n\n'.join(
            extract_section_h4_text(
                body, '### AI-Native Procurement: Built Into the Platform', 'The Difference Between AI Features'
            )
        )

    diff = extract_ai_native_raw_paragraphs(
        raw,
        'The Difference Between AI Features and AI-Native Architecture',
        'What AI-Native Procurement Delivers',
    )
    if not diff:
        diff = '\n\n'.join(
            extract_section_h4_text(
                body,
                'The Difference Between AI Features and AI-Native Architecture',
                '### What AI-Native Procurement Delivers',
            )
        )

    stats = extract_ai_native_stats_from_raw(raw)
    if not stats:
        delivers_start = body.find('### What AI-Native Procurement Delivers')
        lifecycle_start = body.find('### What Raindrop Systems AI Does')
        delivers_h4s: list[str] = []
        if delivers_start != -1 and lifecycle_start != -1:
            delivers_chunk = body[delivers_start:lifecycle_start]
            for line in [clean_text(match.group(1)) for match in re.finditer(r'^#### (.+)$', delivers_chunk, re.M)]:
                if not (
                    line.upper().startswith('ANALYST RECOGNITION')
                    or 'RainConnect' in line
                    or line.startswith('"')
                    or line.startswith('“')
                    or 'Everest Group' in line
                    or 'Williams Sonoma' in line
                ):
                    delivers_h4s.append(line)
        stats = extract_ai_native_stats(delivers_h4s[1:])

    idc_chunk = raw_section(raw, 'ANALYST RECOGNITION', 'What Raindrop Systems AI Does')
    idc_match = re.search(r'<blockquote[^>]*>(.*?)</blockquote>', idc_chunk, re.S)
    idc_quote = clean_text(re.sub(r'<[^>]+>', ' ', idc_match.group(1))) if idc_match else ''
    idc_author = 'Patrick Reymann'
    idc_role = 'Research Director, Procurement and Enterprise Applications, IDC'
    if not idc_quote:
        idc_quote, idc_author, idc_role = extract_idc_testimonial([])

    recognition = extract_ai_native_recognition_from_raw(raw)

    lifecycle_intro, lifecycle_items = extract_ai_native_lifecycle_from_raw(raw)
    if not lifecycle_items:
        lifecycle_start = body.find('### What Raindrop Systems AI Does')
        lifecycle_end = body.find('### What "AI" and "Agentic AI"')
        lifecycle_blocks = (
            split_h3_blocks(body[lifecycle_start:lifecycle_end])
            if lifecycle_start != -1 and lifecycle_end != -1
            else []
        )
        lifecycle_intro = parse_h4_lines(lifecycle_blocks[0][1])[0] if lifecycle_blocks else ''
        lifecycle_items = role_grid_items(lifecycle_blocks[1:])

    ai_meaning = extract_ai_native_raw_paragraphs(
        raw,
        'What "AI" and "Agentic AI" Actually Mean in Procurement',
        'How AI-Native Architecture Works in Practice',
    )
    practice = extract_ai_native_raw_paragraphs(
        raw,
        'How AI-Native Architecture Works in Practice',
        'WHO BENEFITS FROM AI-NATIVE PROCUREMENT',
    )
    if practice:
        practice = re.sub(
            r'AI features digitize procurement\.AI-native',
            'AI features digitize procurement.\n\nAI-native',
            practice,
        )

    benefits_items = extract_ai_native_benefits_from_raw(raw)
    if not benefits_items:
        benefits_start = body.find('WHO BENEFITS FROM AI-NATIVE PROCUREMENT')
        deploy_start = body.find('### Fast to Deploy. Built to Scale.')
        if benefits_start != -1 and deploy_start != -1:
            benefits_items = role_grid_items(split_h3_blocks(body[benefits_start:deploy_start]))

    deploy_body = extract_ai_native_raw_paragraphs(
        raw,
        'Fast to Deploy. Built to Scale.',
        'Frequently Asked Questions',
    )
    faq_items = extract_faq_cz_acc(raw) or extract_faq_from_body(body)
    final_cta = extract_final_cta(body)

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'AI-Native Procurement: Built Into the Platform, Not Bolted On',
            'body': intro
            if intro
            else (
                'Most platforms added AI later. Raindrop Systems was built for it from day one — across intake, '
                'sourcing, contracts, suppliers, spend, and AP. Meet Rain, our purpose-built AI agent for procurement.'
            ),
            'media': 'right',
            'cta': {'label': 'See It in Action — Book a Demo', 'href': '/contact/get-started'},
        },
        {
            'type': 'featureSplit',
            'headline': 'The Difference Between AI Features and AI-Native Architecture',
            'body': diff,
            'media': 'left',
        },
    ]

    if stats:
        layout.append({'type': 'stats', 'headline': 'What AI-Native Procurement Delivers', 'items': stats})

    layout.append(
        {
            'type': 'testimonials',
            'headline': 'Analyst Recognition · IDC 2025',
            'items': [{'quote': idc_quote, 'author': idc_author, 'role': idc_role}],
        }
    )

    if recognition:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Industry recognition',
                'body': recognition,
                'media': 'right',
            }
        )

    if lifecycle_items:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'What Raindrop Systems AI Does Across the Procurement Lifecycle',
                'description': lifecycle_intro,
                'items': lifecycle_items,
            }
        )

    if ai_meaning:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'What "AI" and "Agentic AI" Actually Mean in Procurement',
                'body': ai_meaning,
                'media': 'left',
                'cta': {'label': 'Learn more about Agentic Procurement', 'href': '/agentic-procurement'},
            }
        )

    if practice:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'How AI-Native Architecture Works in Practice',
                'body': practice,
                'media': 'right',
            }
        )

    if benefits_items:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'WHO BENEFITS FROM AI-NATIVE PROCUREMENT',
                'items': benefits_items,
            }
        )

    if deploy_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Fast to Deploy. Built to Scale.',
                'body': deploy_body,
                'media': 'left',
            }
        )

    if faq_items:
        layout.append({'type': 'faq', 'headline': 'Frequently Asked Questions', 'items': faq_items})

    if final_cta:
        layout.append(final_cta)
    else:
        layout.append(
            {
                'type': 'cta',
                'headline': 'READY TO SEE THE DIFFERENCE ARCHITECTURE MAKES?',
                'description': (
                    'If you’re evaluating AI procurement platforms, the architecture question matters more than the '
                    'feature list. Schedule a demo to see how Raindrop Systems AI operates across your specific '
                    'procurement workflows — intake, sourcing, contracts, suppliers, spend, or AP.'
                ),
                'primaryCta': {'label': 'Book a Demo', 'href': '/contact/get-started'},
                'secondaryCta': {'label': 'Explore the full platform', 'href': '/solutions/platform'},
            }
        )

    return layout


def extract_h3_strong_cards(raw: str, start: str, end: str) -> list[dict[str, str]]:
    chunk = raw_section(raw, start, end)
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'<h3[^>]*>(?:<strong>|<b>)(.*?)(?:</strong>|</b>)</h3>\s*<p[^>]*>(.*?)</p>',
        chunk,
        re.S | re.I,
    ):
        title = clean_text(match.group(1))
        description = html_fragment_to_markdown(match.group(2))
        if title and description:
            items.append({'title': title, 'description': description})
    return items


def extract_clm_h2_section(raw: str, headline_prefix: str) -> tuple[str, str]:
    match = re.search(
        rf'<h2[^>]*>\s*([^<]*{re.escape(headline_prefix)}[^<]*)</h2>.*?'
        r'elementor-widget-text-editor.*?widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    if not match:
        return '', ''
    headline = clean_text(html.unescape(match.group(1)))
    body = html_fragment_to_markdown(f'<p>{match.group(2)}</p>')
    return headline, body


def extract_clm_teal_stats(raw: str, start: str, end: str, font_size: str = '80') -> list[dict[str, str]]:
    chunk = raw_section(raw, start, end)
    items: list[dict[str, str]] = []
    for match in re.finditer(
        rf'font-family:Staatliches;font-size:{font_size}px[^>]*>(.*?)</div>.*?'
        r'(?:letter-spacing:0\.5px|font-size:13px|font-size:18px)[^>]*>(.*?)</div>',
        chunk,
        re.S,
    ):
        value = clean_text(match.group(1))
        label = clean_text(html.unescape(match.group(2)))
        if value and label:
            items.append({'value': value, 'label': label})
    return items


def extract_clm_case_studies(raw: str) -> list[dict[str, str]]:
    chunk = raw_section(raw, 'Procurement leaders turning contracts', 'Built for every team')
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'<h3[^>]*>(?:<a[^>]*>)?\s*([^<]+?)\s*(?:</a>)?</h3>\s*'
        r'<p style="font-size:\s*22px[^"]*"[^>]*>(.*?)</p>\s*'
        r'<p style="margin-bottom:\s*20px;">(.*?)</p>(.*?)</div>\s*</div>\s*</div>',
        chunk,
        re.S | re.I,
    ):
        title = clean_text(match.group(1))
        subtitle = clean_text(match.group(2))
        body = html_fragment_to_markdown(match.group(3))
        links = html_fragment_to_markdown(match.group(4))
        description = f'{subtitle}\n\n{body}'
        if links:
            description = f'{description}\n\n{links}'
        items.append({'title': title, 'description': description})
    return items


def layout_for_clm(
    sections: list[Section], meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    period_icon = next(
        (record.id for record in records if 'raindrop-period-teal' in record.id),
        None,
    )
    collaboration_image = next((record.id for record in records if 'clm-collaboration' in record.id), None)
    smart_intake_image = next((record.id for record in records if 'clm-smart-intake' in record.id), None)

    intro_match = re.search(
        r'<h3>Steer The Storm: Turn Commitments Into Clarity</h3>(.*?)</div></div></div>',
        raw,
        re.S | re.I,
    )
    intro = html_fragment_to_markdown(intro_match.group(1)) if intro_match else meta.get('description', '')

    pain_points = extract_h3_strong_cards(raw, 'The contract problem most teams know too well', 'How It Works')
    differentiators = extract_h3_strong_cards(raw, 'WHAT MAKES IT DIFFERENT', 'Six capabilities')
    capabilities = extract_h3_strong_cards(
        raw, 'Six capabilities that move contracts', 'Collaborative Review'
    )
    role_cards = extract_h3_strong_cards(raw, 'Built for every team that touches contracts', 'Total Transparency')

    if period_icon:
        for card in differentiators:
            card['image'] = period_icon

    _, agentic_intro = extract_clm_h2_section(raw, 'Agentic AI in contract management')
    agentic_stats = extract_clm_teal_stats(raw, 'Agentic AI in contract management', 'Terri Smith')
    world_market_stats = extract_clm_teal_stats(
        raw, 'Terri Smith', 'Procurement leaders turning contracts', font_size='56'
    )

    capabilities_tagline_match = re.search(
        r'<p[^>]*>\s*(<strong>Track renewal dates</strong>.*?)</p>',
        raw_section(raw, 'auto-renewal surprises', 'Terri Smith'),
        re.S | re.I,
    )
    capabilities_tagline = (
        html_fragment_to_markdown(capabilities_tagline_match.group(1))
        if capabilities_tagline_match
        else ''
    )

    quote_match = re.search(
        r'<p[^>]*>([^<]*Our team has been using the Raindrop Contract and Sourcing modules[^<]*)</p>',
        raw,
        re.S,
    )
    testimonial_items: list[dict[str, str]] = []
    if quote_match:
        quote = clean_text(html.unescape(quote_match.group(1)))
        quote = quote.strip('"“”')
        testimonial_items.append(
            {
                'quote': quote,
                'author': 'Terri Smith',
                'role': 'World Market',
            }
        )

    transparency_match = re.search(
        r'Total Transparency Across the Contract Lifecycle</h3>.*?widget-container">\s*(.*?)\s*</div>\s*</div>',
        raw,
        re.S | re.I,
    )
    transparency_body = (
        html_fragment_to_markdown(transparency_match.group(1)) if transparency_match else ''
    )

    analyst_match = re.search(
        r'Recognized by analysts who watch this space</h2>.*?widget-container">\s*(.*?)\s*</div>\s*</div>',
        raw,
        re.S | re.I,
    )
    analyst_body = html_fragment_to_markdown(analyst_match.group(1)) if analyst_match else ''

    case_studies = extract_clm_case_studies(raw)
    faq_items = sanitize_faq_items(extract_faq_cz_acc(raw) or extract_faq_pairs(raw))

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'Steer The Storm: Turn Commitments Into Clarity',
            'body': intro,
            'media': 'right',
        }
    ]

    if pain_points:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 3,
                'headline': 'The contract problem most teams know too well',
                'items': pain_points,
            }
        )

    how_it_works = [
        ('AI Powered Redlining', 'right', None),
        ('Third Party Contract', 'left', None),
        ('One Click NDA Creation', 'right', None),
        ('Collaborative Review', 'left', collaboration_image),
        ('Smart Intake', 'right', smart_intake_image),
        ('Tracking', 'left', None),
    ]
    for prefix, media, image_id in how_it_works:
        headline, section_body = extract_clm_h2_section(raw, prefix)
        if not section_body:
            continue
        split: dict = {
            'type': 'featureSplit',
            'headline': headline or prefix,
            'body': section_body,
            'media': media,
        }
        if image_id:
            split['image'] = image_id
        layout.append(split)

    if differentiators:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 3,
                'headline': 'WHAT MAKES IT DIFFERENT',
                'items': differentiators,
            }
        )

    if capabilities:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 3,
                'headline': 'Six capabilities that move contracts from documents to commitments',
                'items': capabilities,
            }
        )

    if agentic_intro:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Agentic AI in contract management: what Rain does for you',
                'body': agentic_intro,
                'media': 'right',
            }
        )

    if agentic_stats:
        layout.append(
            {
                'type': 'stats',
                'variant': 'cards',
                'headline': '',
                'description': capabilities_tagline,
                'items': agentic_stats,
            }
        )

    if testimonial_items:
        layout.append({'type': 'testimonials', 'headline': '', 'items': testimonial_items})

    if world_market_stats:
        layout.append(
            {
                'type': 'stats',
                'variant': 'cards',
                'headline': '',
                'items': world_market_stats,
            }
        )

    if case_studies:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'Procurement leaders turning contracts into measurable wins',
                'items': case_studies,
            }
        )

    if role_cards:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 3,
                'headline': 'Built for every team that touches contracts',
                'items': role_cards,
            }
        )

    if transparency_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Total Transparency Across the Contract Lifecycle',
                'body': transparency_body,
                'media': 'right',
            }
        )

    if analyst_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Recognized by analysts who watch this space',
                'body': analyst_body,
                'media': 'left',
            }
        )

    if faq_items:
        layout.append({'type': 'faq', 'headline': 'FAQ', 'items': faq_items})

    layout.append(
        {
            'type': 'cta',
            'headline': 'Reach out to Raindrop today',
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )
    return layout


def extract_module_benefit_cards(raw: str, end_marker: str) -> list[dict[str, str]]:
    chunk = raw_section(raw, 'KEY BENEFITS', end_marker)
    items: list[dict[str, str]] = []
    for match in re.finditer(r'<h3><b>(.*?)</b></h3><p>(.*?)</p>', chunk, re.S | re.I):
        items.append(
            {
                'title': clean_text(match.group(1)),
                'description': clean_text(html.unescape(match.group(2))),
            }
        )
    if items:
        return items
    for match in re.finditer(r'<h3[^>]*>(.*?)</h3>\s*<p>(.*?)</p>', chunk, re.S | re.I):
        title = anchor_label(match.group(1))
        if not title or title.lower() in {'contact us', 'faq', 'resources'}:
            continue
        items.append({'title': title, 'description': clean_text(match.group(2))})
    return items


def extract_h2_section_body(raw: str, headline: str) -> str:
    match = re.search(
        rf'<h2[^>]*>\s*{re.escape(headline)}\s*</h2>.*?'
        r'elementor-widget-text-editor.*?widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    return html_fragment_to_markdown(f'<p>{match.group(1)}</p>') if match else ''


def extract_h2_section_full_body(raw: str, headline: str) -> str:
    match = re.search(
        rf'<h2[^>]*>\s*{re.escape(headline)}\s*</h2>.*?'
        r'elementor-widget-text-editor.*?widget-container">\s*(.*?)\s*</div>\s*</div>',
        raw,
        re.S | re.I,
    )
    return html_fragment_to_markdown(match.group(1)) if match else ''


def extract_h3_section_body(raw: str, headline: str) -> str:
    match = re.search(
        rf'<h3[^>]*>\s*{re.escape(headline)}\s*</h3>.*?'
        r'widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    return html_fragment_to_markdown(f'<p>{match.group(1)}</p>') if match else ''


def layout_for_ap_automation(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    image_by_keyword = {
        'ingestion': next((record.id for record in records if 'ap-ai-ingestion' in record.id), None),
        'match': next((record.id for record in records if 'ap-po-match' in record.id), None),
        'integrate': next((record.id for record in records if 'ap-integrate-pay' in record.id), None),
    }

    intro_match = re.search(
        r'NO OCR\. NO TEMPLATES\..*?JUST TOUCHLESS AP\..*?</h2>.*?'
        r'widget-container">\s*<p[^>]*>(.*?)</p>\s*</div>.*?'
        r'widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    intro = meta.get('description', '')
    if intro_match:
        tagline = html_fragment_to_markdown(f'<p>{intro_match.group(1)}</p>')
        body_para = html_fragment_to_markdown(f'<p>{intro_match.group(2)}</p>')
        intro = '\n\n'.join(part for part in (tagline, body_para) if part)

    downpour_body = extract_h2_section_body(raw, 'From downpour to done')
    cordis_stats = extract_staatliches_72_stats(
        raw,
        'What Cordis Did With Raindrop Systems</h2>',
        'AP Automation Software: Key Benefits</h2>',
    )
    cordis_footnote_match = re.search(
        r'What Cordis Did With Raindrop Systems</h2>.*?<p[^>]*>(.*?Cordis.*?Raindrop Systems\.)</p>',
        raw,
        re.S | re.I,
    )
    cordis_footnote = (
        html_fragment_to_markdown(f'<p>{cordis_footnote_match.group(1)}</p>')
        if cordis_footnote_match
        else ''
    )

    benefits = extract_h3_strong_cards(
        raw,
        'AP Automation Software: Key Benefits</h2>',
        'Match and Validate Automatically</h3>',
    )
    suite_body = extract_h2_section_full_body(raw, 'Built Into the Full Source-to-Pay Suite')
    ask_rain_body = extract_h2_section_full_body(raw, 'Ask Rain')
    customer_story_body = extract_h2_section_full_body(raw, 'Raindrop Systems in Action: A Customer Story')
    analyst_body = extract_h2_section_full_body(raw, 'Recognized by the Analysts Who Watch This Space')

    cta_match = re.search(
        r'See AP Automation In Action, Under 3 Months</h2>.*?widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    cta_body = html_fragment_to_markdown(f'<p>{cta_match.group(1)}</p>') if cta_match else ''

    quote_match = re.search(
        r'Raindrop Systems in Action: A Customer Story</h2>.*?'
        r'text-align:\s*center[^"]*"[^>]*>&ldquo;(.*?)&rdquo;',
        raw,
        re.S | re.I,
    )
    testimonial_items: list[dict[str, str]] = []
    if quote_match:
        testimonial_items.append(
            {
                'quote': clean_text(html.unescape(quote_match.group(1))),
                'author': 'AP Manager',
                'role': 'Midwest Vision Partners',
            }
        )

    faq_items = sanitize_faq_items(extract_faq_cz_acc(raw) or extract_faq_pairs(raw))

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'NO OCR. NO TEMPLATES. JUST TOUCHLESS AP.',
            'body': intro,
            'media': 'right',
            **({'image': image_by_keyword['ingestion']} if image_by_keyword.get('ingestion') else {}),
        }
    ]

    if downpour_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'From downpour to done',
                'body': downpour_body,
                'media': 'right',
            }
        )

    if cordis_stats:
        layout.append(
            {
                'type': 'stats',
                'variant': 'cards',
                'headline': 'What Cordis Did With Raindrop Systems',
                'description': cordis_footnote,
                'items': cordis_stats,
            }
        )

    if benefits:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 3,
                'headline': 'AP Automation Software: Key Benefits',
                'items': benefits,
            }
        )

    for headline, image_key, media in (
        ('Match and Validate Automatically', 'match', 'right'),
        ('Integrate and Pay', 'integrate', 'left'),
    ):
        section_body = extract_h3_section_body(raw, headline)
        if not section_body:
            continue
        split: dict = {
            'type': 'featureSplit',
            'headline': headline,
            'body': section_body,
            'media': media,
        }
        if image_by_keyword.get(image_key):
            split['image'] = image_by_keyword[image_key]
        layout.append(split)

    if suite_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Built Into the Full Source-to-Pay Suite',
                'body': suite_body,
                'media': 'right',
            }
        )

    if ask_rain_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Ask Rain',
                'body': ask_rain_body,
                'media': 'left',
            }
        )

    if customer_story_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Raindrop Systems in Action: A Customer Story',
                'body': customer_story_body,
                'media': 'right',
            }
        )

    if testimonial_items:
        layout.append({'type': 'testimonials', 'headline': '', 'items': testimonial_items})

    if analyst_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Recognized by the Analysts Who Watch This Space',
                'body': analyst_body,
                'media': 'right',
            }
        )

    if cta_body:
        layout.append(
            {
                'type': 'cta',
                'headline': 'See AP Automation In Action, Under 3 Months',
                'description': cta_body,
                'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
            }
        )

    if faq_items:
        layout.append({'type': 'faq', 'headline': 'FAQ', 'items': faq_items})

    layout.append(
        {
            'type': 'cta',
            'headline': 'Request a Demo',
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )
    return layout


def extract_rainpay_capability_cards(raw: str) -> list[dict[str, str]]:
    chunk = raw_section(
        raw,
        'Six Capabilities That Make Payments Part of the Workflow</h2>',
        'How RainPay Works</h2>',
    )
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'<strong>(.*?)</strong></h3></div><p[^>]*>(.*?)</p>',
        chunk,
        re.S,
    ):
        title = clean_text(html.unescape(match.group(1)))
        description = html_fragment_to_markdown(match.group(2))
        if title and description:
            items.append({'title': title, 'description': description})
    return items


def extract_rainpay_workflow_steps(raw: str) -> list[dict[str, str]]:
    chunk = raw_section(raw, 'How RainPay Works</h2>', 'Proof: What Embedding')
    items: list[dict[str, str]] = []
    for match in re.finditer(
        r'font-size:40px;color:#02DCCE;margin-bottom:10px;">(\d{2})</div><h3[^>]*>(.*?)</h3></div><p[^>]*>(.*?)</p>',
        chunk,
        re.S,
    ):
        title = f'{match.group(1)} {clean_text(match.group(2))}'
        description = html_fragment_to_markdown(match.group(3))
        if title and description:
            items.append({'title': title, 'description': description})
    return items


def extract_settlement_table_rows(raw: str) -> list[dict[str, str]]:
    chunk = raw_section(
        raw,
        'Settlement Times by Payment Method</h2>',
        'See RainPay in Your Workflow',
    )
    rows: list[dict[str, str]] = []
    for match in re.finditer(
        r'<td style="padding:18px 24px;font-weight:600;">(.*?)</td>'
        r'<td style="padding:18px 24px;color:#6F6681;">(.*?)</td>',
        chunk,
        re.S,
    ):
        left = clean_text(match.group(1))
        right = clean_text(match.group(2))
        if left and right:
            rows.append({'left': left, 'right': right})
    return rows


def layout_for_rainpay(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    hero_image = next(
        (record.id for record in records if 'rainpay-hero' in record.id),
        pick_image(records, 'hero', 0),
    )

    intro_match = re.search(
        r'ONE WORKFLOW,.*?EVERY PAYMENT.*?</h2>.*?'
        r'widget-container">\s*<p[^>]*>(.*?)</p>\s*</div>.*?'
        r'widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    intro = meta.get('description', '')
    if intro_match:
        tagline = html_fragment_to_markdown(f'<p>{intro_match.group(1)}</p>')
        body_para = html_fragment_to_markdown(f'<p>{intro_match.group(2)}</p>')
        intro = '\n\n'.join(part for part in (tagline, body_para) if part)

    payment_stats = extract_staatliches_72_stats(
        raw,
        'Embedded Payments by the Numbers</h2>',
        'What "Embedded" Actually Means',
    )
    embedded_body = extract_h2_section_full_body(
        raw, 'What "Embedded" Actually Means for Your AP Workflow'
    )
    capabilities = extract_rainpay_capability_cards(raw)

    how_intro_match = re.search(
        r'How RainPay Works</h2>.*?widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    how_intro = (
        html_fragment_to_markdown(f'<p>{how_intro_match.group(1)}</p>') if how_intro_match else ''
    )
    workflow_steps = extract_rainpay_workflow_steps(raw)
    proof_body = extract_h2_section_full_body(raw, 'Proof: What Embedding Payments Actually Changes')
    why_body = extract_h2_section_full_body(raw, 'Why RainPay (vs. Point Payment Solutions)')

    settlement_intro_match = re.search(
        r'Settlement Times by Payment Method</h2>.*?widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    settlement_intro = (
        html_fragment_to_markdown(f'<p>{settlement_intro_match.group(1)}</p>')
        if settlement_intro_match
        else ''
    )
    settlement_rows = extract_settlement_table_rows(raw)
    settlement_footer_match = re.search(
        r'Settlement Times by Payment Method</h2>.*?'
        r'<tbody>.*?</tbody></table>.*?widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    settlement_footer = (
        html_fragment_to_markdown(f'<p>{settlement_footer_match.group(1)}</p>')
        if settlement_footer_match
        else ''
    )

    cta_match = re.search(
        r'See RainPay in Your Workflow</h2>.*?widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    cta_body = html_fragment_to_markdown(f'<p>{cta_match.group(1)}</p>') if cta_match else ''
    faq_items = sanitize_faq_items(extract_faq_cz_acc(raw) or extract_faq_pairs(raw))

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'ONE WORKFLOW, EVERY PAYMENT',
            'body': intro,
            'media': 'right',
            **({'image': hero_image} if hero_image else {}),
        }
    ]

    if payment_stats:
        layout.append(
            {
                'type': 'stats',
                'variant': 'cards',
                'headline': 'Embedded Payments by the Numbers',
                'items': payment_stats,
            }
        )

    if embedded_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'What "Embedded" Actually Means for Your AP Workflow',
                'body': embedded_body,
                'media': 'right',
            }
        )

    if capabilities:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 3,
                'headline': 'Six Capabilities That Make Payments Part of the Workflow',
                'items': capabilities,
            }
        )

    if workflow_steps:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'How RainPay Works',
                'description': how_intro,
                'items': workflow_steps,
            }
        )

    if proof_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Proof: What Embedding Payments Actually Changes',
                'body': proof_body,
                'media': 'right',
            }
        )

    if why_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Why RainPay (vs. Point Payment Solutions)',
                'body': why_body,
                'media': 'left',
            }
        )

    if settlement_rows:
        settlement_items = [
            {'title': row['left'], 'description': row['right']} for row in settlement_rows
        ]
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'Settlement Times by Payment Method',
                'description': '\n\n'.join(
                    part for part in (settlement_intro, settlement_footer) if part
                ),
                'items': settlement_items,
            }
        )

    if cta_body:
        layout.append(
            {
                'type': 'cta',
                'headline': 'See RainPay in Your Workflow',
                'description': cta_body,
                'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
            }
        )

    if faq_items:
        layout.append({'type': 'faq', 'headline': 'FAQ', 'items': faq_items})

    layout.append(
        {
            'type': 'cta',
            'headline': 'Request a Demo',
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )
    return layout


def layout_for_e_invoicing(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    period_icon = next(
        (record.id for record in records if 'raindrop-period-teal' in record.id),
        None,
    )
    hero_image = next(
        (record.id for record in records if 'e-invoicing-hero' in record.id),
        pick_image(records, 'hero', 0),
    )

    intro_match = re.search(
        r'ONE API.*?EVERY MANDATE.*?</h2>.*?'
        r'widget-container">\s*<p[^>]*>(.*?)</p>\s*</div>.*?'
        r'widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    intro = meta.get('description', '')
    if intro_match:
        tagline = html_fragment_to_markdown(f'<p>{intro_match.group(1)}</p>')
        body_para = html_fragment_to_markdown(f'<p>{intro_match.group(2)}</p>')
        intro = '\n\n'.join(part for part in (tagline, body_para) if part)

    benchmark_stats = extract_e_invoicing_stat_cards(raw)
    stats_footnote_match = re.search(
        r'The Cost of Getting E-Invoicing Wrong</h2>.*?<p[^>]*>(.*?PwC.*?)</p>',
        raw,
        re.S | re.I,
    )
    stats_footnote = (
        html_fragment_to_markdown(stats_footnote_match.group(1)) if stats_footnote_match else ''
    )

    architectural_body = extract_h2_section_full_body(raw, 'One API, Many Mandates')
    if architectural_body:
        architectural_body = f'THE ARCHITECTURAL CHOICE\n\n{architectural_body}'

    delivers = extract_h3_strong_cards(
        raw,
        'What Raindrop Systems E-Invoicing Delivers</h2>',
        'Built to Last: ERP-Agnostic',
    )
    if period_icon:
        for card in delivers:
            card['image'] = period_icon

    built_to_last_body = extract_h2_section_full_body(
        raw, 'Built to Last: ERP-Agnostic and Future-Proof'
    )
    compliance_intro_match = re.search(
        r'Compliance Models, Explained</h2>.*?widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    compliance_intro = (
        html_fragment_to_markdown(f'<p>{compliance_intro_match.group(1)}</p>')
        if compliance_intro_match
        else ''
    )
    compliance_models = extract_e_invoicing_border_cards(
        raw,
        'Compliance Models, Explained</h2>',
        'Secure by Design</h2>',
    )
    secure_body = extract_h2_section_full_body(raw, 'Secure by Design')
    compliant_to_paid_body = extract_h2_section_full_body(raw, 'From Compliant Invoice to Paid Invoice')
    role_cards = extract_e_invoicing_border_cards(
        raw,
        'Built for Finance and IT Teams Working Across Borders</h2>',
        'Analyst and Industry Recognition</h2>',
        with_subtitle=False,
    )
    roles_chunk = raw_section(
        raw,
        'Built for Finance and IT Teams Working Across Borders</h2>',
        'Analyst and Industry Recognition</h2>',
    )
    roles_footer = ''
    for match in re.finditer(
        r'widget-container">\s*(.*?)\s*</div>\s*</div>\s*</div>',
        roles_chunk,
        re.S,
    ):
        inner = match.group(1)
        if 'border-top' not in inner and '<p' in inner:
            roles_footer = html_fragment_to_markdown(inner)

    analyst_body = extract_h2_section_full_body(raw, 'Analyst and Industry Recognition')
    simplify_match = re.search(
        r'Ready to Simplify Global E-Invoicing\?</h2>.*?widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    simplify_body = (
        html_fragment_to_markdown(f'<p>{simplify_match.group(1)}</p>') if simplify_match else ''
    )
    faq_items = sanitize_faq_items(extract_faq_cz_acc(raw) or extract_faq_pairs(raw))

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'ONE API, EVERY MANDATE',
            'body': intro,
            'media': 'right',
            **({'image': hero_image} if hero_image else {}),
        }
    ]

    if benchmark_stats:
        layout.append(
            {
                'type': 'stats',
                'variant': 'cards',
                'headline': 'The Cost of Getting E-Invoicing Wrong',
                'description': stats_footnote,
                'items': benchmark_stats,
            }
        )

    if architectural_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'One API, Many Mandates',
                'body': architectural_body,
                'media': 'right',
            }
        )

    if delivers:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 3,
                'headline': 'What Raindrop Systems E-Invoicing Delivers',
                'items': delivers,
            }
        )

    if built_to_last_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Built to Last: ERP-Agnostic and Future-Proof',
                'body': built_to_last_body,
                'media': 'left',
            }
        )

    if compliance_models:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 2,
                'headline': 'Compliance Models, Explained',
                'description': compliance_intro,
                'items': compliance_models,
            }
        )

    if secure_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Secure by Design',
                'body': secure_body,
                'media': 'right',
            }
        )

    if compliant_to_paid_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'From Compliant Invoice to Paid Invoice',
                'body': compliant_to_paid_body,
                'media': 'left',
            }
        )

    if role_cards:
        layout.append(
            {
                'type': 'featureGrid',
                'columns': 3,
                'headline': 'Built for Finance and IT Teams Working Across Borders',
                'description': roles_footer,
                'items': role_cards,
            }
        )

    if analyst_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Analyst and Industry Recognition',
                'body': analyst_body,
                'media': 'right',
            }
        )

    if simplify_body:
        layout.append(
            {
                'type': 'cta',
                'headline': 'Ready to Simplify Global E-Invoicing?',
                'description': simplify_body,
                'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
            }
        )

    if faq_items:
        layout.append({'type': 'faq', 'headline': 'FAQ', 'items': faq_items})

    layout.append(
        {
            'type': 'cta',
            'headline': 'Request a Demo',
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )
    return layout


def layout_for_analytics(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    period_icon = next(
        (record.id for record in records if 'raindrop-period-teal' in record.id),
        None,
    )
    intro_match = re.search(
        r'<h3>Clear the clouds</h3><p>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    intro = (
        html_fragment_to_markdown(f'<p>{intro_match.group(1)}</p>')
        if intro_match
        else meta.get('description', '')
    )
    hero_image = next(
        (record.id for record in records if record.id == 'analytics-hero' or 'analytics-hero' in record.id),
        pick_image(records, 'hero'),
    )
    image_by_keyword = {
        'unify': next((record.id for record in records if 'analytics-unify' in record.id), None),
        'insights': next((record.id for record in records if 'analytics-insights' in record.id), None),
        'configure': next((record.id for record in records if 'analytics-configure' in record.id), None),
    }

    benefits = extract_h3_strong_cards(raw, 'KEY BENEFITS</h2>', 'How It Works</h2>')
    if period_icon:
        for card in benefits:
            card['image'] = period_icon

    visibility_match = re.search(
        r'<h3>From Visibility to Action</h3>(.*?)</div></div></div>',
        raw,
        re.S | re.I,
    )
    visibility_body = (
        html_fragment_to_markdown(visibility_match.group(1)) if visibility_match else ''
    )
    faq_items = sanitize_faq_items(extract_faq_cz_acc(raw) or extract_faq_pairs(raw))

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'Clear the clouds',
            'body': intro,
            'media': 'right',
            **({'image': hero_image} if hero_image else {}),
        }
    ]

    if benefits:
        layout.append({'type': 'featureGrid', 'columns': 3, 'headline': 'KEY BENEFITS', 'items': benefits})

    for headline, image_key, media in (
        ('Unify Internal and External Data', 'unify', 'right'),
        ('Explore Insights, Out of the Box', 'insights', 'left'),
        ('Configure What Matters', 'configure', 'right'),
    ):
        section_body = extract_h2_section_body(raw, headline)
        if not section_body:
            continue
        split: dict = {
            'type': 'featureSplit',
            'headline': headline,
            'body': section_body,
            'media': media,
        }
        if image_by_keyword.get(image_key):
            split['image'] = image_by_keyword[image_key]
        layout.append(split)

    if visibility_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'From Visibility to Action',
                'body': visibility_body,
                'media': 'right',
            }
        )

    if faq_items:
        layout.append({'type': 'faq', 'headline': 'FAQ', 'items': faq_items})

    layout.append(
        {
            'type': 'cta',
            'headline': 'Request a Demo',
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )
    return layout


def layout_for_rainsign(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    period_icon = next(
        (record.id for record in records if 'raindrop-period-teal' in record.id),
        None,
    )
    intro_match = re.search(
        r'<h3>Sign-off without the storm</h3><p>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    intro = (
        html_fragment_to_markdown(f'<p>{intro_match.group(1)}</p>')
        if intro_match
        else meta.get('description', '')
    )
    hero_image = pick_image(records, 'hero') or next(
        (record.id for record in records if 'rainsign-hero' in record.id),
        None,
    )
    image_by_keyword = {
        'initiate': next((record.id for record in records if 'initiate' in record.id), None),
        'audit': next((record.id for record in records if 'audit' in record.id), None),
        'monitor': next((record.id for record in records if 'monitor' in record.id), None),
    }

    benefits = extract_module_benefit_cards(raw, 'Initiate Signing')
    if period_icon:
        for card in benefits:
            card['image'] = period_icon

    integration_match = re.search(
        r'<h3>Seamless Integration Across Workflows</h3>(.*?)</div></div></div>',
        raw,
        re.S | re.I,
    )
    integration_body = (
        html_fragment_to_markdown(integration_match.group(1)) if integration_match else ''
    )
    faq_items = sanitize_faq_items(extract_faq_cz_acc(raw) or extract_faq_pairs(raw))

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'Sign-off without the storm',
            'body': intro,
            'media': 'right',
            **({'image': hero_image} if hero_image else {}),
        }
    ]

    if benefits:
        layout.append({'type': 'featureGrid', 'columns': 3, 'headline': 'KEY BENEFITS', 'items': benefits})

    for headline, image_key, media in (
        ('Initiate Signing in Raindrop', 'initiate', 'right'),
        ('Audit Ready, Always', 'audit', 'left'),
        ('Monitor Progress', 'monitor', 'right'),
    ):
        section_body = extract_h2_section_body(raw, headline)
        if not section_body:
            continue
        split: dict = {
            'type': 'featureSplit',
            'headline': headline,
            'body': section_body,
            'media': media,
        }
        if image_by_keyword.get(image_key):
            split['image'] = image_by_keyword[image_key]
        layout.append(split)

    if integration_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Seamless Integration Across Workflows',
                'body': integration_body,
                'media': 'right',
            }
        )

    if faq_items:
        layout.append({'type': 'faq', 'headline': 'FAQ', 'items': faq_items})

    layout.append(
        {
            'type': 'cta',
            'headline': 'Request a Demo',
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )
    return layout


def layout_for_eprocurement(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    period_icon = next(
        (record.id for record in records if 'raindrop-period-teal' in record.id),
        None,
    )
    intro_match = re.search(
        r'<h3>Effortless purchasing, no umbrella required[^<]*</h3>(.*?)</div></div></div>',
        raw,
        re.S | re.I,
    )
    intro = (
        html_fragment_to_markdown(intro_match.group(1)) if intro_match else meta.get('description', '')
    )
    hero_image = next(
        (record.id for record in records if record.id == 'eprocurement' or record.id.endswith('eprocurement')),
        pick_image(records, 'ui', 0),
    )
    image_by_keyword = {
        'intake': next((record.id for record in records if 'intake' in record.id), None),
        'shop': next((record.id for record in records if 'shop' in record.id), None),
        'approve': next((record.id for record in records if 'approve' in record.id), None),
    }

    benefits = extract_module_benefit_cards(raw, 'Smart Intake')
    if period_icon:
        for card in benefits:
            card['image'] = period_icon

    compliance_match = re.search(
        r'<h3>Built for Visibility and Compliance</h3>(.*?)</div></div></div>',
        raw,
        re.S | re.I,
    )
    compliance_body = (
        html_fragment_to_markdown(compliance_match.group(1)) if compliance_match else ''
    )
    faq_items = sanitize_faq_items(extract_faq_cz_acc(raw) or extract_faq_pairs(raw))

    layout: list[dict] = [
        {
            'type': 'featureSplit',
            'headline': 'Effortless purchasing, no umbrella required',
            'body': intro,
            'media': 'right',
            **({'image': hero_image} if hero_image else {}),
        }
    ]

    if benefits:
        layout.append({'type': 'featureGrid', 'columns': 3, 'headline': 'KEY BENEFITS', 'items': benefits})

    for prefix, image_key, media in (
        ('Smart Intake', 'intake', 'right'),
        ('Ask, Shop', 'shop', 'left'),
        ('Route, Approve', 'approve', 'right'),
    ):
        headline, section_body = extract_clm_h2_section(raw, prefix)
        if not section_body:
            continue
        split: dict = {
            'type': 'featureSplit',
            'headline': headline or prefix,
            'body': section_body,
            'media': media,
        }
        if image_by_keyword.get(image_key):
            split['image'] = image_by_keyword[image_key]
        layout.append(split)

    if compliance_body:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Built for Visibility and Compliance',
                'body': compliance_body,
                'media': 'right',
            }
        )

    if faq_items:
        layout.append({'type': 'faq', 'headline': 'FAQ', 'items': faq_items})

    layout.append(
        {
            'type': 'cta',
            'headline': 'Request a Demo',
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
        }
    )
    return layout


def record_id_by_hint(records: list[ImageRecord], *hints: str) -> str | None:
    for record in records:
        if record.download_failed:
            continue
        record_id = record.id.lower()
        for hint in hints:
            normalized = hint.lower().replace('_', '-').replace(' ', '-')
            if normalized in record_id:
                return record.id
    return None


def extract_h2_section_paragraphs(raw: str, headline_prefix: str) -> tuple[str, list[str]]:
    match = re.search(
        rf'<h2[^>]*>\s*([^<]*{re.escape(headline_prefix)}[^<]*)</h2>(.*?)(?=<h2[^>]*>|class="cz_related_post|\Z)',
        raw,
        re.S | re.I,
    )
    if not match:
        return '', []

    title = clean_text(html.unescape(match.group(1)))
    chunk = match.group(2)
    paragraphs: list[str] = []
    seen: set[str] = set()
    for paragraph_match in re.finditer(r'<p[^>]*>(.*?)</p>', chunk, re.S):
        text = html_fragment_to_markdown(f'<p>{paragraph_match.group(1)}</p>')
        if len(text) < 30 or text in seen:
            continue
        if 'download now' in text.lower():
            continue
        seen.add(text)
        paragraphs.append(text)
    return title, paragraphs


def extract_article_intro(raw: str, meta: dict[str, str]) -> str:
    match = re.search(
        r'<h1[^>]*>.*?</h1>.*?widget-container">\s*<p[^>]*>(.*?)</p>',
        raw,
        re.S | re.I,
    )
    if match:
        return html_fragment_to_markdown(f'<p>{match.group(1)}</p>')
    return meta.get('description', '')


def extract_related_posts_from_article(
    raw: str, slug: str, records: list[ImageRecord]
) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()

    for start in (match.start() for match in re.finditer(r'cz_related_post col', raw)):
        block = raw[start : start + 2500]
        href_match = re.search(r'cz_post_title[^>]*href="(https://raindrop.com/[^"#]+)"', block)
        title_match = re.search(r'<h3[^>]*>([^<]+)</h3>', block)
        image_match = re.search(r'src="(https://[^"]+uploads[^"]+)"', block)
        category_match = re.search(r'category/[^"]+"[^>]*>([^<]+)', block)
        if not href_match or not title_match:
            continue

        href = href_match.group(1).rstrip('/')
        if href in seen:
            continue
        seen.add(href)

        title = clean_text(html.unescape(title_match.group(1)))
        item: dict[str, str] = {
            'title': title,
            'href': local_path_from_url(href),
            'excerpt': clean_text(category_match.group(1)) if category_match else 'Articles',
        }
        if image_match:
            image_id = ensure_resource_image(slug, records, image_match.group(1), title)
            if image_id:
                item['image'] = image_id
        items.append(item)

    return items


def layout_for_hype_cycle_article(
    meta: dict[str, str], records: list[ImageRecord], raw: str, body: str
) -> list[dict]:
    layout: list[dict] = []

    intro = extract_article_intro(raw, meta)
    if intro:
        intro_block: dict = {
            'type': 'featureSplit',
            'headline': meta.get('h1') or meta.get('title', ''),
            'body': intro,
            'media': 'right',
        }
        hero_image = record_id_by_hint(records, 'agent-washing-social-post-5-1024')
        if hero_image:
            intro_block['image'] = hero_image
        layout.append(intro_block)

    for prefix, image_hint, media in (
        ('Raindrop Positioned', 'screenshot-2026-07-22', 'right'),
        ('Recognized by Customers', 'what-features-should', 'left'),
    ):
        title, paragraphs = extract_h2_section_paragraphs(raw, prefix)
        if not paragraphs:
            continue
        split: dict = {
            'type': 'featureSplit',
            'headline': title,
            'body': '\n\n'.join(paragraphs),
            'media': media,
        }
        image_id = record_id_by_hint(records, image_hint)
        if image_id:
            split['image'] = image_id
        layout.append(split)

    download_paragraphs: list[str] = []
    for section_match in re.finditer(
        r'<h2[^>]*>\s*([^<]*Request to Download[^<]*)</h2>(.*?)(?=<h2[^>]*>|class="cz_related_post|\Z)',
        raw,
        re.S | re.I,
    ):
        for paragraph_match in re.finditer(r'<p[^>]*>(.*?)</p>', section_match.group(2), re.S):
            text = html_fragment_to_markdown(f'<p>{paragraph_match.group(1)}</p>')
            if len(text) >= 30 and text not in download_paragraphs:
                download_paragraphs.append(text)

    if download_paragraphs:
        download_block: dict = {
            'type': 'featureSplit',
            'headline': 'Request to Download',
            'body': '\n\n'.join(download_paragraphs),
            'media': 'right',
        }
        image_id = record_id_by_hint(records, 'what-are-the-key-benefits')
        if image_id:
            download_block['image'] = image_id
        layout.append(download_block)

    _, disclaimer_paragraphs = extract_h2_section_paragraphs(raw, 'Gartner Disclaimer')
    legal_paragraphs = [
        paragraph
        for paragraph in disclaimer_paragraphs
        if any(keyword in paragraph for keyword in ('Gartner', 'GARTNER', 'This graphic'))
    ]
    if legal_paragraphs:
        layout.append(
            {
                'type': 'featureSplit',
                'headline': 'Gartner Disclaimer:',
                'body': '\n\n'.join(legal_paragraphs[:4]),
                'media': 'right',
            }
        )

    related_posts = extract_related_posts_from_article(
        raw, meta.get('slug', 'hype-cycle-for-procurement-sourcing-2026'), records
    )
    if related_posts:
        layout.append({'type': 'resourceList', 'headline': 'Related Posts', 'items': related_posts})

    if layout:
        return layout

    return layout_without_hero(generic_layout([], meta, records, raw, body))


FOOTER_MARKERS = (
    '## Contact Us',
    '### Contact Us',
    '### Resources',
    '### [SEE ALL RESOURCES',
    'Posts pagination',
    '### Sitemap',
    '## READY TO SEE THE DIFFERENCE',
    '### Frequently Asked Questions',
    '#### Related Posts',
    'Comments are disabled',
)


def trim_body_footer(body: str) -> str:
    cut = len(body)
    for marker in FOOTER_MARKERS:
        idx = body.find(marker)
        if idx != -1:
            cut = min(cut, idx)
    return body[:cut].strip()


def hero_image_from_raw(raw: str, records: list[ImageRecord]) -> str | None:
    parts = raw.split('elementor-top-section')
    for part in parts[1:4]:
        if '<h1' not in part[:12000].lower():
            continue
        urls = [
            urllib.parse.urljoin(BASE, match)
            for match in re.findall(r'<img[^>]+src="([^"]+)"', part[:20000], re.I)
            if not SKIP_URL_RE.search(match)
        ]
        for url in urls:
            key = url.split('?')[0]
            for record in records:
                if record.download_failed or record.reused or record.role not in {'ui', 'hero', 'portrait'}:
                    continue
                if record.source_url.split('?')[0] == key:
                    return record.id
        break
    return None


def parse_h4_lines(content: str) -> list[str]:
    return [clean_text(line) for line in re.findall(r'^#### (.+)$', content, re.M)]


def looks_like_stat_value(text: str) -> bool:
    return bool(
        re.match(r'^[\d~$]', text)
        or '%' in text
        or '×' in text
        or re.search(r'\d+\s*[–-]\s*\d+', text)
        or text.upper() in {'ROI', 'REDUCTION', 'FASTER', 'COST', 'CYCLE', 'LIVE'}
    )


def parse_stats_items(h4s: list[str]) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    index = 0
    while index + 2 < len(h4s):
        if looks_like_stat_value(h4s[index]):
            items.append({'value': h4s[index], 'label': h4s[index + 1], 'description': h4s[index + 2]})
            index += 3
        else:
            index += 1
    return items


def split_h3_blocks(content: str) -> list[tuple[str, str]]:
    parts = re.split(r'^(### .+)$', content, flags=re.M)
    blocks: list[tuple[str, str]] = []
    for index in range(1, len(parts), 2):
        title = parts[index][4:].strip()
        body = parts[index + 1] if index + 1 < len(parts) else ''
        blocks.append((title, body))
    return blocks


def role_grid_items(blocks: list[tuple[str, str]]) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for title, body in blocks:
        lines = parse_h4_lines(body)
        if not lines:
            continue
        description = ' · '.join(lines) if len(lines) > 1 else lines[0]
        items.append({'title': title, 'description': description})
    return items


def extract_final_cta(body: str) -> dict | None:
    match = re.search(
        r'## (READY TO SEE[^\n]+)\n\n#### (.+?)(?=\n\n### |\n\n## |\Z)',
        body,
        re.S | re.M,
    )
    if not match:
        return None
    return {
        'type': 'cta',
        'headline': clean_text(match.group(1)),
        'description': clean_text(match.group(2)),
        'primaryCta': {'label': 'Book a Demo', 'href': '/contact/get-started'},
        'secondaryCta': {'label': 'Explore the full platform', 'href': '/solutions/platform'},
    }


def layout_from_body(
    body: str, meta: dict[str, str], records: list[ImageRecord], raw: str, sections: list[Section]
) -> list[dict]:
    trimmed = trim_body_footer(body)
    hero_image = hero_image_from_raw(raw, records)

    layout: list[dict] = [
        {
            'type': 'hero',
            'variant': 'split-right-media' if hero_image else 'centered-stack',
            'headline': meta.get('h1') or meta.get('title', ''),
            'subheadline': meta.get('description', ''),
            'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
            **({'image': hero_image} if hero_image else {}),
        }
    ]

    ui_images = [
        record.id
        for record in records
        if record.role == 'ui' and not record.download_failed and not record.reused
    ]
    if hero_image and hero_image in ui_images:
        ui_images = [image_id for image_id in ui_images if image_id != hero_image]
    ui_index = 0

    def next_ui_image() -> str | None:
        nonlocal ui_index
        if ui_index >= len(ui_images):
            return None
        image_id = ui_images[ui_index]
        ui_index += 1
        return image_id

    content = re.sub(r'^# .+\n+', '', trimmed, count=1)
    leading_match = re.match(r'^(.*?)(?=^### )', content, re.S | re.M)
    if leading_match:
        leading_h4s = parse_h4_lines(leading_match.group(1))
        if leading_h4s:
            layout[0]['subheadline'] = leading_h4s[0] if len(leading_h4s) == 1 else ' '.join(leading_h4s[:2])
            if len(leading_h4s) > 1:
                intro_split: dict = {
                    'type': 'featureSplit',
                    'headline': meta.get('h1') or meta.get('title', ''),
                    'body': '\n\n'.join(leading_h4s[1:]),
                    'media': 'right',
                }
                intro_image = next_ui_image()
                if intro_image:
                    intro_split['image'] = intro_image
                layout.append(intro_split)
    split_index = 0
    skip_h3_titles = {'contact us', 'sitemap', 'resources'}

    def append_h3_block(title: str, block_body: str) -> None:
        nonlocal split_index
        h4s = parse_h4_lines(block_body)
        lower_title = title.lower()
        if 'faq' in lower_title or lower_title in skip_h3_titles:
            return
        if not h4s and not clean_text(block_body):
            return

        stats = parse_stats_items(h4s)
        if len(stats) >= 2:
            layout.append({'type': 'stats', 'headline': title, 'items': stats})
            return

        quote_match = re.search(r'[“"]([^”"]{30,})[”"]\s*[—–-]\s*(.+)', block_body)
        if quote_match:
            layout.append(
                {
                    'type': 'testimonials',
                    'headline': title,
                    'items': [{'quote': clean_text(quote_match.group(1)), 'author': clean_text(quote_match.group(2)), 'role': ''}],
                }
            )
            return

        if len(h4s) >= 3 and all(len(line) < 120 for line in h4s):
            layout.append(
                {
                    'type': 'featureGrid',
                    'columns': 3 if len(h4s) >= 6 else 2,
                    'headline': title,
                    'items': [{'title': line, 'description': ''} for line in h4s[:12]],
                }
            )
            return

        if len(h4s) >= 2 and all(len(line) < 100 for line in h4s):
            split = {
                'type': 'featureSplit',
                'headline': title,
                'body': ' · '.join(h4s),
                'media': 'left' if split_index % 2 else 'right',
            }
            image_id = next_ui_image()
            if image_id:
                split['image'] = image_id
            layout.append(split)
            split_index += 1
            return

        body_text = '\n\n'.join(h4s) if h4s else clean_text(block_body)
        split: dict = {
            'type': 'featureSplit',
            'headline': title,
            'body': body_text,
            'media': 'left' if split_index % 2 else 'right',
        }
        image_id = next_ui_image()
        if image_id:
            split['image'] = image_id
        layout.append(split)
        split_index += 1

    h2_parts = re.split(r'^(## .+)$', content, flags=re.M)
    if len(h2_parts) <= 1:
        for title, block_body in split_h3_blocks(content):
            append_h3_block(title, block_body)
    else:
        for title, block_body in split_h3_blocks(h2_parts[0]):
            append_h3_block(title, block_body)
        for index in range(1, len(h2_parts), 2):
            h2_title = h2_parts[index][3:].strip()
            h2_body = h2_parts[index + 1] if index + 1 < len(h2_parts) else ''
            h3_blocks = split_h3_blocks(h2_body)
            if len(h3_blocks) >= 2:
                grid_items: list[dict[str, str]] = []
                for title, block_body in h3_blocks:
                    if title.lower() in skip_h3_titles:
                        continue
                    h4s = parse_h4_lines(block_body)
                    description = ' · '.join(h4s) if h4s else clean_text(block_body)
                    grid_items.append({'title': title, 'description': description})
                if grid_items and (
                    len(grid_items) >= 3
                    or any(keyword in h2_title.lower() for keyword in ('trusted', 'benefit', 'case', 'customer', 'role'))
                ):
                    layout.append({'type': 'featureGrid', 'columns': 2, 'headline': h2_title, 'items': grid_items})
                    continue
            if h3_blocks:
                for title, block_body in h3_blocks:
                    append_h3_block(title, block_body)
            else:
                paragraph = '\n\n'.join(parse_h4_lines(h2_body))
                if paragraph:
                    append_h3_block(h2_title, paragraph)

    left_title, right_title, comparison_rows = extract_comparison_from_raw(raw)
    if comparison_rows and not any(item.get('type') == 'comparisonTable' for item in layout):
        layout.append(
            {
                'type': 'comparisonTable',
                'headline': 'From Answers to Action',
                'leftTitle': left_title,
                'rightTitle': right_title,
                'rows': comparison_rows,
            }
        )

    faq_items = sanitize_faq_items(
        extract_faq_cz_acc(raw) or extract_faq_pairs(raw) or extract_faq_from_body(body)
    )
    if faq_items and not any(item.get('type') == 'faq' for item in layout):
        layout.append({'type': 'faq', 'headline': 'Frequently Asked Questions', 'items': faq_items})

    logos = [record.id for record in records if record.role == 'logo' and not record.reused and not record.download_failed]
    if logos and not any(item.get('type') == 'logoCloud' for item in layout):
        logo_headline = next(
            (heading for section in sections for heading in section.headings if 'trusted' in heading.lower() or 'customer' in heading.lower()),
            'Trusted by industry leaders',
        )
        if any(keyword in body.lower() for keyword in ('customer', 'trusted', 'logo', 'williams', 'sephora')):
            layout.append({'type': 'logoCloud', 'headline': logo_headline, 'images': logos[:12]})

    testimonials = extract_testimonials_from_body(body)
    if testimonials and not any(item.get('type') == 'testimonials' for item in layout):
        layout.append({'type': 'testimonials', 'headline': 'What customers say', 'items': testimonials})

    for section in sections[1:10]:
        if section.has_accordion and not any(item.get('type') == 'faq' for item in layout):
            faq_items = extract_faq_cz_acc(raw) or extract_faq_pairs(raw)
            if faq_items:
                layout.append({'type': 'faq', 'headline': section.headings[0] if section.headings else 'FAQ', 'items': faq_items})

    if not any(item.get('type') == 'cta' for item in layout):
        final_cta = extract_final_cta(body)
        layout.append(
            final_cta
            or {
                'type': 'cta',
                'headline': 'Request a Demo',
                'primaryCta': {'label': 'Request a Demo', 'href': '/contact/get-started'},
            }
        )

    return layout


def layout_without_hero(layout: list[dict]) -> list[dict]:
    hero = next((block for block in layout if block.get('type') == 'hero'), None)
    blocks = [block for block in layout if block.get('type') != 'hero']
    if not hero:
        return blocks
    if hero.get('subheadline') and not any(
        block.get('type') == 'featureSplit' and block.get('body') == hero.get('subheadline')
        for block in blocks
    ):
        intro: dict = {
            'type': 'featureSplit',
            'headline': hero.get('headline', ''),
            'body': hero.get('subheadline', ''),
            'media': 'right',
        }
        if hero.get('image'):
            intro['image'] = hero['image']
        blocks.insert(0, intro)
    return blocks


def generic_layout(
    sections: list[Section], meta: dict[str, str], records: list[ImageRecord], raw: str, body: str = ''
) -> list[dict]:
    if body:
        return layout_from_body(body, meta, records, raw, sections)
    return layout_from_body(body_markdown(raw, meta), meta, records, raw, sections)


def build_layout(
    slug: str, sections: list[Section], meta: dict[str, str], records: list[ImageRecord], raw: str, body: str = ''
) -> list[dict]:
    if not body:
        body = body_markdown(raw, meta)
    if slug == 'contact/get-started':
        return [{'type': 'formEmbed', 'headline': meta.get('h1') or 'Request a Demo'}]
    if slug == 'contact':
        return layout_for_contact(meta, records, raw, body)
    if slug == 'legal':
        return layout_for_legal(meta, raw)
    if slug == 'legal/privacy':
        return layout_for_privacy_policy(meta, raw)
    if slug == 'security':
        return layout_for_security(meta, records, raw)
    if slug == 'home':
        return layout_for_home(sections, meta, records, raw, body)
    if slug == 'agentic-procurement':
        return layout_for_agentic_procurement(meta, records, raw, body)
    if slug == 'hype-cycle-for-procurement-sourcing-2026':
        return layout_for_hype_cycle_article(meta, records, raw, body)
    if slug == 'solutions/modules/contract-lifecycle-management':
        return layout_for_clm(sections, meta, records, raw, body)
    if slug == 'solutions/modules/rainsign':
        return layout_for_rainsign(meta, records, raw, body)
    if slug == 'solutions/modules/eprocurement':
        return layout_for_eprocurement(meta, records, raw, body)
    if slug == 'solutions/modules/e-invoicing':
        return layout_for_e_invoicing(meta, records, raw, body)
    if slug == 'solutions/modules/ap-automation':
        return layout_for_ap_automation(meta, records, raw, body)
    if slug == 'solutions/modules/rainpay':
        return layout_for_rainpay(meta, records, raw, body)
    if slug == 'solutions/modules/analytics':
        return layout_for_analytics(meta, records, raw, body)
    if slug == 'company':
        return layout_for_company(meta, records, raw, body)
    if slug == 'company/raindrop-team':
        return layout_for_raindrop_team(meta, records, raw, body)
    if slug == 'company/advisor-team':
        return layout_for_company_team(meta, records, raw, body, default_role='Advisor')
    if slug == 'why-raindrop':
        return layout_for_why_raindrop(meta, records, raw, body)
    if slug == 'why-raindrop/ai-powered':
        return layout_for_ai_powered(meta, records, raw, body)
    if slug == 'ai-native-procurement':
        return layout_for_ai_native_procurement(meta, records, raw, body)
    if slug == 'resources':
        return layout_for_resources(meta, records)
    if slug == 'resources/recognition':
        return layout_for_recognition(meta, records)
    if slug == 'resources/articles':
        return layout_for_articles(meta, records)
    if slug == 'resources/case-studies':
        return layout_for_case_studies(meta, records)
    if slug == 'resources/raindrop-news':
        return layout_for_raindrop_news(meta, records)
    if slug == 'resources/videos':
        return layout_for_videos(meta, records)
    if slug == 'resources/podcasts':
        return layout_for_podcasts(meta, records)
    if slug == 'solutions':
        return layout_for_solutions(meta, records, raw)
    if slug == 'solutions/platform':
        return layout_for_platform(meta, records, raw)
    if slug == 'solutions/modules':
        return layout_for_modules(meta, records, raw)
    if slug == 'solutions/platform/key-components':
        return layout_without_hero(generic_layout(sections, meta, records, raw, body))
    if slug == 'solutions/raindrop-integrates-anywhere':
        return layout_for_integrates_anywhere(meta, records, raw, body)
    if slug == 'why-raindrop/our-expertise':
        return layout_for_our_expertise(meta, records, body, raw)
    if slug == 'why-raindrop/customer-success-stories':
        return layout_for_customer_success_stories(meta, records, body, raw)
    return layout_without_hero(generic_layout(sections, meta, records, raw, body))


def extract_meta(raw: str) -> dict[str, str]:
    title_match = re.search(r'<title>([^<]*)</title>', raw, re.I)
    title = clean_text(title_match.group(1)) if title_match else ''
    title = re.sub(r'\s*[-|–]\s*Raindrop(?: Systems)?\s*$', '', title, flags=re.I)
    desc_match = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', raw, re.I)
    description = clean_text(desc_match.group(1)) if desc_match else ''
    h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', raw, re.S | re.I)
    h1 = clean_text(h1_match.group(1)) if h1_match else title
    return {'title': title, 'description': description, 'h1': h1}


def body_markdown(raw: str, meta: dict[str, str]) -> str:
    parser = ContentExtractor()
    parser.feed(raw)
    lines = [f'# {meta["h1"]}', '']
    seen: set[str] = set()
    for block in parser.blocks:
        key = block.lower()
        if key in seen:
            continue
        seen.add(key)
        lines.append(block)
        lines.append('')
    seen_ctas: set[str] = set()
    for label, href in parser.ctas[:8]:
        key = f'{label}|{href}'
        if key in seen_ctas:
            continue
        seen_ctas.add(key)
        lines.append(f'- [{label}]({href})')
    return '\n'.join(lines).strip() + '\n'


def scrape_site_assets(raw: str) -> None:
    SITE_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    links = re.findall(r'<link[^>]+rel="(?:icon|apple-touch-icon|shortcut icon)"[^>]+href="([^"]+)"', raw, re.I)
    links += re.findall(r'<link[^>]+href="([^"]+)"[^>]+rel="(?:icon|apple-touch-icon|shortcut icon)"', raw, re.I)
    for href in dict.fromkeys(links):
        url = href if href.startswith('http') else urllib.parse.urljoin(BASE, href)
        filename = sanitize_filename(url)
        dest = SITE_ASSETS_DIR / filename
        if dest.exists():
            continue
        download_image(url, dest)


@dataclass
class LayoutRow:
    slug: str
    blocks: list[str]
    image_count: int


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    layout_rows: list[LayoutRow] = []

    site_raw = fetch('/')[1]
    scrape_site_assets(site_raw)

    paths = NAV_PATHS
    if len(sys.argv) > 1:
        selected = set(sys.argv[1:])
        nav_slugs = {path_to_slug(path) for path in NAV_PATHS}
        paths = [path for path in NAV_PATHS if path_to_slug(path) in selected]
        paths.extend(f'/{slug}' for slug in sorted(selected - nav_slugs))
        if not paths:
            print(f'No matching slugs in: {", ".join(sys.argv[1:])}', file=sys.stderr)
            return 1

    for path in paths:
        slug = path_to_slug(path)
        filename = path_to_filename(slug)
        out_path = OUT_DIR / filename

        try:
            final_url, raw = fetch(path)
        except Exception as exc:  # noqa: BLE001
            print(f'FAIL {slug}: {exc}', file=sys.stderr)
            continue

        meta = extract_meta(raw)
        meta['source_url'] = final_url
        meta['slug'] = slug
        records = process_images(slug, raw)
        sections = parse_sections(raw)
        body = body_markdown(raw, meta)
        layout = build_layout(slug, sections, meta, records, raw, body)

        images_yaml = [
            {
                'id': record.id,
                'src': record.src,
                'alt': record.alt,
                'role': record.role,
                'source_url': record.source_url,
                **({'reused': True} if record.reused else {}),
                **({'download_failed': True} if record.download_failed else {}),
            }
            for record in records
        ]

        front = [
            '---',
            f'source_url: {final_url}',
            f'title: {yaml_quote(meta["title"])}',
            f'description: {yaml_quote(meta["description"])}',
            f'h1: {yaml_quote(meta["h1"])}',
            f'slug: {slug}',
            'layout:',
            yaml_dump(layout, indent=1),
            'images:',
            yaml_dump(images_yaml, indent=1),
            '---',
            '',
        ]

        out_path.write_text('\n'.join(front) + body, encoding='utf-8')
        block_types = [str(item.get('type', '?')) for item in layout]
        layout_rows.append(LayoutRow(slug=slug, blocks=block_types, image_count=len(records)))
        print(f'OK {slug} ({len(records)} images, {len(layout)} blocks)')

    print('\n## Layout map\n')
    print('| slug | blocks | images |')
    print('| --- | --- | --- |')
    for row in layout_rows:
        print(f'| {row.slug} | {" → ".join(row.blocks)} | {row.image_count} |')

    return 0


if __name__ == '__main__':
    sys.exit(main())
