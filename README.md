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

Configured sources live in `data/feeds.json` (Washington Post world & entertainment, ALXnow, AP, BBC World).

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
