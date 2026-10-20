import { cartTotals, formatRupiah, removeOne } from './store.js';
import { readSavedCart, saveCart, setProductImage, showMessage } from './browser-store.js';

const list = document.getElementById('ul_list_produk');
const summary = document.getElementById('keteranganharga');
const feedback = document.getElementById('cart-feedback');

function cartItem(item) {
  const row = document.createElement('li');
  row.className = 'list-group-item cart-item';
  const image = document.createElement('img');
  setProductImage(image, item.foto, item.nama);
  const details = document.createElement('div');
  const name = document.createElement('h2');
  name.className = 'h6 item-name';
  name.textContent = item.nama;
  const quantity = document.createElement('p');
  quantity.className = 'small mb-0';
  quantity.textContent = `Rp ${formatRupiah(item.hargaint)} × ${item.qty}`;
  details.append(name, quantity);
  const total = document.createElement('span');
  total.className = 'fw-bold item-total';
  total.textContent = `Rp ${formatRupiah(item.hargaint * item.qty)}`;
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'btn btn-outline-danger btn-sm';
  remove.textContent = 'Hapus satu';
  remove.setAttribute('aria-label', `Hapus satu ${item.nama}`);
  remove.addEventListener('click', () => {
    try {
      saveCart(removeOne(readSavedCart().items, item.id));
      renderCart();
      showMessage(feedback, `Satu ${item.nama} dihapus dari keranjang.`);
    } catch {
      showMessage(feedback, 'Perubahan belum tersimpan. Periksa izin penyimpanan browser.', 'error');
    }
  });
  row.append(image, details, total, remove);
  return row;
}

function renderCart() {
  const saved = readSavedCart();
  list.replaceChildren();
  showMessage(feedback, saved.notice, saved.notice ? 'error' : '');
  try {
    const totals = cartTotals(saved.items);
    summary.hidden = saved.items.length === 0;
    if (summary.hidden) {
      const empty = document.createElement('li');
      empty.className = 'list-group-item empty-state';
      empty.append('Keranjang belanja Anda kosong. ');
      const link = document.createElement('a');
      link.href = 'produk.html';
      link.textContent = 'Pilih produk';
      empty.append(link);
      list.append(empty);
    } else {
      list.append(...saved.items.map(cartItem));
    }
    for (const [id, value] of [['subtotal_html', totals.subtotal], ['ppn_html', totals.tax], ['total_html', totals.total]]) {
      document.getElementById(id).textContent = `Rp ${formatRupiah(value)}`;
    }
  } catch {
    summary.hidden = true;
    showMessage(feedback, 'Nilai keranjang tersimpan tidak valid dan tidak dapat dihitung.', 'error');
  }
}

window.addEventListener('storage', renderCart);
renderCart();
