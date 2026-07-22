const WTOP_LOGO_PATH = 'wtop_logo_512x512';

export const WTOP_LOGO_REPLACEMENT =
    'https://images.unsplash.com/photo-1624269305548-1527ef905ff6?q=80&w=1842&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

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
    return { url: imageUrl };
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
