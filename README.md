# Cascadia Collections

Static website for [www.cascadiacollections.com](https://www.cascadiacollections.com/),
built with [Parcel](https://parceljs.org/) and deployed with
[Cloudflare Pages](https://pages.cloudflare.com/).

## Development

Use Node.js 22:

```sh
nvm use
npm ci
npm start
```

Run the production build and checks with:

```sh
npm run check
```

The output is written to `dist/`. The build copies Cloudflare Pages headers,
the custom 404 page, crawler metadata, and legacy icon metadata alongside the
Parcel bundles.

## Deployment

Pushes to `main` build and deploy through `.github/workflows/deploy.yml`.
The repository must define the `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` Actions secrets. Pull requests run the same build,
dependency audit, and GitHub dependency review in CI.
