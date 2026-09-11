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

## The boundary, and it runs through consequence

The front page is built around a split that is not cosmetic, and edits must keep
it. The line runs through **consequence**, not through content (app repository,
ADR 0221, which replaced the boundary table of ADR 0121; ADR 0234 narrowed it
further):

- **Free, and it ships first.** Households, catalogue, staples, shopping day and
  its inventory, members, shopping list, stock list, the four messages, and every
  way of getting a line in: voice, receipt OCR, geofencing. Plus the week schema,
  the kitchen profile and *every* household and personal setting — likes,
  dislikes, intolerances, equipment. It establishes the truth about a household,
  and lets that household describe itself.
- **Paid, and it ships later.** Editing the plan — variants, swipes, the Joker —
  the plan feeding the shopping list and the freezer, the explanations and the
  recipe view, the cooking screen, kitchen tips, the recipe composer. It turns
  that truth into a cycle. Same reason for both: a plan can only be judged after
  weeks at real tables.
- **Later still.** Cooking events, and a web UI for guests without an Apple
  device — ADR 0221 moved them out of the paid tier into a third release. The
  page mentions them only as an outlook, and deliberately does not mention the
  web UI: that release brings a server and accounts, and the privacy page still
  states the absence of both as a property of the build.

**The test is whether an act has consequences, not what it is about.** A setting
is free even when it only matters for planning: the household may say what its
kitchen can do and how its week looks at no cost. What costs money is a plan
that *writes* — onto the shopping list, into the freezer, into what the app has
learned about this household.

**The page no longer says "part one" and "part two".** It reads as a progression:
start simply, and the fuller description of the household becomes relevant when
the app should take the week off your hands. Do not reintroduce the labels — the
split is a rule for deciding what goes where, not a heading.

**The barcode scan is gone** (app repository, ADR 0224), and with it Open Food
Facts and the app's last outbound call. Siri and geofencing stayed. Nothing on
this site may mention a barcode, and the privacy page's "no outbound connection"
now says so as a promise rather than an exception.

**The receipt scan exists in the app and is deliberately not advertised here.**
Nobody knows yet how well OCR copes with the range of real till receipts, and a
front page is a promise. It appears in one place only: the camera row of the
privacy page's permission table, because a permission the app requests has to be
declared whether or not the marketing mentions it. Do not add it to the front
page or to the support answers until the accuracy is known.

## The one drawing

The three stages on the front page are inline SVG in the fragments, styled from
`theme/style.css`. It is the only drawing on a site that is otherwise text, and
it stays that way on four conditions.

**It draws the growth, not the roadmap.** Each panel colours only what its stage
adds and leaves the earlier rings standing, because that is the claim being
made: the paid step does not bolt a box on, it widens something that already ran
closed. **No numbers, no dates, no feature lists.** A roadmap is the most
expensive artefact to keep current and the most visible when it is stale — app
ADR 0121 to 0221 to 0234 moved the boundary twice within hours.

**It carries nothing the text does not also say.** The SVGs are `aria-hidden`
and the labels are HTML, not text inside the drawing. That is what makes one
drawing serve both languages, lets the labels translate and scale, and gives a
screen reader prose instead of a shape. A page with the images switched off
loses nothing but decoration. If a new fact ever arrives only in the picture,
the picture is wrong.

**The labels stand without the picture.** They speak of the household — *what it
has, what it eats, whom it invites* — and never of the circle. A caption that
has to explain the drawing is leaning on it. "Every week" appears twice and
makes stages one and two the routine; "not routine" in stage three breaks it on
purpose.

**Stage three names no platform.** Cooking events, friends, guests who
contribute — and not the web UI, not accounts, not a server. That release brings
all three, and the privacy page still states their absence as a property of the
build. The two get changed together or not at all (see the boundary section
above).

Two implementation notes, both of which cost something to rediscover.
`checkhtml.py` accepts inline SVG because `HTMLParser.handle_startendtag` falls
back to start plus end, so self-closing `<circle/>` balances — but every element
must be closed or self-closed. And the stroke weights in stage three (outline
2.2, dash `6 4`) were measured at the rendered 120px, not chosen: at 2.0 and
`4 4` the outlined guests read as a grey thread in dark mode rather than as an
outline and a dash. The stylesheet says so at the rule.

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
