import {test, expect} from '@playwright/test';

test.describe('Auction test', () => {

    test('test_01', async ({page}) => {
        await page.goto('http://localhost:3000/');
        await expect(page.getByRole('link', { name: '🔨 AuctionRFQ' })).toBeVisible();
        await expect(page.getByText('British Auction System')).toBeVisible();
        await expect(page.getByRole('button', { name: '+ New RFQ' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'View →' })).toBeVisible();
    })

    test('test_02', async ({page}) => {
        await page.goto('http://localhost:3000/');
        await page.getByRole('button', { name: '+ New RFQ' }).click();

        await page.getByRole('textbox', { name: 'e.g. Hyderabad to Chennai Q2' }).click();
        await page.getByRole('textbox', { name: 'e.g. Hyderabad to Chennai Q2' }).fill('hyd to chennai');

        await page.locator('input[type="datetime-local"]').nth(0).fill('2026-06-09T13:00');
        await page.locator('input[type="datetime-local"]').nth(1).fill('2026-06-09T14:00');
        await page.locator('input[type="datetime-local"]').nth(2).fill('2026-06-09T15:00');

        await page.getByRole('spinbutton').first().click();
        await page.getByRole('spinbutton').first().fill('10');
        await page.getByRole('spinbutton').nth(1).click();
        await page.getByRole('spinbutton').nth(1).fill('5');
        await page.getByRole('radio', { name: 'Any bid in last X minutes' }).check();
        await page.getByRole('button', { name: 'Create RFQ' }).click();

        await expect(page.getByText('hyd to chennai')).toBeVisible();
    })

    test('test_03', async ({page}) => {
        await page.goto('http://localhost:3000/');
        await page.getByRole('cell', { name: 'View →' }).first().click();

        const activateBtn = page.getByRole('button', { name: '▶ Activate Auction' });

        if(await activateBtn.count() > 0) {
            await activateBtn.click();
        }

        await expect(page.getByText('Active')).toBeVisible();


        await page.getByRole('textbox', { name: 'e.g. Blue Dart Logistics' }).click();
        await page.getByRole('textbox', { name: 'e.g. Blue Dart Logistics' }).fill('Rith');
        await page.getByPlaceholder('0').first().click();
        await page.getByPlaceholder('0').first().fill('65000');
        await page.getByPlaceholder('0').nth(1).click();
        await page.getByPlaceholder('0').nth(1).fill('1500');
        await page.getByPlaceholder('0').nth(2).click();
        await page.getByPlaceholder('0').nth(2).fill('2500');
        await page.getByRole('button', { name: '🔨 Submit Bid' }).click();

        const L1Row = page.getByRole('row').filter({hasText: 'L6'});
        await expect(L1Row.getByText('Rith')).toBeVisible();
    })

    test('test_04', async ({page}) => {
        await page.goto('http://localhost:3000/');
        await page.getByRole('cell', { name: 'View →' }).first().click();

        await expect(page.getByText('active')).toBeVisible();

        //bid A
        await page.getByRole('textbox', { name: 'e.g. Blue Dart Logistics' }).click();
        await page.getByRole('textbox', { name: 'e.g. Blue Dart Logistics' }).fill('Radha');
        await page.getByPlaceholder('0').first().click();
        await page.getByPlaceholder('0').first().fill('50000');
        await page.getByPlaceholder('0').nth(1).click();
        await page.getByPlaceholder('0').nth(1).fill('500');
        await page.getByPlaceholder('0').nth(2).click();
        await page.getByPlaceholder('0').nth(2).fill('1000');

        await page.getByRole('button', { name: '🔨 Submit Bid' }).click();

        //bid B
        await page.getByRole('textbox', { name: 'e.g. Blue Dart Logistics' }).click();
        await page.getByRole('textbox', { name: 'e.g. Blue Dart Logistics' }).fill('Krishna');
        await page.getByPlaceholder('0').first().click();
        await page.getByPlaceholder('0').first().fill('45000');
        await page.getByPlaceholder('0').nth(1).click();
        await page.getByPlaceholder('0').nth(1).fill('500');
        await page.getByPlaceholder('0').nth(2).click();
        await page.getByPlaceholder('0').nth(2).fill('1000');

        await page.getByRole('button', { name: '🔨 Submit Bid' }).click();

        // L1 place -> krishna
        const L1Row = page.getByRole('row').filter({hasText: 'L1'});
        await expect.soft(L1Row.getByText('Krishna')).toBeVisible();

        const L2Row = page.getByRole('row').filter({hasText: 'L2'});
        await expect.soft(L2Row.getByText('Radha')).toBeVisible();

        await expect.soft(L1Row).toContainText('46,500');
    })

    test('test_05', async ({page}) => {
        await page.goto('http://localhost:3000/');
        await page.getByRole('button', { name: '+ New RFQ' }).click();
        await page.getByRole('textbox', { name: 'e.g. Hyderabad to Chennai Q2' }).click();
        await page.getByRole('textbox', { name: 'e.g. Hyderabad to Chennai Q2' }).fill('bad auction');

        await page.locator('input[type="datetime-local"]').nth(0).fill('2026-06-09T13:00'); 
        await page.locator('input[type="datetime-local"]').nth(1).fill('2026-06-09T15:00'); 
        await page.locator('input[type="datetime-local"]').nth(2).fill('2026-06-09T14:00');
        
        await page.getByRole('spinbutton').first().fill('11');
        await page.getByRole('spinbutton').nth(1).click();
        await page.getByRole('spinbutton').nth(1).fill('6');
        await page.getByRole('radio', { name: 'Any rank change in last X' }).check();
        await page.getByRole('button', { name: 'Create RFQ' }).click();
    })
})
