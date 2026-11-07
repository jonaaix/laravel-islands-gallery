const VIDEO_FILE = /\.(mp4|m4v|mov|webm|ogv)$/i;

export function isVideo(item) {
    if (item?.type) {
        return item.type === 'video';
    }

    try {
        return VIDEO_FILE.test(new URL(item?.src ?? '', window.location.href).pathname);
    } catch {
        return false;
    }
}

export function stillOf(item) {
    return isVideo(item) ? item.poster ?? null : item?.src ?? null;
}

export function firstFrame(src) {
    return src.includes('#') ? src : `${src}#t=0.1`;
}

export function clock(seconds) {
    const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    const minutes = Math.floor((total % 3600) / 60);
    const rest = String(total % 60).padStart(2, '0');

    return total >= 3600 ? `${Math.floor(total / 3600)}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}
