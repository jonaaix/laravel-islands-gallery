---
name: islands-gallery-development
description: Show images with aaix/laravel-islands-gallery — the inline Gallery (3:2 stage, arrows, swipe, thumbnails) and the full-screen Lightbox (zoom, pan, pinch, swipe, keyboard, slideshow, fullscreen). Use whenever an island shows more than a single picture or a picture should open large.
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

`index` is `null` while closed; set it to open, the component writes it back on every step and
emits `close`. `origin` is optional: return the on-screen rectangle of the clicked picture and the
image zooms out of it on open and back into it on close.

Controls: ← → and swipe step through, a click or double tap zooms at the pointer, the wheel and
two fingers zoom continuously, a zoomed image pans by dragging, Esc first unzooms then closes,
dragging down closes on touch, a tap hides the chrome, Space toggles the slideshow. The toolbar
carries counter, zoom, slideshow, fullscreen, download and close.

Further props: `loop`, `thumbnails`, `slideshowInterval` (ms, default 4000), `maxZoom` (default 4),
`downloadable` (default `true`, also on `Gallery`).

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
    exitFullscreen: t('Exit full screen'), download: t('Download'),
}));
```

`:current`, `:total` and `:number` are filled in by the package.

## Host setup

- `vite.config.js`: `import islandsGallery from './vendor/aaix/laravel-islands-gallery/vite.js'` and add `islandsGallery()` to `plugins`.
- Tailwind: add the package's `resources/js` to `@source` in every stylesheet that renders islands.
- The lightbox sits at z-index 70 (the modal layer) and teleports to `body`, so it also opens from inside a `Modal`.
