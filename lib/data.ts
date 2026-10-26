// Demo data for "Tillo", a fictional corner store. Photos: Unsplash (Unsplash License).
export type Cat = "Fresh" | "Bakery" | "Pantry" | "Drinks";
export type Product = {
  id: string; name: string; sku: string; cat: Cat; unit: string;
  price: number; cost: number; stock: number; min: number; cap: number;
  rate: number;            // typical units sold per day (drives the seeded history)
  expires?: number;        // days until the current batch expires
  img: string;
};
export type Line = { id: string; qty: number; price: number; cost: number };
export type Sale = { id: string; ts: number; lines: Line[]; discount: number; total: number; method: Method; customer?: string };
export type Method = "Cash" | "Card" | "QR" | "Tab";
export type Customer = { id: string; name: string; phone: string; tab: number; limit: number; since: number; history: { ts: number; amount: number; note: string }[] };

const U = (id: string, w = 500) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const PRODUCTS: Product[] = [
  { id: "eggs", name: "Free-range Eggs", sku: "FR-101", cat: "Fresh", unit: "tray of 12", price: 4.2, cost: 3.1, stock: 18, min: 12, cap: 60, rate: 9, expires: 9, img: U("1506976785307-8732e854ad03") },
  { id: "bananas", name: "Bananas", sku: "FR-102", cat: "Fresh", unit: "1 kg", price: 1.8, cost: 1.05, stock: 9, min: 10, cap: 50, rate: 7, expires: 3, img: U("1680165528445-acee3470f012") },
  { id: "apples", name: "Red Apples", sku: "FR-103", cat: "Fresh", unit: "1 kg", price: 3.4, cost: 2.2, stock: 26, min: 10, cap: 50, rate: 5, expires: 12, img: U("1560806887-1e4cd0b6cbd6") },
  { id: "oranges", name: "Oranges", sku: "FR-104", cat: "Fresh", unit: "1 kg", price: 2.9, cost: 1.9, stock: 31, min: 10, cap: 50, rate: 4, expires: 10, img: U("1557800636-894a64c1696f") },
  { id: "pineapple", name: "Pineapple", sku: "FR-105", cat: "Fresh", unit: "each", price: 3.2, cost: 2.0, stock: 0, min: 6, cap: 24, rate: 2, img: U("1559657498-0ef60001f7e7") },
  { id: "garlic", name: "Garlic", sku: "FR-106", cat: "Fresh", unit: "250 g", price: 1.5, cost: 0.8, stock: 40, min: 8, cap: 40, rate: 3, expires: 30, img: U("1587049332298-1c42e83937a7") },
  { id: "sourdough", name: "Sourdough Loaf", sku: "BK-201", cat: "Bakery", unit: "800 g", price: 5.5, cost: 2.6, stock: 7, min: 8, cap: 30, rate: 8, expires: 2, img: U("1565030771467-51f74f2c68ea") },
  { id: "croissant", name: "Butter Croissant", sku: "BK-202", cat: "Bakery", unit: "each", price: 2.4, cost: 0.9, stock: 22, min: 12, cap: 48, rate: 14, expires: 1, img: U("1623334044303-241021148842") },
  { id: "cinnamon", name: "Cinnamon Roll", sku: "BK-203", cat: "Bakery", unit: "each", price: 2.8, cost: 1.1, stock: 11, min: 8, cap: 36, rate: 6, expires: 2, img: U("1530006261244-0ae043004358") },
  { id: "cookies", name: "Choc-chip Cookies", sku: "BK-204", cat: "Bakery", unit: "pack of 6", price: 3.6, cost: 1.7, stock: 28, min: 10, cap: 40, rate: 5, expires: 14, img: U("1674316249792-b0c40675d0fe") },
  { id: "doughnuts", name: "Cream Doughnuts", sku: "BK-205", cat: "Bakery", unit: "box of 4", price: 4.9, cost: 2.3, stock: 5, min: 6, cap: 24, rate: 4, expires: 1, img: U("1518562923427-19e694fbd8e9") },
  { id: "rice", name: "Basmati Rice", sku: "PN-301", cat: "Pantry", unit: "5 kg", price: 12.5, cost: 9.4, stock: 34, min: 10, cap: 60, rate: 3, img: U("1568347355280-d33fdf77d42a") },
  { id: "coffee", name: "Ground Coffee", sku: "PN-302", cat: "Pantry", unit: "250 g", price: 8.9, cost: 5.6, stock: 14, min: 8, cap: 40, rate: 3, img: U("1707216265113-9f57a25cfea4") },
  { id: "chocolate", name: "Dark Chocolate", sku: "PN-303", cat: "Pantry", unit: "100 g", price: 2.6, cost: 1.3, stock: 46, min: 15, cap: 80, rate: 6, img: U("1623660053975-cf75a8be0908") },
  { id: "pasta", name: "Fresh Pasta", sku: "PN-304", cat: "Pantry", unit: "500 g", price: 4.4, cost: 2.5, stock: 12, min: 10, cap: 40, rate: 4, expires: 5, img: U("1551892374-ecf8754cf8b0") },
  { id: "milk", name: "Fresh Milk", sku: "DR-401", cat: "Drinks", unit: "1 L", price: 1.9, cost: 1.3, stock: 16, min: 15, cap: 60, rate: 12, expires: 4, img: U("1639151082235-406d8eb262b9") },
  { id: "juice", name: "Orange Juice", sku: "DR-402", cat: "Drinks", unit: "1 L", price: 3.9, cost: 2.4, stock: 20, min: 10, cap: 40, rate: 5, expires: 6, img: U("1583073600538-f219abfb20bc") },
  { id: "coldbrew", name: "Cold Brew", sku: "DR-403", cat: "Drinks", unit: "330 ml", price: 3.5, cost: 1.6, stock: 3, min: 10, cap: 40, rate: 6, expires: 20, img: U("1517701550927-30cf4ba1dba5") },
];

export const CATS: Cat[] = ["Fresh", "Bakery", "Pantry", "Drinks"];

const ago = (d: number) => Date.now() - d * 864e5;
export const CUSTOMERS: Customer[] = [
  { id: "c1", name: "Maya Fernando", phone: "+1 555 0142", tab: 23.4, limit: 60, since: ago(210), history: [{ ts: ago(3), amount: 14.1, note: "Weekly groceries" }, { ts: ago(5), amount: 9.3, note: "Bread and milk" }, { ts: ago(12), amount: -18, note: "Payment received" }] },
  { id: "c2", name: "Daniel Ortiz", phone: "+1 555 0177", tab: 0, limit: 40, since: ago(90), history: [{ ts: ago(9), amount: -12.5, note: "Payment received" }, { ts: ago(16), amount: 12.5, note: "Coffee and pastries" }] },
  { id: "c3", name: "Aisha Khan", phone: "+1 555 0109", tab: 8.7, limit: 50, since: ago(400), history: [{ ts: ago(1), amount: 8.7, note: "Bread and milk" }] },
  { id: "c4", name: "Leo Park", phone: "+1 555 0190", tab: 41.2, limit: 50, since: ago(150), history: [{ ts: ago(11), amount: 41.2, note: "Party order" }] },
  { id: "c5", name: "Sofia Rossi", phone: "+1 555 0163", tab: 16.9, limit: 80, since: ago(30), history: [{ ts: ago(8), amount: 16.9, note: "Fruit and juice" }] },
];

/* ---------- deterministic seeded history (~2 months) ---------- */
function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
const HOURS = [0.3, 0.9, 1.4, 1.1, 0.8, 1.2, 1.5, 1.0, 0.7, 0.9, 1.3, 1.6, 0.6]; // 7am..7pm weight

export function seedSales(now = Date.now()): Sale[] {
  const r = rng(42), out: Sale[] = [];
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  for (let d = 62; d >= 0; d--) {
    const day = new Date(start.getTime() - d * 864e5);
    const dow = day.getDay(), boost = (dow === 0 || dow === 6 ? 1.35 : 1) * (1 + (62 - d) * 0.004);
    const lastHour = d === 0 ? new Date(now).getHours() - 6 : 13;
    for (let h = 0; h < Math.min(13, lastHour); h++) {
      const bills = Math.round(HOURS[h] * 3.2 * boost * (0.75 + r() * 0.5));
      for (let b = 0; b < bills; b++) {
        const n = 1 + Math.floor(r() * 3), lines: Line[] = [];
        for (let i = 0; i < n; i++) {
          let pick = PRODUCTS[0], acc = 0; const tot = PRODUCTS.reduce((a, p) => a + p.rate, 0), x = r() * tot;
          for (const p of PRODUCTS) { acc += p.rate; if (x <= acc) { pick = p; break; } }
          const ex = lines.find(l => l.id === pick.id);
          if (ex) ex.qty++; else lines.push({ id: pick.id, qty: 1, price: pick.price, cost: pick.cost });
        }
        const total = lines.reduce((a, l) => a + l.qty * l.price, 0);
        const ts = day.getTime() + (7 + h) * 36e5 + Math.floor(r() * 36e5);
        if (ts > now) continue;
        out.push({ id: "S" + (100000 + out.length), ts, lines, discount: 0, total, method: r() < 0.55 ? "Card" : r() < 0.8 ? "Cash" : "QR" });
      }
    }
  }
  return out;
}
