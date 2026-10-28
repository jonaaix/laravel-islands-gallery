import { computed, ref } from 'vue';

export const SLIDE_DURATION = 350;
export const SLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function useSlider({ count, loop, width, start = 0 }) {
    const index = ref(start);
    const target = ref(start);
    const offset = ref(0);
    const animating = ref(false);
    let timer = null;

    const total = computed(() => count());

    function wrap(value) {
        const n = total.value;

        return n === 0 ? 0 : ((value % n) + n) % n;
    }

    function canStep(delta) {
        if (total.value < 2) {
            return false;
        }

        return loop() || (index.value + delta >= 0 && index.value + delta < total.value);
    }

    const prevIndex = computed(() => (canStep(-1) ? wrap(index.value - 1) : null));
    const nextIndex = computed(() => (canStep(1) ? wrap(index.value + 1) : null));

    function settle(onDone) {
        animating.value = true;
        clearTimeout(timer);
        timer = setTimeout(() => {
            animating.value = false;
            onDone?.();
        }, SLIDE_DURATION);
    }

    function step(delta) {
        if (animating.value || !canStep(delta)) {
            settle();
            offset.value = 0;

            return false;
        }

        offset.value = -delta * width();
        target.value = wrap(index.value + delta);
        settle(() => {
            index.value = wrap(index.value + delta);
            offset.value = 0;
        });

        return true;
    }

    function goTo(position) {
        const next = wrap(position);

        if (next === index.value || animating.value) {
            return;
        }

        if (Math.abs(next - index.value) === 1 || (loop() && Math.abs(next - index.value) === total.value - 1)) {
            step(next === wrap(index.value + 1) ? 1 : -1);

            return;
        }

        index.value = next;
        target.value = next;
        offset.value = 0;
    }

    function drag(dx) {
        const resisted = (dx > 0 && prevIndex.value === null) || (dx < 0 && nextIndex.value === null);
        offset.value = resisted ? dx / 3 : dx;
    }

    function release(dx, velocity) {
        const threshold = width() * 0.18;

        if (dx < -threshold || velocity < -0.45) {
            return step(1);
        }

        if (dx > threshold || velocity > 0.45) {
            return step(-1);
        }

        settle();
        offset.value = 0;

        return false;
    }

    function reset(destination = 0) {
        clearTimeout(timer);
        animating.value = false;
        index.value = wrap(destination);
        target.value = index.value;
        offset.value = 0;
    }

    return { index, target, offset, animating, prevIndex, nextIndex, step, goTo, drag, release, reset, wrap };
}
