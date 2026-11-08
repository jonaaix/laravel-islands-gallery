<script setup>
import { ref } from 'vue';

const props = defineProps({
    value: { type: Number, required: true },
    buffered: { type: Number, default: 0 },
    step: { type: Number, default: 0.05 },
    label: { type: String, required: true },
    valueText: { type: String, default: '' },
});

const emit = defineEmits(['input']);

const bar = ref(null);
const track = ref(null);
const dragging = ref(false);

const percent = (fraction) => `${Math.min(1, Math.max(0, fraction)) * 100}%`;

function fractionAt(event) {
    const box = track.value.getBoundingClientRect();

    return Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
}

function onPointerDown(event) {
    if (event.button !== 0) {
        return;
    }

    bar.value.setPointerCapture(event.pointerId);
    dragging.value = true;
    emit('input', fractionAt(event));
}

function onPointerMove(event) {
    if (dragging.value) {
        emit('input', fractionAt(event));
    }
}

function onPointerUp() {
    dragging.value = false;
}

function onKeydown(event) {
    const moves = { ArrowLeft: -props.step, ArrowDown: -props.step, ArrowRight: props.step, ArrowUp: props.step, Home: -1, End: 1 };
    const delta = moves[event.key];

    if (delta === undefined) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    emit('input', Math.min(1, Math.max(0, props.value + delta)));
}
</script>

<template>
    <div
        ref="bar"
        role="slider"
        tabindex="0"
        :aria-label="label"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(value * 100)"
        :aria-valuetext="valueText || undefined"
        class="ilg-slider group/slider flex h-8 cursor-pointer touch-none items-center rounded-md px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        :data-dragging="dragging ? '' : undefined"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @keydown="onKeydown"
    >
        <div ref="track" class="relative flex h-full flex-1 items-center">
            <div class="relative h-1 w-full overflow-hidden rounded-full bg-white/20 transition-[height] duration-150 group-hover/slider:h-1.5 group-data-dragging/slider:h-1.5">
                <div class="absolute inset-y-0 left-0 bg-white/30" :style="{ width: percent(buffered) }" />
                <div class="absolute inset-y-0 left-0 bg-white" :style="{ width: percent(value) }" />
            </div>
            <div
                class="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white shadow transition-transform duration-150 group-hover/slider:scale-100 group-focus-visible/slider:scale-100 group-data-dragging/slider:scale-100"
                :style="{ left: percent(value) }"
            />
        </div>
    </div>
</template>
