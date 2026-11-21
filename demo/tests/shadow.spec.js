import { expect, test } from '@playwright/test';

const lightbox = (page) => page.getByRole('dialog');
const counter = (page) => lightbox(page).locator('span.tabular-nums');
const shadowActiveLabel = (page) => page.evaluate(() => document.getElementById('host').shadowRoot.activeElement?.getAttribute('aria-label') ?? null);

test.beforeEach(async ({ page }) => {
    await page.goto('/shadow.html');
    await page.locator('#open').click();
    await expect(lightbox(page)).toBeVisible();
    await page.evaluate(() => (window.pageKeys = []));
});

test.describe('lightbox in a shadow root', () => {
    test('renders into the given element inside the shadow root', async ({ page }) => {
        const placement = await page.evaluate(() => ({
            inShadow: !!document.getElementById('host').shadowRoot.querySelector('[role="dialog"]'),
            inBody: !!document.body.querySelector(':scope > [role="dialog"], :scope > * > [role="dialog"]'),
        }));

        expect(placement).toEqual({ inShadow: true, inBody: false });
    });

    test('keeps the keys it handles away from the page', async ({ page }) => {
        await page.keyboard.press('ArrowRight');
        await expect(counter(page)).toHaveText('2 / 3');

        await page.keyboard.press('a');

        expect(await page.evaluate(() => window.pageKeys)).toEqual(['document:a', 'window:a']);
    });

    test('keeps the focus inside while tabbing', async ({ page }) => {
        const last = await page.evaluate(() => {
            const buttons = [...document.getElementById('host').shadowRoot.querySelectorAll('[role="dialog"] button')].filter((button) => button.offsetParent !== null);

            return buttons.at(-1).getAttribute('aria-label');
        });

        await lightbox(page).getByRole('button', { name: last }).focus();
        await page.keyboard.press('Tab');
        const first = await shadowActiveLabel(page);

        expect(first).not.toBe(last);
        await page.keyboard.press('Shift+Tab');
        expect(await shadowActiveLabel(page)).toBe(last);
        expect(await page.evaluate(() => window.pageKeys.filter((key) => key.endsWith('Tab')))).toEqual([]);
    });

    test('shows the exit button while in full screen', async ({ page }) => {
        await lightbox(page).getByRole('button', { name: 'Full screen' }).click();
        await expect(lightbox(page).getByRole('button', { name: 'Exit full screen' })).toBeVisible();

        await lightbox(page).getByRole('button', { name: 'Exit full screen' }).click();
        await expect(lightbox(page).getByRole('button', { name: 'Full screen' })).toBeVisible();
    });

    test('picks a size from the download menu', async ({ page }) => {
        await lightbox(page).getByRole('button', { name: 'Download' }).click();
        const download = page.waitForEvent('download');
        await lightbox(page).getByRole('menuitem', { name: 'Small' }).click();

        expect((await download).suggestedFilename()).toBe('swatch-1-small.svg');
    });

    test('closes on Escape', async ({ page }) => {
        await page.keyboard.press('Escape');
        await expect(lightbox(page)).toBeHidden();
        expect(await page.evaluate(() => window.pageKeys)).toEqual([]);
    });
});
