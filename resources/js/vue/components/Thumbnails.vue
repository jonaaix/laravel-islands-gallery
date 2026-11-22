<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { firstFrame, isVideo } from '../media.js';
import IconPlay from '../icons/IconPlay.vue';

const props = defineProps({
    images: { type: Array, required: true },
    index: { type: Number, required: true },
    label: { type: Function, required: true },
    tone: { type: String, default: 'surface' },
});

const emit = defineEmits(['select']);
const strip = ref(null);

// Renders only the thumbnails around the shown part of the strip; spacers keep its full scroll width.
const WINDOW = 40;
const GAP_REM = 0.375;

const centre = ref(props.index);
const range = computed(() => {
    if (props.images.length <= WINDOW * 2 + 1) {
        return { start: 0, end: props.images.length };
    }

    const start = Math.min(Math.max(0, centre.value - WINDOW), props.images.length - WINDOW * 2 - 1);

    return { start, end: start + WINDOW * 2 + 1 };
});
const shown = computed(() => props.images.slice(range.value.start, range.value.end).map((image, offset) => ({ image, position: range.value.start + offset })));

function spacer(count) {
    return { width: `calc(${count} * (var(--ilg-thumbnail-width) + ${GAP_REM}rem) - ${GAP_REM}rem)` };
}

function followScroll() {
    const first = strip.value?.querySelector('[data-position]');

    if (!first) {
        return;
    }

    const step = first.offsetWidth + parseFloat(getComputedStyle(strip.value).columnGap || '0');
    centre.value = Math.round((strip.value.scrollLeft + strip.value.clientWidth / 2) / step);
}

function reveal() {
    centre.value = props.index;
    const button = strip.value?.querySelector(`[data-position="${props.index}"]`);

    if (!button) {
        return;
    }

    const left = button.offsetLeft - (strip.value.clientWidth - button.offsetWidth) / 2;
    strip.value.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
}

watch(() => props.index, () => nextTick(reveal), { immediate: true });
</script>

<template>
    <div ref="strip" class="ilg-thumbnails flex gap-1.5 overflow-x-auto scroll-smooth p-1 [--ilg-thumbnail-width:4.5rem] [scrollbar-width:none] sm:[--ilg-thumbnail-width:5.25rem] [&::-webkit-scrollbar]:hidden" @scroll.passive="followScroll">
        <span v-if="range.start > 0" aria-hidden="true" class="shrink-0" :style="spacer(range.start)"></span>
        <button
            v-for="{ image, position } in shown"
            :key="image.src + position"
            :data-position="position"
            type="button"
            :aria-label="label(position)"
            :aria-current="position === index ? 'true' : undefined"
            class="ilg-thumbnail relative shrink-0 overflow-hidden rounded-md transition duration-200 ease-out focus-visible:outline-none"
            :class="
                position === index
                    ? tone === 'overlay' ? 'ilg-thumbnail-active ring-2 ring-white/80' : 'ilg-thumbnail-active ring-2 ring-gray-900/60 dark:ring-white/80'
                    : tone === 'overlay' ? 'ring-1 ring-white/10 hover:ring-white/50' : 'ring-1 ring-black/5 hover:ring-black/25 dark:ring-white/10 dark:hover:ring-white/40'
            "
            @click="emit('select', position)"
        >
            <video
                v-if="isVideo(image) && !(image.thumb ?? image.poster)"
                :src="firstFrame(image.src)"
                preload="metadata"
                muted
                playsinline
                aria-hidden="true"
                class="pointer-events-none aspect-[3/2] h-12 w-auto bg-black object-cover sm:h-14"
            />
            <img v-else :src="image.thumb ?? image.poster ?? image.src" alt="" loading="lazy" draggable="false" class="aspect-[3/2] h-12 w-auto object-cover sm:h-14" />
            <span v-if="isVideo(image)" class="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span class="flex size-6 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/20 backdrop-blur-sm">
                    <IconPlay class="size-3 translate-x-px" />
                </span>
            </span>
        </button>
        <span v-if="range.end < images.length" aria-hidden="true" class="shrink-0" :style="spacer(images.length - range.end)"></span>
    </div>
</template>

<style>
.ilg-thumbnail:focus-visible {
    box-shadow: 0 0 0 2px white, 0 0 0 3px rgb(0 0 0 / 0.55);
}
</style>
