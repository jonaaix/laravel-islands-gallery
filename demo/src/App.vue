<script setup>
import { ref } from 'vue';
import { Gallery, openLightbox } from '@aaix/laravel-islands-gallery/vue';

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

const video = { type: 'video', src: './videos/flower.webm', caption: 'Bee on a flower', filename: 'bee-on-a-flower.webm' };

const media = [images[0], { ...video, poster: './videos/flower.jpg' }, images[3]];
const inlineMedia = [video, images[6]];

const thumbs = ref([]);

function openFromList(index) {
    openLightbox(images, {
        start: index,
        origin: (position) => thumbs.value[position]?.getBoundingClientRect() ?? null,
        originRadius: 8,
    });
}
</script>

<template>
    <main class="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header class="space-y-1">
            <h1 class="text-2xl font-bold tracking-tight">Laravel Islands Gallery</h1>
            <p class="text-sm text-gray-600 dark:text-gray-400">Click the image to open the lightbox.</p>
        </header>

        <Gallery id="gallery" :images="images" />

        <section class="space-y-2">
            <h2 class="text-base font-semibold">Opened from a list</h2>
            <div id="thumb-list" class="flex flex-wrap gap-2">
                <button
                    v-for="(image, index) in images"
                    :key="image.src"
                    :ref="(element) => (thumbs[index] = element)"
                    type="button"
                    :aria-label="`Open ${image.caption}`"
                    class="cursor-zoom-in overflow-hidden rounded-lg ring-1 ring-gray-200 dark:ring-white/10"
                    @click="openFromList(index)"
                >
                    <img :src="image.thumb" alt="" class="aspect-[3/2] h-16 w-auto object-cover" />
                </button>
            </div>
        </section>

        <section class="space-y-2">
            <h2 class="text-base font-semibold">Photos and videos</h2>
            <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-1">
                    <p class="text-sm text-gray-600 dark:text-gray-400">Plays in the lightbox</p>
                    <Gallery id="media" :images="media" />
                </div>
                <div class="space-y-1">
                    <p class="text-sm text-gray-600 dark:text-gray-400">Plays in place, lightbox off</p>
                    <Gallery id="inline" :images="inlineMedia" :lightbox="false" />
                </div>
            </div>
        </section>

        <p class="text-xs text-gray-500 dark:text-gray-400">
            Sample photos: <a class="underline" href="https://unsplash.com/license">Unsplash</a>, served by
            <a class="underline" href="https://picsum.photos">Lorem Picsum</a>. Sample video:
            <a class="underline" href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video">MDN</a>, CC0.
        </p>
    </main>
</template>
