import { reactive } from 'vue';

export function useVideo({ onEnded = null } = {}) {
    const positions = new Map();
    let element = null;
    let playOnLoad = null;

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
            video.playing = false;
        },
        waiting() {
            video.waiting = true;
        },
        playing() {
            video.waiting = false;
        },
        seeked(event) {
            video.waiting = false;
            video.buffered = bufferedEnd(event.target);
        },
        ended(event) {
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
        setVolume,
        toggleMute,
    });

    return video;
}
