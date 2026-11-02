# Changelog

All notable changes to `aaix/laravel-islands-gallery` will be documented in this file.

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
