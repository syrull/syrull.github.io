# Repository Guidelines

## Project Structure & Module Organization
`src/` holds UI code and `src/content/` hosts Markdown collections. Key dirs: `src/components` (shared UI), `src/layouts` (page scaffolds), `src/pages` (routes), `src/assets` (importable media), and `src/styles` (global CSS). Collections live in `src/content/{blog,posts,writeups}` and follow the schemas in `src/content.config.ts`; add new entries under the matching folder with required frontmatter. Static assets that bypass the bundler belong in `public/`. Build output lands in `dist/` and should not be edited manually.

## Build, Test, and Development Commands
- `npm install` — install dependencies.
- `npm run dev` — launch the dev server at http://localhost:4321.
- `npm run build` — compile the production bundle into `dist/`.
- `npm run preview` — serve the built site locally for smoke tests.
- `npm run astro -- check` — validate content schemas and TypeScript types.

## Coding Style & Naming Conventions
Use 2-space indentation and let your editor's Astro/TypeScript formatter run before commits. Name `.astro` components in PascalCase (`Header.astro`) and exported helpers in camelCase. Co-locate CSS or utilities with their companion component when it improves clarity. Keep the strict typing defaults from `astro/tsconfigs/strict`; add explicit types instead of relying on `any` or implicit inference.

## Component Button Style Guidelines
All interactive buttons across components must follow a consistent style:
```css
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  background: rgb(var(--bg-primary));
  border: 1px solid rgb(var(--border-color));
  border-radius: 6px;
  color: rgb(var(--text-primary));
  font-size: 0.8rem;
  font-weight: 500;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: rgb(var(--bg-secondary));
}
```
This applies to action buttons in `PythonScript.astro`, `GoogleDork.astro`, `GitHubRepo.astro`, and any future components with clickable buttons. Use outlined style (not filled) with accent color on hover.

## Testing Guidelines
No formal test runner is configured yet; rely on `npm run astro -- check` and `npm run build` before pushing. When you introduce automated tests, place `.test.ts[x]` files alongside the code they cover and document any new tooling in this guide. For visual changes, capture screenshots and sanity-check pages via `npm run preview`.

## Commit & Pull Request Guidelines
Write concise, imperative commit subjects (e.g., `Add posts index cards`) and expand on context in the body when needed. PRs should describe the change, list local testing, and attach before/after screenshots for UI updates. Call out affected paths under `src/content/` so reviewers can verify frontmatter changes quickly.

## Content Authoring Notes
Each entry under `src/content/` needs `title`, `pubDate`, and any optional metadata declared in `src/content.config.ts`. Store upload-style assets in `public/` or import them via the `<Image />` component for optimization. Draft longform pieces on a feature branch and preview with `npm run dev` to confirm TOC, hero media, and syntax highlighting behave as expected.
