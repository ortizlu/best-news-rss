'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DisplayStory } from '@/lib/display/items';
import './display.css';

const showProgress = false;
function formatRelativeTime(pubDate?: string): string {
    if (!pubDate) return '';
    const ms = Date.parse(pubDate);
    if (Number.isNaN(ms)) return '';
    const diffSec = Math.round((Date.now() - ms) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 48) return `${diffHr} hr ago`;
    const diffDay = Math.round(diffHr / 24);
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

type Props = {
    stories: DisplayStory[];
    intervalSeconds: number;
};

export default function DisplayPlayer({ stories, intervalSeconds }: Props) {
    const [index, setIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

    const playable = useMemo(() => {
        if (stories.length === 0) return [];
        return stories;
    }, [stories]);

    const advance = useCallback(() => {
        setProgress(0);
        setIndex(i => (playable.length ? (i + 1) % playable.length : 0));
    }, [playable.length]);

    useEffect(() => {
        if (playable.length <= 1) return;
        const tickMs = 100;
        const totalMs = intervalSeconds * 1000;
        const id = window.setInterval(() => {
            setProgress(p => {
                const next = p + tickMs / totalMs;
                if (next >= 1) {
                    advance();
                    return 0;
                }
                return next;
            });
        }, tickMs);
        return () => clearInterval(id);
    }, [advance, intervalSeconds, playable.length, index]);

    useEffect(() => {
        const refreshMs = 5 * 60 * 1000;
        const id = window.setInterval(() => {
            window.location.reload();
        }, refreshMs);
        return () => clearInterval(id);
    }, []);

    if (playable.length === 0) {
        return (
            <div className="display-page">
                <div className="display-empty">
                    No stories with content right now. Check data/feeds.json and redeploy.
                </div>
            </div>
        );
    }

    return (
        <div className="display-page">
            {showProgress && (
                <div className="display-progress" style={{ width: `${Math.min(progress, 1) * 100}%` }} aria-hidden />
            )}
            {playable.map((story, i) => {
                const showImage = story.imageUrl && !brokenImages.has(i);
                return (
                    <article
                        key={`${story.title}-${i}`}
                        className={`display-slide${i === index ? ' active' : ''}`}
                        aria-hidden={i !== index}
                    >
                        <div
                            className="display-bg"
                            style={
                                showImage
                                    ? { backgroundImage: `url("${story.imageUrl}")` }
                                    : {
                                          backgroundImage: 'linear-gradient(135deg, #000 0%, #000 55%, #000 100%)'
                                      }
                            }
                        />
                        {showImage && (
                            <img
                                src={story.imageUrl}
                                alt=""
                                hidden
                                onError={() => setBrokenImages(prev => new Set(prev).add(i))}
                            />
                        )}
                        {showImage && <div className="display-overlay" />}
                        <div className="display-content">
                            <div className="display-meta">
                                {[story.source, formatRelativeTime(story.pubDate)].filter(Boolean).join('  ·  ')}
                            </div>
                            <h1 className="display-title">{story.title}</h1>
                            {story.description && <p className="display-description">{story.description}</p>}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
