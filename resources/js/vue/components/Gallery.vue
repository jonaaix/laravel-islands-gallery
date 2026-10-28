<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { SLIDE_DURATION, SLIDE_EASING, useSlider } from '../composables/useSlider.js';
import { DEFAULT_LABELS, format } from '../labels.js';
import IconChevronLeft from '../icons/IconChevronLeft.vue';
import IconChevronRight from '../icons/IconChevronRight.vue';
import IconFullscreen from '../icons/IconFullscreen.vue';
import Lightbox from './Lightbox.vue';
import Thumbnails from './Thumbnails.vue';

const props = defineProps({
    images: { type: Array, required: true },
    start: { type: Number, default: 0 },
    aspect: { type: String, default: '3 / 2' },
    fit: { type: String, default: 'cover' },
    loop: { type: Boolean, default: true },
    thumbnails: { type: Boolean, default: true },
    lightbox: { type: Boolean, default: true },
    labels: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['change']);

const text = computed(() => ({ ...DEFAULT_LABELS, ...props.labels }));
const stage = ref(null);
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

const trackStyle = computed(() => ({
    transform: `translate3d(${slider.offset.value}px, 0, 0)`,
    transition: slider.animating.value ? `transform ${SLIDE_DURATION}ms ${SLIDE_EASING}` : 'none',
}));

watch(slider.index, (index) => emit('change', index));
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

    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastTime: performance.now(), velocity: 0, axis: null };
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
    slider.drag(dx);
}

function onPointerUp(event) {
    if (!drag || drag.id !== event.pointerId) {
        return;
    }

    if (drag.axis === 'x') {
        slider.release(event.clientX - drag.x, drag.velocity);
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
    slider.reset(index);
}
</script>

<template>
    <div v-if="images.length" class="ilg-gallery space-y-2">
        <div
            ref="stage"
            class="group relative overflow-hidden rounded-il-card bg-il-neutral-100 ring-1 ring-il-neutral-200 dark:bg-white/5 dark:ring-white/10"
            :class="lightbox ? 'cursor-zoom-in' : ''"
            :style="{ aspectRatio: aspect }"
            style="touch-action: pan-y"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
        >
            <div class="absolute inset-0" :style="trackStyle">
                <div
                    v-for="slide in slides"
                    :key="slide.position"
                    class="absolute inset-0"
                    :style="{ transform: `translate3d(${slide.position * 100}%, 0, 0)` }"
                >
                    <img
                        v-if="slide.image"
                        :key="slide.image.src"
                        :src="slide.image.src"
                        :alt="slide.position === 0 ? (slide.image.alt ?? slide.image.caption ?? '') : ''"
                        draggable="false"
                        class="size-full select-none"
                        :class="fit === 'contain' ? 'object-contain' : 'object-cover'"
                    />
                </div>
            </div>

            <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100" />

            <template v-if="images.length > 1">
                <button
                    v-if="slider.prevIndex.value !== null"
                    type="button"
                    class="ilg-inline-arrow left-2"
                    :aria-label="text.previous"
                    @pointerdown.stop
                    @click="slider.step(-1)"
                >
                    <IconChevronLeft class="size-5" />
                </button>
                <button
                    v-if="slider.nextIndex.value !== null"
                    type="button"
                    class="ilg-inline-arrow right-2"
                    :aria-label="text.next"
                    @pointerdown.stop
                    @click="slider.step(1)"
                >
                    <IconChevronRight class="size-5" />
                </button>
            </template>

            <span
                v-if="images.length > 1"
                class="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium tabular-nums text-white backdrop-blur-sm"
            >
                {{ format(text.counter, { current: slider.index.value + 1, total: images.length }) }}
            </span>

            <button
                v-if="lightbox"
                type="button"
                class="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity duration-500 ease-out group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                :aria-label="text.open"
                @pointerdown.stop
                @click="lightboxIndex = slider.index.value"
            >
                <IconFullscreen class="size-4" />
            </button>
        </div>

        <Thumbnails
            v-if="thumbnails && images.length > 1"
            :images="images"
            :index="slider.index.value"
            :label="(position) => format(text.image, { number: position + 1 })"
            @select="slider.goTo"
        />

        <Lightbox
            v-if="lightbox"
            :images="images"
            :index="lightboxIndex"
            :origin="originOf"
            :loop="loop"
            :labels="labels"
            @update:index="onLightboxChange"
            @close="lightboxIndex = null"
        />
    </div>
</template>

<style>
.ilg-inline-arrow {
    position: absolute;
    top: 50%;
    display: inline-flex;
    height: 2.25rem;
    width: 2.25rem;
    transform: translateY(-50%);
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background-color: rgb(255 255 255 / 0.85);
    color: rgb(17 24 39);
    box-shadow: 0 4px 12px -2px rgb(0 0 0 / 0.25), inset 0 0 0 1px rgb(0 0 0 / 0.06);
    backdrop-filter: blur(8px);
    opacity: 0;
    transition: opacity 500ms ease-out, background-color 150ms ease-out;
}

.group:hover .ilg-inline-arrow,
.ilg-inline-arrow:focus-visible {
    opacity: 1;
}

.ilg-inline-arrow:hover {
    background-color: white;
}

.ilg-inline-arrow:focus-visible {
    outline: 2px solid var(--color-il-primary-500);
    outline-offset: 2px;
}

:where(.dark) .ilg-inline-arrow {
    background-color: rgb(17 24 39 / 0.8);
    color: white;
    box-shadow: 0 4px 12px -2px rgb(0 0 0 / 0.5), inset 0 0 0 1px rgb(255 255 255 / 0.12);
}

:where(.dark) .ilg-inline-arrow:hover {
    background-color: rgb(31 41 55 / 0.95);
}

@media (hover: none) {
    .ilg-inline-arrow {
        display: none;
    }
}
</style>
