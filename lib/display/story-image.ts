const WTOP_LOGO_PATH = 'wtop_logo_512x512';

/** Sized for Dakboard widgets — full-res OG URLs are unnecessary. */
export const DISPLAY_IMAGE_WIDTH = 800;

export const WTOP_LOGO_REPLACEMENT =
    'https://images.unsplash.com/photo-1624269305548-1527ef905ff6?auto=format&fit=crop&w=800&q=75';

/** Downscale remote images where the host supports query params (Unsplash, etc.). */
export function resizeDisplayImageUrl(
    url: string,
    width = DISPLAY_IMAGE_WIDTH,
): string {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('unsplash.com')) {
            parsed.searchParams.set('auto', 'format');
            parsed.searchParams.set('fit', 'crop');
            parsed.searchParams.set('w', String(width));
            parsed.searchParams.set('q', '75');
            return parsed.toString();
        }
    } catch {
        /* keep original */
    }
    return url;
}

function isWtopLogo(url: string): boolean {
    try {
        return new URL(url).pathname.includes(WTOP_LOGO_PATH);
    } catch {
        return url.includes(WTOP_LOGO_PATH);
    }
}

export function resolveDisplayImageUrl(imageUrl?: string): {
    url?: string;
    blur?: boolean;
} {
    if (!imageUrl) return {};
    if (isWtopLogo(imageUrl)) {
        return { url: WTOP_LOGO_REPLACEMENT, blur: true };
    }
    return { url: resizeDisplayImageUrl(imageUrl) };
}

export function applyDisplayImageOverrides<T extends { imageUrl?: string }>(
    story: T,
): T & { imageUrl?: string; imageBlur?: boolean } {
    const resolved = resolveDisplayImageUrl(story.imageUrl);
    return {
        ...story,
        imageUrl: resolved.url,
        imageBlur: resolved.blur
    };
}
