import { test as base, expect } from '@playwright/test';

const origin = 'http://127.0.0.1:8765';
const cartKey = 'list_belanja';
const cappuccino = 'Cappuccino Arabica';
const pahit = 'Pahit Arabica';
const cardSelector = '#baris_produk .product-card';
const test = base.extend({
  browserGuard: [async ({ context }, use) => {
    const errors = [];
    const watch = page => page.on('pageerror', error => errors.push(error.message));
    context.pages().forEach(watch);
    context.on('page', watch);
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    await use();
    expect(errors, 'all opened pages should be free of uncaught JavaScript errors').toEqual([]);
  }, { auto: true }],
});

function product(page, name) {
  return page.locator(cardSelector).filter({ has: page.locator('.card-title', { hasText: name }) });
}

async function openCatalog(page) {
  await page.goto('/produk.html');
  await expect(page.locator(cardSelector)).toHaveCount(9);
}

async function seedCart(page, raw) {
  await page.goto('/index.html');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [cartKey, raw]);
}

async function savedCart(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), cartKey);
}

test('loads all nine local products with external requests blocked', async ({ page }, testInfo) => {
  const dataRequests = [];
  page.on('request', request => {
    if (['fetch', 'xhr'].includes(request.resourceType())) dataRequests.push(request.url());
  });
  await openCatalog(page);
  await expect(page.locator('#catalog-status')).toHaveText('9 produk ditampilkan.');
  expect(dataRequests).toEqual([`${origin}/data.json`]);
  await expect(page.locator('#retry-catalog')).toBeHidden();
  await expect(page.locator('#cart_icon')).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('catalog-desktop.png'), fullPage: true });
});

test('combines category, search and numeric price sorting, then resets an empty search', async ({ page }) => {
  await openCatalog(page);
  await page.locator('#select_kopi').selectOption('milkshake');
  await page.locator('#filter_harga').selectOption('paling_murah');
  await expect(page.locator(`${cardSelector} .card-title`)).toHaveText([
    'Banana Milkshake', 'Chocolate Milkshake', 'Strawberry Milkshake',
  ]);
  await page.locator('#filter_harga').selectOption('paling_mahal');
  await expect(page.locator(`${cardSelector} .card-title`)).toHaveText([
    'Strawberry Milkshake', 'Chocolate Milkshake', 'Banana Milkshake',
  ]);
  await page.locator('#cari-produk').fill(' CHOCOLATE ');
  await expect(page.locator(`${cardSelector} .card-title`)).toHaveText(['Chocolate Milkshake']);
  await page.locator('#select_kopi').selectOption('arabica');
  await expect(page.locator(cardSelector)).toHaveCount(0);
  await expect(page.locator('#produk_not_found')).toBeVisible();
  await page.locator('#reset-filters').click();
  await expect(page.locator(cardSelector)).toHaveCount(9);
  await expect(page.locator('#select_kopi')).toHaveValue('semua');
  await expect(page.locator('#filter_harga')).toHaveValue('');
  await expect(page.locator('#cari-produk')).toHaveValue('');
});

test('adding after a reload preserves the products already saved in the cart', async ({ page }) => {
  await openCatalog(page);
  await product(page, cappuccino).locator('.add-to-cart').click();
  await expect(page.locator('#cart_icon')).toHaveText('1');
  await page.reload();
  await expect(page.locator(cardSelector)).toHaveCount(9);
  await expect(page.locator('#cart_icon')).toHaveText('1');
  await product(page, pahit).locator('.add-to-cart').click();
  await expect(page.locator('#cart_icon')).toHaveText('2');
  expect((await savedCart(page)).map(item => item.nama)).toEqual([cappuccino, pahit]);
  await page.goto('/cart.html');
  await expect(page.locator('#ul_list_produk .cart-item')).toHaveCount(2);
  await expect(page.locator('#subtotal_html')).toHaveText('Rp 300.000');
  await expect(page.locator('#ppn_html')).toHaveText('Rp 30.000');
  await expect(page.locator('#total_html')).toHaveText('Rp 330.000');
});

test('duplicate additions form one quantity and removing one unit persists after reload', async ({ page }) => {
  await openCatalog(page);
  const add = product(page, cappuccino).locator('.add-to-cart');
  await add.click();
  await add.click();
  await expect(page.locator('#cart_icon')).toHaveText('2');
  await page.goto('/cart.html');
  await expect(page.locator('#ul_list_produk .cart-item')).toHaveCount(1);
  await expect(page.locator('#subtotal_html')).toHaveText('Rp 400.000');
  await page.getByRole('button', { name: `Hapus satu ${cappuccino}`, exact: true }).click();
  await expect(page.locator('#subtotal_html')).toHaveText('Rp 200.000');
  await page.reload();
  await expect(page.locator('#ul_list_produk .cart-item')).toHaveCount(1);
  await expect(page.locator('#total_html')).toHaveText('Rp 220.000');
  expect((await savedCart(page))[0].qty).toBe(1);
  await page.getByRole('button', { name: `Hapus satu ${cappuccino}`, exact: true }).click();
  await expect(page.locator('#keteranganharga')).toBeHidden();
  await expect(page.locator('#ul_list_produk')).toContainText('kosong');
});

test('a first visit and unreadable saved carts show a usable empty state', async ({ page }) => {
  await page.goto('/cart.html');
  await expect(page.locator('#ul_list_produk')).toContainText('kosong');
  await expect(page.locator('#keteranganharga')).toBeHidden();
  for (const raw of ['{broken', '{}', 'null']) {
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [cartKey, raw]);
    await page.reload();
    await expect(page.locator('#ul_list_produk .cart-item')).toHaveCount(0);
    await expect(page.locator('#ul_list_produk')).toContainText('kosong');
    await expect(page.locator('#keteranganharga')).toBeHidden();
    await expect(page.locator('#cart-feedback')).toContainText('tidak dapat dibaca');
    expect(await page.evaluate(key => localStorage.getItem(key), cartKey)).toBe(raw);
  }
});

test('a failed catalog request shows an error and can be retried', async ({ page }) => {
  let requests = 0;
  await page.route('**/data.json', route => ++requests === 1
    ? route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }) : route.continue());
  await page.goto('/produk.html');
  await expect(page.locator('#catalog-status')).toContainText('belum dapat dimuat');
  await expect(page.locator('#retry-catalog')).toBeVisible();
  await expect(page.locator(cardSelector)).toHaveCount(0);
  await page.locator('#cari-produk').fill('Chocolate');
  await page.locator('#select_kopi').selectOption('milkshake');
  await page.locator('#filter_harga').selectOption('paling_mahal');
  await expect(page.locator('#catalog-status')).toContainText('belum dapat dimuat');
  await expect(page.locator('#retry-catalog')).toBeVisible();
  await page.locator('#retry-catalog').click();
  await expect(page.locator(`${cardSelector} .card-title`)).toHaveText(['Chocolate Milkshake']);
  await expect(page.locator('#retry-catalog')).toBeHidden();
  await page.locator('#cari-produk').fill('');
  await page.locator('#select_kopi').selectOption('semua');
  await expect(page.locator(cardSelector)).toHaveCount(9);
  expect(requests).toBe(2);
});

test('catalog and legacy cart names remain text while unsafe image protocols use a fallback', async ({ page }) => {
  const name = '<img src=x onerror="window.__xss=true"> O\'Neil';
  const hostile = { nama: name, foto: 'javascript:window.__xss=true', harga: '10.000', qty: 1 };
  await page.addInitScript(() => { window.__xss = false; });
  await page.route('**/data.json', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ arabica: [hostile] }),
  }));
  await page.goto('/produk.html');
  await expect(page.locator(`${cardSelector} .card-title`)).toHaveText(name);
  await expect(page.locator(`${cardSelector} .card-title img`)).toHaveCount(0);
  await expect(page.locator(`${cardSelector} .product-image`)).toHaveAttribute('data-fallback', 'true');
  expect(await page.evaluate(() => window.__xss)).toBe(false);
  await page.evaluate(([key, rows]) => localStorage.setItem(key, JSON.stringify(rows)), [cartKey, [hostile]]);
  await page.goto('/cart.html');
  await expect(page.locator('.cart-item .item-name')).toHaveText(name);
  await expect(page.locator('.cart-item .item-name img')).toHaveCount(0);
  await expect(page.locator('.cart-item img')).toHaveAttribute('src', 'images/logo/logo_kuy.png');
  expect(await page.evaluate(() => window.__xss)).toBe(false);
});

test('a storage write failure reports failure without changing the badge or saved cart', async ({ page }) => {
  await openCatalog(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'QuotaExceededError'); };
  });
  await product(page, cappuccino).locator('.add-to-cart').click();
  await expect(page.locator('#cart-feedback')).toHaveAttribute('data-tone', 'error');
  await expect(page.locator('#cart-feedback')).toContainText('Produk belum ditambahkan.');
  await expect(page.locator('#cart_icon')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), cartKey)).toBeNull();
});

test('cart changes synchronize to another open tab through storage events', async ({ page, context }) => {
  await openCatalog(page);
  const other = await context.newPage();
  await openCatalog(other);
  await product(page, cappuccino).locator('.add-to-cart').click();
  await expect(other.locator('#cart_icon')).toHaveText('1');
  await other.goto('/cart.html');
  await other.getByRole('button', { name: `Hapus satu ${cappuccino}`, exact: true }).click();
  await expect(page.locator('#cart_icon')).toBeHidden();
  await expect(other.locator('#keteranganharga')).toBeHidden();
});

test('mobile navigation works and all three pages fit narrow viewports', async ({ page }, testInfo) => {
  await seedCart(page, JSON.stringify([{ nama: cappuccino, foto: 'images/produk/product_capuchino.jpg', hargaint: 200000, qty: 2 }]));
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/index.html', '/produk.html', '/cart.html']) {
      await page.goto(path);
      if (path === '/produk.html') await expect(page.locator(cardSelector)).toHaveCount(9);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
        { message: `${path} should fit a ${width}px viewport` }).toBeLessThanOrEqual(1);
      if (path !== '/index.html') {
        const toggle = page.getByRole('button', { name: 'Buka navigasi' });
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#navbarNav11')).toBeVisible();
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      }
      if (width === 390) {
        await page.screenshot({ path: testInfo.outputPath(`${path.slice(1, -5)}-mobile.png`), fullPage: true });
      }
    }
  }
});
