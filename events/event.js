// The event page (app repository: ADR 0511, ADR 0002, build plan E7).
//
// A person without an Apple ID opens a link and sees an event. There is no
// server: the organiser's device wrote the event as one AES-GCM sealed blob
// into CloudKit's public database, and this page fetches it with a read-only
// token and opens it here, in the browser, with the key from the link.
//
// **Everything after `#` stays in the browser.** The link is
// `https://red-pot.de/e/#<event id>.<key>`; neither part is ever sent to
// red-pot.de. CloudKit sees which record is asked for, never the key.
//
// **Read-only by construction.** An unauthenticated visitor may read the
// public database and nothing else, so this page offers no button it could
// not honour: what a web guest brings, they tell the organiser.
//
// **Text only, never markup.** Everything that came out of the blob is set
// with `textContent`; an occasion called `<img onerror=…>` is a funny name and
// nothing more.
//
// The pure half (parse, open, words) is exported, so `tools/checkevent.mjs`
// holds it against a blob sealed by the app's own CryptoKit code.

export const VERSION = 1;

// -- the link ---------------------------------------------------------------

export function parseFragment(hash) {
  const text = (hash || "").replace(/^#/, "");
  const dot = text.indexOf(".");
  if (dot < 0) return null;
  const id = text.slice(0, dot).toLowerCase();
  const key = fromBase64Url(text.slice(dot + 1));
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return null;
  if (!key || key.length !== 32) return null;
  return { id, key, recordName: "event-" + id };
}

export function fromBase64Url(text) {
  try {
    let plain = text.replace(/-/g, "+").replace(/_/g, "/");
    while (plain.length % 4) plain += "=";
    const binary = atob(plain);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

// -- the seal ---------------------------------------------------------------

/** nonce (12) ‖ ciphertext ‖ tag (16) — CryptoKit's `combined`. */
export async function openBytes(sealed, key, subtle = globalThis.crypto.subtle) {
  const cryptoKey = await subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["decrypt"]);
  const iv = sealed.slice(0, 12);
  const body = sealed.slice(12);
  return new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, body));
}

export async function openSealed(sealed, key, subtle = globalThis.crypto.subtle) {
  const plain = await openBytes(sealed, key, subtle);
  const payload = JSON.parse(new TextDecoder().decode(plain));
  if (payload.v !== VERSION) throw new Error("version");
  return payload;
}

// -- CloudKit -----------------------------------------------------------------

/** The sealed blobs of several records by name, or a reason there are none.
 *  One request: the copy's photos come in one lookup with the copy. */
export async function fetchRecords(config, recordNames, fetcher = globalThis.fetch) {
  const url = "https://api.apple-cloudkit.com/database/1/" + encodeURIComponent(config.container)
    + "/" + encodeURIComponent(config.environment) + "/public/records/lookup?ckAPIToken="
    + encodeURIComponent(config.apiToken);
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records: recordNames.map((recordName) => ({ recordName })), desiredKeys: ["blob", "v"] }),
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) return { error: "unreachable" };
  const data = await response.json();
  const found = {};
  let missing = false;
  for (const record of data.records || []) {
    const value = record.fields && record.fields.blob && record.fields.blob.value;
    const sealed = value ? fromBase64Url(value) : null;
    if (record.serverErrorCode || !sealed) {
      if (record.serverErrorCode && record.serverErrorCode !== "NOT_FOUND") return { error: "unreachable" };
      missing = true;
      continue;
    }
    found[record.recordName] = sealed;
  }
  return { found, missing };
}

/** The environments that have a token, in the order the page asks them. */
export function environments(config) {
  return (config.environments || []).filter((one) => one && one.apiToken)
    .map((one) => ({ container: config.container, environment: one.name, apiToken: one.apiToken }));
}

/** The first environment that has the record, with its blob — so a copy
 *  written by a TestFlight build and one written from Xcode both open. */
export async function locate(config, recordName, fetcher = globalThis.fetch) {
  let last = { error: "gone" };
  for (const one of environments(config)) {
    const found = await fetchSealed(one, recordName, fetcher);
    if (found.sealed) return { ...found, config: one };
    last = found;
    if (found.error === "unreachable") continue;
  }
  return last;
}

/** The sealed blob of one record, or a reason it is not there. */
export async function fetchSealed(config, recordName, fetcher = globalThis.fetch) {
  const result = await fetchRecords(config, [recordName], fetcher);
  if (result.error) return result;
  const sealed = result.found[recordName] || Object.values(result.found)[0];
  return sealed ? { sealed } : { error: "gone" };
}

// -- the words ---------------------------------------------------------------

export const WORDS = {
  de: {
    assigned: "%s (eingeteilt)", newer: "Diese Einladung ist neuer als diese Seite. Lade sie bitte neu.",
    photos: "Fotos", photoBy: "Foto von %s",
    title: "Einladung", by: "von %s", courses: "Menü", tasks: "Aufgaben", open: "noch offen",
    brings: "%s bringt", asOf: "Stand: %s", tell: "Was du mitbringst, sag direkt dem Gastgeber – auf dieser Seite kann man nur lesen.",
    loading: "Einladung wird geöffnet …", incomplete: "Dieser Link ist unvollständig. Bitte den Gastgeber, ihn noch einmal zu schicken.",
    gone: "Dieses Event ist nicht oder nicht mehr freigegeben.", revoked: "Dieser Link gilt nicht mehr. Bitte den Gastgeber um einen neuen.",
    unreachable: "Die Einladung konnte gerade nicht geladen werden. Versuch es gleich noch einmal.",
    notReady: "Event-Seiten sind noch nicht eingerichtet.", app: "Mit Red Pot planen, kochen und einkaufen",
    none: "Noch nichts eingetragen.",
  },
  en: {
    assigned: "%s (assigned)", newer: "This invitation is newer than this page. Please reload it.",
    photos: "Photos", photoBy: "Photo by %s",
    title: "Invitation", by: "hosted by %s", courses: "Menu", tasks: "Tasks", open: "still open",
    brings: "%s brings", asOf: "As of %s", tell: "Tell the host directly what you are bringing – this page can only be read.",
    loading: "Opening the invitation …", incomplete: "This link is incomplete. Ask the host to send it again.",
    gone: "This event is not, or no longer, shared.", revoked: "This link is no longer valid. Ask the host for a new one.",
    unreachable: "The invitation could not be loaded just now. Try again in a moment.",
    notReady: "Event pages are not set up yet.", app: "Plan, cook and shop with Red Pot",
    none: "Nothing entered yet.",
  },
  fr: {
    assigned: "%s (attribué)", newer: "Cette invitation est plus récente que cette page. Recharge-la, s’il te plaît.",
    photos: "Photos", photoBy: "Photo de %s",
    title: "Invitation", by: "chez %s", courses: "Menu", tasks: "Tâches", open: "encore libre",
    brings: "%s apporte", asOf: "État : %s", tell: "Dis directement à l’hôte ce que tu apportes – cette page se lit seulement.",
    loading: "Ouverture de l’invitation …", incomplete: "Ce lien est incomplet. Demande à l’hôte de le renvoyer.",
    gone: "Cet événement n’est pas, ou plus, partagé.", revoked: "Ce lien n’est plus valable. Demande-en un nouveau à l’hôte.",
    unreachable: "L’invitation n’a pas pu être chargée. Réessaie dans un instant.",
    notReady: "Les pages d’événement ne sont pas encore prêtes.", app: "Planifier, cuisiner et faire les courses avec Red Pot",
    none: "Rien d’inscrit pour l’instant.",
  },
  es: {
    assigned: "%s (asignado)", newer: "Esta invitación es más nueva que esta página. Vuelve a cargarla, por favor.",
    photos: "Fotos", photoBy: "Foto de %s",
    title: "Invitación", by: "organizado por %s", courses: "Menú", tasks: "Tareas", open: "sin asignar",
    brings: "%s trae", asOf: "Actualizado: %s", tell: "Dile directamente al anfitrión qué vas a traer: esta página solo se puede leer.",
    loading: "Abriendo la invitación …", incomplete: "Este enlace está incompleto. Pide al anfitrión que lo vuelva a enviar.",
    gone: "Este evento no está, o ya no está, compartido.", revoked: "Este enlace ya no es válido. Pide uno nuevo al anfitrión.",
    unreachable: "No se ha podido cargar la invitación. Inténtalo de nuevo en un momento.",
    notReady: "Las páginas de eventos aún no están listas.", app: "Planifica, cocina y compra con Red Pot",
    none: "Todavía no hay nada.",
  },
  it: {
    assigned: "%s (assegnato)", newer: "Questo invito è più recente di questa pagina. Ricaricala, per favore.",
    photos: "Foto", photoBy: "Foto di %s",
    title: "Invito", by: "da %s", courses: "Menù", tasks: "Compiti", open: "ancora libero",
    brings: "%s porta", asOf: "Aggiornato al %s", tell: "Di’ direttamente a chi ospita cosa porti: questa pagina si può solo leggere.",
    loading: "Apertura dell’invito …", incomplete: "Questo link è incompleto. Chiedi a chi ospita di rimandarlo.",
    gone: "Questo evento non è, o non è più, condiviso.", revoked: "Questo link non è più valido. Chiedine uno nuovo a chi ospita.",
    unreachable: "Non è stato possibile caricare l’invito. Riprova tra poco.",
    notReady: "Le pagine degli eventi non sono ancora pronte.", app: "Pianifica, cucina e fai la spesa con Red Pot",
    none: "Ancora niente.",
  },
};

export function language(preferred) {
  for (const tag of preferred || []) {
    const short = String(tag).slice(0, 2).toLowerCase();
    if (WORDS[short]) return short;
  }
  return "en";
}

export function say(words, key, value) {
  return value === undefined ? words[key] : words[key].replace("%s", value);
}

/** The organiser's wall-clock day and time, shown as that day and time
 *  wherever the browser is — an invitation means that evening. */
export function when(payload, lang) {
  const [y, m, d] = payload.date.split("-").map(Number);
  const [hh, mm] = (payload.time || "00:00").split(":").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" };
  if (payload.time) Object.assign(options, { hour: "2-digit", minute: "2-digit" });
  return new Intl.DateTimeFormat(lang, options).format(date);
}

// -- the page ---------------------------------------------------------------

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function list(words, slots) {
  if (!slots.length) return element("p", words.none, "muted");
  const ul = element("ul", undefined, "slots");
  for (const slot of slots) {
    const li = element("li");
    li.appendChild(element("strong", slot.title));
    if (slot.by && slot.assigned) {
      // The organiser wrote the name on it; nobody has promised it yet.
      li.appendChild(element("span", " — " + say(words, "assigned", slot.by), "open"));
    } else if (slot.by) {
      li.appendChild(element("span", " — " + say(words, "brings", slot.by) + (slot.dish ? ": " + slot.dish : "")));
    } else {
      li.appendChild(element("span", " — " + words.open, "open"));
    }
    ul.appendChild(li);
  }
  return ul;
}

function show(main, nodes) {
  main.replaceChildren(...nodes);
}

async function run() {
  const lang = language(navigator.languages);
  const words = WORDS[lang];
  document.documentElement.lang = lang;
  document.title = words.title + " · Red Pot";
  const main = document.getElementById("main");
  const settings = window.RED_POT_EVENTS || {};
  const link = parseFragment(location.hash);
  if (!link) return show(main, [element("p", words.incomplete, "notice")]);
  if (!environments(settings).length) return show(main, [element("p", words.notReady, "notice")]);
  show(main, [element("p", words.loading, "muted")]);

  let found;
  try {
    found = await locate(settings, link.recordName);
  } catch {
    found = { error: "unreachable" };
  }
  const config = found.config;
  if (found.error) return show(main, [element("p", words[found.error], "notice")]);

  let payload;
  try {
    payload = await openSealed(found.sealed, link.key);
  } catch (error) {
    // A copy in a format this page does not know yet is not a dead link.
    if (error && error.message === "version") return show(main, [element("p", words.newer, "notice")]);
    // A rotated key fetches the same record and cannot open it.
    return show(main, [element("p", words.revoked, "notice")]);
  }

  document.title = payload.occasion + " · Red Pot";
  const nodes = [element("h1", payload.occasion), element("p", when(payload, lang), "when")];
  if (payload.organiser) nodes.push(element("p", say(words, "by", payload.organiser), "muted"));
  nodes.push(element("h2", words.courses), list(words, payload.courses || []));
  nodes.push(element("h2", words.tasks), list(words, payload.tasks || []));
  const photos = element("div", undefined, "photos");
  if ((payload.photos || []).length) nodes.push(element("h2", words.photos), photos);
  nodes.push(element("p", words.tell, "notice"));
  const stamp = new Date(payload.asOf);
  if (!isNaN(stamp)) {
    nodes.push(element("p", say(words, "asOf", new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(stamp)), "fine"));
  }
  const app = element("a", words.app, "app");
  app.href = "/";
  nodes.push(app);
  show(main, nodes);
  await showPhotos(config, link.key, payload.photos || [], photos, words);
}

/** The photos, after the text: each its own sealed record, opened here and
 *  shown from a `blob:` URL that never leaves the browser. A photo that
 *  will not load is left out rather than shown broken. */
async function showPhotos(config, key, photos, into, words) {
  if (!photos.length) return;
  let result;
  try {
    result = await fetchRecords(config, photos.map((photo) => photo.record));
  } catch {
    return;
  }
  if (result.error) return;
  for (const photo of photos) {
    const sealed = result.found[photo.record];
    if (!sealed) continue;
    try {
      const bytes = await openBytes(sealed, key);
      const img = document.createElement("img");
      img.src = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
      img.alt = photo.by ? say(words, "photoBy", photo.by) : words.photos;
      img.loading = "lazy";
      into.appendChild(img);
    } catch {
      // A photo sealed under an older key: not shown.
    }
  }
}

if (typeof document !== "undefined") {
  window.addEventListener("hashchange", run);
  run();
}
