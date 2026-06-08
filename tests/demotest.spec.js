import { test, expect } from '@playwright/test';

test.beforeEach('login', async ({page}) => {
    await page.goto('https://www.saucedemo.com/');
    await page.locator('[data-test="username"]').dblclick();
    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').dblclick();
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();
})

test.afterEach('logout', async ({page}) => {
    await page.getByRole('button', { name: 'Open Menu' }).click();
    await page.locator('[data-test="logout-sidebar-link"]').click();
})

test('test2', async ({ page }) => {
    await expect(page.locator('[data-test="add-to-cart-sauce-labs-backpack"]')).toBeVisible();
    await expect(page.locator('[data-test="item-4-title-link"] [data-test="inventory-item-name"]')).toContainText('Sauce Labs Backpack');
    await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
    await page.locator('[data-test="shopping-cart-link"]').click();
    await expect(page.locator('[data-test="remove-sauce-labs-backpack"]')).toBeVisible();
    await page.locator('[data-test="remove-sauce-labs-backpack"]').click();
})