import { expect, test } from '@playwright/test'

async function registerNewShopper(page) {
  const email = `e2e-${Date.now()}@example.com`
  await page.goto('/register')
  await page.getByLabel('First name').fill('End')
  await page.getByLabel('Last name').fill('ToEnd')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('Checkout-2767!')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

async function addFirstProductToBag(page) {
  await page.goto('/shop')
  await page.locator('a[href^="/product/"]').first().click()
  await page.getByRole('button', { name: 'Add to bag' }).click()
}

async function payWith(page, testCardLabel) {
  await page.getByText('No real cards - use a test number').click()
  await page.getByRole('button', { name: testCardLabel }).click()
  await page.getByRole('button', { name: 'Pay and place order' }).click()
}

test('shop lists products from the API', async ({ page }) => {
  await page.goto('/shop')
  await expect(page.locator('a[href^="/product/"]').first()).toBeVisible()
})

test('new shopper registers, buys a product and sees the confirmation', async ({ page }) => {
  await registerNewShopper(page)
  await addFirstProductToBag(page)
  await payWith(page, /4242 4242 4242 4242/)

  await expect(page).toHaveURL(/\/order\/success\/\d+/)
  await expect(page.getByRole('heading', { name: 'Thank you for your order' })).toBeVisible()
})

test('declined card shows the reason and keeps the bag', async ({ page }) => {
  await registerNewShopper(page)
  await addFirstProductToBag(page)
  await payWith(page, /4000 0000 0000 0002/)

  await expect(page.getByText('Your card was declined.').first()).toBeVisible()
  await expect(page).not.toHaveURL(/\/order\/success/)
  await expect(page.getByRole('button', { name: /Shopping bag, 1 item/ })).toBeVisible()
})