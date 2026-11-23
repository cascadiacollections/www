// Black Friday / Cyber Monday 2026. This object is the only place the window lives.
//
// Active from 2026-11-27 00:00 through 2026-12-01 23:59 America/Los_Angeles.
// `end` is exclusive, at 2026-12-02 00:00 Pacific, so the whole 23:59 minute counts.
// Outside that window the markup stays hidden and the page behaves as usual.
//
// Preview any day with ?promo=bf2026. The preview always shows the banner on
// load. Dismiss still hides it for the rest of that view and is remembered for
// the real window. Clear localStorage key `cc-promo-bf2026` to forget that.
export const promoConfig = {
  id: "bf2026",
  timeZone: "America/Los_Angeles",
  start: { year: 2026, month: 11, day: 27, hour: 0, minute: 0, second: 0 },
  end: { year: 2026, month: 12, day: 2, hour: 0, minute: 0, second: 0 },
  queryParam: "promo",
  queryValue: "bf2026",
  storageKey: "cc-promo-bf2026",
};

function zonedParts(date, timeZone) {
  const bag = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date)) {
    if (part.type in bag) bag[part.type] = Number(part.value);
  }
  // Some engines report midnight as hour 24.
  if (bag.hour === 24) bag.hour = 0;
  return bag;
}

function zoneOffsetMs(date, timeZone) {
  const parts = zonedParts(date, timeZone);
  const wallAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return wallAsUtc - date.getTime();
}

// `parts.month` is 1–12. Returns the UTC instant for that civil time in `timeZone`.
export function zonedTimeToUtc(parts, timeZone) {
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const first = utcGuess - zoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - zoneOffsetMs(new Date(first), timeZone));
}

export function isPromoWindow(date, config = promoConfig) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  const start = zonedTimeToUtc(config.start, config.timeZone);
  const end = zonedTimeToUtc(config.end, config.timeZone);
  return date >= start && date < end;
}

export function isPromoPreview(search, config = promoConfig) {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  if (!params || typeof params.get !== "function") return false;
  return params.get(config.queryParam) === config.queryValue;
}

export function promoState({
  date = new Date(),
  search = "",
  dismissed = false,
  config = promoConfig,
} = {}) {
  const preview = isPromoPreview(search, config);
  const inWindow = isPromoWindow(date, config);
  const open = preview || inWindow;
  return {
    preview,
    inWindow,
    showPicks: open,
    // Preview is a deliberate request to see the banner, so it wins over a
    // previous dismissal. A dismissal during the real window still sticks.
    showBanner: open && (preview || !dismissed),
  };
}

export function readDismissed(storage, key) {
  if (!storage) return false;
  try {
    return storage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeDismissed(storage, key) {
  if (!storage) return false;
  try {
    storage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}

export function mountPromo(doc, storage, { now = new Date(), search, config = promoConfig } = {}) {
  const banner = doc.querySelector("[data-promo-banner]");
  const picks = doc.querySelectorAll("[data-promo-picks]");
  const resolvedSearch = search ?? doc.defaultView?.location?.search ?? "";
  const state = promoState({
    date: now,
    search: resolvedSearch,
    dismissed: readDismissed(storage, config.storageKey),
    config,
  });

  if (state.showPicks) {
    for (const el of picks) el.hidden = false;
  }

  if (state.showBanner && banner) {
    banner.hidden = false;
    const dismiss = () => {
      banner.hidden = true;
      writeDismissed(storage, config.storageKey);
      const next = doc.getElementById("hero-title");
      if (next && typeof next.focus === "function") next.focus({ preventScroll: true });
    };
    const button = banner.querySelector("[data-promo-dismiss]");
    button?.addEventListener("click", dismiss);
    banner.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dismiss();
    });
  }

  return state;
}

if (typeof document !== "undefined") {
  mountPromo(document, localStorage);
}
