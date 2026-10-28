<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { SLIDE_DURATION, SLIDE_EASING, useSlider } from '../composables/useSlider.js';
import { DEFAULT_LABELS, format } from '../labels.js';
import IconChevronLeft from '../icons/IconChevronLeft.vue';
import IconChevronRight from '../icons/IconChevronRight.vue';
import IconFullscreen from '../icons/IconFullscreen.vue';
import IconFullscreenExit from '../icons/IconFullscreenExit.vue';
import IconOpenOriginal from '../icons/IconOpenOriginal.vue';
import IconPause from '../icons/IconPause.vue';
import IconPlay from '../icons/IconPlay.vue';
import IconXMark from '../icons/IconXMark.vue';
import IconZoomIn from '../icons/IconZoomIn.vue';
import IconZoomOut from '../icons/IconZoomOut.vue';
import { Tooltip } from '@aaix/laravel-islands/vue/helpers';
import Thumbnails from './Thumbnails.vue';

const props = defineProps({
    images: { type: Array, required: true },
    index: { type: Number, default: null },
    origin: { type: Function, default: null },
    loop: { type: Boolean, default: true },
    thumbnails: { type: Boolean, default: true },
    slideshowInterval: { type: Number, default: 4000 },
    maxZoom: { type: Number, default: 4 },
    labels: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['update:index', 'close']);

const MIN_DRAG = 8;
const CLOSE_DISTANCE = 120;
const DOUBLE_TAP_MS = 280;

const text = computed(() => ({ ...DEFAULT_LABELS, ...props.labels }));
const root = ref(null);
const stage = ref(null);
let currentImage = null;
const isOpen = ref(false);
const isVisible = ref(false);
const stageWidth = ref(0);
const fullscreen = ref(false);
const playing = ref(false);
const chromeHidden = ref(false);
const intro = reactive({ transform: '', transition: '' });
const zoom = reactive({ scale: 1, x: 0, y: 0, animate: false });
const dismiss = reactive({ y: 0, animate: false });

const slider = useSlider({
    count: () => props.images.length,
    loop: () => props.loop,
    width: () => stageWidth.value,
});

const current = computed(() => props.images[slider.index.value] ?? null);
const zoomed = computed(() => zoom.scale > 1.01);
const dismissProgress = computed(() => Math.min(1, Math.abs(dismiss.y) / (CLOSE_DISTANCE * 2.5)));
const slides = computed(() => [
    { position: -1, image: slider.prevIndex.value === null ? null : props.images[slider.prevIndex.value] },
    { position: 0, image: current.value },
    { position: 1, image: slider.nextIndex.value === null ? null : props.images[slider.nextIndex.value] },
]);

const trackStyle = computed(() => ({
    transform: `translate3d(${slider.offset.value}px, 0, 0)`,
    transition: slider.animating.value ? `transform ${SLIDE_DURATION}ms ${SLIDE_EASING}` : 'none',
}));

const currentStyle = computed(() => {
    if (intro.transform) {
        return { transform: intro.transform, transition: intro.transition };
    }

    const dismissScale = 1 - dismissProgress.value * 0.25;

    return {
        transform: `translate3d(${zoom.x}px, ${zoom.y + dismiss.y}px, 0) scale(${zoom.scale * dismissScale})`,
        transition: zoom.animate || dismiss.animate ? `transform ${SLIDE_DURATION}ms ${SLIDE_EASING}` : intro.transition,
        cursor: zoomed.value ? 'grab' : 'zoom-in',
    };
});

// ----- Opening and closing -----

let previousFocus = null;
let previousOverflow = '';

function measure() {
    stageWidth.value = stage.value?.clientWidth ?? window.innerWidth;
}

function fromOrigin(image) {
    const rect = props.origin?.(slider.index.value);
    const target = image?.getBoundingClientRect();

    if (!rect || !target || target.width === 0 || rect.width === 0) {
        return null;
    }

    const scale = Math.max(rect.width / target.width, rect.height / target.height);
    const dx = rect.left + rect.width / 2 - (target.left + target.width / 2);
    const dy = rect.top + rect.height / 2 - (target.top + target.height / 2);

    return `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
}

async function animateIn() {
    await nextTick();
    measure();

    const image = currentImage;

    if (image && !image.complete) {
        await new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
            setTimeout(resolve, 400);
        });
    }

    const start = fromOrigin(image);
    intro.transition = 'none';
    intro.transform = start ?? 'translate3d(0, 12px, 0) scale(0.96)';

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            isVisible.value = true;
            intro.transition = `transform ${SLIDE_DURATION}ms ${SLIDE_EASING}`;
            intro.transform = 'translate3d(0, 0, 0) scale(1)';
            setTimeout(() => {
                intro.transform = '';
                intro.transition = '';
            }, SLIDE_DURATION);
        });
    });
}

function open(index) {
    previousFocus = document.activeElement;
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    slider.reset(index);
    resetZoom(false);
    dismiss.y = 0;
    chromeHidden.value = false;
    isOpen.value = true;
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', onResize);
    animateIn().then(() => root.value?.focus({ preventScroll: true }));
}

function close() {
    if (!isOpen.value) {
        return;
    }

    stopSlideshow();
    const end = zoomed.value ? null : fromOrigin(currentImage);
    isVisible.value = false;
    intro.transition = `transform ${SLIDE_DURATION}ms ${SLIDE_EASING}, opacity ${SLIDE_DURATION}ms ease-in`;
    intro.transform = end ?? `translate3d(0, ${dismiss.y + 16}px, 0) scale(0.96)`;

    setTimeout(() => {
        isOpen.value = false;
        intro.transform = '';
        intro.transition = '';
        dismiss.y = 0;
        document.documentElement.style.overflow = previousOverflow;
        window.removeEventListener('keydown', onKeydown);
        window.removeEventListener('resize', onResize);

        if (document.fullscreenElement) {
            document.exitFullscreen?.();
        }

        previousFocus?.focus?.({ preventScroll: true });
        emit('close');
    }, SLIDE_DURATION);
}

watch(
    () => props.index,
    (index) => {
        if (index === null || index === undefined) {
            close();
        } else if (!isOpen.value) {
            open(index);
        } else if (index !== slider.index.value) {
            slider.goTo(index);
        }
    },
);

watch(slider.index, (index) => {
    resetZoom(false);

    if (isOpen.value && index !== props.index) {
        emit('update:index', index);
    }

    preload(index);
});

function preload(index) {
    for (const delta of [-1, 1]) {
        const image = props.images[slider.wrap(index + delta)];

        if (image) {
            new Image().src = image.src;
        }
    }
}

function onResize() {
    measure();
    resetZoom(false);
}

// ----- Zoom and pan -----

function resetZoom(animate = true) {
    zoom.animate = animate;
    zoom.scale = 1;
    zoom.x = 0;
    zoom.y = 0;
}

function bounds(scale) {
    const image = currentImage;
    const box = stage.value?.getBoundingClientRect();

    if (!image || !box) {
        return { x: 0, y: 0 };
    }

    return {
        x: Math.max(0, (image.offsetWidth * scale - box.width) / 2),
        y: Math.max(0, (image.offsetHeight * scale - box.height) / 2),
    };
}

function clampPan(scale, x, y, give = 0) {
    const limit = bounds(scale);
    const soften = (value, max) => {
        if (Math.abs(value) <= max) {
            return value;
        }

        const overshoot = Math.abs(value) - max;

        return Math.sign(value) * (max + (give ? overshoot * give : 0));
    };

    return { x: soften(x, limit.x), y: soften(y, limit.y) };
}

function zoomTo(scale, clientX, clientY, animate = true) {
    const box = stage.value.getBoundingClientRect();
    const next = Math.min(props.maxZoom, Math.max(1, scale));
    const px = (clientX ?? box.left + box.width / 2) - (box.left + box.width / 2);
    const py = (clientY ?? box.top + box.height / 2) - (box.top + box.height / 2);
    const ratio = next / zoom.scale;
    const panned = clampPan(next, px - (px - zoom.x) * ratio, py - (py - zoom.y) * ratio);

    zoom.animate = animate;
    zoom.scale = next;
    zoom.x = next === 1 ? 0 : panned.x;
    zoom.y = next === 1 ? 0 : panned.y;
}

function toggleZoom(clientX, clientY) {
    stopSlideshow();
    zoomed.value ? resetZoom() : zoomTo(2.5, clientX, clientY);
}

function onWheel(event) {
    event.preventDefault();
    stopSlideshow();
    zoomTo(zoom.scale * Math.exp(-event.deltaY * 0.0025), event.clientX, event.clientY, false);
}

// ----- Pointer gestures -----

const pointers = new Map();
let gesture = null;
let lastTap = { time: 0, x: 0, y: 0 };

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function onPointerDown(event) {
    if (event.button !== 0 || intro.transform) {
        return;
    }

    stage.value.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stopSlideshow();

    if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        gesture = { type: 'pinch', distance: distance(a, b), scale: zoom.scale, mid: midpoint(a, b), x: zoom.x, y: zoom.y };
        slider.release(0, 0);

        return;
    }

    gesture = {
        type: 'pending',
        startX: event.clientX,
        startY: event.clientY,
        time: performance.now(),
        x: zoom.x,
        y: zoom.y,
        lastX: event.clientX,
        lastY: event.clientY,
        lastTime: performance.now(),
        velocityX: 0,
        velocityY: 0,
        onImage: event.target === currentImage,
        pointerType: event.pointerType,
    };
}

function onPointerMove(event) {
    if (!pointers.has(event.pointerId) || !gesture) {
        return;
    }

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (gesture.type === 'pinch' && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const mid = midpoint(a, b);
        const scale = Math.min(props.maxZoom * 1.15, Math.max(0.85, (gesture.scale * distance(a, b)) / gesture.distance));
        const box = stage.value.getBoundingClientRect();
        const px = gesture.mid.x - (box.left + box.width / 2);
        const py = gesture.mid.y - (box.top + box.height / 2);
        const ratio = scale / gesture.scale;

        zoom.animate = false;
        zoom.scale = scale;
        zoom.x = px - (px - gesture.x) * ratio + (mid.x - gesture.mid.x);
        zoom.y = py - (py - gesture.y) * ratio + (mid.y - gesture.mid.y);

        return;
    }

    const now = performance.now();
    const elapsed = Math.max(1, now - gesture.lastTime);
    gesture.velocityX = (event.clientX - gesture.lastX) / elapsed;
    gesture.velocityY = (event.clientY - gesture.lastY) / elapsed;
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
    gesture.lastTime = now;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (gesture.type === 'pending') {
        if (Math.hypot(dx, dy) < MIN_DRAG) {
            return;
        }

        gesture.type = zoomed.value ? 'pan' : Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'dismiss';
    }

    if (gesture.type === 'pan') {
        const panned = clampPan(zoom.scale, gesture.x + dx, gesture.y + dy, 0.3);
        zoom.animate = false;
        zoom.x = panned.x;
        zoom.y = panned.y;
    } else if (gesture.type === 'swipe') {
        slider.drag(dx);
    } else if (gesture.type === 'dismiss') {
        dismiss.animate = false;
        dismiss.y = dy;
    }
}

function onPointerUp(event) {
    if (!pointers.has(event.pointerId)) {
        return;
    }

    pointers.delete(event.pointerId);

    if (!gesture) {
        return;
    }

    if (gesture.type === 'pinch') {
        if (pointers.size === 0) {
            zoom.scale < 1.05 ? resetZoom() : zoomTo(zoom.scale, gesture.mid.x, gesture.mid.y);
            gesture = null;
        }

        return;
    }

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (gesture.type === 'pending') {
        handleTap(event, gesture);
    } else if (gesture.type === 'pan') {
        const panned = clampPan(zoom.scale, zoom.x + gesture.velocityX * 120, zoom.y + gesture.velocityY * 120);
        zoom.animate = true;
        zoom.x = panned.x;
        zoom.y = panned.y;
    } else if (gesture.type === 'swipe') {
        slider.release(dx, gesture.velocityX);
    } else if (gesture.type === 'dismiss') {
        if (Math.abs(dy) > CLOSE_DISTANCE || Math.abs(gesture.velocityY) > 0.7) {
            close();
        } else {
            dismiss.animate = true;
            dismiss.y = 0;
        }
    }

    gesture = null;
}

function handleTap(event, tap) {
    const now = performance.now();
    const isDouble = now - lastTap.time < DOUBLE_TAP_MS && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 30;
    lastTap = { time: isDouble ? 0 : now, x: event.clientX, y: event.clientY };

    if (tap.pointerType === 'mouse') {
        if (tap.onImage) {
            toggleZoom(event.clientX, event.clientY);
        } else if (!zoomed.value) {
            close();
        }

        return;
    }

    if (isDouble) {
        toggleZoom(event.clientX, event.clientY);

        return;
    }

    setTimeout(() => {
        if (lastTap.time === now) {
            chromeHidden.value = !chromeHidden.value;
        }
    }, DOUBLE_TAP_MS);
}

// ----- Navigation, slideshow, fullscreen -----

function previous() {
    stopSlideshow();
    slider.step(-1);
}

function next() {
    stopSlideshow();
    slider.step(1);
}

let slideshowTimer = null;
const slideshowKey = ref(0);

function startSlideshow() {
    playing.value = true;
    slideshowKey.value++;
    clearInterval(slideshowTimer);
    slideshowTimer = setInterval(() => {
        if (!slider.step(1)) {
            stopSlideshow();
        }

        slideshowKey.value++;
    }, props.slideshowInterval);
}

function stopSlideshow() {
    playing.value = false;
    clearInterval(slideshowTimer);
}

function toggleSlideshow() {
    playing.value ? stopSlideshow() : startSlideshow();
}

async function toggleFullscreen() {
    if (document.fullscreenElement) {
        await document.exitFullscreen?.();
    } else {
        await root.value?.requestFullscreen?.();
    }
}

function onFullscreenChange() {
    fullscreen.value = document.fullscreenElement === root.value;
    nextTick(measure);
}

document.addEventListener('fullscreenchange', onFullscreenChange);

const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;

function onKeydown(event) {
    const actions = {
        ArrowLeft: previous,
        ArrowRight: next,
        Escape: () => (zoomed.value ? resetZoom() : close()),
        '+': () => zoomTo(zoom.scale * 1.5),
        '=': () => zoomTo(zoom.scale * 1.5),
        '-': () => zoomTo(zoom.scale / 1.5),
        ' ': toggleSlideshow,
    };

    if (event.key === 'Tab') {
        trapFocus(event);

        return;
    }

    const action = actions[event.key];

    if (action) {
        event.preventDefault();
        action();
    }
}

function trapFocus(event) {
    const focusable = [...(root.value?.querySelectorAll('button, a[href]') ?? [])].filter((element) => element.offsetParent !== null);

    if (focusable.length === 0) {
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

onBeforeUnmount(() => {
    stopSlideshow();
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);

    if (isOpen.value) {
        document.documentElement.style.overflow = previousOverflow;
    }
});

defineExpose({ close });
</script>

<template>
    <Teleport to="body">
        <div
            v-if="isOpen"
            ref="root"
            class="ilg-lightbox fixed inset-0 z-[70] flex flex-col overflow-hidden text-white outline-none select-none"
            role="dialog"
            tabindex="-1"
            aria-modal="true"
            :aria-label="text.dialog"
        >
            <div
                class="absolute inset-0 bg-neutral-950/95 backdrop-blur-2xl transition-opacity duration-[350ms] ease-out"
                :style="{ opacity: isVisible ? 1 - dismissProgress * 0.85 : 0 }"
            />

            <div
                class="relative z-20 flex items-center justify-between gap-3 p-3 transition-opacity duration-200 sm:p-4"
                :class="isVisible && !chromeHidden && dismiss.y === 0 ? 'opacity-100' : 'pointer-events-none opacity-0'"
            >
                <span class="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium tabular-nums text-white/90 ring-1 ring-white/15 backdrop-blur-md">
                    {{ format(text.counter, { current: slider.index.value + 1, total: images.length }) }}
                </span>

                <div class="flex items-center gap-0.5 rounded-full bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur-md">
                    <Tooltip :text="zoomed ? text.zoomOut : text.zoomIn" placement="bottom">
                        <button type="button" class="ilg-tool" :aria-label="zoomed ? text.zoomOut : text.zoomIn" @click="toggleZoom()">
                            <IconZoomOut v-if="zoomed" class="size-5" />
                            <IconZoomIn v-else class="size-5" />
                        </button>
                    </Tooltip>
                    <Tooltip v-if="images.length > 1" :text="playing ? text.pause : text.play" placement="bottom">
                        <button type="button" class="ilg-tool" :aria-label="playing ? text.pause : text.play" @click="toggleSlideshow">
                            <IconPause v-if="playing" class="size-5" />
                            <IconPlay v-else class="size-5" />
                        </button>
                    </Tooltip>
                    <Tooltip v-if="canFullscreen" :text="fullscreen ? text.exitFullscreen : text.fullscreen" placement="bottom">
                        <button type="button" class="ilg-tool" :aria-label="fullscreen ? text.exitFullscreen : text.fullscreen" @click="toggleFullscreen">
                            <IconFullscreenExit v-if="fullscreen" class="size-5" />
                            <IconFullscreen v-else class="size-5" />
                        </button>
                    </Tooltip>
                    <Tooltip v-if="current" :text="text.openOriginal" placement="bottom">
                        <a class="ilg-tool" :href="current.src" target="_blank" rel="noopener" :aria-label="text.openOriginal">
                            <IconOpenOriginal class="size-5" />
                        </a>
                    </Tooltip>
                    <span class="mx-0.5 h-5 w-px bg-white/15" aria-hidden="true" />
                    <Tooltip :text="text.close" placement="bottom">
                        <button type="button" class="ilg-tool" :aria-label="text.close" @click="close">
                            <IconXMark class="size-5" />
                        </button>
                    </Tooltip>
                </div>
            </div>

            <div v-if="playing" :key="slideshowKey" class="absolute inset-x-0 top-0 z-30 h-0.5 bg-white/10">
                <div class="ilg-progress h-full bg-white/70" :style="{ animationDuration: `${slideshowInterval}ms` }" />
            </div>

            <div
                ref="stage"
                class="relative z-10 min-h-0 flex-1 touch-none overflow-hidden"
                @pointerdown="onPointerDown"
                @pointermove="onPointerMove"
                @pointerup="onPointerUp"
                @pointercancel="onPointerUp"
                @wheel="onWheel"
            >
                <div class="absolute inset-0" :style="trackStyle">
                    <div
                        v-for="slide in slides"
                        :key="slide.position"
                        class="absolute inset-0 flex items-center justify-center px-3 py-2 sm:px-20"
                        :style="{ transform: `translate3d(${slide.position * 100}%, 0, 0)` }"
                    >
                        <img
                            v-if="slide.image && slide.position === 0"
                            :ref="(element) => (currentImage = element)"
                            :key="slide.image.src"
                            :src="slide.image.src"
                            :alt="slide.image.alt ?? slide.image.caption ?? ''"
                            draggable="false"
                            class="ilg-image max-h-full max-w-full rounded-lg object-contain shadow-[0_30px_80px_-20px_rgb(0_0_0/0.75)] will-change-transform"
                            :style="currentStyle"
                        />
                        <img
                            v-else-if="slide.image"
                            :key="slide.image.src"
                            :src="slide.image.src"
                            alt=""
                            draggable="false"
                            class="max-h-full max-w-full rounded-lg object-contain opacity-90 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.75)]"
                            :style="{ opacity: isVisible ? 0.9 : 0 }"
                        />
                    </div>
                </div>

                <template v-if="images.length > 1">
                    <button
                        type="button"
                        class="ilg-arrow left-3 sm:left-5"
                        :class="isVisible && !chromeHidden && !zoomed && dismiss.y === 0 && slider.prevIndex.value !== null ? 'opacity-100' : 'pointer-events-none opacity-0'"
                        :aria-label="text.previous"
                        @pointerdown.stop
                        @click="previous"
                    >
                        <IconChevronLeft class="size-6" />
                    </button>
                    <button
                        type="button"
                        class="ilg-arrow right-3 sm:right-5"
                        :class="isVisible && !chromeHidden && !zoomed && dismiss.y === 0 && slider.nextIndex.value !== null ? 'opacity-100' : 'pointer-events-none opacity-0'"
                        :aria-label="text.next"
                        @pointerdown.stop
                        @click="next"
                    >
                        <IconChevronRight class="size-6" />
                    </button>
                </template>
            </div>

            <div
                class="relative z-20 space-y-2 px-3 pb-3 pt-2 transition-opacity duration-200 sm:pb-4"
                :class="isVisible && !chromeHidden && dismiss.y === 0 ? 'opacity-100' : 'pointer-events-none opacity-0'"
            >
                <p v-if="current?.caption" class="mx-auto max-w-3xl text-center text-sm text-white/75">{{ current.caption }}</p>
                <div v-if="thumbnails && images.length > 1" class="mx-auto w-fit max-w-full rounded-2xl bg-white/5 p-1 ring-1 ring-white/10 backdrop-blur-md">
                    <Thumbnails :images="images" :index="slider.index.value" :label="(position) => format(text.image, { number: position + 1 })" tone="overlay" @select="(position) => { stopSlideshow(); slider.goTo(position); }" />
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style>
.ilg-tool {
    position: relative;
    display: inline-flex;
    height: 2.25rem;
    width: 2.25rem;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    color: rgb(255 255 255 / 0.85);
    transition: background-color 150ms ease-out, color 150ms ease-out;
}

.ilg-tool:hover {
    background-color: rgb(255 255 255 / 0.12);
    color: white;
}

.ilg-tool:focus-visible {
    outline: 2px solid rgb(255 255 255 / 0.7);
    outline-offset: 1px;
}

.ilg-arrow {
    position: absolute;
    top: 50%;
    z-index: 10;
    display: inline-flex;
    height: 3rem;
    width: 3rem;
    transform: translateY(-50%);
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background-color: rgb(255 255 255 / 0.1);
    color: white;
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.15);
    backdrop-filter: blur(12px);
    transition: opacity 200ms ease-out, background-color 150ms ease-out;
}

.ilg-arrow:hover {
    background-color: rgb(255 255 255 / 0.2);
}

.ilg-arrow:focus-visible {
    outline: 2px solid rgb(255 255 255 / 0.7);
    outline-offset: 2px;
}

@media (hover: none) {
    .ilg-arrow {
        display: none;
    }
}

.ilg-progress {
    animation-name: ilg-progress;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
}

@keyframes ilg-progress {
    from { width: 0; }
    to { width: 100%; }
}

</style>
