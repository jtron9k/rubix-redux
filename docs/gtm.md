# Google Tag Manager and analytics

The site loads Google Tag Manager when **Settings → GTM container ID** holds an ID like `GTM-ABC1234`. Blank or malformed IDs load nothing. The app itself sends no analytics: it pushes events into `window.dataLayer`, and GTM decides where they go (GA4, ad platforms, anything else).

Third-party widgets (chat, call tracking, review badges, pixels) also belong in GTM, not in the app code.

## The event contract

Every event is a plain `dataLayer.push({ event, ...fields })`. **No field is ever `undefined`**: a missing value is sent as `""`. (GTM keeps the previous value for a key pushed as `undefined`, so stale data would leak between events.)

Fields shared by most events:

| Field | Example | Meaning |
|---|---|---|
| `page_path` | `/austin/date-night` | The URL path the visitor is on |
| `page_group` | `austin` | The page group (first URL segment), `""` on root pages |

### `phone_click`

A visitor tapped a call link.

| Field | Example |
|---|---|
| `phone` | `(555) 010-0123` (the number shown, after group overrides) |
| `cta_location` | `header`, `hero`, `cta_band`, `cta_band_bottom`, `footer`, `sticky_bar`, `form_error`, `form_success` |
| `page_path`, `page_group` | |

### `cta_click`

A visitor clicked a button that isn't a call link (a link to another page, or a `#quote` jump to the form).

| Field | Example |
|---|---|
| `cta_label` | `Get a quote` |
| `cta_location` | `hero`, `hero_secondary`, `cta_band`, `sticky_bar`, … |
| `cta_href` | `#quote`, `/austin/summer` |
| `page_path`, `page_group` | |

### `form_step`

A visitor finished one step of a multi-step lead form.

| Field | Example |
|---|---|
| `form_id` | `date-night-quote` |
| `step` | `2` (1-based number of the step just completed) |
| `step_name` | `phone` (the field on that step) |
| `page_path`, `page_group` | |

### `generate_lead`

A lead form was submitted and the server accepted it. This is the conversion.

| Field | Example |
|---|---|
| `form_id` | `date-night-quote` |
| `experiment_id` | `denver_dn_v1`, or `""` |
| `experiment_arm` | `control`, `variant`, or `""` |
| `page_path`, `page_group` | |

### `experiment_view`

Pushed once per page load on a page running an A/B test, after the arm is decided.

| Field | Example |
|---|---|
| `experiment_id` | `austin_home_v1` |
| `experiment_arm` | `control` or `variant` (a variant that can't render is reported as `control`) |
| `page_path`, `page_group` | |

### The arm cookie

Each test stores the visitor's arm in a first-party cookie for 30 days, readable by GTM:

- Name: `lp_ab_<id>`, with the id lowercased and anything outside `a-z 0-9 _` turned into `_` (test `austin_home_v1` → `lp_ab_austin_home_v1`).
- Value: `control` or `variant`.

QA links with `?lp_ab=a` or `?lp_ab=b` show an arm without writing the cookie, so they don't pollute results.

## Recipe: GA4 through GTM

Do this once per container.

### 1. Variables

In **Variables → User-Defined Variables → New**, create a **Data Layer Variable** (version 2) for each field you want to report. Name them `DLV - <field>`:

`page_path`, `page_group`, `phone`, `cta_location`, `cta_label`, `cta_href`, `form_id`, `step`, `step_name`, `experiment_id`, `experiment_arm`.

For a test you want to segment every event by, also add a **1st Party Cookie** variable named `Cookie - lp_ab_<id>` with cookie name `lp_ab_<id>`.

### 2. GA4 configuration

Add a **Google Tag** with your GA4 measurement ID (`G-…`), fired on **Initialization - All Pages**.

The site is a single-page app: moving between pages doesn't reload it. To count those page views, turn on **Enhanced measurement → Page views → Page changes based on browser history events** in the GA4 data stream settings.

### 3. Triggers

Create one **Custom Event** trigger per event, with the event name matching exactly:

| Trigger name | Event name |
|---|---|
| `CE - phone_click` | `phone_click` |
| `CE - cta_click` | `cta_click` |
| `CE - form_step` | `form_step` |
| `CE - generate_lead` | `generate_lead` |
| `CE - experiment_view` | `experiment_view` |

### 4. GA4 event tags

For each trigger, add a **Google Analytics: GA4 Event** tag using the same event name, with the matching variables as event parameters. For example:

- **GA4 - generate_lead**: event name `generate_lead`; parameters `form_id`, `page_path`, `page_group`, `experiment_id`, `experiment_arm`; trigger `CE - generate_lead`. In GA4, mark `generate_lead` as a key event.
- **GA4 - phone_click**: event name `phone_click`; parameters `cta_location`, `page_path`, `page_group`; trigger `CE - phone_click`. Mark it as a key event too if calls are conversions for you. Don't send the phone number to GA4 unless you need it.
- **GA4 - experiment_view**: event name `experiment_view`; parameters `experiment_id`, `experiment_arm`, `page_path`; trigger `CE - experiment_view`.

Register each custom parameter as a **custom dimension** in GA4 (**Admin → Custom definitions**, event scope) so it shows up in reports.

### 5. Test and publish

1. Click **Preview** in GTM and open your site.
2. Tap a call link, click a button, step through a form and submit a test lead. Each push should appear in the Tag Assistant timeline with its fields, and the matching tag should fire.
3. Open a page with a test and check `experiment_view` fires once, and that the `lp_ab_<id>` cookie is set (DevTools → Application → Cookies).
4. **Submit** and publish the container.

## Reading A/B results in GA4

Use an **Exploration** with `experiment_arm` (or the cookie variable) as a dimension and `generate_lead` and `phone_click` counts as metrics, filtered to the `experiment_id` you're testing. Compare conversions per `experiment_view` in each arm. Let a test run until each arm has enough conversions to trust the difference; a few dozen is a floor, not a target.
