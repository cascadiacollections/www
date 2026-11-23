# Cascadia Collections

Static website for [cascadiacollections.com](https://cascadiacollections.com/),
built with [Parcel](https://parceljs.org/) and deployed with
[GitHub Pages](https://pages.github.com/).

## Development

Use Node.js 26:

```sh
nvm use
npm ci
npm start
```

Run the production build and checks with:

```sh
npm run check
```

The output is written to `dist/`. The build copies the custom domain `CNAME`,
the custom 404 page, crawler metadata, and legacy icon metadata alongside the
Parcel bundles.

## Deployment

Pull requests run the build, dependency audit, and GitHub dependency review in
CI. Pushes to `main` deploy to GitHub Pages through
`.github/workflows/deploy.yml`, which uploads `dist/` as a Pages artifact.
No secrets are required; Pages must be configured to build from GitHub Actions.

## Site switches

`site.config.js` holds the two settings that change without a redesign:

- `steamUrl`: empty while Salt Line has no Steam store page, so "Coming to
  Steam" renders as plain text. Set it to the store URL to turn it into a link.
- `showSponsors`: set to `false` to hide every "Support the work" (GitHub
  Sponsors) link.

## Seasonal promo

`promo.mjs` holds the Black Friday / Cyber Monday 2026 window: 2026-11-27 00:00
through 2026-12-01 23:59 America/Los_Angeles. Outside that window the banner
and free-picks section stay hidden, including when JavaScript is off.
`?promo=bf2026` previews them on any day. Dismiss is remembered in
localStorage (`cc-promo-bf2026`); the preview query shows the banner again on
the next load. No cookies, analytics, or third-party scripts.
