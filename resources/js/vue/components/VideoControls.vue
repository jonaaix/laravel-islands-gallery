<script setup>
import { computed } from 'vue';
import { IconButton } from '@aaix/laravel-islands/vue/helpers';
import { clock } from '../media.js';
import IconPause from '../icons/IconPause.vue';
import IconPlay from '../icons/IconPlay.vue';
import IconSpeakerWave from '../icons/IconSpeakerWave.vue';
import IconSpeakerXMark from '../icons/IconSpeakerXMark.vue';
import ControlSlider from './ControlSlider.vue';

const props = defineProps({
    video: { type: Object, required: true },
    text: { type: Object, required: true },
    size: { type: String, default: 'lg' },
});

const fractionOf = (seconds) => (props.video.duration ? seconds / props.video.duration : 0);
const silent = computed(() => props.video.muted || props.video.volume === 0);
const elapsed = computed(() => `${clock(props.video.time)} / ${clock(props.video.duration)}`);
const seekStep = computed(() => (props.video.duration ? 5 / props.video.duration : 0.05));
</script>

<template>
    <div class="ilg-video-controls flex items-center gap-1" @pointerdown.stop>
        <IconButton :label="video.playing ? text.pauseVideo : text.playVideo" tone="plain" :size="size" class="ilg-tool shrink-0" @click="video.toggle()">
            <IconPause v-if="video.playing" />
            <IconPlay v-else />
        </IconButton>
        <span class="shrink-0 px-1 text-xs font-medium tabular-nums text-white/85">{{ elapsed }}</span>
        <ControlSlider
            class="min-w-0 flex-1 px-1"
            :value="fractionOf(video.time)"
            :buffered="fractionOf(video.buffered)"
            :step="seekStep"
            :label="text.seek"
            :value-text="elapsed"
            @input="(fraction) => video.seek(fraction * video.duration)"
        />
        <IconButton :label="silent ? text.unmute : text.mute" tone="plain" :size="size" class="ilg-tool shrink-0" @click="video.toggleMute()">
            <IconSpeakerXMark v-if="silent" />
            <IconSpeakerWave v-else />
        </IconButton>
        <ControlSlider
            class="ilg-volume hidden w-20 shrink-0 px-1 sm:flex"
            :value="silent ? 0 : video.volume"
            :step="0.1"
            :label="text.volume"
            :value-text="`${Math.round((silent ? 0 : video.volume) * 100)} %`"
            @input="video.setVolume"
        />
    </div>
</template>

<style>
@media (hover: none) {
    .ilg-volume {
        display: none;
    }
}
</style>
