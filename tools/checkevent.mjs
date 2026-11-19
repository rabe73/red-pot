#!/usr/bin/env node
// Hold the event page's pure half to what the app writes (app repository:
// ADR 0511, E7). No dependencies: Node's own WebCrypto is the browser's.
//
//     node tools/checkevent.mjs
//
// The fixture was sealed by CryptoKit the way the app's `EventWebCopy.seal`
// seals; the app's own test opens the same bytes. If this stops opening
// them, the page and the app no longer speak the same format.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  parseFragment, openSealed, openBytes, fetchSealed, fetchRecords, locate, environments,
  fromBase64Url, language, when, WORDS,
} from "../events/event.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, "..", "events", "fixture.json"), "utf8"));
let failed = 0;
function expect(ok, what) {
  if (!ok) { failed += 1; console.log("  x " + what); }
}

const id = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const link = parseFragment("#" + id + "." + fixture.key);
expect(link && link.id === id && link.key.length === 32, "a whole link parses");
expect(link && link.recordName === "event-" + id, "the record is named after the event");
expect(parseFragment("#" + id) === null, "a link without a key is refused");
expect(parseFragment("#not-an-id." + fixture.key) === null, "a link without an id is refused");
expect(parseFragment("") === null, "no fragment, no event");

const sealed = Uint8Array.from(Buffer.from(fixture.sealed, "base64"));
const payload = await openSealed(sealed, link.key);
expect(payload.occasion === fixture.occasion, "CryptoKit's seal opens with WebCrypto");
expect(payload.courses[0].title === fixture.firstCourse && payload.courses[0].dish === fixture.firstDish,
  "the courses come through, accents and all");
expect(payload.courses[1].by === undefined, "an open course has nobody");

let refused = false;
try {
  const wrong = new Uint8Array(32);
  await openSealed(sealed, wrong);
} catch { refused = true; }
expect(refused, "a rotated key opens nothing");

// CloudKit's answer, without the network.
const reply = (body, ok = true) => async () => ({ ok, json: async () => body });
const config = { container: "iCloud.de.red-pot", environment: "development", apiToken: "t" };
const found = await fetchSealed(config, "event-" + id,
  reply({ records: [{ recordName: "event-" + id, fields: { blob: { value: fixture.sealed, type: "BYTES" } } }] }));
expect(found.sealed && found.sealed.length === sealed.length, "a record's bytes are read");
const gone = await fetchSealed(config, "event-" + id, reply({ records: [{ serverErrorCode: "NOT_FOUND" }] }));
expect(gone.error === "gone", "a withdrawn page says it is gone");
const down = await fetchSealed(config, "event-" + id, reply({}, false));
expect(down.error === "unreachable", "an unreachable CloudKit says so");
let asked = "";
await fetchSealed(config, "event-" + id, async (url) => { asked = url; return { ok: false }; });
expect(!asked.includes(fixture.key), "the key never leaves the browser");

// A photo is its own sealed record, opened as bytes (owner, 2026-11-19, ⑱).
const photo = await openBytes(Uint8Array.from(Buffer.from(fixture.photo, "base64")), link.key);
expect(photo[0] === 0xff && photo[1] === 0xd8, "a sealed photo opens to a JPEG");
expect(new TextDecoder().decode(photo.slice(4, 4 + fixture.photoText.length)) === fixture.photoText,
  "and to the very bytes that were sealed");
const many = await fetchRecords(config, ["a", "b", "c"], reply({ records: [
  { recordName: "a", fields: { blob: { value: fixture.sealed } } },
  { recordName: "b", serverErrorCode: "NOT_FOUND" },
  { recordName: "c", fields: { blob: { value: fixture.photo } } },
] }));
expect(Object.keys(many.found).join() === "a,c" && many.missing, "one lookup brings the copy and its photos, and says what is gone");

// Production first, Development second, an environment without a token not
// at all (2026-11-19: a Development token cannot read Production).
const settings = { container: "iCloud.de.red-pot", environments: [
  { name: "production", apiToken: "p" }, { name: "staging", apiToken: "" }, { name: "development", apiToken: "d" }] };
expect(environments(settings).map((one) => one.environment).join() === "production,development",
  "only environments with a token are asked, in order");
const asked2 = [];
const located = await locate(settings, "event-" + id, async (url) => {
  asked2.push(url);
  const body = url.includes("/production/") ? { records: [{ serverErrorCode: "NOT_FOUND" }] }
    : { records: [{ recordName: "event-" + id, fields: { blob: { value: fixture.sealed } } }] };
  return { ok: true, json: async () => body };
});
expect(located.sealed && located.config.environment === "development" && asked2.length === 2,
  "a copy only in Development is still found");
const none = await locate({ container: "c", environments: [] }, "x");
expect(none.error === "gone", "no environment, no copy");

expect(language(["fr-CH", "de"]) === "fr" && language(["pt-BR"]) === "en", "the browser's language, English otherwise");
for (const [lang, words] of Object.entries(WORDS)) {
  for (const key of Object.keys(WORDS.en)) expect(typeof words[key] === "string", lang + " has " + key);
}
expect(when({ date: "2026-07-04", time: "18:30" }, "de").includes("18:30"), "the organiser's evening stays that evening");
expect(fromBase64Url("@@") === null || fromBase64Url("@@").length >= 0, "bad base64 does not throw");

if (failed) {
  console.log(failed + " check(s) failed.");
  process.exit(1);
}
console.log("Event page ok.");
