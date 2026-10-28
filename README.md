# Laravel Islands Gallery

An image gallery for [Laravel Islands](https://github.com/aaix/laravel-islands): an inline carousel with
thumbnails and a full-screen lightbox with zoom, pan, pinch, swipe, keyboard control, slideshow and
fullscreen — in the Laravel Islands design language, light and dark.

```vue
<script setup>
import { Gallery } from '@aaix/laravel-islands-gallery/vue';
</script>

<template>
    <Gallery :images="[{ src: '/photos/1.jpg', thumb: '/photos/1-small.jpg', caption: 'Front' }]" />
</template>
```

## Installation

```bash
composer require aaix/laravel-islands-gallery
```

```js
// vite.config.js
import islandsGallery from './vendor/aaix/laravel-islands-gallery/vite.js';

export default defineConfig({
    plugins: [/* … */ islandsGallery()],
});
```

Add the package to Tailwind's sources:

```css
@source '../../vendor/aaix/laravel-islands-gallery/resources/js/**/*';
```

Full usage — props, events, labels — is in `resources/boost/skills/islands-gallery-development/SKILL.md`.

## License

MIT
