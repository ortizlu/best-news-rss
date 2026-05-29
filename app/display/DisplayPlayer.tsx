'use client';

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type RefObject
} from 'react';
import type { DisplayStory } from '@/lib/display/items';
import { fitDescriptionText } from '@/lib/display/truncate-description';
import './display.css';

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
    showProgress: boolean;
};

type StoryTextProps = {
    story: DisplayStory;
    descriptionText?: string;
    textStackRef?: RefObject<HTMLDivElement | null>;
    metaRef?: RefObject<HTMLDivElement | null>;
    titleRef?: RefObject<HTMLHeadingElement | null>;
    descriptionRef?: RefObject<HTMLParagraphElement | null>;
};

function StoryText({
    story,
    descriptionText,
    textStackRef,
    metaRef,
    titleRef,
    descriptionRef
}: StoryTextProps) {
    const body = descriptionText ?? story.description;

    return (
        <div ref={textStackRef} className="display-text-stack">
            <div ref={metaRef} className="display-meta">
                {[story.source, formatRelativeTime(story.pubDate)].filter(Boolean).join('  ·  ')}
            </div>
            <h1 ref={titleRef} className="display-title">
                {story.title}
            </h1>
            {body && (
                <p ref={descriptionRef} className="display-description">
                    {body}
                </p>
            )}
        </div>
    );
}

export default function DisplayPlayer({ stories, intervalSeconds, showProgress }: Props) {
    const [index, setIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
    const [descriptionText, setDescriptionText] = useState<string | undefined>();
    const textStackRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const metaRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const descriptionRef = useRef<HTMLParagraphElement>(null);

    const playable = useMemo(() => {
        if (stories.length === 0) return [];
        return stories;
    }, [stories]);

    const activeStory = playable[index];

    const advance = useCallback(() => {
        setIndex(i => (playable.length ? (i + 1) % playable.length : 0));
    }, [playable.length]);

    useEffect(() => {
        if (playable.length <= 1) return;

        if (showProgress) {
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
        }

        const id = window.setInterval(advance, intervalSeconds * 1000);
        return () => clearInterval(id);
    }, [advance, intervalSeconds, playable.length, showProgress]);

    useEffect(() => {
        if (!showProgress) return;
        setProgress(0);
    }, [index, showProgress]);

    useEffect(() => {
        const full = activeStory?.description;
        if (!full) {
            setDescriptionText(undefined);
            return;
        }

        setDescriptionText(undefined);

        const container = contentRef.current;
        const stack = textStackRef.current;
        const meta = metaRef.current;
        const title = titleRef.current;
        const desc = descriptionRef.current;
        if (!container || !stack || !desc) return;

        const measure = () => {
            const next = fitDescriptionText(container, meta, title, desc, full);
            setDescriptionText(prev => (prev === next ? prev : next));
        };

        measure();
        const raf = requestAnimationFrame(measure);
        const ro = new ResizeObserver(measure);
        ro.observe(container);
        ro.observe(stack);
        if (meta) ro.observe(meta);
        if (title) ro.observe(title);
        window.addEventListener('resize', measure);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [index, activeStory?.description]);

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
                        <div className="display-content" ref={i === index ? contentRef : undefined}>
                            {story.link ? (
                                <a
                                    className="display-article-link"
                                    href={story.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Read article: ${story.title}`}
                                >
                                    <StoryText
                                        story={story}
                                        descriptionText={i === index ? descriptionText : story.description}
                                        textStackRef={i === index ? textStackRef : undefined}
                                        metaRef={i === index ? metaRef : undefined}
                                        titleRef={i === index ? titleRef : undefined}
                                        descriptionRef={i === index ? descriptionRef : undefined}
                                    />
                                </a>
                            ) : (
                                <StoryText
                                    story={story}
                                    descriptionText={i === index ? descriptionText : story.description}
                                    textStackRef={i === index ? textStackRef : undefined}
                                    metaRef={i === index ? metaRef : undefined}
                                    titleRef={i === index ? titleRef : undefined}
                                    descriptionRef={i === index ? descriptionRef : undefined}
                                />
                            )}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
