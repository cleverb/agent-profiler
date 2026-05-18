---
status: accepted
date: 2026-05-16
decision-makers: Dudley Ablorh-Bryan
---

# Use Storybook and parameterized TypeScript modules for dashboard UI development

## Context and Problem Statement

The web dashboard shipped with Agent Profiler is a small static UI (HTML, CSS, vanilla JavaScript) copied into `dist/dashboard` for the `dashboard` command. Product and layout iteration benefit from isolated component development, documented examples, and light/dark verification without running the full CLI, SQLite, and API on every change.

At the same time, the published package must stay a **local-first CLI**: dev-only tooling must not inflate the npm tarball or runtime install footprint, and any shared “component” code must remain safe to drive from real session data later (escaping, stable class names, parity with production DOM).

## Decision

Adopt **Storybook 10** with the **`@storybook/html-vite`** framework for dashboard UI work, and implement reusable dashboard markup as **parameterized TypeScript functions** that return HTML strings (with explicit escaping for dynamic text).

Concretely:

- **Storybook**: Configure at repo root (`.storybook/main.ts`, `.storybook/preview.ts`), with stories discovered from dashboard UI sources (`**/*.stories.ts` co-located with modules under `packages/dashboard/src/ui/**`). Use **`@storybook/addon-docs`** for CSF docs. Optional dev-only addons (a11y, designs, MCP, themes, vitest, tag badges, decision-record panel) may be registered in `main.ts` when they improve review workflows; they must not be imported from runtime dashboard code. Keep **Storybook and related packages as devDependencies** only; do **not** list Storybook output or config in `package.json` `files`.
- **Stack alignment**: Use **Pico.css** as a baseline layer in Storybook preview and in the shipped dashboard (`pico.min.css` produced at build time from `node_modules` via the existing copy script). Drive light/dark via **`data-theme` on `<html>`** and dashboard CSS tokens scoped to `html[data-theme="light"]` / `html[data-theme="dark"]`. Storybook preview exposes a **toolbar theme control** (decorator) that sets `data-theme` and `color-scheme` on the preview document.
- **Components**: Implement presentation helpers under **`packages/dashboard/src/ui/`** as pure functions + types, e.g. `overviewShellHtml(props)`, `timelineSampleSegmentsHtml(props)`, `toolResultVerticalBarsHtml(props)`, plus small **inner-fragment** helpers when runtime DOM must match existing `index.html` regions one-to-one. All user-, API-, or path-derived strings interpolated into HTML must pass through a shared **`escapeHtml`** helper.
- **Runtime vs Storybook**: The **live dashboard** loads a **Rollup IIFE bundle** (`packages/dashboard/src/browser/main.ts`) that uses the same HTML helpers as stories (usage bars, timeline track, vertical bars, sparkline points). Storybook-only compositions (e.g. full overview shell, flex-based timeline demos) stay in stories.

Non-goals:

- Shipping Storybook or its static build inside the published npm package.
- Adopting React, Shadcn, or another framework for the dashboard UI in this decision (a later ADR may supersede if the product moves to a component framework).
- Defining REST API shapes (unchanged from existing dashboard server contracts).

## Consequences

- Good, because designers and implementers can iterate on layout, tokens, and parameterized examples with **fast feedback** and **theme toggling**.
- Good, because **CSF stories + `args`** document intended props and edge cases next to the code.
- Good, because **`escapeHtml`** and typed props set expectations for safe integration with real session data.
- Good, because the **bundled dashboard entry** consumes the same template helpers as Storybook, reducing markup drift for the main panels.
- Bad, because **HTML string templates** require discipline: any new dynamic field must be escaped; complex SVG or DOM may still need imperative code for correctness.

## Implementation Plan

- **Affected paths**: `.storybook/`, `package.json` scripts (`storybook`, `build-storybook`), `packages/dashboard/src/ui/**`, `packages/dashboard/src/browser/main.ts`, `packages/dashboard/public/**`, optional `storybook-static/` gitignore, `scripts/copy-build-assets.mjs` for Pico and dashboard assembly
- **Dependencies (dev)**: `storybook@10.x`, `@storybook/html-vite@10.x`, `@storybook/addon-docs@10.x`, `vite` compatible with Storybook peers, `@picocss/pico` for CSS; optional Storybook addons (e.g. a11y, designs, themes, vitest, `storybook-addon-decision-records`) stay dev-only; align Storybook-related package **majors** when upgrading
- **Patterns to follow**: Import Pico then dashboard CSS in preview; prefer **typed props** with defaults; export **inner HTML** fragments when the shell is fixed in `index.html`; use **`escapeHtml`** for interpolated strings; co-locate `*.stories.ts` with the modules they exercise
- **Patterns to avoid**: Importing Storybook from runtime dashboard code; committing `node_modules` or vendored Pico into `public/`; unescaped interpolation of API or filesystem strings into HTML

### Verification

- [x] `.storybook/main.ts` targets the dashboard Storybook framework and story glob.
- [x] `.storybook/preview.ts` loads Pico + dashboard CSS and applies a theme toolbar decorator.
- [x] `npm run storybook` and `npm run build-storybook` succeed.
- [x] Dashboard UI helpers live under `packages/dashboard/src/ui/` with shared `escapeHtml` and exported types.
- [x] Published package contents remain limited to `dist/**/*` per `package.json` `files` (no Storybook artifacts).

## Alternatives Considered

- **No Storybook; iterate only on the live dashboard**: Rejected for slower feedback and weaker documentation of component variants.
- **Storybook for React only**: Rejected because the dashboard is HTML-first today; introducing React solely for docs would increase bundle and mental overhead.
- **CSS-only Storybook without TS modules**: Rejected because parameterized examples and type-safe props materially reduce duplication between stories and future runtime wiring.

## More Information

Bundling uses the **`@agent-profiler/dashboard`** workspace (`npm run build` runs Rollup, then copies assets into `dist/dashboard/`). The **authoring and documentation** standard for dashboard UI is captured above.

## Implementation History

- **2026-05-16**: Dashboard presentation CSS is authored as **SCSS** partials **co-located** with UI modules under `packages/dashboard/src/ui/**`, with shared theme tokens + base resets in `packages/dashboard/src/styles/`. The dashboard workspace **`npm run build`** runs **`sass`** to emit **`packages/dashboard/public/styles.css`** (still linked from shipped `index.html`). Storybook preview imports **`src/styles/dashboard.scss`** so Vite compiles styles during docs development.
- **2026-05-17**: Expanded the UI tree with co-located modules and stories: layout primitives (`dashboard-grid`, `dashboard-card`, `dashboard-button`), chart/histogram helpers, and panel **views** (`observable-usage-view`, `timeline-view`, `efficiency-view`, `context-audit-view`, `red-flags-view`, `recommendations-view`, `tool-histogram-view`, etc.). New modules follow the same **parameterized HTML + `escapeHtml`** pattern; the Rollup browser bundle wires the views the live dashboard needs.
- **2026-05-18**: Registered additional **dev-only** Storybook addons in `.storybook/main.ts`: `@storybook/addon-themes`, `@storybook/addon-a11y`, `@storybook/addon-designs`, `@storybook/addon-mcp`, `@storybook/addon-vitest`, `storybook-addon-tag-badges`, and `@vueless/storybook-dark-mode` (supplementary to the preview toolbar; canonical theme switching remains the **`data-theme` / `color-scheme` decorator** in `.storybook/preview.ts`).
- **2026-05-18**: Wired **`storybook-addon-decision-records`** to `docs/decisions` (categories `architecture`, `process`, `telemetry`, index `README.md`) so stories can link to governing ADRs from the Storybook **Architecture** panel without shipping ADR tooling in the npm package.
