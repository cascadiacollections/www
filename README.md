# Cascadia Collections

Static website for [www.cascadiacollections.com](https://www.cascadiacollections.com/),
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
