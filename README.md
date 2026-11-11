# hoh-tools

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Husky** - Git hooks for code quality
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application. From `apps/native`, run the `ios` script for iOS or the `android` script for Android to build and launch the app. See [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/) for device setup.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@hoh-tools/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Environment Configuration

Each app owns its environment schema in `.env.schema`. Varlock generates `src/env.ts` during installation; run `bun run env:generate` after changing a schema. Commit schemas, and keep secrets in ignored env files or your deployment platform.

Import the generated `ENV` accessor in application code. Shared database and auth packages receive configuration or initialized clients from the application. See [Varlock's monorepo guide](https://varlock.dev/guides/monorepos/).

Bun's automatic env loading is disabled in `bunfig.toml`; the framework integration or server bootstrap loads Varlock. Node deployments must include Varlock and its dependencies alongside the app schema.

Run standalone Node/Bun tools that use Varlock from the owning app directory so they load that app's schema and env files. `env:generate` only generates TypeScript files; it does not initialize environment values in a subsequent command.

## Git Hooks and Formatting

- Initialize hooks: `bun run prepare`
- Run checks: `bun run check`

## CI/CD & Releases

### CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request and push to `main`: `bun run check` (Ultracite), `check-types`, `test` and `build`.

### Releasing

All apps share one version, the `version` in the root `package.json`.

1. Bump `version` in the root `package.json` and commit.
2. Tag that commit `vX.Y.Z` (it must match the version) and push the tag.

[`.github/workflows/release.yml`](.github/workflows/release.yml) then runs CI, creates a GitHub Release with generated notes, and releases **only the apps affected since the previous `v*` tag**. It works these out with Turborepo's dependency graph (`turbo ls --filter="...[prev...tag]"`), so a change in a shared package releases every app that uses it. The first tag releases everything. To re-release every app, run the workflow manually from a tag ref with `force_all`.

| App | Release |
| --- | --- |
| `apps/extension` | Chrome + Firefox zips attached to the GitHub Release (manifest version = tag version) |
| `apps/web` | Prerendered static site deployed to a Cloudflare assets-only Worker (`apps/web/wrangler.jsonc`) |
| `apps/fumadocs` | Static docs deployed to a Cloudflare assets-only Worker (`apps/fumadocs/wrangler.jsonc`) |
| `apps/native` | EAS production builds for iOS + Android (`apps/native/eas.json`), queued without waiting |

### Required secrets and variables

Web, docs and the store submission run in the `production` GitHub environment, so you can add required reviewers there.

| Name | Kind | Used by |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | secret | web, docs |
| `EXPO_TOKEN` | secret | native |
| `SUBMIT_EXTENSION_TO_STORES` | variable | set to `true` to enable store submission |
| `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN` | secret | Chrome Web Store submission (`wxt submit`) |
| `FIREFOX_EXTENSION_ID`, `FIREFOX_JWT_ISSUER`, `FIREFOX_JWT_SECRET` | secret | Firefox Add-ons submission (`wxt submit`) |

Before the first native release: run `eas init` in `apps/native` (sets the project ID), replace the `com.anonymous.*` identifiers in `app.json`, and set `EXPO_PUBLIC_SERVER_URL` as an EAS environment variable.

### Code review

[CodeRabbit](https://coderabbit.ai) reviews pull requests to `main` using [`.coderabbit.yaml`](.coderabbit.yaml). Install the CodeRabbit GitHub App on the repository to enable it.

## Project Structure

```
hoh-tools/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Start)
│   ├── native/      # Mobile application (React Native, Expo)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run check-types`: Check TypeScript types across all apps
- `bun run dev:native`: Start the React Native/Expo development server
- `bun run check`: Run Oxlint and Oxfmt
