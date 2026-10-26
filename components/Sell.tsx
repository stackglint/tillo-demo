"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { CATS, type Cat, type Method, type Sale } from "@/lib/data";
import { useStore } from "@/lib/store";
import { I, Ico, Kbd, Photo, Sheet, StockChip, level } from "./ui";

export type Cart = Record<string, number>;
export const match = (q: string, name: string, sku: string) => {
  q = q.trim().toLowerCase(); if (!q) return 0;
  const n = name.toLowerCase(), s = sku.toLowerCase();
  if (s === q) return 100; if (n.startsWith(q)) return 80; if (n.split(" ").some(w => w.startsWith(q))) return 60; if (n.includes(q) || s.includes(q)) return 40;
  let i = 0; for (const c of n) if (c === q[i]) i++; return i === q.length ? 20 : 0;
};

function Receipt({ sale, change, onDone }: { sale: Sale | null; change: number; onDone: () => void }) {
  const { products, money, customers } = useStore();
  const [qr, setQr] = useState("");
  useEffect(() => { if (sale) QRCode.toDataURL(`TILLO-DEMO|${sale.id}|${sale.total.toFixed(2)}`, { margin: 0, width: 220, color: { dark: "#15161A", light: "#FFFFFF" } }).then(setQr).catch(() => setQr("")); }, [sale]);
  if (!sale) return null;
  const d = new Date(sale.ts), gross = sale.total + sale.discount;
  const cust = customers.find(c => c.id === sale.customer);
  return (
    <div className="p-6">
      <div className="printer mx-auto h-3 w-[300px] max-w-full rounded-full bg-ink" aria-hidden="true" />
      <div className="mx-auto -mt-1.5 w-[280px] max-w-[92%] overflow-hidden">
        <div className="receipt receipt-print bg-white px-5 pb-6 pt-5 font-mono text-[0.78rem] text-ink shadow-[0_18px_30px_-18px_rgba(0,0,0,.4)]">
          <div className="text-center"><div className="font-sans text-lg font-bold tracking-tight">tillo</div><div className="text-[0.68rem] text-muted">Demo store · not a real receipt</div></div>
          <div className="my-3 border-t border-dashed border-ink/30" />
          <div className="flex justify-between"><span>{sale.id}</span><span>{d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
          <div className="my-3 border-t border-dashed border-ink/30" />
          <ul className="space-y-1.5">
            {sale.lines.map(l => { const p = products.find(x => x.id === l.id)!; return (
              <li key={l.id}><div className="truncate">{p.name}</div><div className="flex justify-between text-muted"><span>{l.qty} × {money(l.price)}</span><span className="text-ink">{money(l.qty * l.price)}</span></div></li>); })}
          </ul>
          <div className="my-3 border-t border-dashed border-ink/30" />
          <div className="space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(gross)}</span></div>
            {sale.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>−{money(sale.discount)}</span></div>}
            <div className="flex justify-between text-[0.95rem] font-bold"><span>TOTAL</span><span>{money(sale.total)}</span></div>
            <div className="flex justify-between text-muted"><span>Paid by</span><span>{sale.method}{cust ? ` · ${cust.name.split(" ")[0]}` : ""}</span></div>
            {sale.method === "Cash" && change > 0 && <div className="flex justify-between"><span>Change</span><span>{money(change)}</span></div>}
          </div>
          <div className="my-3 border-t border-dashed border-ink/30" />
          {qr && <img src={qr} alt="QR code for the e-receipt" className="mx-auto size-24" />}
          <div className="mt-2 text-center text-[0.66rem] text-muted">Scan for e-receipt (demo)</div>
          <div className="mt-1 text-center text-[0.66rem] text-muted">Thank you!</div>
        </div>
        <div className="receipt-edge h-3 bg-white" aria-hidden="true" />
      </div>
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={() => window.print()} className="h-12 flex-1 rounded-full bg-white font-semibold ring-1 ring-line hover:ring-ink/30">Print</button>
        <button type="button" onClick={onDone} className="h-12 flex-[2] rounded-full bg-ink font-semibold text-white hover:bg-tomato">New sale</button>
      </div>
    </div>
  );
}

export default function Sell({ cart, setCart }: { cart: Cart; setCart: (c: Cart | ((c: Cart) => Cart)) => void }) {
  const { products, money, customers, sell, park, unpark, parked, toast, cur } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Cat | "All">("All");
  const [disc, setDisc] = useState(0);
  const [method, setMethod] = useState<Method>("Card");
  const [cust, setCust] = useState("");
  const [cash, setCash] = useState("");
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState<{ sale: Sale; change: number } | null>(null);
  const [flash, setFlash] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "/" && document.activeElement?.tagName !== "INPUT") { e.preventDefault(); searchRef.current?.focus(); } };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, []);

  const list = useMemo(() => {
    let l = products.filter(p => cat === "All" || p.cat === cat);
    if (q.trim()) l = l.map(p => [p, match(q, p.name, p.sku)] as const).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([p]) => p);
    return l;
  }, [products, cat, q]);

  const lines = products.filter(p => cart[p.id]).map(p => ({ p, q: cart[p.id] }));
  const count = lines.reduce((a, l) => a + l.q, 0);
  const gross = lines.reduce((a, l) => a + l.q * l.p.price, 0);
  const total = gross * (1 - disc / 100);
  const rate = cur === "USD" ? 1 : 300;
  const cashNum = parseFloat(cash || "0") / rate;
  const change = Math.max(0, cashNum - total);

  const add = (id: string, n = 1) => {
    const p = products.find(x => x.id === id)!; const inCart = cart[id] || 0;
    if (inCart + n > p.stock) { toast(p.stock ? `Only ${p.stock} ${p.name} in stock` : `${p.name} is out of stock`); return; }
    setCart(c => ({ ...c, [id]: (c[id] || 0) + n })); setFlash(id); setTimeout(() => setFlash(""), 160);
  };
  const sub = (id: string) => setCart(c => { const n = { ...c }; if (n[id] > 1) n[id]--; else delete n[id]; return n; });
  const canCharge = count > 0 && (method !== "Tab" || !!cust) && (method !== "Cash" || cashNum >= total - 1e-9);

  const charge = () => {
    if (!canCharge) return;
    const sale = sell(cart, disc, method, method === "Tab" ? cust : undefined);
    setDone({ sale, change: method === "Cash" ? change : 0 }); setSheet(false);
  };
  const reset = () => { setCart({}); setDisc(0); setCash(""); setCust(""); setDone(null); setTimeout(() => searchRef.current?.focus(), 50); };
  const quickCash = [total, Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, Math.ceil(total / 20) * 20].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4);

  const cartPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-5 pb-4 pt-5 md:px-6">
        <div><h2 className="text-lg font-bold tracking-tight">Current sale</h2><p className="text-xs text-muted">{count ? `${count} item${count > 1 ? "s" : ""}` : "Tap products to add them"}</p></div>
        <div className="flex gap-2">
          <button type="button" disabled={!count} onClick={() => { park(cart); setCart({}); toast("Sale parked. Resume it from the top bar."); }} className="h-9 rounded-full px-3.5 text-sm font-semibold ring-1 ring-line hover:ring-ink/30 disabled:opacity-40">Park</button>
          <button type="button" disabled={!count} onClick={() => setCart({})} className="h-9 rounded-full px-3.5 text-sm font-semibold text-stop ring-1 ring-line hover:ring-stop/40 disabled:opacity-40">Clear</button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 md:px-6">
        {!lines.length ? (
          <div className="grid h-full min-h-[160px] place-items-center rounded-[24px] border-2 border-dashed border-black/10 text-center text-sm text-muted">
            <div><Ico d={I.tabs} className="mx-auto size-8 text-ink/30" /><div className="mt-2">No items yet</div><div className="mt-1 text-xs">Press <Kbd>/</Kbd> and type a name or SKU</div></div>
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map(({ p, q: n }) => (
              <li key={p.id} className="line-in flex items-center gap-3 rounded-[20px] bg-paper/70 p-2 pr-3">
                <Photo src={p.img} alt="" className="size-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{p.name}</div><div className="font-mono text-xs text-muted">{money(p.price)} × {n}</div></div>
                <div className="flex h-9 items-center rounded-full bg-paper ring-1 ring-line">
                  <button type="button" onClick={() => sub(p.id)} aria-label={`Remove one ${p.name}`} className="grid size-9 place-items-center">−</button>
                  <span className="min-w-5 text-center font-mono text-sm font-semibold">{n}</span>
                  <button type="button" onClick={() => add(p.id)} aria-label={`Add one ${p.name}`} className="grid size-9 place-items-center">+</button>
                </div>
                <div className="w-[72px] text-right font-mono text-sm font-semibold">{money(n * p.price)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4 border-t border-black/5 px-5 pb-5 pt-5 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">Discount</span>
          <div className="flex gap-1">{[0, 5, 10, 15].map(d => (
            <button key={d} type="button" onClick={() => setDisc(d)} aria-pressed={disc === d} className={`h-8 rounded-full px-3 font-mono text-xs font-semibold transition ${disc === d ? "bg-ink text-white" : "bg-white ring-1 ring-line hover:ring-ink/30"}`}>{d}%</button>
          ))}</div>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-sm text-muted">{disc > 0 && <div className="font-mono">−{money(gross - total)} off</div>}Total</div>
          <div className="font-mono text-[2rem] font-semibold leading-none tracking-tight">{money(total)}</div>
        </div>
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-white p-1 ring-1 ring-line" role="radiogroup" aria-label="Payment method">
          {(["Card", "Cash", "QR", "Tab"] as Method[]).map(m => (
            <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className={`h-10 rounded-xl text-sm font-semibold transition ${method === m ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>{m === "Tab" ? "Pay later" : m}</button>
          ))}
        </div>
        {method === "Cash" && (
          <div className="space-y-2">
            <div className="flex gap-1.5 overflow-x-auto">{quickCash.map(v => (
              <button key={v} type="button" onClick={() => setCash(String(+(v * rate).toFixed(2)))} className="h-8 shrink-0 rounded-full bg-white px-3 font-mono text-xs font-semibold ring-1 ring-line hover:ring-ink/30">{money(v)}</button>
            ))}</div>
            <div className="flex items-center gap-3">
              <label htmlFor="cash" className="text-sm text-muted">Received</label>
              <input id="cash" inputMode="decimal" value={cash} onChange={e => setCash(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" className="h-10 min-w-0 flex-1 rounded-xl bg-white px-3 text-right font-mono outline-none ring-1 ring-line focus:ring-2 focus:ring-tomato" />
            </div>
            <div className={`flex justify-between rounded-xl px-3 py-2 text-sm font-semibold ${cashNum >= total && total > 0 ? "bg-good/12 text-good" : "bg-paper text-muted"}`}><span>Change due</span><span className="font-mono">{money(change)}</span></div>
          </div>
        )}
        {method === "Tab" && (
          <div>
            <label htmlFor="cust" className="sr-only">Customer</label>
            <select id="cust" value={cust} onChange={e => setCust(e.target.value)} className="h-10 w-full rounded-xl bg-white px-3 text-sm outline-none ring-1 ring-line focus:ring-2 focus:ring-tomato">
              <option value="">Choose a customer…</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} · owes {money(c.tab)}</option>)}
            </select>
          </div>
        )}
        <button type="button" onClick={charge} disabled={!canCharge} className="charge flex h-14 w-full items-center justify-between rounded-2xl bg-tomato px-5 text-base font-bold text-white shadow-[0_14px_30px_-14px_rgba(255,79,46,.9)] transition hover:brightness-105 active:scale-[.99] disabled:bg-ink/15 disabled:text-ink/40 disabled:shadow-none">
          <span>{method === "Tab" ? "Add to tab" : "Charge"}</span><span className="font-mono">{money(total)}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-h-0 overflow-y-auto px-4 pb-44 pt-2 md:px-8 md:pb-28 lg:pb-8">
        <div className="relative">
          <Ico d={I.search} className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <label htmlFor="psearch" className="sr-only">Search products</label>
          <input id="psearch" ref={searchRef} value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && list[0]) { add(list[0].id); setQ(""); } if (e.key === "Escape") setQ(""); }}
            placeholder="Search or scan: name, SKU…" className="h-14 w-full rounded-[20px] bg-white/85 pl-12 pr-28 text-base shadow-[0_8px_24px_-18px_rgba(20,20,30,.4)] outline-none ring-1 ring-black/5 backdrop-blur transition focus:ring-2 focus:ring-tomato" />
          <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1.5 text-xs text-muted sm:flex"><Kbd>Enter</Kbd> to add</span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {(["All", ...CATS] as const).map(c => (
            <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={`h-10 rounded-full px-4 text-sm font-semibold transition ${cat === c ? "bg-ink text-white shadow-[0_8px_18px_-10px_rgba(20,20,30,.8)]" : "bg-white/80 ring-1 ring-black/5 hover:ring-ink/20"}`}>{c}</button>
          ))}
          {parked.length > 0 && <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />}
          {parked.map(pk => (
            <button key={pk.id} type="button" onClick={() => { const c = unpark(pk.id); if (c) setCart(c); }} className="h-9 rounded-full bg-warn/15 px-3.5 text-sm font-semibold text-warn ring-1 ring-warn/30">⏸ Parked · {Object.values(pk.cart).reduce((a, b) => a + b, 0)} items</button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {list.map((p, i) => {
            const n = cart[p.id] || 0, out = p.stock <= 0;
            return (
              <button key={p.id} type="button" onClick={() => add(p.id)} disabled={out} aria-label={`Add ${p.name}, ${money(p.price)}`}
                className={`tile group relative flex flex-col overflow-hidden rounded-[24px] bg-white/90 text-left shadow-[0_10px_28px_-20px_rgba(20,20,30,.45)] ring-1 transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(20,20,30,.5)] ${n ? "ring-2 ring-tomato" : "ring-black/5"} ${flash === p.id ? "scale-[.96]" : ""} disabled:cursor-not-allowed`}
                style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                <Photo src={p.img} alt="" className={`aspect-[4/3] w-full ${out ? "grayscale" : ""} [&>img]:transition [&>img]:duration-500 group-hover:[&>img]:scale-105`} />
                {n > 0 && <span className="absolute right-2.5 top-2.5 grid min-w-8 place-items-center rounded-full bg-tomato px-2 py-1 font-mono text-sm font-bold text-white shadow-lg">{n}</span>}
                {out && <span className="absolute inset-x-0 top-[34%] mx-auto w-fit rounded-full bg-ink/85 px-3 py-1 text-xs font-semibold text-white">Out of stock</span>}
                <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                  <div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold leading-tight">{p.name}</span><span className="shrink-0 font-mono text-sm font-semibold">{money(p.price)}</span></div>
                  <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted">{p.unit}</span>{level(p) !== "ok" ? <StockChip p={p} compact /> : <span className="font-mono text-[0.7rem] text-muted">{p.stock} left</span>}</div>
                </div>
              </button>
            );
          })}
          {!list.length && <p className="col-span-full py-10 text-center text-muted">No products match “{q}”.</p>}
        </div>
      </div>

      <aside className="mb-3 mr-3 mt-1 hidden min-h-0 overflow-hidden rounded-[28px] border border-black/[.05] bg-white/80 shadow-[0_20px_50px_-30px_rgba(20,20,30,.4)] backdrop-blur-xl lg:block" aria-label="Current sale">{cartPanel}</aside>

      {/* mobile summary bar + sheet */}
      <div className={`fixed inset-x-3 z-30 transition md:bottom-4 md:left-[100px] lg:hidden ${count ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`} style={{ bottom: "calc(96px + env(safe-area-inset-bottom))" }}>
        <button type="button" onClick={() => setSheet(true)} className={`flex h-14 w-full items-center justify-between rounded-[20px] px-5 font-semibold shadow-2xl transition ${count ? "bg-tomato text-white" : "bg-ink/90 text-white/70 backdrop-blur"}`}>
          <span>{count ? `View sale · ${count} item${count > 1 ? "s" : ""}` : "No items yet"}</span><span className="font-mono">{money(total)}</span>
        </button>
      </div>
      <Sheet open={sheet} onClose={() => setSheet(false)} label="Current sale"><div className="h-[86dvh]">{cartPanel}</div></Sheet>
      <Sheet open={!!done} onClose={reset} side="center" label="Receipt"><Receipt sale={done?.sale ?? null} change={done?.change ?? 0} onDone={reset} /></Sheet>
    </div>
  );
}
