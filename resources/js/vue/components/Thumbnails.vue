<script setup>
import { nextTick, ref, watch } from 'vue';
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

function reveal() {
    const button = strip.value?.children[props.index];

    if (!button) {
        return;
    }

    const left = button.offsetLeft - (strip.value.clientWidth - button.offsetWidth) / 2;
    strip.value.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
}

watch(() => props.index, () => nextTick(reveal), { immediate: true });
</script>

<template>
    <div ref="strip" class="ilg-thumbnails flex gap-1.5 overflow-x-auto scroll-smooth p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
            v-for="(image, position) in images"
            :key="image.src + position"
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
    </div>
</template>

<style>
.ilg-thumbnail:focus-visible {
    box-shadow: 0 0 0 2px white, 0 0 0 3px rgb(0 0 0 / 0.55);
}
</style>
