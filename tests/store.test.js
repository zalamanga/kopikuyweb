import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePrice, formatRupiah, normalizeCatalog, normalizeCart,
  addToCart, removeOne, cartTotals,
} from "../js/store.js";

const coffee = {
  nama: "Latte Arabica", foto: "images/latte.jpg", size: "150 Gram", harga: "100.000",
};
const milkshake = {
  nama: "Milkshake", foto: "images/milkshake.jpg", size: "400 Gram", harga: "95.000",
};

test("parses plain and grouped integer rupiah without floating-point currency conversion", () => {
  for (const [raw, expected] of [["100.000", 100000], ["95000", 95000],
    ["1.000.000", 1000000], [" 10.000 ", 10000], ["0", 0], [0, 0], [15000, 15000]]) {
    assert.equal(parsePrice(raw), expected);
  }
  assert.equal(parsePrice(String(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
  assert.equal(formatRupiah(1000000), "1.000.000");
  assert.equal(formatRupiah(0), "0");
  assert.equal(parsePrice(-0), 0);
  assert.equal(formatRupiah(-0), "0");
});

test("rejects negative, fractional, nonfinite, malformed and unsafe prices", () => {
  for (const raw of [NaN, Infinity, -Infinity, -1, 1.5, "", " ", "-1", "1.5", "1.00",
    "10.00.000", "1,000", "Rp 10.000", "1e3", null, undefined, true, [], {},
    "9007199254740992", Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => parsePrice(raw));
  }
});

test("normalizes categories, deduplicates products and exposes numeric prices for sorting", () => {
  const raw = { arabica: [coffee, { ...coffee }], milkshake: [milkshake], ignored: null };
  const before = JSON.stringify(raw);
  const catalog = normalizeCatalog(raw);
  assert.equal(catalog.length, 2);
  assert.deepEqual(catalog.map((item) => item.category), ["arabica", "milkshake"]);
  assert.equal(catalog[0].nama, coffee.nama);
  assert.equal(catalog[0].foto, coffee.foto);
  assert.equal(catalog[0].size, coffee.size);
  assert.deepEqual(catalog.sort((a, b) => a.hargaint - b.hargaint).map((item) => item.hargaint), [95000, 100000]);
  assert.equal(JSON.stringify(raw), before);
});

test("skips invalid catalog data and keeps apostrophes as product data", () => {
  const catalog = normalizeCatalog({ arabica: [null, {}, { ...coffee, harga: "1.2" },
    { ...coffee, nama: " O'Neil Latte " }] });
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].nama, "O'Neil Latte");
  for (const invalid of [null, [], "data", 10]) assert.deepEqual(normalizeCatalog(invalid), []);
});

test("migrates expanded legacy rows and aggregated quantities to one stable product identity", () => {
  const legacy = [{ ...coffee, qty: 1, hargaint: 100000 }, { ...coffee },
    { ...coffee, qty: 3 }, { ...milkshake, qty: 2 }];
  const before = JSON.stringify(legacy);
  const cart = normalizeCart(legacy);
  assert.deepEqual(cart.map((item) => item.qty), [5, 2]);
  assert.equal(cart[0].id, normalizeCatalog({ arabica: [coffee] })[0].id);
  assert.equal(cart[0].harga, "100.000");
  assert.deepEqual(normalizeCart(JSON.parse(JSON.stringify(cart))), cart);
  assert.equal(JSON.stringify(legacy), before);
});

test("same name with a different photo or price remains a separate cart product", () => {
  const cart = normalizeCart([coffee, { ...coffee, foto: "images/another.jpg" },
    { ...coffee, harga: "110.000" }, { ...coffee, nama: ` ${coffee.nama} ` }]);
  assert.equal(cart.length, 3);
  assert.deepEqual(cart.map((item) => item.qty), [2, 1, 1]);
  const forged = normalizeCart([{ ...coffee, id: "caller-supplied" }]);
  assert.notEqual(forged[0].id, "caller-supplied");
});

test("malformed cart rows are skipped without mutating or crashing on raw data", () => {
  for (const invalid of [null, undefined, {}, "[]", 1]) assert.deepEqual(normalizeCart(invalid), []);
  const badRows = [null, [], {}, { ...coffee, nama: " " }, { ...coffee, foto: "" },
    { ...coffee, hargaint: -1 }, ...[0, -1, 1.5, NaN, Infinity, "2", null, 1000]
      .map((qty) => ({ ...coffee, qty }))];
  assert.deepEqual(normalizeCart(badRows), []);
});

test("merged quantities cap at 999 and adding beyond the limit fails without changing input", () => {
  const cart = normalizeCart([{ ...coffee, qty: 998 }, { ...coffee, qty: 5 }]);
  assert.equal(cart[0].qty, 999);
  const before = JSON.stringify(cart);
  assert.throws(() => addToCart(cart, coffee), RangeError);
  assert.equal(JSON.stringify(cart), before);
});

test("adding after persistence reload keeps existing products and counts quantities", () => {
  const persisted = JSON.stringify(addToCart([], coffee));
  const restored = JSON.parse(persisted);
  const next = addToCart(restored, milkshake);
  const updated = addToCart(next, coffee);
  assert.deepEqual(updated.map((item) => [item.nama, item.qty]), [[coffee.nama, 2], [milkshake.nama, 1]]);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].qty, 1);
  assert.throws(() => addToCart(updated, { nama: "Invalid" }), TypeError);
});

test("removeOne decrements one unit, removes zero-quantity rows and leaves unrelated products intact", () => {
  const original = normalizeCart([{ ...coffee, qty: 2 }, { ...milkshake, qty: 1 }]);
  const one = removeOne(original, original[0].id);
  assert.deepEqual(one.map((item) => item.qty), [1, 1]);
  const removed = removeOne(one, original[0].id);
  assert.deepEqual(removed.map((item) => item.nama), [milkshake.nama]);
  assert.equal(original[0].qty, 2);
  assert.deepEqual(removeOne(original, "missing"), original);
  assert.deepEqual(removeOne([], "missing"), []);
});

test("totals use all quantities, item count and the fixed demo surcharge", () => {
  const cart = normalizeCart([{ ...coffee, qty: 2 }, { ...milkshake, qty: 1 }]);
  assert.deepEqual(cartTotals(cart), { subtotal: 295000, tax: 29500, total: 324500, count: 3 });
  assert.deepEqual(cartTotals(removeOne(cart, cart[0].id)),
    { subtotal: 195000, tax: 19500, total: 214500, count: 2 });
  assert.deepEqual(cartTotals([]), { subtotal: 0, tax: 0, total: 0, count: 0 });
  assert.deepEqual(cartTotals([{ ...coffee, harga: "0", qty: 2 }]),
    { subtotal: 0, tax: 0, total: 0, count: 2 });
});

test("rounds the demo surcharge once to whole rupiah", () => {
  const item = (harga) => ({ ...coffee, harga });
  assert.deepEqual(cartTotals([item("4")]), { subtotal: 4, tax: 0, total: 4, count: 1 });
  assert.deepEqual(cartTotals([item("5")]), { subtotal: 5, tax: 1, total: 6, count: 1 });
  assert.deepEqual(cartTotals([item("5"), item("5")]), { subtotal: 10, tax: 1, total: 11, count: 2 });
});

test("rejects multiplication, subtotal and final total overflow", () => {
  const maximum = { ...coffee, harga: Number.MAX_SAFE_INTEGER };
  assert.throws(() => cartTotals([{ ...maximum, qty: 2 }]), RangeError);
  assert.throws(() => cartTotals([maximum, { ...maximum, foto: "different.jpg" }]), RangeError);
  assert.throws(() => cartTotals([maximum]), RangeError);
});
