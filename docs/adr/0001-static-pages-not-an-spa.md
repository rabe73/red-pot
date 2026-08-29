# ADR 0001 — Static pages per language, not a single-page app

Status: Accepted

## Context

The site carries five launch languages (EN, DE, FR, ES, IT) and, at launch,
perhaps five pages each: what the app is, privacy, support, press, imprint. It
is hosted on GitHub Pages, which serves files and does nothing else — no
server-side language negotiation, no rewrites, no runtime.

## Decision

**Pre-rendered static HTML, one directory per language.** `/de/privacy.html`,
`/en/privacy.html`, and so on. No client-side routing, no framework, no
hydration.

### Why not an SPA with runtime i18n

**Five languages need five indexable URLs, and an SPA has one.** A page that
swaps its strings in the browser is a single URL to a crawler; the other four
languages effectively do not exist for search. Fixing that means pre-rendering
per language — at which point the SPA is a slower way to arrive at this design.

**The privacy and support URLs must load, always.** App Store Connect requires
both, a reviewer opens them, and so may a data-protection authority. Static HTML
loads with JavaScript disabled, on an old browser, behind a corporate proxy, in
a webview. A framework bundle has more ways to fail, and the failure mode is a
blank page on the one URL that must never be blank.

**It is content, not an application.** Nothing here has state, routes between
views, or talks to an API. There is no backend at all — ADR 0019 in the app
repository made that true again — and a site with no data to fetch has nothing
to be dynamic about.

**Accessibility comes nearly free.** Real headings, real links, real landmarks,
no focus management to get wrong. The app repository carries accessibility as an
open gap (B2); the site should not add a second front.

**It matches the rest of the project.** Offline-first, no infrastructure,
nothing shipped that cannot be read. A marketing site built on a framework the
project uses nowhere else would be the one component nobody can maintain in two
years.

### Why no static site generator either

Eleventy, Astro, Hugo and Jekyll would all work. None earns its dependency here.

Content is **HTML fragments**, one per page per language, wrapped by a
dependency-free Python build script — the same shape as `tools/corpus` in the
app repository, and for the same reason: a build that needs nothing but Python 3
still runs in five years, and a legal text benefits from exact control over its
markup rather than from a Markdown dialect's interpretation of it.

Twenty-five small pages do not need an incremental build, a plugin ecosystem or
a lockfile.

## Language handling

- Every language lives under its own prefix. English is also the fallback.
- The root `index.html` reads `navigator.languages`, redirects to a matching
  prefix, and falls back to English. It contains a real list of language links
  in `<noscript>`, so it works without JavaScript — the redirect is a
  convenience, never the only way through.
- Every page carries `hreflang` alternates for all built languages plus
  `x-default`, so search engines are told about the set rather than left to
  infer it.
- **A language is complete or it is not built.** Same rule as the corpus (app
  repository, ADR 0017): a half-translated site means a French page title over a
  German privacy policy, and the browser's own fallback never fires because the
  language appears to exist. `build.py` fails on a missing page.

## What it costs

**Adding a page means adding it five times.** That is the honest cost of five
languages, and it is the same cost the app's corpus already pays. The build
enforces it rather than letting the site rot into a partly-translated state.

**No preview of unpublished content.** There is no CMS and no draft mode; the
branch is the draft. For a five-page site that is a feature.
