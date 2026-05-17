import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    use: {
        baseURL: 'http://localhost:3001',
    },
    webServer: {
        command: 'python3 -m http.server 3001',
        port: 3001,
        reuseExistingServer: !process.env.CI,
    },
});
