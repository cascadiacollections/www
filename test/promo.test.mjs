import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPromoPreview,
  isPromoWindow,
  mountPromo,
  promoConfig,
  promoState,
  readDismissed,
  writeDismissed,
  zonedTimeToUtc,
} from "../promo.mjs";

const START = "2026-11-27T08:00:00.000Z";
const END = "2026-12-02T08:00:00.000Z";

describe("Pacific window", () => {
  it("converts the window edges to Pacific time, including daylight time", () => {
    assert.equal(zonedTimeToUtc(promoConfig.start, promoConfig.timeZone).toISOString(), START);
    assert.equal(zonedTimeToUtc(promoConfig.end, promoConfig.timeZone).toISOString(), END);
    assert.equal(
      zonedTimeToUtc(
        { year: 2026, month: 7, day: 1, hour: 0, minute: 0, second: 0 },
        "America/Los_Angeles",
      ).toISOString(),
      "2026-07-01T07:00:00.000Z",
    );
  });

  it("is closed the instant before Black Friday and open at midnight", () => {
    assert.equal(isPromoWindow(new Date("2026-11-27T07:59:59.999Z")), false);
    assert.equal(isPromoWindow(new Date(START)), true);
  });

  it("stays open through 23:59 Pacific on Cyber Monday and closes at midnight", () => {
    assert.equal(isPromoWindow(new Date("2026-11-29T20:00:00.000Z")), true);
    assert.equal(isPromoWindow(new Date("2026-12-02T07:59:59.999Z")), true);
    assert.equal(isPromoWindow(new Date(END)), false);
  });

  it("rejects an invalid date", () => {
    assert.equal(isPromoWindow(new Date("nope")), false);
    assert.equal(isPromoWindow(null), false);
  });
});

describe("preview and dismissal", () => {
  it("accepts only the bf2026 preview query", () => {
    assert.equal(isPromoPreview("?promo=bf2026"), true);
    assert.equal(isPromoPreview("?utm=shop&promo=bf2026"), true);
    assert.equal(isPromoPreview("?promo=other"), false);
    assert.equal(isPromoPreview("?Promo=bf2026"), false);
    assert.equal(isPromoPreview(""), false);
    assert.equal(isPromoPreview(null), false);
  });

  it("keeps the page unchanged outside the window", () => {
    const state = promoState({ date: new Date("2026-11-23T12:00:00.000Z"), search: "" });
    assert.deepEqual(
      { showBanner: state.showBanner, showPicks: state.showPicks, inWindow: state.inWindow },
      { showBanner: false, showPicks: false, inWindow: false },
    );
  });

  it("shows the banner and picks during the window until dismissed", () => {
    const during = new Date("2026-11-28T18:00:00.000Z");
    const open = promoState({ date: during, search: "" });
    assert.equal(open.showBanner, true);
    assert.equal(open.showPicks, true);

    const dismissed = promoState({ date: during, search: "", dismissed: true });
    assert.equal(dismissed.showBanner, false);
    assert.equal(dismissed.showPicks, true);
  });

  it("lets the preview query show the banner outside the window, even after dismissal", () => {
    const before = new Date("2026-11-23T12:00:00.000Z");
    const preview = promoState({ date: before, search: "?promo=bf2026", dismissed: true });
    assert.equal(preview.preview, true);
    assert.equal(preview.inWindow, false);
    assert.equal(preview.showBanner, true);
    assert.equal(preview.showPicks, true);
  });

  it("remembers dismissal without cookies", () => {
    const memory = {
      value: null,
      getItem() {
        return this.value;
      },
      setItem(_key, value) {
        this.value = value;
      },
    };
    assert.equal(readDismissed(memory, promoConfig.storageKey), false);
    assert.equal(writeDismissed(memory, promoConfig.storageKey), true);
    assert.equal(memory.value, "1");
    assert.equal(readDismissed(memory, promoConfig.storageKey), true);

    const blocked = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };
    assert.equal(readDismissed(blocked, promoConfig.storageKey), false);
    assert.equal(writeDismissed(blocked, promoConfig.storageKey), false);
    assert.equal(readDismissed(null, promoConfig.storageKey), false);
  });
});

describe("mountPromo", () => {
  function harness({ search = "", stored = null } = {}) {
    const button = { listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; } };
    const banner = {
      hidden: true,
      listeners: {},
      addEventListener(type, fn) { this.listeners[type] = fn; },
      querySelector(sel) { return sel === "[data-promo-dismiss]" ? button : null; },
    };
    const picks = [{ hidden: true }, { hidden: true }];
    const hero = { focused: false, focusArgs: null, focus(args) { this.focused = true; this.focusArgs = args; } };
    const storage = {
      value: stored,
      getItem() { return this.value; },
      setItem(_key, value) { this.value = value; },
    };
    const doc = {
      defaultView: { location: { search } },
      querySelector(sel) { return sel === "[data-promo-banner]" ? banner : null; },
      querySelectorAll(sel) { return sel === "[data-promo-picks]" ? picks : []; },
      getElementById(id) { return id === "hero-title" ? hero : null; },
    };
    return { banner, button, picks, hero, storage, doc };
  }

  it("leaves every promo node hidden outside the window", () => {
    const page = harness();
    const state = mountPromo(page.doc, page.storage, { now: new Date("2026-11-23T12:00:00.000Z") });
    assert.equal(state.showBanner, false);
    assert.equal(page.banner.hidden, true);
    assert.equal(page.picks.every((el) => el.hidden), true);
  });

  it("reveals the banner from the preview query and hides it on dismiss or Escape", () => {
    const page = harness({ search: "?promo=bf2026" });
    mountPromo(page.doc, page.storage, { now: new Date("2026-11-23T12:00:00.000Z") });
    assert.equal(page.banner.hidden, false);
    assert.equal(page.picks.every((el) => el.hidden === false), true);

    page.button.listeners.click();
    assert.equal(page.banner.hidden, true);
    assert.equal(page.picks.every((el) => el.hidden === false), true);
    assert.equal(page.storage.value, "1");
    assert.equal(page.hero.focused, true);
    assert.deepEqual(page.hero.focusArgs, { preventScroll: true });

    const again = harness({ search: "?promo=bf2026", stored: "1" });
    mountPromo(again.doc, again.storage, { now: new Date("2026-11-23T12:00:00.000Z") });
    assert.equal(again.banner.hidden, false);

    let prevented = false;
    again.banner.listeners.keydown({ key: "Escape", preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(again.banner.hidden, true);
  });

  it("keeps a dismissed banner hidden during the real window", () => {
    const page = harness({ stored: "1" });
    mountPromo(page.doc, page.storage, { now: new Date("2026-11-28T18:00:00.000Z") });
    assert.equal(page.banner.hidden, true);
    assert.equal(page.picks.every((el) => el.hidden === false), true);
  });
});
