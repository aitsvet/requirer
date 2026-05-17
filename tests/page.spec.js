import { test, expect } from '@playwright/test';

const MOCK_LLM = {
    choices: [{ text: '+ Code req A\n+ Code req B\n- Other req X\n- Other req Y' }],
    usage: { total_tokens: 50 },
    model: 'test-model',
};

test.beforeEach(async ({ page }) => {
    await page.route('http://localhost:11434/v1/models', route =>
        route.fulfill({ json: { data: [{ id: 'test-model' }] } }));
    await page.route('http://localhost:11434/v1/completions', route =>
        route.fulfill({ json: MOCK_LLM }));
    await page.goto('/');
    await page.waitForSelector('#sections-table', { state: 'visible' });
});

// Use > tr to exclude rows inside nested markdown tables
const rows = page => page.locator('#sections-tbody > tr');
// Use :scope > td to exclude cells inside nested markdown tables
const cell = (row, n) => row.locator(':scope > td').nth(n);

test('renders 3 rows from sample.md', async ({ page }) => {
    await expect(rows(page)).toHaveCount(3);
});

test('section title expands and collapses content', async ({ page }) => {
    const container = page.locator('.source-content-container').first();
    await expect(container).toBeHidden();
    await page.locator('.collapsible-title').first().click();
    await expect(container).toBeVisible();
    await page.locator('.collapsible-title').first().click();
    await expect(container).toBeHidden();
});

test('expand all then collapse all', async ({ page }) => {
    await page.locator('#expand-all-btn').click();
    for (const c of await page.locator('.source-content-container').all()) {
        await expect(c).toBeVisible();
    }
    await page.locator('#collapse-all-btn').click();
    for (const c of await page.locator('.source-content-container').all()) {
        await expect(c).toBeHidden();
    }
});

test('process single section populates code and other cells', async ({ page }) => {
    await page.locator('#prompt-textarea').fill('Analyze: {source}');
    const firstRow = rows(page).first();
    await firstRow.locator('.run-btn').first().click();
    await expect(cell(firstRow, 2)).toContainText('Code req A', { timeout: 5000 });
    await expect(cell(firstRow, 3)).toContainText('Other req X', { timeout: 5000 });
});

test('process section and below populates all rows', async ({ page }) => {
    await page.locator('#prompt-textarea').fill('Analyze: {source}');
    await rows(page).first().locator('.run-btn').nth(1).click();
    for (let i = 0; i < 3; i++) {
        await expect(cell(rows(page).nth(i), 2)).toContainText('Code req A', { timeout: 15000 });
    }
});

test('download JSON triggers file with correct name', async ({ page }) => {
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#download-json').click(),
    ]);
    expect(download.suggestedFilename()).toBe('requirer.json');
});

test('download MD triggers file with correct name', async ({ page }) => {
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#download-md-btn').click(),
    ]);
    expect(download.suggestedFilename()).toBe('requirer.md');
});

test('upload MD rerenders table with new sections', async ({ page }) => {
    const md = '# New Section\n\nNew content here.\n\n# Another Section\n\nMore content.\n';
    page.once('dialog', d => d.accept());
    await page.locator('#upload-md-input').setInputFiles({
        name: 'test.md', mimeType: 'text/markdown',
        buffer: Buffer.from(md),
    });
    await expect(rows(page)).toHaveCount(2);
    await expect(page.locator('.collapsible-title').first()).toContainText('New Section');
});

test('upload JSON applies code and other to matching sections', async ({ page }) => {
    const sections = JSON.parse(await page.locator('#json-output').textContent());
    sections[0].code = ['Injected code req'];
    sections[0].other = ['Injected other req'];
    page.once('dialog', d => d.accept());
    await page.locator('#upload-json-input').setInputFiles({
        name: 'data.json', mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(sections)),
    });
    const firstRow = rows(page).first();
    await expect(cell(firstRow, 2)).toContainText('Injected code req');
    await expect(cell(firstRow, 3)).toContainText('Injected other req');
});

test('upload JSON with wrong section count is rejected', async ({ page }) => {
    const wrong = JSON.stringify([{ title: 'One', source: [], code: [], other: [] }]);
    const dialog = page.waitForEvent('dialog');
    await page.locator('#upload-json-input').setInputFiles({
        name: 'bad.json', mimeType: 'application/json',
        buffer: Buffer.from(wrong),
    });
    await (await dialog).accept();
    await expect(rows(page)).toHaveCount(3);
});
