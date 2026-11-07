import { isVideo } from './media.js';

export const DEFAULT_LABELS = {
    dialog: 'Image viewer',
    counter: ':current / :total',
    image: 'Image :number',
    video: 'Video :number',
    open: 'Open image',
    previous: 'Previous image',
    next: 'Next image',
    close: 'Close',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    play: 'Start slideshow',
    pause: 'Pause slideshow',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    download: 'Download',
    playVideo: 'Play',
    pauseVideo: 'Pause',
    seek: 'Seek',
    mute: 'Mute',
    unmute: 'Unmute',
    volume: 'Volume',
};

export function format(template, values) {
    return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`:${key}`, String(value)), template);
}

export function itemLabel(text, item, position) {
    return format(isVideo(item) ? text.video : text.image, { number: position + 1 });
}
