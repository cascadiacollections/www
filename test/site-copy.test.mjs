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
    assert.match(privacy, /Cloudflare Web Analytics/);
    assert.match(privacy, /does not fingerprint individual visitors/);
    assert.equal(
      hasHttpsLink(privacy, {
        hostname: "developers.cloudflare.com",
        pathname: "/speed/observatory/rum-beacon/",
        hash: "#privacy-information",
      }),
      true,
    );
    assert.doesNotMatch(privacy, /do not run analytics|do not add tracking/i);
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

  it("sends the extensionless /privacy alias to the canonical policy", () => {
    assert.match(privacy, /rel="canonical" href="https:\/\/cascadiacollections.com\/privacy.html"/);
    const script = privacy.match(/<script>([\s\S]*?)<\/script>/);
    assert.ok(script, "privacy page should carry the alias redirect");

    function open(pathname, search = "", hash = "") {
      let replaced = null;
      const location = {
        pathname,
        search,
        hash,
        replace(url) {
          replaced = url;
        },
      };
      new Function("location", script[1])(location);
      return replaced;
    }

    assert.equal(open("/privacy"), "/privacy.html");
    assert.equal(open("/privacy/"), "/privacy.html");
    assert.equal(open("/privacy", "?from=old", "#contact"), "/privacy.html?from=old#contact");
    assert.equal(open("/privacy.html"), null);
    assert.equal(open("/privacy.html", "", "#contact"), null);
  });
});

describe("homepage structured data", () => {
  it("parses the JSON-LD graph and keeps Salt Line on its own canonical page", () => {
    const block = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(block, "homepage should include JSON-LD");
    const data = JSON.parse(block[1]);
    assert.equal(data["@context"], "https://schema.org");
    const types = data["@graph"].map((node) => node["@type"]);
    assert.deepEqual(types, ["WebSite", "Organization", "VideoGame"]);
    const game = data["@graph"].find((node) => node["@type"] === "VideoGame");
    assert.equal(game.name, "Salt Line");
    assert.equal(game.url, "https://cascadiacollections.github.io/saltline/");
    for (const node of data["@graph"]) {
      assert.equal(new URL(node.url).protocol, "https:");
    }
  });
});

describe("ShoutKit spelling", () => {
  it("uses ShoutKit, including the Black Friday banner", () => {
    assert.match(home, /<title>Cascadia Collections: Salt Line, ShoutKit and more<\/title>/);
    assert.doesNotMatch(home, /Shoutkit/);
    assert.match(
      home,
      /Skip the checkout line\. ShoutKit for iPhone and Bauhaus are free, with no ads and no tracking\./,
    );
    assert.doesNotMatch(read("main.css"), /Shoutkit/);
    assert.match(read("site.webmanifest"), /ShoutKit/);
    assert.doesNotMatch(read("site.webmanifest"), /Shoutkit/);
  });
});
