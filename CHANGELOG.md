# Changelog

All notable changes to `aaix/laravel-islands-gallery` will be documented in this file.

## [1.0.11] - 2026-11-21

### Added

- `closable` prop on `Lightbox`, default `true`. With `false` the lightbox has no close button, and
  neither Escape, a downward drag nor a click beside the image closes it; Escape still resets the
  zoom and closes the download menu.
- `immersive` prop on `Lightbox`, default `false`. With `true` the media fills the screen up to a
  narrow edge and the bars float above it, fading after a short idle time and returning on movement.

### Changed

- The counter is hidden when the lightbox shows a single item.

## [1.0.10] - 2026-11-21

### Changed

- The active thumbnail carries a quieter ring: 80 % white in the lightbox, 60 % gray
  in the gallery (80 % white in dark mode). The keyboard focus ring keeps its stronger white outline.

## [1.0.9] - 2026-11-21

### Added

- `teleport` prop on `Lightbox`: render into a given selector or element, or with `false` in place.
  Defaults to `body` as before.
  With `@aaix/laravel-islands` 1.0.176 or later, the toolbar tooltips follow it.
- The lightbox works inside a shadow root: the focus trap, the fullscreen button and the download
  menu read the shadow root instead of the document.

### Changed

- While the lightbox is open, the keys it handles no longer reach the page, so the page's own
  shortcuts stay quiet.
- The active thumbnail is marked white with a thin dark outer edge in the gallery and the lightbox,
  in place of the primary colour, so it stands out on light and dark surfaces alike. The focus ring
  matches it.

## [1.0.8] - 2026-11-08

### Added

- Frame by frame: <kbd>,</kbd> and <kbd>.</kbd> step one frame back or forward and pause a playing
  video first. The frame length is measured during playback, with 1/30 s as the fallback. Works in the
  lightbox and, with the lightbox off, while a video control has focus.

## [1.0.7] - 2026-11-08

### Fixed

- A slider's knob stays inside the control bar at either end; the volume slider no longer runs past
  the bar's rounded edge.

## [1.0.6] - 2026-11-08

### Fixed

- The seek bar moves smoothly during playback instead of jumping a few times per second.

## [1.0.5] - 2026-11-08

### Changed

- README: a screenshot of a video playing in the lightbox, with its control bar.

## [1.0.4] - 2026-11-07

### Added

- Videos in the same list as images: `type: 'video'` (or a video file extension) and an optional
  `poster`. The stage and the thumbnail strip show the poster, or the first frame, with a play badge.
- Playback in the lightbox with its own control bar: play and pause, time, a seek bar showing what has
  loaded, mute and volume. Space or K plays and pauses, M mutes; the arrow keys keep stepping through
  the list. Zoom is off for videos, swipe and drag-down still work.
- The controls fade out during playback and return on pointer movement or a tap. Leaving a video
  pauses it, coming back resumes it, and the slideshow plays a video to its end before moving on.
- `autoplay` on `Gallery` and `Lightbox` (default `true`); with the lightbox off, a video plays in
  place on the gallery stage.
- `isVideo(item)` export and the labels `video`, `playVideo`, `pauseVideo`, `seek`, `mute`, `unmute`
  and `volume`.

## [1.0.3] - 2026-11-02

### Changed

- Thumbnails that are not the current image are no longer dimmed; the current one is marked by its
  ring alone, so every picture shows at full brightness.

## [1.0.2] - 2026-11-02

### Fixed

- Opening the lightbox on a page with a scrollbar hid the scrollbar and shifted the page sideways. The
  lightbox now holds the page scroll through the islands scroll lock, which keeps the scrollbar's
  width reserved — and only when the page shows one. Requires `aaix/laravel-islands` 1.0.134.

### Removed

- The dark gradient over the gallery stage on hover.

## [1.0.1] - 2026-11-02

### Added

- `openLightbox(images, options)` opens one shared lightbox from anywhere, without a component in
  the template — the counterpart to a lightbox library's `show()`.

## [1.0.0] - 2026-11-02

First release.

### Added

- `Gallery` — an inline carousel on a 3∶2 stage with arrows, swipe, counter, caption and a
  thumbnail strip; a click on the stage opens the lightbox.
- `Lightbox` — a full-screen view with zoom at the pointer, pan, pinch, swipe, keyboard control,
  slideshow and fullscreen. It opens out of the clicked picture and closes back into it, and also
  works alone with `v-model:index`.
- Download in the lightbox toolbar: saves the image under its `filename`, offers a menu when the
  image lists several sizes in `downloads`, and shows a spinner while the file loads.
- English fallbacks for every label; the application passes its own wording through `labels`.
- A standalone demo page with browser tests, published as the live demo on every push.
