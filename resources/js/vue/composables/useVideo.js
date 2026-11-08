import { onScopeDispose, reactive } from 'vue';

const FALLBACK_FRAME_LENGTH = 1 / 30;
const FRAME_SAMPLES = 30;

export function useVideo({ onEnded = null } = {}) {
    const positions = new Map();
    let element = null;
    let playOnLoad = null;
    let frame = null;
    let frameLength = FALLBACK_FRAME_LENGTH;
    let frameSampler = null;

    const sourceOf = (media) => media.getAttribute('src');

    function bind(media) {
        element = media;
    }

    function play() {
        element?.play()?.catch(() => {});
    }

    function pause() {
        playOnLoad = null;
        element?.pause();
    }

    function toggle() {
        element?.paused ? play() : pause();
    }

    function queuePlay(src) {
        if (element && sourceOf(element) === src && element.readyState >= 1) {
            play();
        } else {
            playOnLoad = src;
        }
    }

    function seek(seconds) {
        if (!element || !Number.isFinite(element.duration)) {
            return;
        }

        element.currentTime = Math.min(element.duration, Math.max(0, seconds));
        video.time = element.currentTime;
    }

    function stepFrame(direction) {
        if (!element || !Number.isFinite(element.duration)) {
            return;
        }

        pause();

        const current = Math.floor(element.currentTime / frameLength + 0.001);
        seek((current + direction + 0.5) * frameLength);
    }

    function setVolume(level) {
        video.volume = Math.min(1, Math.max(0, level));
        video.muted = video.volume === 0;

        if (element) {
            element.volume = video.volume;
            element.muted = video.muted;
        }
    }

    function toggleMute() {
        if (video.muted || video.volume === 0) {
            setVolume(video.volume || 1);
        } else {
            video.muted = true;

            if (element) {
                element.muted = true;
            }
        }
    }

    function follow(media) {
        unfollow();

        const tick = () => {
            video.time = media.currentTime;
            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
    }

    function unfollow() {
        if (frame !== null) {
            cancelAnimationFrame(frame);
            frame = null;
        }
    }

    function sampleFrameLength(media) {
        if (!media.requestVideoFrameCallback || frameSampler?.media === media) {
            return;
        }

        stopSampling();

        let lastTime = null;
        let samples = 0;

        const onFrame = (now, { mediaTime }) => {
            const gap = lastTime === null ? 0 : mediaTime - lastTime;

            if (gap > 0.001) {
                frameLength = samples === 0 ? gap : Math.min(frameLength, gap);
                samples++;
            }

            lastTime = mediaTime;
            frameSampler.handle = samples < FRAME_SAMPLES ? media.requestVideoFrameCallback(onFrame) : null;
        };

        frameSampler = { media, handle: media.requestVideoFrameCallback(onFrame) };
    }

    function stopSampling() {
        if (frameSampler?.handle) {
            frameSampler.media.cancelVideoFrameCallback(frameSampler.handle);
        }

        frameSampler = null;
        frameLength = FALLBACK_FRAME_LENGTH;
    }

    function bufferedEnd(media) {
        const ranges = media.buffered;

        for (let range = 0; range < ranges.length; range++) {
            if (ranges.start(range) <= media.currentTime && media.currentTime <= ranges.end(range)) {
                return ranges.end(range);
            }
        }

        return 0;
    }

    const listeners = {
        loadstart() {
            unfollow();
            stopSampling();
            video.time = 0;
            video.duration = 0;
            video.buffered = 0;
            video.playing = false;
            video.waiting = false;
        },
        loadedmetadata(event) {
            const media = event.target;
            const saved = positions.get(sourceOf(media));

            media.volume = video.volume;
            media.muted = video.muted;
            video.duration = media.duration;

            if (saved && saved < media.duration - 1) {
                media.currentTime = saved;
            }

            if (playOnLoad === sourceOf(media)) {
                playOnLoad = null;
                media.play()?.catch(() => {});
            }
        },
        durationchange(event) {
            video.duration = event.target.duration;
        },
        timeupdate(event) {
            video.time = event.target.currentTime;
            positions.set(sourceOf(event.target), video.time);
        },
        progress(event) {
            video.buffered = bufferedEnd(event.target);
        },
        play() {
            video.playing = true;
        },
        pause() {
            unfollow();
            video.playing = false;
        },
        waiting() {
            unfollow();
            video.waiting = true;
        },
        playing(event) {
            video.waiting = false;
            follow(event.target);
            sampleFrameLength(event.target);
        },
        seeked(event) {
            video.waiting = false;
            video.buffered = bufferedEnd(event.target);
        },
        ended(event) {
            unfollow();
            video.playing = false;
            positions.delete(sourceOf(event.target));
            onEnded?.();
        },
    };

    const video = reactive({
        playing: false,
        waiting: false,
        time: 0,
        duration: 0,
        buffered: 0,
        volume: 1,
        muted: false,
        listeners,
        bind,
        play,
        pause,
        toggle,
        queuePlay,
        seek,
        stepFrame,
        setVolume,
        toggleMute,
    });

    onScopeDispose(() => {
        unfollow();
        stopSampling();
    });

    return video;
}
