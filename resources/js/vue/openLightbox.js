import { createApp, h, ref, shallowRef } from 'vue';
import Lightbox from './components/Lightbox.vue';

let viewer = null;

function mount() {
    const host = document.createElement('div');
    const images = shallowRef([]);
    const options = shallowRef({});
    const index = ref(null);

    document.body.append(host);

    const app = createApp({
        render: () => h(Lightbox, {
            ...options.value,
            images: images.value,
            index: index.value,
            'onUpdate:index': (value) => (index.value = value),
        }),
    });

    app.mount(host);

    return { host, app, images, options, index };
}

export function openLightbox(images, { start = 0, ...options } = {}) {
    if (!images?.length) {
        return;
    }

    if (viewer && !viewer.host.isConnected) {
        viewer.app.unmount();
        viewer = null;
    }

    viewer ??= mount();
    viewer.images.value = images;
    viewer.options.value = options;
    viewer.index.value = Math.min(Math.max(0, start), images.length - 1);
}
