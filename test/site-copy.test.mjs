import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(name) {
  return readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
}

function hasHttpsLink(html, { hostname, pathname, hash = "" }) {
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    let url;
    try {
      url = new URL(match[1]);
    } catch {
      continue;
    }
    if (
      url.protocol === "https:" &&
      url.hostname === hostname &&
      url.pathname === pathname &&
      url.hash === hash
    ) {
      return true;
    }
  }
  return false;
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
    const host = "cascadiacollections.github.io";
    assert.equal(hasHttpsLink(privacy, { hostname: host, pathname: "/shoutkit/", hash: "#privacy" }), true);
    assert.equal(hasHttpsLink(privacy, { hostname: host, pathname: "/shoutkit-android/privacy/" }), true);
    assert.equal(
      hasHttpsLink(privacy, { hostname: host, pathname: "/shoutkit-android/privacy/play/" }),
      true,
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
