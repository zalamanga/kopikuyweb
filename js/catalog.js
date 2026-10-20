import { addToCart, cartTotals, formatRupiah, normalizeCatalog } from './store.js';
import { readSavedCart, saveCart, setProductImage, showMessage } from './browser-store.js';

const grid = document.getElementById('baris_produk');
const category = document.getElementById('select_kopi');
const search = document.getElementById('cari-produk');
const sort = document.getElementById('filter_harga');
const status = document.getElementById('catalog-status');
const feedback = document.getElementById('cart-feedback');
const empty = document.getElementById('produk_not_found');
const retry = document.getElementById('retry-catalog');
const badge = document.getElementById('cart_icon');
let products = [];
let catalogState = 'loading';

function updateBadge() {
  const saved = readSavedCart();
  try {
    const count = cartTotals(saved.items).count;
    badge.textContent = String(count);
    badge.hidden = count === 0;
    if (saved.notice) showMessage(feedback, saved.notice, 'error');
  } catch {
    badge.hidden = true;
    showMessage(feedback, 'Isi keranjang tidak valid. Gunakan keranjang baru untuk melanjutkan.', 'error');
  }
}

function productCard(product) {
  const column = document.createElement('div');
  column.className = 'col';
  const card = document.createElement('article');
  card.className = 'card product-card';
  card.dataset.price = String(product.hargaint);
  const image = document.createElement('img');
  image.className = 'card-img-top product-image';
  image.loading = 'lazy';
  setProductImage(image, product.foto, product.nama);
  const body = document.createElement('div');
  body.className = 'card-body';
  const title = document.createElement('h2');
  title.className = 'h5 card-title';
  title.textContent = product.nama;
  const size = document.createElement('p');
  size.className = 'text-muted';
  size.textContent = product.size;
  const price = document.createElement('p');
  price.className = 'fw-bold';
  price.textContent = `Rp ${formatRupiah(product.hargaint)}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-success w-100 add-to-cart';
  button.textContent = 'Tambah ke keranjang';
  button.setAttribute('aria-label', `Tambah ${product.nama} ke keranjang`);
  button.addEventListener('click', () => {
    try {
      const next = addToCart(readSavedCart().items, product);
      cartTotals(next);
      saveCart(next);
      updateBadge();
      showMessage(feedback, `${product.nama} ditambahkan ke keranjang.`);
    } catch {
      showMessage(feedback, 'Produk belum ditambahkan. Periksa izin penyimpanan browser dan batas jumlah 999 per produk.', 'error');
    }
  });
  body.append(title, size, price, button);
  card.append(image, body);
  column.append(card);
  return column;
}

function renderProducts() {
  if (catalogState !== 'ready') return;
  const keyword = search.value.trim().toLocaleLowerCase('id-ID');
  const visible = products.filter(product =>
    (category.value === 'semua' || product.category === category.value)
    && product.nama.toLocaleLowerCase('id-ID').includes(keyword));
  if (sort.value === 'paling_murah') visible.sort((a, b) => a.hargaint - b.hargaint);
  if (sort.value === 'paling_mahal') visible.sort((a, b) => b.hargaint - a.hargaint);
  grid.replaceChildren(...visible.map(productCard));
  empty.hidden = visible.length !== 0;
  status.textContent = `${visible.length} produk ditampilkan.`;
}

async function loadCatalog() {
  catalogState = 'loading';
  retry.hidden = true;
  empty.hidden = true;
  grid.replaceChildren();
  status.textContent = 'Memuat katalog...';
  grid.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error('Catalog unavailable');
    const raw = await response.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid catalog');
    products = normalizeCatalog(raw);
    catalogState = 'ready';
    renderProducts();
  } catch {
    catalogState = 'error';
    products = [];
    status.textContent = 'Katalog belum dapat dimuat. Jalankan situs melalui server HTTP, lalu coba lagi.';
    retry.hidden = false;
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}

document.getElementById('product-filter').addEventListener('submit', event => event.preventDefault());
for (const control of [category, sort]) control.addEventListener('change', renderProducts);
search.addEventListener('input', renderProducts);
document.getElementById('reset-filters').addEventListener('click', () => {
  search.value = '';
  category.value = 'semua';
  sort.value = '';
  renderProducts();
  search.focus();
});
document.getElementById('back-top').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
retry.addEventListener('click', loadCatalog);
window.addEventListener('storage', updateBadge);
updateBadge();
loadCatalog();
