"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import Sell, { match, type Cart } from "./Sell";
import Shelf from "./Shelf";
import Reports from "./Reports";
import Tabs from "./Tabs";
import Assistant from "./Assistant";
import { Confetti, I, Ico, Kbd, Photo, level } from "./ui";

type View = "sell" | "shelf" | "reports" | "tabs";
type Filter = "all" | "low" | "out" | "exp";
const NAV: [View, string, React.ReactNode][] = [["sell", "Sell", I.sell], ["shelf", "Shelf", I.shelf], ["reports", "Reports", I.insights], ["tabs", "Tabs", I.tabs]];
const SUB: Record<View, string> = { sell: "Ring up a sale in seconds", shelf: "Stock, forecasts and reorders", reports: "Live numbers and comparisons", tabs: "Customers who pay later" };
const SG = "mailto:stackglintt@gmail.com?subject=I%20want%20a%20system%20like%20the%20Tillo%20demo";

function Mark({ size = "size-10" }: { size?: string }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(135deg,#FF8A5B,#FF4F2E)] text-white shadow-[0_10px_24px_-10px_rgba(255,79,46,.9)]`}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z" /><path d="M9.5 8h5M9.5 12h5M9.5 16h3" /></svg>
    </span>
  );
}

type Action = { t: "add"; id: string; qty: number } | { t: "restock"; id: string; qty: number } | { t: "shelf"; f: Filter } | { t: "view"; v: View } | { t: "fill"; s: string } | { t: "ask" };

function Palette({ open, onClose, run }: { open: boolean; onClose: () => void; run: (a: Action) => void }) {
  const { products, money } = useStore();
  const [q, setQ] = useState(""); const [i, setI] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setI(0); setTimeout(() => ref.current?.focus(), 30); } }, [open]);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase(), out: { label: string; hint: string; img?: string; act: Action }[] = [];
    const best = (t: string) => products.map(p => [p, match(t, p.name, p.sku)] as const).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0]?.[0];
    let m = s.match(/^(?:sell|add)?\s*(\d+)\s*(?:x\s*)?(.+)$/) || s.match(/^(?:sell|add)\s+(.+)$/);
    if (m) { const qty = m.length === 3 ? parseInt(m[1]) : 1, p = best(m.length === 3 ? m[2] : m[1]); if (p) out.push({ label: `Add ${qty} × ${p.name} to the sale`, hint: money(p.price * qty), img: p.img, act: { t: "add", id: p.id, qty } }); }
    m = s.match(/^(?:restock|receive)\s+(.+?)\s+(\d+)$/);
    if (m) { const p = best(m[1]); if (p) out.push({ label: `Receive ${m[2]} × ${p.name}`, hint: `${p.stock} → ${p.stock + parseInt(m[2])}`, img: p.img, act: { t: "restock", id: p.id, qty: parseInt(m[2]) } }); }
    if (/^(low|running low)/.test(s)) out.push({ label: "Show items running low", hint: "Shelf", act: { t: "shelf", f: "low" } });
    if (/^out/.test(s)) out.push({ label: "Show out-of-stock items", hint: "Shelf", act: { t: "shelf", f: "out" } });
    if (/^exp/.test(s)) out.push({ label: "Show items expiring soon", hint: "Shelf", act: { t: "shelf", f: "exp" } });
    if (/^ask|\?$/.test(s)) out.push({ label: "Ask Tillo a question", hint: "Assistant", act: { t: "ask" } });
    for (const [v, l] of NAV) if (s && (l.toLowerCase().startsWith(s.replace(/^go\s+/, "")) || ("go " + l.toLowerCase()).startsWith(s))) out.push({ label: `Go to ${l}`, hint: "View", act: { t: "view", v } });
    if (s && !out.some(o => o.act.t === "add")) products.map(p => [p, match(s, p.name, p.sku)] as const).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .forEach(([p]) => out.push({ label: `Add ${p.name}`, hint: `${money(p.price)} · ${p.stock} left`, img: p.img, act: { t: "add", id: p.id, qty: 1 } }));
    if (!s) return [
      { label: "sell 2 croissant", hint: "Add to the sale", act: { t: "fill", s: "sell 2 croissant" } as Action },
      { label: "restock milk 24", hint: "Receive stock", act: { t: "fill", s: "restock milk 24" } as Action },
      { label: "low", hint: "Items running low", act: { t: "fill", s: "low" } as Action },
      { label: "go reports", hint: "Open a view", act: { t: "fill", s: "go reports" } as Action },
      { label: "ask", hint: "Ask Tillo", act: { t: "fill", s: "ask" } as Action },
    ];
    return out.slice(0, 7);
  }, [q, products, money]);

  const exec = (k: number) => { const it = items[k]; if (!it) return; if (it.act.t === "fill") { setQ(it.act.s); setI(0); ref.current?.focus(); return; } run(it.act); onClose(); };

  return (
    <div className={`fixed inset-0 z-[60] ${open ? "visible" : "invisible"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-ink/35 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Quick command" className={`absolute left-1/2 top-[12vh] w-[min(94vw,580px)] -translate-x-1/2 overflow-hidden rounded-[28px] bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl transition duration-200 ${open ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <div className="flex items-center gap-3 border-b border-black/5 px-5">
          <Ico d={I.bolt} className="size-5 text-tomato" />
          <label htmlFor="cmd" className="sr-only">Type a command</label>
          <input id="cmd" ref={ref} value={q} onChange={e => { setQ(e.target.value); setI(0); }} placeholder="Type a command or product…"
            onKeyDown={e => { if (e.key === "ArrowDown") { e.preventDefault(); setI(x => Math.min(items.length - 1, x + 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setI(x => Math.max(0, x - 1)); } if (e.key === "Enter") exec(i); if (e.key === "Escape") onClose(); }}
            className="h-16 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted" />
          <Kbd>Esc</Kbd>
        </div>
        <div className="px-5 pb-1 pt-3 text-[0.68rem] font-semibold uppercase tracking-[.12em] text-muted">{q ? "Results" : "Try typing"}</div>
        <ul className="max-h-[50vh] overflow-y-auto px-2.5 pb-2.5" role="listbox" aria-label="Commands">
          {items.map((it, k) => (
            <li key={k} role="option" aria-selected={k === i}>
              <button type="button" onMouseEnter={() => setI(k)} onClick={() => exec(k)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${k === i ? "bg-ink text-white" : ""}`}>
                {it.img ? <Photo src={it.img} alt="" className="size-9 shrink-0 rounded-xl" /> : <span className={`grid size-9 shrink-0 place-items-center rounded-xl font-mono text-xs ${k === i ? "bg-white/15" : "bg-paper"}`}>›</span>}
                <span className={`min-w-0 flex-1 truncate ${q ? "" : "font-mono text-sm"}`}>{it.label}</span>
                <span className={`shrink-0 text-xs ${k === i ? "text-white/60" : "text-muted"}`}>{it.hint}</span>
              </button>
            </li>
          ))}
          {!items.length && <li className="px-3 py-6 text-center text-sm text-muted">No match. Try “sell 3 eggs” or “restock rice 10”.</li>}
        </ul>
      </div>
    </div>
  );
}

function Shell() {
  const { cur, setCur, toasts, restock, products, toast, reset, customers, todayRev, goal, money, celebrate } = useStore();
  const [view, setView] = useState<View>("sell");
  const [filter, setFilter] = useState<Filter>("all");
  const [shelfKey, setShelfKey] = useState(0);
  const [cart, setCart] = useState<Cart>({});
  const [cmd, setCmd] = useState(false);
  const [ask, setAsk] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd(x => !x); } };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, []);

  const go = (v: View, f: Filter = "all") => { setView(v); if (v === "shelf") { setFilter(f); setShelfKey(x => x + 1); } };
  const run = (a: Action) => {
    if (a.t === "add") { const p = products.find(x => x.id === a.id)!; const room = p.stock - (cart[a.id] || 0); if (room <= 0) { toast(`${p.name} is out of stock`); return; } const n = Math.min(room, a.qty); setCart(c => ({ ...c, [a.id]: (c[a.id] || 0) + n })); go("sell"); toast(`Added ${n} × ${p.name}`); }
    if (a.t === "restock") { const p = products.find(x => x.id === a.id)!; restock(a.id, a.qty); toast(`Received ${a.qty} × ${p.name}`); }
    if (a.t === "shelf") go("shelf", a.f);
    if (a.t === "view") go(a.v);
    if (a.t === "ask") setAsk(true);
  };
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const badge: Record<View, number> = { sell: count, shelf: products.filter(p => level(p) !== "ok").length, reports: 0, tabs: customers.filter(c => c.tab > 0).length };
  const hour = now.getHours(), greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const gk = Math.min(1, todayRev / goal);

  return (
    <div className="bg-mesh flex h-dvh gap-0 lg:gap-3 lg:p-3">
      {/* sidebar (lg) */}
      <aside className="hidden w-[256px] shrink-0 flex-col rounded-[30px] border border-black/[.05] bg-white/70 p-4 shadow-[0_20px_50px_-30px_rgba(20,20,30,.35)] backdrop-blur-xl lg:flex" aria-label="Main">
        <div className="flex items-center gap-3 px-1"><Mark /><div><div className="text-lg font-bold leading-none tracking-tight">tillo</div><div className="mt-1 text-xs text-muted">Demo store</div></div></div>
        <button type="button" onClick={() => setCmd(true)} className="mt-6 flex h-11 items-center gap-2.5 rounded-2xl bg-paper/80 px-3 text-sm text-muted ring-1 ring-black/5 transition hover:ring-ink/20">
          <Ico d={I.search} className="size-4" /><span className="flex-1 text-left">Search or command</span><Kbd>Ctrl K</Kbd>
        </button>
        <nav className="mt-5 flex flex-col gap-1">
          {NAV.map(([v, l, d]) => (
            <button key={v} type="button" onClick={() => go(v)} aria-current={view === v ? "page" : undefined}
              className={`group flex h-12 items-center gap-3 rounded-2xl px-3 text-[0.95rem] font-semibold transition ${view === v ? "bg-ink text-white shadow-[0_10px_24px_-12px_rgba(20,20,30,.7)]" : "text-ink/70 hover:bg-white hover:text-ink"}`}>
              <Ico d={d} className="size-5" /><span className="flex-1 text-left">{l}</span>
              {badge[v] > 0 && <span className={`grid min-w-6 place-items-center rounded-full px-1.5 font-mono text-[0.7rem] ${view === v ? "bg-white/15 text-white" : v === "sell" ? "bg-tomato text-white" : "bg-black/5 text-muted"}`}>{badge[v]}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <button type="button" onClick={() => go("reports")} className="w-full rounded-[22px] bg-paper/80 p-4 text-left ring-1 ring-black/5 transition hover:ring-ink/15">
            <div className="flex items-center justify-between text-xs text-muted"><span>Today vs goal</span><span className="font-mono">{Math.round(gk * 100)}%</span></div>
            <div className="mt-1.5 font-mono text-lg font-semibold">{money(todayRev)}</div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[.06]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#FF8A5B,#FF4F2E)] transition-all duration-1000" style={{ width: `${gk * 100}%` }} /></div>
          </button>
          <button type="button" onClick={() => setAsk(true)} className="ask-btn flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white">✦ Ask Tillo</button>
          <a href={SG} className="block px-1 text-center text-[0.7rem] leading-relaxed text-muted hover:text-ink">Demo by <b>StackGlint</b> · sample data<br />Want this for your shop?</a>
        </div>
      </aside>

      {/* compact rail (md) */}
      <nav className="m-3 mr-0 hidden w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-[26px] border border-black/[.05] bg-white/70 py-4 backdrop-blur-xl md:flex lg:hidden" aria-label="Main">
        <Mark />
        <div className="mt-4 flex flex-col gap-1">
          {NAV.map(([v, l, d]) => (
            <button key={v} type="button" onClick={() => go(v)} aria-current={view === v ? "page" : undefined} className={`relative flex w-[60px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[0.66rem] font-semibold ${view === v ? "bg-ink text-white" : "text-muted hover:bg-white"}`}>
              <Ico d={d} className="size-5" />{l}
              {v === "sell" && count > 0 && <span className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-tomato px-1 font-mono text-[0.6rem] text-white">{count}</span>}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setAsk(true)} aria-label="Ask Tillo" className="ask-btn mt-auto grid size-12 place-items-center rounded-2xl text-white">✦</button>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden lg:rounded-[30px] lg:border lg:border-black/[.05] lg:bg-white/40 lg:backdrop-blur-xl">
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-4 md:px-8 md:pt-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="md:hidden"><Mark size="size-9" /></span>
            <div className="min-w-0">
              <p className="hidden text-sm text-muted sm:block">{greet} · {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p>
              <h1 className="flex items-center gap-2 text-[1.6rem] font-bold leading-tight tracking-tight md:text-[2rem]">{NAV.find(n => n[0] === view)![1]}<span className="hidden rounded-full bg-black/5 px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-normal text-muted sm:inline">Demo</span></h1>
              <p className="hidden text-sm text-muted md:block lg:hidden">{SUB[view]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCmd(true)} className="hidden h-10 items-center gap-2 rounded-full bg-white/80 px-3.5 text-sm text-muted shadow-sm ring-1 ring-black/5 hover:ring-ink/20 md:flex lg:hidden"><Ico d={I.bolt} className="size-4 text-tomato" />Command</button>
            <div className="flex rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-black/5" role="radiogroup" aria-label="Currency">
              {(["USD", "LKR"] as const).map(c => <button key={c} type="button" role="radio" aria-checked={cur === c} onClick={() => setCur(c)} className={`h-8 rounded-full px-3 font-mono text-xs font-semibold transition ${cur === c ? "bg-ink text-white" : "text-muted"}`}>{c === "USD" ? "$" : "Rs"}</button>)}
            </div>
            <button type="button" onClick={() => { if (confirmReset) { reset(); setCart({}); setConfirmReset(false); toast("Demo data reset"); } else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000); } }}
              className={`hidden h-10 rounded-full px-4 text-xs font-semibold shadow-sm ring-1 transition sm:block ${confirmReset ? "bg-stop text-white ring-stop" : "bg-white/80 text-muted ring-black/5 hover:ring-ink/20"}`}>{confirmReset ? "Click to confirm" : "Reset demo"}</button>
          </div>
        </header>

        <main className="view-in min-h-0 flex-1" key={view}>
          {view === "sell" && <Sell cart={cart} setCart={setCart} />}
          {view === "shelf" && <Shelf key={shelfKey} initial={filter} />}
          {view === "reports" && <Reports go={(v, f) => go(v, f)} />}
          {view === "tabs" && <Tabs />}
        </main>
      </div>

      {/* mobile dock */}
      <nav className="fixed inset-x-3 z-40 flex rounded-[26px] border border-black/[.06] bg-white/85 p-1.5 shadow-[0_20px_40px_-20px_rgba(20,20,30,.5)] backdrop-blur-xl md:hidden" style={{ bottom: "calc(12px + env(safe-area-inset-bottom))" }} aria-label="Main">
        {NAV.map(([v, l, d]) => (
          <button key={v} type="button" onClick={() => go(v)} aria-current={view === v ? "page" : undefined} className={`relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[0.66rem] font-semibold transition ${view === v ? "bg-ink text-white" : "text-muted"}`}>
            <Ico d={d} className="size-5" />{l}
            {v === "sell" && count > 0 && <span className="absolute right-[calc(50%-20px)] top-1.5 grid min-w-5 place-items-center rounded-full bg-tomato px-1 font-mono text-[0.6rem] text-white">{count}</span>}
          </button>
        ))}
        <button type="button" onClick={() => setAsk(true)} aria-label="Ask Tillo" className="ask-btn ml-1 flex h-14 w-14 flex-col items-center justify-center rounded-[20px] text-[0.66rem] font-semibold text-white">✦<span>Ask</span></button>
      </nav>

      <Palette open={cmd} onClose={() => setCmd(false)} run={run} />
      <Assistant open={ask} onClose={() => setAsk(false)} />
      <Confetti fire={celebrate} />

      <div className="pointer-events-none fixed inset-x-0 bottom-[164px] z-[70] flex flex-col items-center gap-2 md:bottom-8" aria-live="polite">
        {toasts.map(t => <div key={t.id} className="toast rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-xl">{t.t}</div>)}
      </div>
    </div>
  );
}

export default function App() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return (
    <div className="bg-mesh grid h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4"><Mark /><div className="text-sm font-medium text-muted">Opening tillo…</div></div>
    </div>
  );
  return <StoreProvider><Shell /></StoreProvider>;
}
