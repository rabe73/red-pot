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

The site build is dependency-free and runs in CI. `makeicons.py` needs
`rsvg-convert` (librsvg2-bin) and Pillow, and runs by hand on the rare occasion the artwork changes; its output is
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

## The two parts

The front page is built around a split that is not cosmetic, and edits must
keep it (app repository, ADR 0121):

- **Part one — the free app.** Households, catalogue, staples, shopping day and
  its inventory, members, shopping list, stock list, messages, and every way of
  getting a line in: voice, barcode, receipt OCR, geofencing. It establishes the
  truth about a household. It ships first and costs nothing.
- **Part two — the week planner.** The plan itself, the Joker, likes, dislikes,
  intolerances, kitchen equipment, kitchen tips, the recipe composer, events. It
  turns that truth into a cycle. It ships later and costs money, for the same
  reason it ships later: a plan can only be judged after weeks at real tables.

**A feature belongs under the heading of its own part.** The Joker in
particular is part two — it is a meal inside the week plan — and the page led
with it until this split was written down. Anything that suggests, ranks,
learns or plans is part two; anything that records, reminds or shops is part
one.

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

Two settings live outside this repository and neither is visible from it:

- **Settings → Pages → Source** must be **GitHub Actions**, not "Deploy from a
  branch".
- **Settings → Environments → `github-pages` → Deployment branches** must allow
  **`main`**.

The second one cost an afternoon. When the branch policy names a branch that is
not the one deploying, the deploy job is rejected *before it starts*: it fails
in two seconds with no steps and **no logs at all**, and the reason appears only
on the job's page in the browser — the Actions API returns nothing. Everything
else looks healthy, which is what makes it hard to find. If a deploy fails that
way, check the branch policy first.

## Under construction

`underConstruction` in `content/site.json` is one switch with two effects: a
banner on every page, and `noindex` plus a disallow-all `robots.txt`.

Both matter while the app does not exist. The banner belongs on the privacy and
imprint pages as much as on the front page — those are the ones that look most
like a finished product. And a half-written page indexed now would outrank the
finished one later.

Set it to `false` on launch day. Nothing else changes.

## Status

Content is a first draft. The imprint and privacy pages carry the real provider
details; only the contact email address is still a placeholder. `brand/README.md`
records the one remaining icon question — the monogram does not survive a
favicon, and a simpler small-size cut of the mark is a design decision nobody
has made yet.

 The imprint is a placeholder and must be filled in
before publishing — a German imprint with missing details is actionable. The
privacy text describes the real architecture but has not been reviewed by a
lawyer.
