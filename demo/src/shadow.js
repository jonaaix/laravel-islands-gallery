import { createApp, h, ref } from 'vue';
import { Lightbox } from '@aaix/laravel-islands-gallery/vue';
import './style.css';

const swatch = (hue) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><rect width="100%" height="100%" fill="hsl(${hue} 60% 50%)"/></svg>`)}`;

const images = [20, 140, 260].map((hue, position) => ({
    src: swatch(hue),
    caption: `Swatch ${position + 1}`,
    downloads: [
        { label: 'Large', src: swatch(hue), filename: `swatch-${position + 1}-large.svg` },
        { label: 'Small', src: swatch(hue), filename: `swatch-${position + 1}-small.svg` },
    ],
}));

const shadow = document.getElementById('host').attachShadow({ mode: 'open' });
const layer = document.createElement('div');
const mountPoint = document.createElement('div');
shadow.append(layer, mountPoint);

const mirrored = new Map();

function mirrorStyles() {
    for (const source of document.head.querySelectorAll('style')) {
        if (!mirrored.has(source)) {
            mirrored.set(source, shadow.insertBefore(document.createElement('style'), layer));
        }

        mirrored.get(source).textContent = source.textContent;
    }
}

mirrorStyles();
new MutationObserver(mirrorStyles).observe(document.head, { childList: true, subtree: true, characterData: true });

window.pageKeys = [];
document.addEventListener('keydown', (event) => window.pageKeys.push(`document:${event.key}`), true);
window.addEventListener('keydown', (event) => window.pageKeys.push(`window:${event.key}`));

const index = ref(null);

createApp({
    render: () => h(Lightbox, { images, index: index.value, teleport: layer, 'onUpdate:index': (value) => (index.value = value) }),
}).mount(mountPoint);

document.getElementById('open').addEventListener('click', () => (index.value = 0));
