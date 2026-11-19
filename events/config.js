// What the event page needs to reach CloudKit (app repository: ADR 0511, E7).
//
// **The API tokens are public on purpose.** Each is a CloudKit *read-only*
// token for the container's public database, created by the owner in the
// CloudKit Console (iCloud.de.red-pot → Tokens & Keys → API Tokens), and
// every browser that opens an invitation has to send it. What it can read is
// ciphertext; the key to it is only ever in the link's fragment (ADR 0002).
//
// **One token per environment** — CloudKit does not let a Development token
// read Production (measured 2026-11-19: AUTHENTICATION_FAILED). The page asks
// the environments in this order and takes the first that has the event:
// Production for the app from TestFlight and the App Store, Development for
// a build run from Xcode. An environment without a token is skipped; with
// none at all the page says event pages are not set up yet.
window.RED_POT_EVENTS = {
  container: "iCloud.de.red-pot",
  environments: [
    { name: "production", apiToken: "336375a8b457c05e31dc283eaec2ec8ca79c9f95465022bc5e37dce37bcffeb1" },
    { name: "development", apiToken: "86820a82756a8ab9ebcde780231a9e2ed8942b90bd86a726100d9cf684ae7e2b" },
  ],
};
