"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/data";
import { useStore } from "@/lib/store";
import { CountUp, LEVEL, Photo, Sheet, Spark, StockChip, level } from "./ui";

type Filter = "all" | "low" | "out" | "exp";
const days = (d: number) => (d >= 99 ? "99+ days" : d < 1 ? "< 1 day" : `~${Math.round(d)} day${Math.round(d) === 1 ? "" : "s"}`);

export default function Shelf({ initial = "all" }: { initial?: Filter }) {
  const { products, money, daysLeft, velocity, restock, setPrice, sales, toast } = useStore();
  const [f, setF] = useState<Filter>(initial);
  const [sort, setSort] = useState<"days" | "name" | "margin">("days");
  const [sel, setSel] = useState<string | null>(null);
  const [po, setPo] = useState(false);
  const [poQty, setPoQty] = useState<Record<string, number>>({});

  const stats = useMemo(() => ({
    items: products.length,
    low: products.filter(p => level(p) === "low").length,
    out: products.filter(p => level(p) === "out").length,
    value: products.reduce((a, p) => a + p.stock * p.cost, 0),
  }), [products]);

  const list = useMemo(() => {
    let l = products.filter(p => f === "all" || (f === "low" && level(p) === "low") || (f === "out" && level(p) === "out") || (f === "exp" && p.expires !== undefined && p.expires <= 3 && p.stock > 0));
    l = [...l].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "margin" ? (b.price - b.cost) / b.price - (a.price - a.cost) / a.price : daysLeft(a) - daysLeft(b));
    return l;
  }, [products, f, sort, daysLeft]);

  const reorder = useMemo(() => products.filter(p => p.stock <= p.min || daysLeft(p) < 4).map(p => {
    const want = Math.ceil(velocity(p.id) * 7 + p.min - p.stock);
    return { p, qty: Math.max(1, Math.min(p.cap - p.stock, want)) };
  }), [products, daysLeft, velocity]);

  const daily = (id: string) => {
    const out: number[] = Array(14).fill(0), start = new Date(); start.setHours(0, 0, 0, 0);
    for (const s of sales) { const d = Math.floor((start.getTime() - new Date(s.ts).setHours(0, 0, 0, 0)) / 864e5); if (d >= 0 && d < 14) for (const l of s.lines) if (l.id === id) out[13 - d] += l.qty; }
    return out;
  };
  const p = products.find(x => x.id === sel) as Product | undefined;
  const openPo = () => { setPoQty(Object.fromEntries(reorder.map(r => [r.p.id, r.qty]))); setPo(true); };
  const poTotal = reorder.reduce((a, r) => a + (poQty[r.p.id] ?? r.qty) * r.p.cost, 0);

  const filters: [Filter, string, number][] = [["all", "All items", stats.items], ["low", "Running low", stats.low], ["out", "Out of stock", stats.out], ["exp", "Expiring soon", products.filter(x => x.expires !== undefined && x.expires <= 3 && x.stock > 0).length]];

  return (
    <div className="h-full overflow-y-auto"><div className="mx-auto max-w-[1400px] p-4 pb-32 pt-2 md:p-8 md:pb-12 md:pt-2">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Products", String(stats.items), ""], ["Running low", String(stats.low), "text-warn"], ["Out of stock", String(stats.out), "text-stop"], ["Stock value (at cost)", "", ""]].map(([k, v, c], i) => (
          <div key={k} className="card rounded-[24px] border border-black/[.05] bg-white/80 p-4 shadow-[0_12px_32px_-20px_rgba(20,20,30,.2)] md:p-5">
            <div className="text-xs font-medium text-muted">{k}</div>
            <div className={`mt-1 font-mono text-2xl font-semibold ${c}`}>{i === 3 ? <CountUp value={stats.value} format={money} /> : v}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter">
          {filters.map(([k, l, n]) => (
            <button key={k} type="button" role="tab" aria-selected={f === k} onClick={() => setF(k)} className={`h-10 rounded-full px-4 text-sm font-semibold transition ${f === k ? "bg-ink text-white shadow-[0_8px_18px_-10px_rgba(20,20,30,.8)]" : "bg-white/80 ring-1 ring-black/5 hover:ring-ink/20"}`}>
              {l} <span className={`ml-1 font-mono text-xs ${f === k ? "text-white/60" : "text-muted"}`}>{n}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-muted">Sort</label>
          <select id="sort" value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="h-10 rounded-full bg-white/80 px-3 text-sm font-semibold outline-none ring-1 ring-black/5">
            <option value="days">Runs out first</option><option value="margin">Best margin</option><option value="name">Name</option>
          </select>
          <button type="button" onClick={openPo} className="h-10 rounded-full bg-tomato px-4 text-sm font-bold text-white shadow-[0_10px_20px_-12px_rgba(255,79,46,.9)]">Reorder list · {reorder.length}</button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">
        {list.map((x, i) => {
          const lv = level(x), fill = Math.min(1, x.stock / x.cap), dl = daysLeft(x), margin = (x.price - x.cost) / x.price;
          return (
            <button key={x.id} type="button" onClick={() => setSel(x.id)} className="bin group flex flex-col rounded-[26px] border border-black/[.05] bg-white/85 p-3.5 text-left shadow-[0_10px_28px_-20px_rgba(20,20,30,.45)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(20,20,30,.5)] md:p-4" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
              <div className="flex items-center gap-2.5">
                <Photo src={x.img} alt="" className="size-10 shrink-0 rounded-full ring-2 ring-white" />
                <div className="min-w-0"><div className="truncate text-sm font-semibold">{x.name}</div><div className="font-mono text-[0.68rem] text-muted">{x.sku}</div></div>
              </div>
              <div className="tank relative mt-3.5 h-28 overflow-hidden rounded-[18px] bg-paper/80" aria-label={`${x.stock} of ${x.cap} in stock`}>
                <div className={`tank-fill absolute inset-x-0 bottom-0 ${LEVEL[lv].bg}`} style={{ height: `${Math.max(fill * 100, lv === "out" ? 0 : 4)}%`, opacity: 0.85 }}>
                  <svg className="wave absolute -top-2 left-0 h-3 w-[200%]" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5 Q 12.5 0 25 5 T 50 5 T 75 5 T 100 5 T 125 5 T 150 5 T 175 5 T 200 5 V10 H0z" className={LEVEL[lv].text} fill="currentColor" /></svg>
                </div>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center"><div className="font-mono text-2xl font-semibold leading-none">{x.stock}</div><div className="mt-1 text-[0.68rem] font-medium text-ink/60">of {x.cap}</div></div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2"><StockChip p={x} /></div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[0.72rem]">
                <div><div className="text-muted">Lasts</div><div className={`font-mono font-semibold ${dl < 2 ? "text-stop" : dl < 4 ? "text-warn" : ""}`}>{x.stock ? days(dl) : "—"}</div></div>
                <div className="text-right"><div className="text-muted">Margin</div><div className="font-mono font-semibold">{Math.round(margin * 100)}%</div></div>
              </div>
              {x.expires !== undefined && x.expires <= 3 && x.stock > 0 && <div className="mt-2 rounded-lg bg-warn/12 px-2 py-1 text-[0.68rem] font-semibold text-warn">Expires in {x.expires} day{x.expires > 1 ? "s" : ""}</div>}
            </button>
          );
        })}
        {!list.length && <p className="col-span-full py-10 text-center text-muted">Nothing here. Every item is in good shape.</p>}
      </div>

      </div>
      {/* product drawer */}
      <Sheet open={!!p} onClose={() => setSel(null)} label={p ? p.name : "Product"}>
        {p && (
          <div>
            <Photo src={p.img.replace("w=500", "w=900")} alt={p.name} className="h-56 w-full rounded-t-[28px]" />
            <div className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-2xl font-bold tracking-tight">{p.name}</h2><div className="mt-1 font-mono text-xs text-muted">{p.sku} · {p.unit} · {p.cat}</div></div>
                <button type="button" onClick={() => setSel(null)} aria-label="Close" className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-lg ring-1 ring-line">×</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white p-3 ring-1 ring-line"><div className="text-xs text-muted">In stock</div><div className="font-mono text-xl font-semibold">{p.stock}</div></div>
                <div className="rounded-2xl bg-white p-3 ring-1 ring-line"><div className="text-xs text-muted">Sells / day</div><div className="font-mono text-xl font-semibold">{velocity(p.id).toFixed(1)}</div></div>
                <div className="rounded-2xl bg-white p-3 ring-1 ring-line"><div className="text-xs text-muted">Lasts</div><div className="font-mono text-xl font-semibold">{p.stock ? days(daysLeft(p)) : "—"}</div></div>
              </div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
                <div className="flex justify-between text-xs text-muted"><span>Units sold, last 14 days</span><span>today</span></div>
                <Spark data={daily(p.id)} className="mt-2 h-16 w-full text-tomato" />
              </div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
                <div className="flex items-center justify-between">
                  <label htmlFor="price" className="text-sm font-semibold">Selling price</label>
                  <input id="price" inputMode="decimal" defaultValue={p.price.toFixed(2)} key={p.id}
                    onBlur={e => { const v = parseFloat(e.target.value); if (v > 0) { setPrice(p.id, v); toast("Price updated"); } }}
                    className="h-10 w-28 rounded-xl bg-paper px-3 text-right font-mono outline-none ring-1 ring-line focus:ring-2 focus:ring-tomato" />
                </div>
                <div className="mt-3 flex justify-between text-xs text-muted"><span>Cost {money(p.cost)}</span><span>Margin {Math.round(((p.price - p.cost) / p.price) * 100)}%</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-good transition-all" style={{ width: `${Math.max(0, ((p.price - p.cost) / p.price) * 100)}%` }} /></div>
              </div>
              <div>
                <div className="text-sm font-semibold">Receive stock</div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[6, 12, 24].map(n => <button key={n} type="button" onClick={() => { restock(p.id, n); toast(`+${n} ${p.name} received`); }} className="h-11 rounded-xl bg-white font-mono font-semibold ring-1 ring-line hover:ring-ink/30">+{n}</button>)}
                  <button type="button" onClick={() => { const n = p.cap - p.stock; if (n > 0) { restock(p.id, n); toast(`Filled to ${p.cap}`); } }} className="h-11 rounded-xl bg-ink text-sm font-semibold text-white">Fill up</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Sheet>

      {/* purchase order */}
      <Sheet open={po} onClose={() => setPo(false)} side="center" label="Reorder list">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div><h2 className="text-xl font-bold tracking-tight">Reorder list</h2><p className="mt-1 text-sm text-muted">Suggested from the last 7 days of sales, enough for about a week.</p></div>
            <button type="button" onClick={() => setPo(false)} aria-label="Close" className="grid size-10 place-items-center rounded-full bg-white text-lg ring-1 ring-line">×</button>
          </div>
          {!reorder.length ? <p className="py-10 text-center text-muted">Nothing to reorder right now.</p> : (
            <>
              <ul className="mt-4 divide-y divide-line">
                {reorder.map(({ p: x, qty }) => (
                  <li key={x.id} className="flex items-center gap-3 py-3">
                    <Photo src={x.img} alt="" className="size-11 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{x.name}</div><div className="text-xs text-muted">{x.stock} left · {x.stock ? days(daysLeft(x)) : "out"}</div></div>
                    <label className="sr-only" htmlFor={"po-" + x.id}>Quantity for {x.name}</label>
                    <input id={"po-" + x.id} inputMode="numeric" value={poQty[x.id] ?? qty} onChange={e => setPoQty(s => ({ ...s, [x.id]: Math.max(0, parseInt(e.target.value || "0")) }))} className="h-9 w-16 rounded-lg bg-white text-center font-mono outline-none ring-1 ring-line focus:ring-2 focus:ring-tomato" />
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm font-semibold"><span>Estimated cost</span><span className="font-mono">{money(poTotal)}</span></div>
              <button type="button" onClick={() => { reorder.forEach(r => restock(r.p.id, poQty[r.p.id] ?? r.qty)); setPo(false); toast("Order received. Stock updated."); }} className="mt-4 h-12 w-full rounded-full bg-ink font-semibold text-white hover:bg-tomato">Mark all as received</button>
            </>
          )}
        </div>
      </Sheet>
    </div>
  );
}
