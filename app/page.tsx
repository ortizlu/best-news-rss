'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FeedSource } from '@/lib/types';

type CleanPrefs = {
    stripHtml: boolean;
    removeTracking: boolean;
    dropFullContent: boolean;
    maxDescriptionLength: number;
};

const DEFAULT_PREFS: CleanPrefs = {
    stripHtml: true,
    removeTracking: true,
    dropFullContent: true,
    maxDescriptionLength: 1000
};

function buildCleanQuery(prefs: CleanPrefs): string {
    const q = new URLSearchParams();
    q.set('stripHtml', String(prefs.stripHtml));
    q.set('removeTracking', String(prefs.removeTracking));
    q.set('dropFullContent', String(prefs.dropFullContent));
    q.set('maxDescriptionLength', String(prefs.maxDescriptionLength));
    return q.toString();
}

export default function Home() {
    const [feeds, setFeeds] = useState<FeedSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [prefs, setPrefs] = useState<CleanPrefs>(DEFAULT_PREFS);
    const [origin, setOrigin] = useState('');

    const query = useMemo(() => buildCleanQuery(prefs), [prefs]);

    const loadFeeds = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/feeds');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Failed to load feeds');
            setFeeds(data.feeds ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load feeds');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setOrigin(window.location.origin);
        loadFeeds();
    }, [loadFeeds]);

    async function addFeed(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        try {
            const res = await fetch('/api/feeds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, url })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Failed to add feed');
            setName('');
            setUrl('');
            await loadFeeds();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to add feed');
        }
    }

    async function removeFeed(id: string) {
        setError(null);
        try {
            const res = await fetch(`/api/feeds?id=${encodeURIComponent(id)}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Failed to remove feed');
            await loadFeeds();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to remove feed');
        }
    }

    function dakboardAllUrl(): string {
        return `${origin}/rss/all?${query}`;
    }

    function dakboardFullUrl(): string {
        return `${origin}/rss/all/full?${query}`;
    }

    function dakboardDisplayUrl(): string {
        return `${origin}/display?seconds=14`;
    }

    function dakboardUrl(feed: FeedSource): string {
        return `${origin}/rss/${feed.id}?${query}`;
    }

    function previewUrl(rawUrl: string): string {
        return `${origin}/rss?url=${encodeURIComponent(rawUrl)}&${query}`;
    }

    return (
        <main className="container">
            <h1>Best News RSS</h1>
            <p className="lead">
                Add RSS sources you trust. This app strips HTML bloat, tracking parameters, and full-article markup so
                Dakboard gets a title, source name, timestamp, and short summary per story.
            </p>

            <section className="card" style={{ borderColor: 'var(--accent)' }}>
                <h2>Dakboard — all feeds in one URL</h2>
                <p className="hint" style={{ marginTop: 0 }}>
                    Text-only feed (no article links, no images) — best for Dakboard:
                </p>
                <code
                    style={{
                        display: 'block',
                        fontFamily: 'var(--mono)',
                        fontSize: '0.8rem',
                        wordBreak: 'break-all',
                        color: 'var(--text)',
                        marginBottom: '0.5rem'
                    }}
                >
                    {origin ? dakboardAllUrl() : 'https://best-news-rss.vercel.app/rss/all'}
                </code>
                <p className="hint">With clickable links and lead images:</p>
                <code
                    style={{
                        display: 'block',
                        fontFamily: 'var(--mono)',
                        fontSize: '0.8rem',
                        wordBreak: 'break-all',
                        color: 'var(--muted)',
                        marginBottom: '0.75rem'
                    }}
                >
                    {origin ? dakboardFullUrl() : 'https://best-news-rss.vercel.app/rss/all/full'}
                </code>
                <div className="feed-actions">
                    <a href={origin ? dakboardAllUrl() : '#'} target="_blank" rel="noreferrer">
                        Open text-only RSS
                    </a>
                    <button
                        type="button"
                        className="btn"
                        disabled={!origin}
                        onClick={() => navigator.clipboard.writeText(dakboardAllUrl())}
                    >
                        Copy text-only URL
                    </button>
                </div>
            </section>

            <section className="card">
                <h2>Dakboard — custom display (image background)</h2>
                <p className="hint" style={{ marginTop: 0 }}>
                    Full-screen rotating cards with a photo background and dark overlay. Use a paid custom screen →{' '}
                    <strong>Website/iFrame</strong> block:
                </p>
                <code
                    style={{
                        display: 'block',
                        fontFamily: 'var(--mono)',
                        fontSize: '0.8rem',
                        wordBreak: 'break-all',
                        color: 'var(--text)',
                        marginBottom: '0.75rem'
                    }}
                >
                    {origin ? dakboardDisplayUrl() : 'https://best-news-rss.vercel.app/display?seconds=14'}
                </code>
                <div className="feed-actions">
                    <a href={origin ? dakboardDisplayUrl() : '#'} target="_blank" rel="noreferrer">
                        Preview display
                    </a>
                    <button
                        type="button"
                        className="btn-ghost"
                        disabled={!origin}
                        onClick={() => navigator.clipboard.writeText(dakboardDisplayUrl())}
                    >
                        Copy iframe URL
                    </button>
                </div>
            </section>

            <section className="card">
                <h2>Cleaning options</h2>
                <div className="options-grid">
                    <label>
                        <input
                            type="checkbox"
                            checked={prefs.stripHtml}
                            onChange={e => setPrefs(p => ({ ...p, stripHtml: e.target.checked }))}
                        />
                        Strip HTML from text
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={prefs.removeTracking}
                            onChange={e =>
                                setPrefs(p => ({
                                    ...p,
                                    removeTracking: e.target.checked
                                }))
                            }
                        />
                        Remove tracking params from links
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={prefs.dropFullContent}
                            onChange={e =>
                                setPrefs(p => ({
                                    ...p,
                                    dropFullContent: e.target.checked
                                }))
                            }
                        />
                        Drop full article body (content:encoded)
                    </label>
                </div>
                <div className="form-row" style={{ marginTop: '1rem' }}>
                    <label htmlFor="maxLen">Max description length</label>
                    <input
                        id="maxLen"
                        type="number"
                        min={80}
                        max={2000}
                        value={prefs.maxDescriptionLength}
                        onChange={e =>
                            setPrefs(p => ({
                                ...p,
                                maxDescriptionLength: Number(e.target.value) || 1000
                            }))
                        }
                    />
                </div>
                <p className="hint">
                    Each saved feed gets a public <strong>RSS 2.0 URL</strong> — paste it into Dakboard’s RSS widget, or
                    any reader.
                </p>
            </section>

            <section className="card">
                <h2>Add a source</h2>
                <form onSubmit={addFeed}>
                    <div className="form-row">
                        <label htmlFor="name">Name</label>
                        <input
                            id="name"
                            placeholder="e.g. BBC World"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-row">
                        <label htmlFor="url">RSS feed URL</label>
                        <input
                            id="url"
                            type="url"
                            placeholder="https://feeds.bbci.co.uk/news/world/rss.xml"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn">
                            Add feed
                        </button>
                    </div>
                </form>
                {error && <p className="error">{error}</p>}
            </section>

            <section className="card">
                <h2>Your feeds</h2>
                {loading ? (
                    <p className="empty">Loading…</p>
                ) : feeds.length === 0 ? (
                    <p className="empty">
                        No feeds yet. Add one above, or edit <code>data/feeds.json</code> in the repo and redeploy.
                    </p>
                ) : (
                    <ul className="feed-list">
                        {feeds.map(feed => (
                            <li key={feed.id}>
                                <div className="feed-name">{feed.name}</div>
                                <div className="feed-url">{feed.url}</div>
                                <div className="feed-url" style={{ marginBottom: '0.35rem' }}>
                                    Dakboard URL:{' '}
                                    <span style={{ color: 'var(--text)' }}>{origin ? dakboardUrl(feed) : '…'}</span>
                                </div>
                                <div className="feed-actions">
                                    <a href={dakboardUrl(feed)} target="_blank" rel="noreferrer">
                                        Open RSS feed
                                    </a>
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => navigator.clipboard.writeText(dakboardUrl(feed))}
                                    >
                                        Copy Dakboard URL
                                    </button>
                                    <button type="button" className="btn-danger" onClick={() => removeFeed(feed.id)}>
                                        Remove
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="card">
                <h2>One-off RSS URL (any source)</h2>
                <p className="hint" style={{ marginTop: 0 }}>
                    Returns RSS XML directly — no account or JSON. Use in Dakboard without saving the feed:
                </p>
                <code
                    style={{
                        display: 'block',
                        fontFamily: 'var(--mono)',
                        fontSize: '0.8rem',
                        wordBreak: 'break-all',
                        color: 'var(--muted)'
                    }}
                >
                    {origin || 'https://your-app.vercel.app'}
                    /rss?url=FEED_URL&amp;{query}
                </code>
                {url && origin && (
                    <p className="hint">
                        <a href={previewUrl(url)} target="_blank" rel="noreferrer">
                            Preview the URL you entered above
                        </a>
                    </p>
                )}
            </section>
        </main>
    );
}
