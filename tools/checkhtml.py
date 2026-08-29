#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fail on malformed HTML in a built directory. No dependencies.

Hand-written fragments are the point of this site's design, and the cost of
that choice is that an unclosed tag renders as a mess instead of raising an
error. Python's own parser is enough to catch the cases that matter: a tag
never closed, a tag closed that was never open, and the wrong closing order.
"""
import os
import sys
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}


class Check(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.problems = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.problems.append("line %d: </%s> closes nothing"
                                 % (self.getpos()[0], tag))
            return
        open_tag, line = self.stack.pop()
        if open_tag != tag:
            self.problems.append(
                "line %d: </%s> closes <%s> opened on line %d"
                % (self.getpos()[0], tag, open_tag, line))


def main(root):
    bad = 0
    for dirpath, _, names in os.walk(root):
        for name in sorted(names):
            if not name.endswith(".html"):
                continue
            path = os.path.join(dirpath, name)
            c = Check()
            with open(path, encoding="utf-8") as f:
                c.feed(f.read())
            c.close()
            for tag, line in c.stack:
                c.problems.append("line %d: <%s> is never closed" % (line, tag))
            if c.problems:
                bad += 1
                print("%s" % path)
                for p in c.problems:
                    print("  x %s" % p)
    if bad:
        print("\n%d file(s) malformed." % bad)
        return 1
    print("HTML ok.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "dist"))
