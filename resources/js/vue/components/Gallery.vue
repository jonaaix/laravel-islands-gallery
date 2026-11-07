<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { SLIDE_DURATION, SLIDE_EASING, useSlider } from '../composables/useSlider.js';
import { useVideo } from '../composables/useVideo.js';
import { DEFAULT_LABELS, format, itemLabel } from '../labels.js';
import { firstFrame, isVideo, stillOf } from '../media.js';
import IconChevronLeft from '../icons/IconChevronLeft.vue';
import IconChevronRight from '../icons/IconChevronRight.vue';
import IconFullscreen from '../icons/IconFullscreen.vue';
import IconPlay from '../icons/IconPlay.vue';
import { IconButton } from '@aaix/laravel-islands/vue/helpers';
import Lightbox from './Lightbox.vue';
import Thumbnails from './Thumbnails.vue';
import VideoControls from './VideoControls.vue';

const props = defineProps({
    images: { type: Array, required: true },
    start: { type: Number, default: 0 },
    aspect: { type: String, default: '3 / 2' },
    fit: { type: String, default: 'cover' },
    loop: { type: Boolean, default: true },
    thumbnails: { type: Boolean, default: true },
    lightbox: { type: Boolean, default: true },
    captions: { type: Boolean, default: true },
    downloadable: { type: Boolean, default: true },
    autoplay: { type: Boolean, default: true },
    labels: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['change']);

const text = computed(() => ({ ...DEFAULT_LABELS, ...props.labels }));
const stage = ref(null);
const track = ref(null);
const width = ref(0);
const lightboxIndex = ref(null);

const slider = useSlider({
    count: () => props.images.length,
    loop: () => props.loop,
    width: () => width.value,
    start: props.start,
});

const slides = computed(() => [
    { position: -1, image: slider.prevIndex.value === null ? null : props.images[slider.prevIndex.value] },
    { position: 0, image: props.images[slider.index.value] ?? null },
    { position: 1, image: slider.nextIndex.value === null ? null : props.images[slider.nextIndex.value] },
]);

const caption = computed(() => (props.captions ? props.images[slider.target.value]?.caption ?? '' : ''));
const currentIsVideo = computed(() => isVideo(props.images[slider.index.value]));
const playsInline = computed(() => currentIsVideo.value && !props.lightbox);
const video = useVideo();

const trackStyle = computed(() => ({
    transform: `translate3d(${slider.offset.value}px, 0, 0)`,
    transition: slider.animating.value ? `transform ${SLIDE_DURATION}ms ${SLIDE_EASING}` : 'none',
}));

watch(slider.index, (index) => emit('change', index));
watch(slider.target, () => video.pause());
watch(() => props.images, () => slider.reset(0));

let resizeObserver = null;

onMounted(() => {
    width.value = stage.value?.clientWidth ?? 0;
    resizeObserver = new ResizeObserver(([entry]) => (width.value = entry.contentRect.width));
    resizeObserver.observe(stage.value);
});

onBeforeUnmount(() => resizeObserver?.disconnect());

let drag = null;

function onPointerDown(event) {
    if (event.button !== 0 || props.images.length === 0) {
        return;
    }

    const base = slider.animating.value ? slider.interrupt(new DOMMatrix(getComputedStyle(track.value).transform).m41) : 0;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, base, lastX: event.clientX, lastTime: performance.now(), velocity: 0, axis: base !== 0 ? 'x' : null };

    if (base !== 0) {
        stage.value.setPointerCapture(event.pointerId);
    }
}

function onPointerMove(event) {
    if (!drag || drag.id !== event.pointerId) {
        return;
    }

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;

    if (!drag.axis && Math.hypot(dx, dy) > 8) {
        drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';

        if (drag.axis === 'x') {
            stage.value.setPointerCapture(event.pointerId);
        }
    }

    if (drag.axis !== 'x') {
        return;
    }

    const now = performance.now();
    drag.velocity = (event.clientX - drag.lastX) / Math.max(1, now - drag.lastTime);
    drag.lastX = event.clientX;
    drag.lastTime = now;
    slider.drag(drag.base + dx);
}

function onPointerUp(event) {
    if (!drag || drag.id !== event.pointerId) {
        return;
    }

    if (drag.axis === 'x') {
        slider.release(drag.base + event.clientX - drag.x, drag.velocity);
    } else if (!drag.axis && playsInline.value) {
        video.toggle();
    } else if (!drag.axis && props.lightbox) {
        lightboxIndex.value = slider.index.value;
    }

    drag = null;
}

function originOf() {
    return stage.value?.getBoundingClientRect() ?? null;
}

function onLightboxChange(index) {
    lightboxIndex.value = index;

    if (index !== null) {
        slider.reset(index);
    }
}
</script>

<template>
    <div v-if="images.length" class="ilg-gallery space-y-2">
        <div
            ref="stage"
            class="group relative overflow-hidden rounded-il-card bg-il-neutral-100 ring-1 ring-il-neutral-200 dark:bg-white/5 dark:ring-white/10"
            :class="currentIsVideo ? 'cursor-pointer' : lightbox ? 'cursor-zoom-in' : ''"
            :style="{ aspectRatio: aspect }"
            style="touch-action: pan-y"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
        >
            <div ref="track" class="absolute inset-0" :style="trackStyle">
                <div
                    v-for="slide in slides"
                    :key="slide.position"
                    class="absolute inset-0"
                    :style="{ transform: `translate3d(${slide.position * 100}%, 0, 0)` }"
                >
                    <video
                        v-if="slide.image && slide.position === 0 && playsInline"
                        :ref="video.bind"
                        :key="slide.image.src"
                        :src="slide.image.src"
                        :poster="slide.image.poster"
                        :aria-label="slide.image.alt ?? slide.image.caption ?? undefined"
                        preload="metadata"
                        playsinline
                        class="size-full bg-black"
                        :class="fit === 'contain' ? 'object-contain' : 'object-cover'"
                        v-on="video.listeners"
                    />
                    <img
                        v-else-if="slide.image && stillOf(slide.image)"
                        :key="slide.image.src"
                        :src="stillOf(slide.image)"
                        :alt="slide.position === 0 ? (slide.image.alt ?? slide.image.caption ?? '') : ''"
                        draggable="false"
                        class="size-full select-none"
                        :class="fit === 'contain' ? 'object-contain' : 'object-cover'"
                    />
                    <video
                        v-else-if="slide.image"
                        :key="slide.image.src"
                        :src="firstFrame(slide.image.src)"
                        :aria-label="slide.position === 0 ? (slide.image.alt ?? slide.image.caption ?? undefined) : undefined"
                        preload="metadata"
                        muted
                        playsinline
                        class="pointer-events-none size-full bg-black"
                        :class="fit === 'contain' ? 'object-contain' : 'object-cover'"
                    />
                </div>
            </div>

            <div
                v-if="currentIsVideo && !slider.animating.value && !(playsInline && video.playing)"
                class="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
                <span class="ilg-play-badge flex size-12 items-center justify-center rounded-full">
                    <IconPlay class="size-5 translate-x-px" />
                </span>
            </div>

            <template v-if="images.length > 1">
                <div v-if="slider.prevIndex.value !== null" class="absolute left-2 top-1/2 -translate-y-1/2">
                    <IconButton :label="text.previous" tone="plain" size="md" class="ilg-inline-arrow" @pointerdown.stop @click="slider.step(-1)">
                        <IconChevronLeft />
                    </IconButton>
                </div>
                <div v-if="slider.nextIndex.value !== null" class="absolute right-2 top-1/2 -translate-y-1/2">
                    <IconButton :label="text.next" tone="plain" size="md" class="ilg-inline-arrow" @pointerdown.stop @click="slider.step(1)">
                        <IconChevronRight />
                    </IconButton>
                </div>
            </template>

            <div
                v-if="playsInline"
                class="ilg-inline-controls absolute inset-x-2 bottom-2 rounded-full bg-black/55 p-0.5 text-white backdrop-blur-sm"
                :data-playing="video.playing ? '' : undefined"
            >
                <VideoControls :video="video" :text="text" size="md" />
            </div>

            <span
                v-if="caption && !playsInline"
                class="pointer-events-none absolute bottom-2 left-1/2 max-w-[calc(100%-10rem)] -translate-x-1/2 truncate rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
            >
                {{ caption }}
            </span>

            <span
                v-if="images.length > 1 && !playsInline"
                class="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium tabular-nums text-white backdrop-blur-sm"
            >
                {{ format(text.counter, { current: slider.target.value + 1, total: images.length }) }}
            </span>

            <div v-if="lightbox" class="absolute right-2 top-2">
                <IconButton :label="text.open" tone="plain" size="md" class="ilg-inline-open" @pointerdown.stop @click="lightboxIndex = slider.index.value">
                    <IconFullscreen />
                </IconButton>
            </div>
        </div>

        <Thumbnails
            v-if="thumbnails && images.length > 1"
            :images="images"
            :index="slider.target.value"
            :label="(position) => itemLabel(text, images[position], position)"
            @select="slider.goTo"
        />

        <Lightbox
            v-if="lightbox"
            :images="images"
            :index="lightboxIndex"
            :origin="originOf"
            :loop="loop"
            :downloadable="downloadable"
            :autoplay="autoplay"
            :labels="labels"
            @update:index="onLightboxChange"
            @close="lightboxIndex = null"
        />
    </div>
</template>

<style>
.ilg-inline-arrow,
.ilg-inline-open {
    background-color: rgb(0 0 0 / 0.28);
    color: rgb(255 255 255 / 0.92);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.14);
    backdrop-filter: blur(6px);
    opacity: 0;
    transition: opacity 500ms ease-out, background-color 150ms ease-out;
}

.group:hover .ilg-inline-arrow,
.group:hover .ilg-inline-open,
.ilg-inline-arrow:focus-visible,
.ilg-inline-open:focus-visible {
    opacity: 1;
}

.ilg-inline-arrow:hover,
.ilg-inline-open:hover {
    background-color: rgb(0 0 0 / 0.45);
}

.ilg-play-badge {
    background-color: rgb(0 0 0 / 0.4);
    color: white;
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.2);
    backdrop-filter: blur(6px);
}

.ilg-inline-controls {
    transition: opacity 500ms ease-out;
}

.ilg-inline-controls[data-playing] {
    opacity: 0;
}

.group:hover .ilg-inline-controls,
.ilg-inline-controls:focus-within {
    opacity: 1;
}

@media (hover: none) {
    .ilg-inline-arrow {
        display: none;
    }

    .ilg-inline-open,
    .ilg-inline-controls[data-playing] {
        opacity: 1;
    }
}
</style>
