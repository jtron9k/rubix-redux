# AGENTS.md

Data-driven landing pages on React 18, Vite 5, Tailwind 3.4 and Decap CMS 3.16, hosted on Netlify. Every URL is a JSON file in `content/`; editors change content in `/admin`, which commits to `main` and triggers a deploy. The sample business ("Brightside Sitters") is fictional.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on 5173. `/setup` (wizard) and `/__setup/*` exist only here |
| `npx decap-server` | Local CMS backend on 8081; then open `http://localhost:5173/admin/index.html` |
| `npm run build` | `prebuild` writes the og manifest, `vite build`, `postbuild` patches `dist/admin/config.yml` |
| `npm run typecheck` | Writes the og manifest, then `tsc` for `src`, `build`/configs, and `netlify` |
| `npm run lint` | ESLint (flat config) |
| `npm test` | `pretest` writes the og manifest, then Vitest |
| `npm run check:content` | Content gate; `-- --strict` also fails on go-live warnings |
| `npm run setup` | CLI version of the setup wizard; accepts piped answers |
| `npm run placeholders` | Regenerates `public/images/uploads/placeholder-*.svg` |

Gates before every commit: `npm run typecheck && npm run lint && npm test && npm run check:content && npm run build`. CI (`.github/workflows/ci.yml`) runs the same on PRs and on push to `main`.

## Layout

```
content/settings/business.json   one file: business info, GTM, brand colors, consent, defaults
content/groups/<key>.json        a page group = first URL segment (/austin); overrides phone, hours, meta…
content/pages/<file>.json        one per URL; the `slug` field is the real path, file name is cosmetic
shared/content-core.mjs          pure rules shared by app, scripts and setup (slugs, groups, templates,
                                 review counter, tel links, LAYOUT_KEYS, canRenderLayout) + .d.mts
shared/setup-rules.mjs           setup validation (wizard and setup-core); shared/theme.mjs color scales
build/site-settings-plugin.ts    Vite plugin: head tags, theme CSS, GTM, Netlify Forms stub, /__setup API
scripts/lib/setup-core.mjs       the ONLY setup writer (readState / planSetup / applySetup), whitelisted paths
scripts/lib/load-content.mjs     content reader for Node scripts; scripts/lib/admin-config.mjs config.yml edits
scripts/templates/group-home.json page cloned for a new group by setup
src/AppRouter.tsx                one catch-all route (+ lazy /setup in DEV only)
src/LandingPage.tsx              resolve page → campaign redirect → experiment → layout → sticky bar
src/content/                     types.ts (schema), loaders (import.meta.glob), iconMap.ts
src/layouts/index.ts             layout registry; src/components/ shared sections
src/lib/                         experiment, promo, lead, tracking, analytics, image (pure, tested)
netlify/functions/               auth + callback (GitHub OAuth for Decap), lead
netlify/edge-functions/og-meta.ts per-page share tags from og-manifest.json (generated, gitignored)
netlify/lib/                     helpers and tests for functions (NOT in functions/: everything there deploys)
public/admin/                    Decap index.html (pinned CDN build) and config.yml
```

Components get `site` (settings merged with the group) and `page` as props. There is no React context for content.

## Content rules

- **Schema sync.** Every field in `src/content/types.ts` needs a field in `public/admin/config.yml`: Decap drops unknown keys on save.
- **Optional objects and lists** in Decap need `required: false` on the wrapper **and** every inner field, or saving an entry that leaves them empty fails.
- **Layouts live in four places**: the `LayoutKey` union and `LAYOUT_KEYS` in `types.ts`, `LAYOUT_KEYS` in `shared/content-core.mjs`, the registry in `src/layouts/index.ts`, and both selects (`layout`, `variantLayout`) in `config.yml`. `check-content` and `scripts/registries.test.mjs` fail when they drift. Same for icons: `src/content/iconMap.ts` and the `icon` select.
- `canRenderLayout(page, key)` is the single rule for whether a page can use a layout (`lead-form` needs `form.fields`, `campaign` needs `coupons`). LandingPage, the A/B split and check-content all use it.
- **Template tokens** in any string: `{{businessName}} {{groupName}} {{regionName}} {{stateAbbr}} {{groupSlug}} {{phone}}`. `{{reviewCount}}` is runtime-only (review counter). Unknown tokens are left in place and fail check-content.
- **Slugs** match `^/$|^/[a-z0-9-]+(/[a-z0-9-]+)*$`; the first segment must be a group key (check-content error otherwise). Decap names files from the slug: `/austin/date-night` → `austin-date-night.json`, `/` is `home.json`.
- Reserved group keys: `admin`, `api`, `setup`, `images`, `assets`.
- Dates: `YYYY-MM-DD` is local time and a date-only `expiresAt` / `campaignEndsAt` lasts through the end of that day; full ISO datetimes also work.
- Review counter: settings → group → page; `target: 0` turns it off, blank inherits. Off means labels with `{{reviewCount}}` are dropped.
- Sample dates go stale: the campaign ends 2027-08-31 and some coupons start in 2027 (`?promo_preview=1` shows them).

## Behavior that's easy to break

- **Routing order.** `netlify.toml`: `/api/*` redirects first, SPA fallback `/*` last. In `LandingPage`, the campaign-expiry redirect runs **before** the experiment, so an expired page never writes an arm cookie or reports `experiment_view`. Expired campaigns go to `/<group>` (or `/` for a group home) with the query string kept, and only if the target exists.
- **A/B split** (`src/lib/experiment.ts`): decided synchronously during render (an effect would flash control), cached per pathname + QA pin. Precedence: `?lp_ab=a|b|off` pin, then 0/100 %, then cookie `lp_ab_<id>`, then roll. Pins write no cookie and are stripped with `replaceState`; `off` clears it. A variant that can't render serves and reports `control`. Nothing in readArm/decideArm may throw. **Gotcha:** a 0 % share still writes a control cookie, so stage a test under a throwaway id; changing the id restarts a test.
- **dataLayer**: never push `undefined`; `pushEvent` sends `""`. Events: `experiment_view`, `phone_click`, `cta_click`, `generate_lead`, `form_step`. Contract in `docs/gtm.md`; keep it in sync when fields change.
- **Phone links** only through `PhoneLink` (`tel:+1<digits>` from `site.phone`, pushes `phone_click`). The sticky mobile bar dials, except on `lead-form` pages where it scrolls to the form. `#quote` scrolls to the form on any layout that has one.
- **Leads**: `/api/lead` validates name, 10+ phone digits and consent; a filled `company` honeypot gets a silent 200. It POSTs JSON to `LEAD_WEBHOOK_URL` when set, otherwise urlencoded `form-name=lead` to `${URL}/` (Netlify Forms). The plugin injects a hidden static `lead` form listing every field name across the pages, so Netlify detects it at build time. Forward failure → 502, and the form tells the visitor to call.
- **Share cards**: `scripts/build-og-manifest.mjs` → `og-manifest.json` → `og-meta` edge function. It can only replace tags that exist, so the plugin always writes the full title/description/og/twitter set. The placeholder share image is SVG, which most unfurlers ignore.
- **Images**: rasters go through `/.netlify/images` in production; dev and SVGs use the file directly. `vite preview` has no image CDN.
- **Theme**: `brand.primary`/`accent` become `--brand-50…900` and `--accent-50…900` CSS variables; Tailwind maps `brand-*`/`accent-*` to them. Primary CTAs are black. Fonts are set in both the plugin (`FONTS_HREF`) and `tailwind.config.js`.

## Setup

- `/setup` (dev) and `npm run setup` both call `scripts/lib/setup-core.mjs`. It writes only `content/settings/business.json`, `content/groups/*.json`, `content/pages/*.json`, the `repo`/`base_url` lines of `public/admin/config.yml`, and `.env` (`LEAD_WEBHOOK_URL`, for `netlify dev` only).
- Group rename moves its pages and rewrites every internal link under the old prefix; removal deletes the group's pages; a new group gets `scripts/templates/group-home.json`.
- After a setup save the plugin skips the settings-file full reload for 3 s so the wizard's checklist stays visible.
- `scripts/patch-admin-config.mjs` (postbuild) rewrites `repo` and `base_url` in `dist/admin/config.yml` from Netlify's `REPOSITORY_URL` and `URL`, so forks work without editing YAML.

## Gotchas

- Any file in `netlify/functions/` deploys as a function. Keep tests and helpers in `netlify/lib/`.
- Netlify code uses extensionless imports, so Node can't run it directly; test it with Vitest.
- Scripts that check "run directly" must compare `fileURLToPath(import.meta.url)`; paths can contain spaces.
- Don't put a shebang in a module that `vite.config.ts` imports (directly or via the plugin); Vite's config bundler fails on it. Shared helpers go in `scripts/lib/`.
- The og manifest is generated and gitignored; `typecheck`, `test` and `build` regenerate it.
- `/admin` under Vite dev needs the full path `/admin/index.html`.
- Decap only enables Publish when a value changed. To test a save round trip: change, save, `git diff`, then `git checkout` the file. Reload between entries rather than changing the hash. Decap reorders keys on save (harmless).
- Script tests are `.test.mjs` (not typechecked); `src` and `netlify` tests are typechecked.
- `.local/` is gitignored and holds a list of terms that must never appear in the repo or commit messages. Before committing or pushing, run `grep -riFf .local/forbidden-terms.txt --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.local .` and expect no output.

## Conventions

- Conventional Commits. Commit after each coherent step; all gates green.
- lucide-react is the only icon library; add icons to `iconMap.ts` **and** the Decap `icon` select.
- Keep pure logic React-free in `src/lib/` or `shared/` with tests next to it.
- Docs: `README.md` (users), this file (agents), `docs/gtm.md` (tracking). `next_steps.md` (session handoff) and `docs/plans/` are local and gitignored.
