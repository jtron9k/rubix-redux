# Rubix Redux

Landing pages for paid traffic, edited in a CMS instead of code. Each URL is a JSON file; editors change copy, phones, offers and A/B tests in Decap CMS, every save commits to GitHub, and Netlify redeploys in about a minute.

Built with React 18, Vite 5, Tailwind CSS, Decap CMS and Netlify. MIT licensed.

> **Sample content.** The repo ships with a fictional babysitting service, "Brightside Sitters", in two cities. Its reviews, claims, phone numbers (555-01xx) and images are placeholders. Some sample promo dates are in 2027 and will go stale; `npm run check:content` warns about everything you still need to replace.

<!-- Screenshot: a sample page on desktop and mobile (added in the setup walkthrough). -->

## Features

- **Five layouts**: standard, services-first, trust-heavy, lead-form (form beside the hero) and campaign (countdown and date-gated coupons). Each page picks one.
- **Page groups**: the first URL segment (`/austin`, `/denver`, or `/es`, `/partners`) can override the phone, hours, service area, meta tags and review count. Adding a group is a CMS entry, not a code change.
- **Template tokens** like `{{groupName}}` and `{{phone}}`, so pages in different groups can be near-copies.
- **Silent A/B tests**: serve a different layout or a different page at the same URL, split by percentage, sticky for 30 days, with QA links and a kill switch.
- **Click-to-call** everywhere, with a sticky call bar on mobile.
- **Lead forms** configured in the CMS (single or multi-step), sent to your webhook (Zapier, Make, n8n, a CRM) or to Netlify Forms. Ad-click IDs and UTM parameters ride along.
- **Promos**: coupons, announcement bars and promo ads with start and end dates, plus preview links.
- **Campaign expiry**: when a campaign page ends, visitors go to the group's home page with their tracking parameters kept.
- **Live review counter** that counts up next to the star rating.
- **Per-page share cards**: link previews use each page's title, description and image, generated from content at build time.
- **Google Tag Manager** with a documented event contract ([docs/gtm.md](docs/gtm.md)).
- **First-time setup**: a browser wizard at `/setup` or `npm run setup`.
- **Quality gates**: a content checker, unit tests and CI that also runs on CMS commits.

## Contents

- [Quick start](#quick-start)
- [First-time setup](#first-time-setup)
- [Deploy to Netlify](#deploy-to-netlify)
- [CMS login (GitHub OAuth)](#cms-login-github-oauth)
- [Environment variables](#environment-variables)
- [Editing content](#editing-content)
- [Adding a page group or a page](#adding-a-page-group-or-a-page)
- [A/B testing](#ab-testing)
- [Promos and campaigns](#promos-and-campaigns)
- [Leads](#leads)
- [Tracking](#tracking)
- [Customizing](#customizing)
- [Checks and tests](#checks-and-tests)
- [Troubleshooting](#troubleshooting)

## Quick start

You need Node 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. You'll see the sample home page and a banner linking to first-time setup. Try `/austin`, `/austin/date-night`, `/austin/summer`, `/denver` and `/denver/date-night`.

## First-time setup

Open http://localhost:5173/setup while `npm run dev` is running. The wizard has seven steps:

1. **Business**: name, tagline, main phone, email, address, hours, service area, footer license line, and the default page title and description.
2. **Brand**: primary and accent colors with a live preview, logo path and alt text.
3. **Tracking**: your Google Tag Manager container ID (`GTM-XXXXXXX`, or blank) and whether to hide pages from search engines (on by default; paid landing pages usually shouldn't be indexed).
4. **Leads**: Netlify Forms or a webhook URL, and the consent text shown under forms.
5. **Page groups**: add, rename or remove groups, each with an optional phone override. Renaming moves the group's pages and fixes links to them; removing deletes them.
6. **Publishing**: your GitHub repository (`owner/name`) and site URL.
7. **Review and save**: lists every file that will change before anything is written, then shows your next steps.

Prefer the terminal? `npm run setup` asks the same questions. Press Enter to keep the current value.

Setup writes only `content/settings/business.json`, `content/groups/`, `content/pages/` (for group changes), the `repo` and `base_url` lines of `public/admin/config.yml`, and `.env` (a webhook URL for local testing). Commit the result.

`/setup` exists only in development; production builds don't include it.

## Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/jtron9k/rubix-redux)

The button copies this repo to your GitHub account and creates a Netlify site from it. Or push your own copy to GitHub and choose **Add new site → Import an existing project** in Netlify. Build settings come from `netlify.toml`, so there's nothing to type.

On Netlify, the build points the CMS at the repository and URL it's deploying, so a fork works without editing `config.yml`.

## CMS login (GitHub OAuth)

The CMS at `/admin` logs editors in with GitHub through two small functions in this repo (no third-party auth service).

1. In GitHub, go to **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Homepage URL**: `https://your-site.netlify.app`. **Authorization callback URL**: `https://your-site.netlify.app/api/callback`.
3. Create a client secret. Put the client ID and secret in Netlify's environment variables (below) and redeploy.
4. Open `https://your-site.netlify.app/admin` and log in. Editors need write access to the repository.

## Environment variables

Set these in Netlify under **Site configuration → Environment variables**, then redeploy.

| Variable | Required | Where it comes from |
|---|---|---|
| `GITHUB_CLIENT_ID` | Yes, for `/admin` | Your GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | Yes, for `/admin` | Your GitHub OAuth App |
| `LEAD_WEBHOOK_URL` | No | Your Zapier, Make, n8n or CRM webhook. Without it, leads go to Netlify Forms |

The `.env` file that setup writes is for `netlify dev` only; it isn't deployed.

## Editing content

The CMS has three collections:

- **Settings**: business info, GTM ID, brand colors, consent text, default meta tags, review counter, badges.
- **Page Groups**: one entry per first URL segment, with optional overrides.
- **Pages**: one entry per URL. The **URL path** field is the page's address.

Every save commits to `main`, which triggers a deploy. Copy fields accept `**bold**`. Uploaded images go to `public/images/uploads/`.

To edit locally without GitHub, run `npx decap-server` alongside `npm run dev` and open http://localhost:5173/admin/index.html. Changes are written straight to your files.

## Adding a page group or a page

**A group**: in **Page Groups → New**, set the key (lowercase, like `houston`), the name and region, and any overrides. Then create its home page with URL path `/houston`. Setup does both at once and starts the page from a template.

**A page**: in **Pages → New**, set the URL path (`/houston/date-night`; the first segment must be a group), pick a layout, and fill in the sections. `lead-form` pages need a form; `campaign` pages need coupons.

Tokens you can use in any text: `{{businessName}}`, `{{groupName}}`, `{{regionName}}`, `{{stateAbbr}}`, `{{groupSlug}}`, `{{phone}}`. The phone and names come from the page's group. `{{reviewCount}}` shows the live review counter.

## A/B testing

Open **A/B test** on the control page:

- **Test ID**: a name for the test, like `austin_home_v1`.
- **Variant layout**: render this same page with another layout for half the visitors, **or**
- **Variant page**: serve another page's content at this URL (the variant page also stays reachable at its own address).
- **Variant share (%)**: percent of visitors in the variant (blank means 50).

Each visitor keeps their arm for 30 days through the cookie `lp_ab_<id>`. The page pushes one `experiment_view` per load; leads carry the experiment and arm.

- **QA**: add `?lp_ab=b` (variant) or `?lp_ab=a` (control) to the URL. These don't set the cookie. `?lp_ab=off` clears it.
- **Kill switch**: set the variant share to `0` (everyone sees control) or `100` (everyone sees the variant).
- **Restart**: change the ID. Old cookies are ignored.
- **Staging a test**: a 0 % share still records visitors as control, so they'd stay in control once the test goes live. Stage under a throwaway ID, then switch to the real one.

If the variant can't render (for example a `lead-form` layout on a page without a form), everyone gets the control and it's reported as control. Read results in GA4 as described in [docs/gtm.md](docs/gtm.md#reading-ab-results-in-ga4).

## Promos and campaigns

Coupons, announcement bars and promo ads each take optional **Starts** and **Expires** dates. `YYYY-MM-DD` is local time, and an expiry date lasts through the end of that day. The announcement bar shows the first active entry; promo ads show all active ones; coupons show a countdown.

Preview links:

- `?promo_preview=1` shows every entry regardless of dates.
- `?promo_start=20270601&promo_end=20270630` shows entries active at any point in that range.

**Campaign end**: set **Campaign ends** on a page and, after that date, visitors are sent to the group's home page (or `/` for a group home) with their query string, so ad-click IDs survive.

## Leads

Forms post to `/api/lead`, which checks the name, a phone with 10 or more digits and consent, and drops bots that fill a hidden field.

- **Webhook**: with `LEAD_WEBHOOK_URL` set, each lead is POSTed as JSON: the form fields, `page`, `group`, `form_id`, any `utm_*`, `gclid`, `msclkid` and `fbclid` values, the experiment and arm, `consent`, and `submitted_at`. In Zapier, use **Webhooks by Zapier → Catch Hook**; Make, n8n and most CRMs work the same way.
- **Netlify Forms**: without a webhook, leads appear under **Forms → lead** in Netlify. Turn on email notifications there.

If delivery fails, the visitor sees an error asking them to call.

## Tracking

With a GTM ID in Settings, the site loads GTM and pushes these events: `phone_click`, `cta_click`, `form_step`, `generate_lead` and `experiment_view`. [docs/gtm.md](docs/gtm.md) lists every field and walks through the GA4 setup. Add chat widgets, call tracking and pixels through GTM rather than the code.

## Customizing

- **Layouts** are in `src/layouts/`, built from sections in `src/components/`. Adding a layout means updating `src/content/types.ts`, `shared/content-core.mjs`, `src/layouts/index.ts` and both layout selects in `public/admin/config.yml`; the checks fail until all agree.
- **Colors** come from Settings. **Fonts** are set in `build/site-settings-plugin.ts` (`FONTS_HREF`) and `tailwind.config.js` (`fontFamily`); change both together.
- **Icons** come from [lucide](https://lucide.dev). Add one to `src/content/iconMap.ts` and to the `icon` select in `config.yml`.
- **New content fields** go in `src/content/types.ts` **and** `public/admin/config.yml`, or the CMS drops them on save.
- **Share images**: the placeholder is an SVG, which most link previews ignore. Use a 1200×630 PNG or JPG for **Default share image** and per-page images.

See [AGENTS.md](AGENTS.md) for architecture and the rules that are easy to break.

## Checks and tests

```bash
npm run typecheck
npm run lint
npm test
npm run check:content
npm run build
```

`check:content` fails on broken content (bad paths, unknown layouts or icons, missing variant pages, invalid dates, leftover `{{tokens}}`, a malformed GTM ID) and warns about go-live leftovers (the sample business name, placeholder images, sample reviews). Before launch, run `npm run check:content -- --strict` to fail on those too.

GitHub Actions runs all five on pull requests and on every push to `main`, including CMS saves.

## Troubleshooting

- **`/admin` is blank in dev**: use the full path, http://localhost:5173/admin/index.html.
- **Local CMS edits don't save**: run `npx decap-server` in a second terminal.
- **Login popup never closes or says "state mismatch"**: check the OAuth App's callback URL matches the site exactly (`https://…/api/callback`), and that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set and the site was redeployed.
- **The CMS drops a field or won't save**: the field is missing from `config.yml`, or an optional object or list lacks `required: false` on it and its inner fields.
- **Images are broken under `npm run preview`**: production images go through Netlify's image CDN, which `vite preview` doesn't have. Use `netlify dev` or a deploy preview.
- **Leads don't appear in Netlify Forms**: the form is registered at build time; redeploy after adding fields, and check **Forms** is enabled for the site.
- **GTM doesn't fire**: the ID must look like `GTM-ABC1234`, and the container must be published. Use GTM Preview to watch events.

## License

MIT. See [LICENSE](LICENSE).
