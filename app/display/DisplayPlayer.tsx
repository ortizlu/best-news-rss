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

const STORY_REFRESH_MS = 5 * 60 * 1000;

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

function storyKey(story: DisplayStory): string {
    return story.link ?? story.title;
}

/** Active slide plus neighbors for crossfade — not the full deck. */
function visibleSlideIndices(active: number, total: number): number[] {
    if (total <= 0) return [];
    if (total === 1) return [0];
    const prev = (active - 1 + total) % total;
    const next = (active + 1) % total;
    return [...new Set([prev, active, next])].sort((a, b) => a - b);
}

type Props = {
    stories: DisplayStory[];
    intervalSeconds: number;
    showProgress: boolean;
    showPhotos: boolean;
    transparent: boolean;
    iosStyle: boolean;
    textAlign: 'left' | 'right';
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

type SlideBackgroundProps = {
    story: DisplayStory;
    showImage: boolean;
    iosStyle: boolean;
    transparent: boolean;
    onImageError: () => void;
};

function SlideBackground({
    story,
    showImage,
    iosStyle,
    transparent,
    onImageError
}: SlideBackgroundProps) {
    const renderSlideBg = iosStyle || !transparent;
    if (!renderSlideBg) return null;

    if (showImage && story.imageUrl) {
        return (
            <>
                <img
                    className={[
                        'display-bg',
                        story.imageBlur && 'display-bg--soft-blur'
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    src={story.imageUrl}
                    alt=""
                    decoding="async"
                    onError={onImageError}
                />
                <div
                    className={[
                        'display-overlay',
                        iosStyle && 'display-overlay--frost'
                    ]
                        .filter(Boolean)
                        .join(' ')}
                />
            </>
        );
    }

    return (
        <div
            className={[
                'display-bg',
                iosStyle && 'display-bg--frost'
            ]
                .filter(Boolean)
                .join(' ')}
            style={
                iosStyle
                    ? undefined
                    : {
                          backgroundImage:
                              'linear-gradient(135deg, #000 0%, #000 55%, #000 100%)'
                      }
            }
        />
    );
}

export default function DisplayPlayer({
    stories: initialStories,
    intervalSeconds,
    showProgress,
    showPhotos,
    transparent,
    iosStyle,
    textAlign
}: Props) {
    const [playable, setPlayable] = useState(initialStories);
    const [index, setIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [brokenImageKeys, setBrokenImageKeys] = useState<Set<string>>(() => new Set());
    const [descriptionText, setDescriptionText] = useState<string | undefined>();
    const textStackRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const metaRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const descriptionRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        setPlayable(initialStories);
        setIndex(i => (initialStories.length ? Math.min(i, initialStories.length - 1) : 0));
    }, [initialStories]);

    const activeStory = playable[index];

    const slideIndices = useMemo(
        () => visibleSlideIndices(index, playable.length),
        [index, playable.length]
    );

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

    /* Soft refresh — fetch new stories without reloading the page (Safari-friendly). */
    useEffect(() => {
        const refreshStories = async () => {
            try {
                const params = new URLSearchParams({
                    maxItems: '30',
                    includeImages: showPhotos ? '1' : '0'
                });
                const res = await fetch(`/api/display?${params.toString()}`, {
                    cache: 'no-store'
                });
                if (!res.ok) return;
                const data = (await res.json()) as { stories?: DisplayStory[] };
                if (!Array.isArray(data.stories) || data.stories.length === 0) return;
                setPlayable(data.stories);
                setIndex(i => Math.min(i, data.stories!.length - 1));
            } catch {
                /* ignore network blips on wall displays */
            }
        };

        const id = window.setInterval(refreshStories, STORY_REFRESH_MS);
        return () => clearInterval(id);
    }, [showPhotos]);

    useEffect(() => {
        if (!transparent) return;
        document.documentElement.classList.add('display-transparent');
        document.body.classList.add('display-transparent');
        return () => {
            document.documentElement.classList.remove('display-transparent');
            document.body.classList.remove('display-transparent');
        };
    }, [transparent]);

    const markImageBroken = useCallback((story: DisplayStory) => {
        const key = storyKey(story);
        setBrokenImageKeys(prev => {
            if (prev.has(key)) return prev;
            const next = new Set(prev);
            next.add(key);
            return next;
        });
    }, []);

    const pageClassName = [
        'display-page',
        transparent && 'display-page--transparent',
        iosStyle && 'display-page--ios',
        iosStyle && showPhotos && 'display-page--has-photos',
        textAlign === 'right' && 'display-page--align-right'
    ]
        .filter(Boolean)
        .join(' ');

    if (playable.length === 0) {
        return (
            <div className={pageClassName}>
                <div className="display-empty">
                    No stories with content right now. Check data/feeds.json and redeploy.
                </div>
            </div>
        );
    }

    return (
        <div className={pageClassName}>
            {showProgress && (
                <div className="display-progress" style={{ width: `${Math.min(progress, 1) * 100}%` }} aria-hidden />
            )}
            {slideIndices.map(i => {
                const story = playable[i];
                const key = storyKey(story);
                const showImage =
                    showPhotos && Boolean(story.imageUrl) && !brokenImageKeys.has(key);
                const isActive = i === index;

                return (
                    <article
                        key={key}
                        className={`display-slide${isActive ? ' active' : ''}`}
                        aria-hidden={!isActive}
                    >
                        <SlideBackground
                            story={story}
                            showImage={showImage}
                            iosStyle={iosStyle}
                            transparent={transparent}
                            onImageError={() => markImageBroken(story)}
                        />
                        <div className="display-content" ref={isActive ? contentRef : undefined}>
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
                                        descriptionText={
                                            isActive ? descriptionText : story.description
                                        }
                                        textStackRef={isActive ? textStackRef : undefined}
                                        metaRef={isActive ? metaRef : undefined}
                                        titleRef={isActive ? titleRef : undefined}
                                        descriptionRef={isActive ? descriptionRef : undefined}
                                    />
                                </a>
                            ) : (
                                <StoryText
                                    story={story}
                                    descriptionText={isActive ? descriptionText : story.description}
                                    textStackRef={isActive ? textStackRef : undefined}
                                    metaRef={isActive ? metaRef : undefined}
                                    titleRef={isActive ? titleRef : undefined}
                                    descriptionRef={isActive ? descriptionRef : undefined}
                                />
                            )}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
