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
