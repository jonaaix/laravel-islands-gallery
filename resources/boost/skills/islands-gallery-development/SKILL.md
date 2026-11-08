---
name: islands-gallery-development
description: Show images and videos with aaix/laravel-islands-gallery — the inline Gallery (3:2 stage, arrows, swipe, thumbnails) and the full-screen Lightbox (zoom, pan, pinch, swipe, keyboard, slideshow, fullscreen, video playback). Use whenever an island shows more than a single picture, a picture should open large, or a video should play.
---

# Showing Images

One import covers both modes:

```js
import { Gallery, Lightbox } from '@aaix/laravel-islands-gallery/vue';
```

## Images

Every image is a plain object; only `src` is required.

```js
{ src: 'https://…/full.jpg', thumb: 'https://…/336.jpg', caption: 'Front view', alt: 'Die cutter, front', filename: 'die-cutter-front.jpg' }
```

Map whatever the server sends into this shape in a `computed` — the components never read
other keys.

A video goes in the same list: `{ type: 'video', src, poster, thumb, caption }`. Without `type`, a
`.mp4`, `.m4v`, `.mov`, `.webm` or `.ogv` file counts as a video. Always send a `poster` when the
server has one; without it the stage and thumbnails fall back to the video's first frame.

## Gallery — inline

```vue
<Gallery :images="images" :labels="labels" />
```

| Prop | Default | Meaning |
| --- | --- | --- |
| `images` | — | The list above. Renders nothing when empty. |
| `start` | `0` | Index shown first. |
| `aspect` | `'3 / 2'` | Stage ratio. Photos are 3∶2 in this design system — change it only for non-photos. |
| `fit` | `'cover'` | `'contain'` when nothing may be cropped (documents, drawings). |
| `loop` | `true` | Wrap from the last image to the first. |
| `thumbnails` | `true` | Strip below the stage. |
| `lightbox` | `true` | A click or tap on the stage opens the full-screen view. |
| `captions` | `true` | The current image's caption, bottom centre on the stage. |
| `labels` | English | See *Wording*. |

Emits `change(index)`. Arrows appear on hover (hidden on touch devices, where the stage swipes),
the counter sits bottom right, the open button top right.

## Lightbox — full screen

The `Gallery` brings its own. Use `Lightbox` alone when the trigger is something else — a row
thumbnail, a button:

```vue
<Lightbox v-model:index="openIndex" :images="images" :labels="labels" :origin="(index) => thumbs[index]?.getBoundingClientRect()" />
```

Without a component in the template — a photo in a table cell, a card — call
`openLightbox(images, { start, origin, labels })`; every option besides `start` is a `Lightbox` prop.
One shared lightbox mounts on first use and is reused.

`index` is `null` while closed; set it to open, the component writes it back on every step and
emits `close`. `origin` is optional: return the on-screen rectangle of the clicked picture and the
image zooms out of it on open and back into it on close.

Controls: ← → and swipe step through, a click or double tap zooms at the pointer, the wheel and
two fingers zoom continuously, a zoomed image pans by dragging, Esc first unzooms then closes,
dragging down closes on touch, a tap hides the chrome, Space toggles the slideshow. The toolbar
carries counter, zoom, slideshow, fullscreen, download and close.

Further props: `loop`, `thumbnails`, `slideshowInterval` (ms, default 4000), `maxZoom` (default 4),
`downloadable` (default `true`, also on `Gallery`).

## Videos

The stage and thumbnails show the poster with a play badge; a click opens the lightbox and the video
plays (`autoplay`, default `true`, on `Gallery` and `Lightbox`). With `:lightbox="false"` it plays in
place on the stage. In the lightbox: no zoom, swipe and drag-down still work, a control bar carries
play/pause, time, seek bar with loaded range, mute and volume. Space or K plays/pauses, M mutes,
, and . step one frame back/forward (pausing first; also inline while a video control has focus),
← → keep stepping through the list (they seek only on the focused seek bar). Controls fade out while
playing, leaving pauses, coming back resumes, the slideshow waits for a video's end. Prefer MP4
(H.264) or WebM.

## Download

The button saves `src` under `filename` (falls back to the URL's last segment). Several sizes go
in `downloads` and turn the button into a menu:

```js
{ src, filename: 'die-cutter-front.jpg', downloads: [
    { label: t('Original'), src: originalUrl, filename: 'die-cutter-front.jpg' },
    { label: t('Web (1500 px)'), src: webUrl, filename: 'die-cutter-front-1500.jpg' },
] }
```

Name files after the record, never the position. Files on another domain need CORS headers to be
saved in place; without them the browser opens the image in a new tab.

## Wording

The package ships English fallbacks only. The application owns the strings — always pass them
through the translation layer:

```js
const labels = computed(() => ({
    dialog: t('Image viewer'), counter: t(':current / :total'), image: t('Image :number'), open: t('Open image'),
    previous: t('Previous image'), next: t('Next image'), close: t('Close'), zoomIn: t('Zoom in'), zoomOut: t('Zoom out'),
    play: t('Start slideshow'), pause: t('Pause slideshow'), fullscreen: t('Full screen'),
    exitFullscreen: t('Exit full screen'), download: t('Download'), video: t('Video :number'), playVideo: t('Play'),
    pauseVideo: t('Pause'), seek: t('Seek'), mute: t('Mute'), unmute: t('Unmute'), volume: t('Volume'),
}));
```

`:current`, `:total` and `:number` are filled in by the package.

## Host setup

- `vite.config.js`: `import islandsGallery from './vendor/aaix/laravel-islands-gallery/vite.js'` and add `islandsGallery()` to `plugins`.
- Tailwind: add the package's `resources/js` to `@source` in every stylesheet that renders islands.
- The lightbox sits at z-index 70 (the modal layer) and teleports to `body`, so it also opens from inside a `Modal`.
