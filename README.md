# Best News RSS

A [Next.js](https://nextjs.org) app on Vercel that fetches RSS feeds you choose and serves a **cleaned** version: plain-text summaries, no full-article HTML, and stripped tracking query parameters.

## What gets removed

- HTML in titles and descriptions (optional)
- `content:encoded` full article bodies (optional)
- UTM and common tracking params on item links (`utm_*`, `fbclid`, `gclid`, …)
- Long descriptions truncated to a max length you set

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), add feeds, and copy the **Dakboard URL** into an RSS widget.

## RSS output URLs (for Dakboard)

Paste one of these into Dakboard → Add block → **RSS Feed** → Feed URL:

| URL | Use when |
|-----|----------|
| `https://your-app.vercel.app/rss/all` | **Dakboard default** — merged feeds, plain text, no links or images |
| `https://your-app.vercel.app/rss/all/full` | Same merge, but with article links and lead images |
| `https://your-app.vercel.app/rss/{id}` | A single source only |
| `https://your-app.vercel.app/rss?url=…` | One-off, no save |

Query overrides: `?links=true`, `?images=true` (e.g. `/rss/all?links=true`).

Configured sources live in `data/feeds.json` (Washington Post world & entertainment, ALXnow, AP, BBC World, WTOP, NewsBreak Groveton).

### NewsBreak local pages

NewsBreak does not offer a public RSS URL for readers ([they accept RSS from publishers, not the other way around](https://help.newsbreak.com/hc/en-us/articles/36837190635405-How-do-I-deliver-my-content-to-NewsBreak)). This app can turn a location page into RSS by reading its embedded feed data, e.g.:

`https://www.newsbreak.com/groveton-va` → included in `/rss/all` or alone at `/rss/newsbreak-groveton`

Add any location slug from the NewsBreak URL path to `data/feeds.json`.

### Dakboard image display (custom widget)

For full-bleed background images with readable text overlay, use a **Website/iFrame** block (paid custom screens) pointing at:

`https://your-app.vercel.app/display?seconds=14`

Stories rotate every 14 seconds (change with `?seconds=5` through `120`). The page reloads every 5 minutes to pick up fresh headlines. The blue progress strip is off by default; add `&progress=true` to enable it.

**Why does text still look cropped?** Content is limited in three places:

1. **Extraction** (`lib/display/items.ts`) — `maxParagraphs` (default `8` for display) and `maxDescriptionLength` (`1000`). RSS feeds often only ship one short summary paragraph.
2. **Cleaning** (`lib/rss/clean.ts`) — `dropFullContent: true` on `/rss/all` keeps only the lead paragraph; display sets `dropFullContent: false` and uses multiple `<p>` tags when available.
3. **CSS** (`app/display/display.css`) — `-webkit-line-clamp` on `.display-description` hides overflow in the widget. Raise or remove it to show more lines.

Debug: open `/api/display` in a browser and check the `description` field length before blaming the widget CSS.

**Missing images on `/display`:** If the RSS item has no image, the app fetches the article URL and uses `og:image` / `twitter:image` from the page HTML. Stories with no RSS image and no OG tag keep the gradient-only background. Some sites block automated fetches; AP/BBC summaries in third-party feeds may still lack a usable hero URL.

Opening the URL in a browser shows raw RSS 2.0 XML (`application/rss+xml`).

## API

| Endpoint | Description |
|----------|-------------|
| `GET /rss/{id}` | **Primary** — cleaned RSS 2.0 for a saved feed |
| `GET /rss?url=…` | Cleaned RSS 2.0 for any source URL |
| `GET /api/feed/{id}` | Same as `/rss/{id}` |
| `GET /api/clean?url=…` | Same as `/rss?url=…` |
| `GET/POST/DELETE /api/feeds` | List, add, or remove saved feeds |

### Query parameters (both feed endpoints)

| Param | Default | Effect |
|-------|---------|--------|
| `stripHtml` | `true` | Plain text only |
| `removeTracking` | `true` | Strip tracking query params |
| `dropFullContent` | `true` | Ignore `content:encoded` |
| `maxDescriptionLength` | `400` | Truncate descriptions |

Example:

```
/rss?url=https://feeds.bbci.co.uk/news/world/rss.xml&stripHtml=true&maxDescriptionLength=200
```

## Deploy on Vercel

```bash
vercel
```

**Build error “No Output Directory named public”?** In [Vercel Project Settings](https://vercel.com/docs/project-configuration) → General → Build & Development Settings, set **Framework Preset** to **Next.js** and clear **Output Directory** (leave blank). This repo includes `vercel.json` so Vercel uses the Next.js builder instead of a static `public` folder.

**Saving feeds in production:** Vercel’s filesystem is read-only at runtime. To add feeds on production you can:

1. Edit `data/feeds.json` in git and redeploy, or
2. Run `npm run dev` locally to add feeds via the UI (writes to `data/feeds.json`), then commit and push.

For dynamic feed storage later, plug in [Vercel KV](https://vercel.com/docs/storage/vercel-kv) or a database and swap `lib/feeds-store.ts`.

## Project layout

```
app/           # UI and API routes
data/feeds.json
lib/rss/       # fetch + clean + XML builder
```
