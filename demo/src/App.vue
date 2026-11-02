<script setup>
import { Gallery } from '@aaix/laravel-islands-gallery/vue';

const photos = [
    [1015, 'Fjord from above', 5000, 3333],
    [1018, 'Green ridge', 3914, 2935],
    [1036, 'Snowfield', 4608, 3072],
    [1039, 'Waterfall', 5000, 3337],
    [1043, 'Valley at noon', 5000, 3333],
    [1044, 'River in the mist', 4032, 2268],
    [1050, 'Coastline', 5000, 3333],
    [1067, 'City at dusk', 5000, 3333],
];

const slugOf = (caption) => caption.toLowerCase().replaceAll(' ', '-');

const images = photos.map(([id, caption, width, height]) => ({
    src: `https://picsum.photos/id/${id}/1500/1000`,
    thumb: `https://picsum.photos/id/${id}/336/224`,
    caption,
    downloads: [
        { label: `Original (${width} × ${height})`, src: `https://picsum.photos/id/${id}/${width}/${height}`, filename: `${slugOf(caption)}.jpg` },
        { label: 'Large (1500 × 1000)', src: `https://picsum.photos/id/${id}/1500/1000`, filename: `${slugOf(caption)}-large.jpg` },
        { label: 'Small (750 × 500)', src: `https://picsum.photos/id/${id}/750/500`, filename: `${slugOf(caption)}-small.jpg` },
    ],
}));
</script>

<template>
    <main class="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header class="space-y-1">
            <h1 class="text-2xl font-bold tracking-tight">Laravel Islands Gallery</h1>
            <p class="text-sm text-gray-600 dark:text-gray-400">Click the image to open the lightbox.</p>
        </header>

        <Gallery id="gallery" :images="images" />

        <p class="text-xs text-gray-500 dark:text-gray-400">
            Sample photos: <a class="underline" href="https://unsplash.com/license">Unsplash</a>, served by
            <a class="underline" href="https://picsum.photos">Lorem Picsum</a>.
        </p>
    </main>
</template>
