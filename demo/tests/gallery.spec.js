import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.route('https://picsum.photos/**', (route) => {
        const [, , id, width, height] = new URL(route.request().url()).pathname.split('/');

        return route.fulfill({
            contentType: 'image/svg+xml',
            headers: { 'access-control-allow-origin': '*' },
            body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="hsl(${id % 360} 60% 50%)"/></svg>`,
        });
    });

    await page.goto('/');
});

const gallery = (page) => page.locator('#gallery');
const counter = (page) => gallery(page).locator('span.tabular-nums');
const caption = (page) => gallery(page).locator('span.truncate');
const lightbox = (page) => page.getByRole('dialog');

async function openLightbox(page) {
    await gallery(page).locator('[style*="transition: none"]').first().waitFor();
    await gallery(page).click({ position: { x: 200, y: 150 } });
    await expect(lightbox(page)).toBeVisible();
}

async function closeLightbox(page) {
    await page.keyboard.press('Escape');
    await expect(lightbox(page)).toBeHidden();
}

test.describe('gallery', () => {
    test('steps with the arrows and shows the current caption', async ({ page }) => {
        await expect(counter(page)).toHaveText('1 / 8');
        await expect(caption(page)).toHaveText('Fjord from above');

        await gallery(page).hover();
        await gallery(page).getByRole('button', { name: 'Next image' }).click();

        await expect(counter(page)).toHaveText('2 / 8');
        await expect(caption(page)).toHaveText('Green ridge');
    });

    test('wraps from the first image to the last', async ({ page }) => {
        await gallery(page).hover();
        await gallery(page).getByRole('button', { name: 'Previous image' }).click();

        await expect(counter(page)).toHaveText('8 / 8');
    });

    test('swipes to the next image', async ({ page }) => {
        const box = await gallery(page).boundingBox();
        const y = box.y + box.height / 2;

        await page.mouse.move(box.x + box.width * 0.8, y);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.5, y, { steps: 8 });
        await page.mouse.move(box.x + box.width * 0.2, y, { steps: 8 });
        await page.mouse.up();

        await expect(counter(page)).toHaveText('2 / 8');
        await expect(lightbox(page)).toBeHidden();
    });

    test('jumps to a thumbnail', async ({ page }) => {
        await page.getByRole('button', { name: 'Image 4' }).first().click();

        await expect(counter(page)).toHaveText('4 / 8');
        await expect(caption(page)).toHaveText('Waterfall');
    });
});

test.describe('lightbox', () => {
    test('opens on the image the gallery shows', async ({ page }) => {
        await page.getByRole('button', { name: 'Image 3' }).first().click();
        await openLightbox(page);

        await expect(lightbox(page)).toContainText('3 / 8');
        await expect(lightbox(page)).toContainText('Snowfield');
    });

    test('steps with the keyboard', async ({ page }) => {
        await openLightbox(page);
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');

        await expect(lightbox(page)).toContainText('3 / 8');
    });

    test('leaves the gallery on the image it closed on', async ({ page }) => {
        await openLightbox(page);
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await expect(lightbox(page)).toContainText('4 / 8');

        await closeLightbox(page);

        await expect(counter(page)).toHaveText('4 / 8');
        await expect(caption(page)).toHaveText('Waterfall');
    });

    test('keeps the page from shifting sideways when it has a scrollbar', async ({ page }) => {
        await page.addStyleTag({ content: 'body { min-height: 3000px; }' });
        const before = (await gallery(page).boundingBox()).x;

        await openLightbox(page);

        expect((await gallery(page).boundingBox()).x).toBe(before);
        expect(await page.evaluate(() => document.documentElement.style.scrollbarGutter)).toBe('stable');

        await closeLightbox(page);
        expect(await page.evaluate(() => document.documentElement.style.scrollbarGutter)).toBe('');
    });

    test('reserves no gutter when the page has no scrollbar', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 2000 });
        await openLightbox(page);

        expect(await page.evaluate(() => document.documentElement.style.scrollbarGutter)).toBe('');
    });

    test('opens again after closing', async ({ page }) => {
        await openLightbox(page);
        await lightbox(page).getByRole('button', { name: 'Close' }).click();
        await expect(lightbox(page)).toBeHidden();

        await openLightbox(page);
    });

    test('zooms out first and closes on the second Escape', async ({ page }) => {
        await openLightbox(page);
        await lightbox(page).getByRole('button', { name: 'Zoom in' }).click();
        await expect(lightbox(page).getByRole('button', { name: 'Zoom out' })).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(lightbox(page).getByRole('button', { name: 'Zoom in' })).toBeVisible();

        await closeLightbox(page);
    });
});

test.describe('openLightbox', () => {
    test('opens the shared lightbox from a list and leaves the gallery alone', async ({ page }) => {
        await page.getByRole('button', { name: 'Open Snowfield' }).click();

        await expect(lightbox(page)).toBeVisible();
        await expect(lightbox(page)).toContainText('3 / 8');

        await closeLightbox(page);
        await expect(counter(page)).toHaveText('1 / 8');
    });

    test('opens again on another picture', async ({ page }) => {
        await page.getByRole('button', { name: 'Open Waterfall' }).click();
        await expect(lightbox(page)).toContainText('4 / 8');
        await closeLightbox(page);

        await page.getByRole('button', { name: 'Open Coastline' }).click();
        await expect(lightbox(page)).toContainText('7 / 8');
    });
});

test.describe('download', () => {
    test('offers every size and saves the chosen one under its file name', async ({ page }) => {
        await openLightbox(page);
        await lightbox(page).getByRole('button', { name: 'Download' }).click();

        const menu = lightbox(page).getByRole('menu');
        await expect(menu.getByRole('menuitem')).toHaveText(['Original (5000 × 3333)', 'Large (1500 × 1000)', 'Small (750 × 500)']);

        const [file] = await Promise.all([
            page.waitForEvent('download'),
            menu.getByRole('menuitem', { name: 'Small (750 × 500)' }).click(),
        ]);

        expect(file.suggestedFilename()).toBe('fjord-from-above-small.jpg');
        await expect(menu).toBeHidden();
    });

    test('shows a spinner on the button while the file loads', async ({ page }) => {
        let release;
        const held = new Promise((resolve) => (release = resolve));

        await page.route('https://picsum.photos/id/1015/5000/3333', async (route) => {
            await held;

            return route.fulfill({ contentType: 'image/jpeg', headers: { 'access-control-allow-origin': '*' }, body: 'jpeg' });
        });

        await openLightbox(page);
        const button = lightbox(page).getByRole('button', { name: 'Download' });
        await button.click();
        await lightbox(page).getByRole('menuitem', { name: 'Original (5000 × 3333)' }).click();

        await expect(button).toHaveAttribute('aria-busy', 'true');
        await expect(button.locator('.animate-spin')).toBeVisible();

        const download = page.waitForEvent('download');
        release();
        expect((await download).suggestedFilename()).toBe('fjord-from-above.jpg');

        await expect(button).toHaveAttribute('aria-busy', 'false');
        await expect(button.locator('.animate-spin')).toHaveCount(0);
    });

    test('closes the menu on Escape and keeps the lightbox open', async ({ page }) => {
        await openLightbox(page);
        await lightbox(page).getByRole('button', { name: 'Download' }).click();
        await expect(lightbox(page).getByRole('menu')).toBeVisible();

        await page.keyboard.press('Escape');

        await expect(lightbox(page).getByRole('menu')).toBeHidden();
        await expect(lightbox(page)).toBeVisible();
    });

    test('closes the menu on a click beside it', async ({ page }) => {
        await openLightbox(page);
        await lightbox(page).getByRole('button', { name: 'Download' }).click();
        await expect(lightbox(page).getByRole('menu')).toBeVisible();

        await lightbox(page).getByRole('button', { name: 'Next image' }).click();

        await expect(lightbox(page).getByRole('menu')).toBeHidden();
    });
});

test.describe('video', () => {
    const media = (page) => page.locator('#media');
    const inline = (page) => page.locator('#inline');

    async function openVideo(page) {
        await media(page).getByRole('button', { name: 'Video 2' }).click();
        await expect(media(page).locator('span.tabular-nums')).toHaveText('2 / 3');
        await media(page).locator('[style*="transition: none"]').first().waitFor();
        await media(page).click({ position: { x: 120, y: 80 } });
        await expect(lightbox(page)).toBeVisible();
    }

    test('names a video in the thumbnail strip', async ({ page }) => {
        const thumbnails = media(page).locator('.ilg-thumbnails button');

        await expect(thumbnails.nth(0)).toHaveAttribute('aria-label', 'Image 1');
        await expect(thumbnails.nth(1)).toHaveAttribute('aria-label', 'Video 2');
    });

    test('opens a video playing in the lightbox, without zoom', async ({ page }) => {
        await openVideo(page);

        await expect(lightbox(page).locator('video.ilg-video')).toHaveJSProperty('paused', false);
        await expect(lightbox(page).getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
        await expect(lightbox(page).getByRole('button', { name: 'Zoom in' })).toHaveCount(0);
    });

    test('pauses with Space and mutes with M', async ({ page }) => {
        await openVideo(page);
        await expect(lightbox(page).locator('video.ilg-video')).toHaveJSProperty('paused', false);

        await page.keyboard.press('Space');
        await expect(lightbox(page).locator('video.ilg-video')).toHaveJSProperty('paused', true);

        await page.keyboard.press('m');
        await expect(lightbox(page).locator('video.ilg-video')).toHaveJSProperty('muted', true);
        await expect(lightbox(page).getByRole('button', { name: 'Unmute' })).toBeVisible();
    });

    test('seeks where the seek bar is clicked', async ({ page }) => {
        await openVideo(page);
        await expect(lightbox(page).locator('video.ilg-video')).toHaveJSProperty('paused', false);
        await page.keyboard.press('Space');
        await expect(lightbox(page).locator('video.ilg-video')).toHaveJSProperty('paused', true);

        const seek = lightbox(page).getByRole('slider', { name: 'Seek' });
        await seek.click();

        await expect.poll(async () => Number(await seek.getAttribute('aria-valuenow'))).toBeGreaterThan(40);
        expect(Number(await seek.getAttribute('aria-valuenow'))).toBeLessThan(60);
    });

    test('steps frame by frame with comma and period, pausing first', async ({ page }) => {
        await openVideo(page);
        const element = lightbox(page).locator('video.ilg-video');
        const time = () => element.evaluate((video) => video.currentTime);
        await expect.poll(time).toBeGreaterThan(1);

        await page.keyboard.press('.');
        await expect(element).toHaveJSProperty('paused', true);
        const first = await time();

        await page.keyboard.press('.');
        const second = await time();
        expect(second - first).toBeGreaterThan(0.005);
        expect(second - first).toBeLessThan(0.1);

        await page.keyboard.press(',');
        expect(await time()).toBeCloseTo(first, 3);
    });

    test('keeps the arrow keys for stepping and stops the video on leaving it', async ({ page }) => {
        await openVideo(page);
        await expect(lightbox(page).locator('video.ilg-video')).toHaveJSProperty('paused', false);

        await page.keyboard.press('ArrowRight');

        await expect(lightbox(page)).toContainText('3 / 3');
        await expect(lightbox(page).locator('video.ilg-video')).toHaveCount(0);
    });

    test('plays in place when the lightbox is off', async ({ page }) => {
        await inline(page).click({ position: { x: 120, y: 80 } });

        await expect(inline(page).getByLabel('Bee on a flower')).toHaveJSProperty('paused', false);
        await expect(lightbox(page)).toHaveCount(0);
    });
});
