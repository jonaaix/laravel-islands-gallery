import { defineConfig, devices } from '@playwright/test';

const port = 5180;

export default defineConfig({
    testDir: './tests',
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: `http://localhost:${port}`,
        launchOptions: { executablePath: process.env.CHROME_PATH || undefined, ignoreDefaultArgs: ['--hide-scrollbars'] },
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: `npx vite --port ${port} --strictPort`,
        url: `http://localhost:${port}`,
        reuseExistingServer: !process.env.CI,
    },
});
