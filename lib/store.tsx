"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CUSTOMERS, PRODUCTS, seedSales, type Customer, type Line, type Method, type Product, type Sale } from "./data";

const KEY = "tillo-demo-v2";
export const LKR_RATE = 300; // illustrative demo rate only
const DAY = 864e5;
const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

type Persist = {
  stock: Record<string, number>; price: Record<string, number>; mine: Sale[]; customers: Customer[];
  parked: { id: string; ts: number; cart: Record<string, number> }[]; cur: "USD" | "LKR"; goal: number | null; live: boolean;
};
const fresh = (): Persist => ({ stock: {}, price: {}, mine: [], customers: CUSTOMERS, parked: [], cur: "USD", goal: null, live: true });

type Store = {
  products: Product[]; sales: Sale[]; customers: Customer[]; parked: Persist["parked"]; cur: Persist["cur"];
  money: (n: number) => string; setCur: (c: Persist["cur"]) => void;
  sell: (cart: Record<string, number>, discountPct: number, method: Method, customer?: string) => Sale;
  restock: (id: string, qty: number) => void; setPrice: (id: string, p: number) => void;
  settle: (cid: string, amount: number) => void; addCustomer: (name: string, phone: string, limit: number) => void;
  park: (cart: Record<string, number>) => void; unpark: (id: string) => Record<string, number> | null;
  reset: () => void; velocity: (id: string) => number; daysLeft: (p: Product) => number;
  toast: (t: string) => void; toasts: { id: number; t: string }[];
  goal: number; setGoal: (n: number) => void; todayRev: number; celebrate: number;
  live: boolean; setLive: (b: boolean) => void; lastSale: Sale | null;
};
const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx)!;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [p, setP] = useState<Persist>(fresh);
  const [seed] = useState<Sale[]>(() => seedSales());
  const [toasts, setToasts] = useState<{ id: number; t: string }[]>([]);
  const [celebrate, setCelebrate] = useState(0);
  const loaded = useRef(false);

  useEffect(() => { try { const v = localStorage.getItem(KEY); if (v) setP({ ...fresh(), ...JSON.parse(v) }); } catch {} loaded.current = true; }, []);
  useEffect(() => { if (!loaded.current) return; try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} }, [p]);

  const products = useMemo(() => PRODUCTS.map(x => ({ ...x, stock: p.stock[x.id] ?? x.stock, price: p.price[x.id] ?? x.price })), [p.stock, p.price]);
  const sales = useMemo(() => [...seed, ...p.mine].sort((a, b) => a.ts - b.ts), [seed, p.mine]);
  const lastSale = p.mine.length ? p.mine[p.mine.length - 1] : null;

  const money = useCallback((n: number) => p.cur === "USD" ? "$" + n.toFixed(2) : "Rs " + Math.round(n * LKR_RATE).toLocaleString("en-US"), [p.cur]);

  const vel = useMemo(() => {
    const since = Date.now() - 7 * DAY, m: Record<string, number> = {};
    for (const s of sales) if (s.ts >= since) for (const l of s.lines) m[l.id] = (m[l.id] || 0) + l.qty;
    for (const k in m) m[k] = m[k] / 7;
    return m;
  }, [sales]);

  // default goal: 10% above the average full day of the last 4 weeks, rounded
  const autoGoal = useMemo(() => {
    const t0 = startOfDay() - 28 * DAY, t1 = startOfDay();
    const tot = sales.filter(s => s.ts >= t0 && s.ts < t1).reduce((a, s) => a + s.total, 0);
    return Math.max(50, Math.round((tot / 28) * 1.1 / 10) * 10);
  }, [sales]);
  const goal = p.goal ?? autoGoal;
  const todayRev = useMemo(() => { const t = startOfDay(); return sales.filter(s => s.ts >= t).reduce((a, s) => a + s.total, 0); }, [sales]);

  const toast = useCallback((t: string) => {
    const id = Date.now() + Math.random();
    setToasts(x => [...x, { id, t }]); setTimeout(() => setToasts(x => x.filter(y => y.id !== id)), 2800);
  }, []);

  const record = useCallback((sale: Sale) => {
    setP(s => {
      const stock = { ...s.stock }; for (const l of sale.lines) stock[l.id] = Math.max(0, (stock[l.id] ?? PRODUCTS.find(x => x.id === l.id)!.stock) - l.qty);
      const customers = sale.method === "Tab" && sale.customer ? s.customers.map(c => c.id === sale.customer ? { ...c, tab: +(c.tab + sale.total).toFixed(2), history: [{ ts: sale.ts, amount: sale.total, note: `Bill ${sale.id}` }, ...c.history] } : c) : s.customers;
      return { ...s, stock, customers, mine: [...s.mine, sale] };
    });
  }, []);

  // goal celebration
  const prevRev = useRef<number | null>(null);
  useEffect(() => {
    if (prevRev.current !== null && prevRev.current < goal && todayRev >= goal) { setCelebrate(c => c + 1); toast("Daily goal reached!"); }
    prevRev.current = todayRev;
  }, [todayRev, goal, toast]);

  // simulated live sales (clearly labelled as simulated in the UI)
  const productsRef = useRef(products); productsRef.current = products;
  useEffect(() => {
    if (!p.live) return;
    const id = setInterval(() => {
      const pool = productsRef.current.filter(x => x.stock > 2); if (!pool.length) return;
      const n = 1 + Math.floor(Math.random() * 3), lines: Line[] = [];
      for (let i = 0; i < n; i++) { const x = pool[Math.floor(Math.random() * pool.length)]; const ex = lines.find(l => l.id === x.id); if (ex) ex.qty++; else lines.push({ id: x.id, qty: 1, price: x.price, cost: x.cost }); }
      const total = lines.reduce((a, l) => a + l.qty * l.price, 0);
      record({ id: "L" + Math.floor(300000 + Math.random() * 99999), ts: Date.now(), lines, discount: 0, total, method: Math.random() < 0.6 ? "Card" : Math.random() < 0.7 ? "Cash" : "QR" });
    }, 15000);
    return () => clearInterval(id);
  }, [p.live, record]);

  const store: Store = {
    products, sales, customers: p.customers, parked: p.parked, cur: p.cur, money, toasts, toast, goal, todayRev, celebrate, live: p.live, lastSale,
    setCur: cur => setP(s => ({ ...s, cur })),
    setGoal: g => setP(s => ({ ...s, goal: g })),
    setLive: live => setP(s => ({ ...s, live })),
    sell: (cart, discountPct, method, customer) => {
      const lines: Line[] = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => { const pr = products.find(x => x.id === id)!; return { id, qty, price: pr.price, cost: pr.cost }; });
      const gross = lines.reduce((a, l) => a + l.qty * l.price, 0), discount = gross * discountPct / 100;
      const sale: Sale = { id: "S" + Math.floor(200000 + Math.random() * 99999), ts: Date.now(), lines, discount, total: gross - discount, method, customer };
      record(sale);
      return sale;
    },
    restock: (id, qty) => setP(s => ({ ...s, stock: { ...s.stock, [id]: Math.max(0, (s.stock[id] ?? PRODUCTS.find(x => x.id === id)!.stock) + qty) } })),
    setPrice: (id, price) => setP(s => ({ ...s, price: { ...s.price, [id]: price } })),
    settle: (cid, amount) => setP(s => ({ ...s, customers: s.customers.map(c => c.id === cid ? { ...c, tab: Math.max(0, +(c.tab - amount).toFixed(2)), history: [{ ts: Date.now(), amount: -amount, note: "Payment received" }, ...c.history] } : c) })),
    addCustomer: (name, phone, limit) => setP(s => ({ ...s, customers: [...s.customers, { id: "c" + Date.now(), name, phone, tab: 0, limit, since: Date.now(), history: [] }] })),
    park: cart => setP(s => ({ ...s, parked: [...s.parked, { id: "P" + Date.now(), ts: Date.now(), cart }] })),
    unpark: id => { const x = p.parked.find(y => y.id === id); setP(s => ({ ...s, parked: s.parked.filter(y => y.id !== id) })); return x ? x.cart : null; },
    reset: () => setP(fresh()),
    velocity: id => vel[id] || 0,
    daysLeft: pr => pr.stock / (vel[pr.id] || 0.01),
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
