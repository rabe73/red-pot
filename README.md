# Red Pot — website

Static site for the Red Pot app: what it is, privacy, support, imprint. Five
launch languages. No framework, no dependencies, no server.

Design rationale: [ADR 0001](docs/adr/0001-static-pages-not-an-spa.md).

## Layout

```
content/
├── site.json        locales, pages, navigation and UI strings
└── <lang>/          one HTML fragment per page
theme/
├── base.html        the page skeleton
└── style.css
brand/               the icon, and where its colours come from
assets/              generated images — do not edit by hand
build.py             wraps fragments, writes dist/
tools/checkhtml.py   fails on malformed HTML
tools/makeicons.py   regenerates assets/ from brand/ (needs Pillow)
```

The site build is dependency-free and runs in CI. `makeicons.py` needs Pillow
and runs by hand on the rare occasion the artwork changes; its output is
committed, so CI never installs anything.

## Build

```bash
python3 build.py            # -> dist/
python3 build.py --check    # validate only
python3 tools/checkhtml.py dist
```

Open `dist/index.html` in a browser; the tree works from the filesystem as well
as from a server, because page links are bare filenames.

## Languages

`content/site.json` declares `requiredLocales` (de, en) and `plannedLocales`
(fr, es, it — the plan's five launch languages).

**A language is complete or it is not built.** A required locale missing a page
fails the build; a planned locale missing a page is skipped entirely and the
build says so. Half a language is worse than none: browsers fall back per
language, not per page, so a French visitor would get a French page title over a
German privacy policy and no fallback would ever fire. Same rule as the app's
recipe corpus (app repository, ADR 0017), and for the same reason.

The remaining three languages are translated shortly before the first release,
together — not now, while the wording is still moving.

## Adding a page

1. Add it to `pages` in `content/site.json`, and its label to `ui.<lang>.nav`
   for **every** locale in the file.
2. Write `content/<lang>/<slug>.html` for every required locale. It is a
   fragment: start at `<h1>`, no `<html>`, `<head>` or `<body>`.
3. Give it a `<p class="lede">` — that becomes the meta description and the
   Open Graph summary. The title comes from the `<h1>`.
4. `python3 build.py && python3 tools/checkhtml.py dist`

## Publishing

GitHub Actions builds **every branch** and checks it: the site builds, the HTML
parses, no template placeholder survived. Only `main` deploys to GitHub Pages.

That split is deliberate. The privacy and support URLs are the ones an App Store
reviewer opens, and a broken build should fail in CI rather than on the live
page.

## Status

Content is a first draft. `brand/README.md` lists three things about the icon
that need fixing before submission — it is a JPEG, its corners are pre-rounded
where iOS will round them again, and the monogram does not survive a favicon.

 The imprint is a placeholder and must be filled in
before publishing — a German imprint with missing details is actionable. The
privacy text describes the real architecture but has not been reviewed by a
lawyer.
