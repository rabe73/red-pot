#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the Red Pot site: static HTML, one directory per language.

    python3 build.py            # -> dist/
    python3 build.py --check    # validate only, write nothing

No dependencies beyond Python 3. Content is HTML fragments under
content/<lang>/<slug>.html; this wraps them in theme/base.html, builds the
navigation, the hreflang alternates and a language-negotiating root page, and
writes dist/.

Why fragments rather than Markdown, and why no site generator at all: see
docs/adr/0001-static-pages-not-an-spa.md. The short version is that a legal
text wants exact control over its markup, and a build that needs nothing but
Python 3 still runs in five years.

**A language is complete or it is not built.** A required locale missing a page
fails the build; a planned locale missing a page is skipped entirely, with a
line saying so. Half a language is worse than none — the browser falls back per
language, not per page, so a French visitor would get a French title over a
German privacy policy and no fallback would ever fire.
"""
import argparse
import datetime as dt
import io
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(ROOT, "content")
THEME = os.path.join(ROOT, "theme")


def read(path):
    with io.open(path, encoding="utf-8") as f:
        return f.read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(text)


def first_tag(fragment, tag):
    m = re.search(r"<%s[^>]*>(.*?)</%s>" % (tag, tag), fragment,
                  re.S | re.I)
    return re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else ""


def page_meta(fragment, slug, site, lang):
    """Title and description come from the content, not from a config file.

    Keeping them next to the words they describe is the only way they stay true
    when the words change -- a title in site.json is a copy nobody updates.
    """
    title = first_tag(fragment, "h1") or site["ui"][lang]["nav"].get(slug, slug)
    m = re.search(r'<p class="lede">(.*?)</p>', fragment, re.S | re.I)
    desc = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""
    full = title if slug == "index" else "%s — %s" % (title, site["name"])
    return full, desc


def complete_locales(site):
    """Which languages have every page, which are missing what."""
    have, missing = [], {}
    for lang in site["locales"]:
        gaps = [p["slug"] for p in site["pages"]
                if not os.path.isfile(os.path.join(CONTENT, lang, p["slug"] + ".html"))]
        if gaps:
            missing[lang] = gaps
        else:
            have.append(lang)
    return have, missing


def build(check_only=False):
    site = json.loads(read(os.path.join(CONTENT, "site.json")))
    base = read(os.path.join(THEME, "base.html"))
    built, missing = complete_locales(site)

    errors = []
    for lang in site["requiredLocales"]:
        if lang in missing:
            errors.append("required locale %s is missing: %s"
                          % (lang, ", ".join(missing[lang])))
    for lang in built:
        if lang not in site["ui"]:
            errors.append("locale %s has pages but no ui strings in site.json" % lang)
    if errors:
        for e in errors:
            print("  x %s" % e)
        raise SystemExit(1)

    out = os.path.join(ROOT, "dist")
    if not check_only:
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
        shutil.copy(os.path.join(THEME, "style.css"), os.path.join(out, "style.css"))
        shutil.copytree(os.path.join(ROOT, "assets"), os.path.join(out, "assets"))
        # GitHub Pages runs Jekyll over the artifact unless told not to, and
        # Jekyll silently drops files and directories beginning with an
        # underscore. Nothing here starts with one today; the file costs nothing
        # and removes a whole class of "why is that page 404" later.
        write(os.path.join(out, ".nojekyll"), "")

    base_url = site["baseUrl"].rstrip("/")
    urls = []
    for lang in built:
        ui = site["ui"][lang]
        for page in site["pages"]:
            slug = page["slug"]
            fragment = read(os.path.join(CONTENT, lang, slug + ".html"))
            title, desc = page_meta(fragment, slug, site, lang)
            rel = "%s/%s.html" % (lang, slug)
            canonical = "%s/%s/" % (base_url, lang) if slug == "index" \
                else "%s/%s" % (base_url, rel)
            urls.append(canonical)

            # Pages of one language sit side by side, so nav links are bare
            # filenames — no base path to get wrong, and the whole dist/ tree
            # opens correctly from the filesystem as well as from a server.
            nav = "".join(
                '<a href="%s.html"%s>%s</a>'
                % (p["slug"],
                   ' aria-current="page"' if p["slug"] == slug else "",
                   ui["nav"][p["slug"]])
                for p in site["pages"] if p.get("nav"))

            alts = "\n".join(
                '<link rel="alternate" hreflang="%s" href="%s">'
                % (l, "%s/%s/" % (base_url, l) if slug == "index"
                   else "%s/%s/%s.html" % (base_url, l, slug))
                for l in built)
            alts += '\n<link rel="alternate" hreflang="x-default" href="%s/%s/%s">' % (
                base_url, site["fallbackLocale"], "" if slug == "index" else slug + ".html")

            langs = " ".join(
                '<a href="../%s/%s.html" lang="%s"%s>%s</a>'
                % (l, slug, l, ' aria-current="page"' if l == lang else "",
                   site["locales"][l]["name"])
                for l in built)

            html = base
            for key, value in (
                    ("lang", lang), ("dir", site["locales"][lang]["dir"]),
                    ("title", title), ("description", desc),
                    ("canonical", canonical), ("alternates", alts),
                    ("root", "../"), ("skip", ui["skip"]),
                    ("baseUrl", base_url),
                    ("robots", '<meta name="robots" content="noindex">\n'
                     if site.get("underConstruction") else ""),
                    ("construction",
                     '<p class="construction">%s</p>\n' % ui["construction"]
                     if site.get("underConstruction") else ""),
                    ("navLabel", site["name"]), ("nav", nav),
                    ("langLabel", ui["langLabel"]), ("langs", langs),
                    ("content", fragment.strip()),
                    ("year", str(dt.date.today().year))):
                html = html.replace("{{%s}}" % key, value)
            if not check_only:
                write(os.path.join(out, rel), html)

    if not check_only:
        write(os.path.join(out, "index.html"), root_page(site, built))
        write(os.path.join(out, "404.html"), root_page(site, built, notfound=True))
        write(os.path.join(out, "sitemap.xml"), sitemap(urls))
        if site.get("underConstruction"):
            # Belt and braces with the per-page noindex: a construction site
            # indexed now would outrank the finished one later.
            write(os.path.join(out, "robots.txt"), "User-agent: *\nDisallow: /\n")
        else:
            write(os.path.join(out, "robots.txt"),
                  "User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n" % base_url)

    return site, built, missing, len(urls)


def root_page(site, built, notfound=False):
    """Language negotiation without a server.

    GitHub Pages cannot read Accept-Language, so the choice is made in the
    browser. The redirect is a convenience and never the only way through: the
    real list of links is in the markup and works with JavaScript off, which is
    also what a crawler sees.
    """
    links = "\n".join(
        '  <li><a href="%s/" lang="%s" hreflang="%s">%s</a></li>'
        % (l, l, l, site["locales"][l]["name"]) for l in built)
    fallback = site["fallbackLocale"]
    noindex = ('<meta name="robots" content="noindex">\n'
               if site.get("underConstruction") else "")
    return """<!doctype html>
<html lang="%s">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
%s<link rel="canonical" href="%s/%s/">
%s
<link rel="icon" href="assets/favicon-32.png" sizes="32x32">
<link rel="icon" href="assets/favicon-16.png" sizes="16x16">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="stylesheet" href="style.css">
<script>
(function () {
  var built = %s, fallback = %s;
  var want = navigator.languages || [navigator.language || fallback];
  for (var i = 0; i < want.length; i++) {
    var code = String(want[i]).slice(0, 2).toLowerCase();
    if (built.indexOf(code) !== -1) { location.replace(code + "/"); return; }
  }
  location.replace(fallback + "/");
})();
</script>
</head>
<body>
<main id="main">
<h1>Red Pot</h1>
<p class="lede">%s</p>
<ul>
%s
</ul>
</main>
</body>
</html>
""" % (fallback,
       "Red Pot" if not notfound else "Red Pot — 404",
       noindex, site["baseUrl"].rstrip("/"), fallback,
       "\n".join('<link rel="alternate" hreflang="%s" href="%s/%s/">'
                 % (l, site["baseUrl"].rstrip("/"), l) for l in built),
       json.dumps(built), json.dumps(fallback),
       site["ui"][fallback]["langLabel"], links)


def sitemap(urls):
    body = "\n".join("  <url><loc>%s</loc></url>" % u for u in urls)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            '%s\n</urlset>\n' % body)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="validate without writing dist/")
    args = ap.parse_args()
    site, built, missing, n = build(args.check)
    print("Red Pot site")
    print("  Gebaut     %s   (%d Seiten)" % (", ".join(built), n))
    for lang, gaps in sorted(missing.items()):
        kind = "geplant" if lang in site["plannedLocales"] else "unbekannt"
        print("  Übersprungen %s (%s) — fehlt: %s" % (lang, kind, ", ".join(gaps)))
    if args.check:
        print("  Nur geprüft, nichts geschrieben.")
    else:
        print("  Geschrieben dist/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
