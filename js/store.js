const MAX_QUANTITY = 999;
const rupiah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function parsePrice(raw) {
  let value = raw;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!/^(?:[0-9]+|[0-9]{1,3}(?:\.[0-9]{3})+)$/.test(text)) {
      throw new TypeError("Harga harus berupa bilangan rupiah bulat.");
    }
    value = Number(text.replaceAll(".", ""));
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("Harga berada di luar rentang rupiah yang didukung.");
  }
  return value === 0 ? 0 : value;
}

export function formatRupiah(value) {
  return rupiah.format(parsePrice(value));
}

function normalizeItem(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)
      || typeof raw.nama !== "string" || typeof raw.foto !== "string") {
    return null;
  }
  const nama = raw.nama.trim();
  const foto = raw.foto.trim();
  if (!nama || !foto) return null;
  let hargaint;
  try {
    hargaint = parsePrice(raw.hargaint ?? raw.harga);
  } catch {
    return null;
  }
  return {
    id: JSON.stringify([nama, foto, hargaint]),
    nama,
    foto,
    size: typeof raw.size === "string" ? raw.size.trim() : "",
    harga: formatRupiah(hargaint),
    hargaint,
  };
}

export function normalizeCatalog(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const products = new Map();
  for (const [category, rows] of Object.entries(raw)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const product = normalizeItem(row);
      if (!product || products.has(product.id)) continue;
      products.set(product.id, {
        ...product,
        category,
        link: typeof row.link === "string" ? row.link.trim() : "",
      });
    }
  }
  return [...products.values()];
}

export function normalizeCart(raw) {
  if (!Array.isArray(raw)) return [];
  const cart = new Map();
  for (const row of raw) {
    const item = normalizeItem(row);
    if (!item) continue;
    const qty = row.qty === undefined ? 1 : row.qty;
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) continue;
    const existing = cart.get(item.id);
    if (existing) {
      existing.qty = Math.min(MAX_QUANTITY, existing.qty + qty);
    } else {
      cart.set(item.id, { ...item, qty });
    }
  }
  return [...cart.values()];
}

export function addToCart(cart, product) {
  const next = normalizeCart(cart);
  const item = normalizeItem(product);
  if (!item) throw new TypeError("Produk tidak valid.");
  const existing = next.find((row) => row.id === item.id);
  if (existing) {
    if (existing.qty === MAX_QUANTITY) {
      throw new RangeError("Jumlah maksimum per produk adalah 999.");
    }
    existing.qty++;
  } else {
    next.push({ ...item, qty: 1 });
  }
  return next;
}

export function removeOne(cart, id) {
  const next = normalizeCart(cart);
  const index = next.findIndex((row) => row.id === id);
  if (index === -1) return next;
  if (next[index].qty > 1) next[index].qty--;
  else next.splice(index, 1);
  return next;
}

function safeInteger(value) {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError("Total keranjang berada di luar rentang rupiah yang didukung.");
  }
  return value;
}

export function cartTotals(cart) {
  let subtotal = 0;
  let count = 0;
  for (const item of normalizeCart(cart)) {
    subtotal = safeInteger(subtotal + safeInteger(item.hargaint * item.qty));
    count = safeInteger(count + item.qty);
  }
  // This preserves the original demo's 10% surcharge, rounded once to whole rupiah.
  const tax = Math.round(subtotal / 10);
  const total = safeInteger(subtotal + tax);
  return { subtotal, tax, total, count };
}
