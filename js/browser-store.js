import { normalizeCart } from './store.js';

const CART_KEY = 'list_belanja';

export function readSavedCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
    if (!Array.isArray(raw)) throw new Error('Invalid cart');
    return { items: normalizeCart(raw), notice: '' };
  } catch {
    return { items: [], notice: 'Keranjang tersimpan tidak dapat dibaca. Periksa izin penyimpanan browser atau tambahkan produk untuk membuat keranjang baru.' };
  }
}

export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(normalizeCart(items)));
}

export function showMessage(element, text, tone = '') {
  element.textContent = text;
  element.dataset.tone = tone;
}

export function setProductImage(image, source, name) {
  const fallback = () => {
    image.dataset.fallback = 'true';
    image.alt = `Gambar ${name} belum tersedia`;
    image.src = 'images/logo/logo_kuy.png';
  };
  image.alt = name;
  image.addEventListener('error', fallback, { once: true });
  try {
    const url = new URL(source, window.location.href);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid image URL');
    image.src = url.href;
  } catch {
    fallback();
  }
}
