import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(name) {
  return readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
}

const privacy = read("privacy.html");
const home = read("index.html");

describe("privacy policy", () => {
  it("describes the studio site as of November 25, 2026", () => {
    assert.match(privacy, /Last updated November 25, 2026/);
    assert.match(privacy, /studio website at cascadiacollections\.com/);
    assert.match(privacy, /cc-promo-bf2026/);
    assert.match(privacy, /GitHub Pages/);
    assert.match(privacy, /Cloudflare/);
    assert.doesNotMatch(privacy, /Termly|February 15, 2026|prize/i);
  });

  it("points at the ShoutKit privacy pages and keeps a plain mailto", () => {
    assert.match(privacy, /https:\/\/cascadiacollections\.github\.io\/shoutkit\/#privacy/);
    assert.match(
      privacy,
      /href="https:\/\/cascadiacollections\.github\.io\/shoutkit-android\/privacy\/"/,
    );
    assert.match(
      privacy,
      /https:\/\/cascadiacollections\.github\.io\/shoutkit-android\/privacy\/play\//,
    );
    assert.match(
      privacy,
      /<!--email_off--><a href="mailto:kevin@cascadiacollections.com">kevin@cascadiacollections.com<\/a><!--\/email_off-->/,
    );
    assert.doesNotMatch(privacy, /\[email&#160;protected\]|cfemail|email-decode/);
  });

  it("keeps HTML comments so the Cloudflare email_off markers survive the build", () => {
    const pkg = JSON.parse(read("package.json"));
    assert.equal(pkg.htmlnano.removeComments, false);
  });
});

describe("ShoutKit spelling", () => {
  it("uses ShoutKit outside the Black Friday promo block", () => {
    assert.match(home, /<title>Cascadia Collections: Salt Line, ShoutKit and more<\/title>/);
    const withoutPromo = home.replace(/<aside class="promo"[\s\S]*?<\/aside>/, "");
    assert.doesNotMatch(withoutPromo, /Shoutkit/);
    assert.match(
      home,
      /Skip the checkout line\. Shoutkit for iPhone and Bauhaus are free, with no ads and no tracking\./,
    );
    assert.doesNotMatch(read("main.css"), /Shoutkit/);
    assert.match(read("site.webmanifest"), /ShoutKit/);
    assert.doesNotMatch(read("site.webmanifest"), /Shoutkit/);
  });
});
