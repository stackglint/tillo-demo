"use client";

import { useEffect, useMemo, useState } from "react";
import { CATS, type Sale } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Card, CardHead, CountUp, Delta, LEVEL, Photo, level } from "./ui";

const DAY = 864e5;
const sod = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
type Period = "today" | "week" | "month";
const PERIODS: [Period, string, string][] = [["today", "Today", "yesterday"], ["week", "This week", "last week"], ["month", "This month", "last month"]];

function windows(period: Period, now: number) {
  const today = sod(now);
  if (period === "today") return { cur: today, prev: today - DAY, n: 13, len: DAY, label: (i: number) => { const h = 7 + i; return h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`; }, bucket: (t: number, s: number) => new Date(t).getHours() - 7 };
  if (period === "week") { const dow = (new Date(now).getDay() + 6) % 7, cur = today - dow * DAY; return { cur, prev: cur - 7 * DAY, n: 7, len: 7 * DAY, label: (i: number) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i], bucket: (t: number, s: number) => Math.floor((sod(t) - s) / DAY) }; }
  const d = new Date(now), cur = new Date(d.getFullYear(), d.getMonth(), 1).getTime(), prev = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return { cur, prev, n, len: cur - prev, label: (i: number) => String(i + 1), bucket: (t: number) => new Date(t).getDate() - 1 };
}

const sum = (xs: Sale[]) => {
  const rev = xs.reduce((a, s) => a + s.total, 0), profit = xs.reduce((a, s) => a + s.lines.reduce((b, l) => b + l.qty * (l.price - l.cost), 0) - s.discount, 0);
  const items = xs.reduce((a, s) => a + s.lines.reduce((b, l) => b + l.qty, 0), 0);
  return { rev, profit, bills: xs.length, avg: xs.length ? rev / xs.length : 0, items };
};
const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);

function GoalRing({ value, goal, money, onEdit }: { value: number; goal: number; money: (n: number) => string; onEdit: (n: number) => void }) {
  const k = Math.min(1, value / goal), r = 42, c = 2 * Math.PI * r;
  const [edit, setEdit] = useState(false); const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[104px] shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="url(#gg)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - k)} className="transition-[stroke-dashoffset] duration-1000 ease-out" />
          <defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stopColor="#FF8A5B" /><stop offset="1" stopColor="#FF4F2E" /></linearGradient></defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center"><div><div className="font-mono text-xl font-semibold">{Math.round(k * 100)}%</div><div className="text-[0.62rem] text-white/60">of goal</div></div></div>
      </div>
      <div className="min-w-0">
        <div className="text-xs text-white/60">Daily goal</div>
        {edit ? (
          <form onSubmit={e => { e.preventDefault(); const n = parseFloat(v); if (n > 0) onEdit(n); setEdit(false); }} className="mt-1 flex gap-1.5">
            <label htmlFor="goal" className="sr-only">Daily goal</label>
            <input id="goal" autoFocus inputMode="decimal" value={v} onChange={e => setV(e.target.value.replace(/[^0-9.]/g, ""))} className="h-9 w-24 rounded-xl bg-white/10 px-2 font-mono text-white outline-none ring-1 ring-white/20 focus:ring-tomato" />
            <button className="h-9 rounded-xl bg-tomato px-3 text-sm font-semibold">Set</button>
          </form>
        ) : (
          <button type="button" onClick={() => { setV(String(goal)); setEdit(true); }} className="mt-0.5 font-mono text-lg font-semibold underline decoration-white/25 decoration-dashed underline-offset-4 hover:decoration-white">{money(goal)}</button>
        )}
        <div className="mt-1 text-xs text-white/60">{value >= goal ? "Goal reached today" : `${money(goal - value)} to go`}</div>
      </div>
    </div>
  );
}

export default function Reports({ go }: { go: (view: "shelf", filter?: "low" | "out" | "exp") => void }) {
  const { sales, products, money, daysLeft, goal, setGoal, todayRev, live, setLive, lastSale } = useStore();
  const [period, setPeriod] = useState<Period>(() => {
    const n = Date.now(), c = (p: Period) => sales.filter(x => x.ts >= windows(p, n).cur).length;
    return c("today") >= 3 ? "today" : c("week") >= 10 ? "week" : "month";
  });
  const [mode, setMode] = useState<"run" | "each">("run");
  const [hover, setHover] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(id); }, []);
  useEffect(() => setNow(Date.now()), [sales]);

  const w = useMemo(() => windows(period, now), [period, now]);
  const elapsed = now - w.cur;
  const data = useMemo(() => {
    const cur = sales.filter(s => s.ts >= w.cur && s.ts <= now), prevAll = sales.filter(s => s.ts >= w.prev && s.ts < w.cur);
    const prevSame = prevAll.filter(s => s.ts <= w.prev + elapsed);
    const cb = Array(w.n).fill(0), pb = Array(w.n).fill(0);
    for (const s of cur) { const i = w.bucket(s.ts, w.cur); if (i >= 0 && i < w.n) cb[i] += s.total; }
    for (const s of prevAll) { const i = w.bucket(s.ts, w.prev); if (i >= 0 && i < w.n) pb[i] += s.total; }
    const nowIdx = Math.min(w.n - 1, Math.max(0, w.bucket(now, w.cur)));
    const cats = CATS.map(c => {
      const f = (xs: Sale[]) => xs.reduce((a, s) => a + s.lines.reduce((b, l) => b + (products.find(p => p.id === l.id)!.cat === c ? l.qty * l.price : 0), 0), 0);
      return { c, cur: f(cur), prev: f(prevSame) };
    });
    const units = (xs: Sale[]) => { const m: Record<string, number> = {}; for (const s of xs) for (const l of s.lines) m[l.id] = (m[l.id] || 0) + l.qty; return m; };
    const uc = units(cur), up = units(prevSame);
    const movers = Object.keys({ ...uc, ...up }).map(id => ({ p: products.find(x => x.id === id)!, cur: uc[id] || 0, prev: up[id] || 0 })).sort((a, b) => b.cur - a.cur).slice(0, 6);
    const mix: Record<string, number> = { Card: 0, Cash: 0, QR: 0, Tab: 0 }; for (const s of cur) mix[s.method] += s.total;
    return { c: sum(cur), p: sum(prevSame), cb, pb, nowIdx, cats, movers, mix };
  }, [sales, w, now, elapsed, products]);

  const series = (b: number[], upto: number) => { let acc = 0; return b.map((v, i) => (i > upto ? null : mode === "run" ? (acc += v) : v)); };
  const cs = series(data.cb, data.nowIdx), ps = series(data.pb, w.n - 1);
  const maxY = Math.max(1, ...cs.map(v => v ?? 0), ...ps.map(v => v ?? 0)) * 1.08;
  const W = 640, H = 220, X = (i: number) => (w.n === 1 ? W / 2 : (i / (w.n - 1)) * W), Y = (v: number) => H - (v / maxY) * H;
  const path = (s: (number | null)[]) => s.map((v, i) => v === null ? "" : `${i === 0 || s[i - 1] === null ? "M" : "L"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const curPath = path(cs), lastI = data.nowIdx;
  const area = cs[0] !== null ? `${curPath} L${X(lastI)},${H} L${X(0)},${H} Z` : "";
  const prevName = PERIODS.find(x => x[0] === period)![2];
  const ahead = data.c.rev - data.p.rev;

  const kpis: [string, number, number, (n: number) => string][] = [
    ["Revenue", data.c.rev, data.p.rev, money], ["Profit", data.c.profit, data.p.profit, money],
    ["Bills", data.c.bills, data.p.bills, n => String(Math.round(n))], ["Average bill", data.c.avg, data.p.avg, money], ["Items sold", data.c.items, data.p.items, n => String(Math.round(n))],
  ];
  const mixTotal = Object.values(data.mix).reduce((a, b) => a + b, 0) || 1;
  const MIX_C: Record<string, string> = { Card: "#2a78d6", Cash: "#e87ba4", QR: "#6250d6", Tab: "#1baf7a" };
  const alerts = [
    ...products.filter(p => level(p) === "out").map(p => ({ k: "out" as const, t: `${p.name} is out of stock`, a: "Reorder", f: "out" as const })),
    ...products.filter(p => p.stock > 0 && daysLeft(p) < 2).map(p => ({ k: "low" as const, t: `${p.name} runs out in about ${Math.max(1, Math.round(daysLeft(p) * 24))} h`, a: "Restock", f: "low" as const })),
    ...products.filter(p => p.expires !== undefined && p.expires <= 2 && p.stock > 6).map(p => ({ k: "low" as const, t: `${p.stock} × ${p.name} expire within ${p.expires} d`, a: "View", f: "exp" as const })),
  ].slice(0, 5);
  const lastP = lastSale ? products.find(x => x.id === lastSale.lines[0].id) : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1400px] space-y-5 p-4 pb-32 md:p-8 md:pb-12">
        {/* controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-black/5" role="tablist" aria-label="Period">
            {PERIODS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={period === k} onClick={() => { setPeriod(k); setHover(null); }} className={`h-10 rounded-full px-4 text-sm font-semibold transition sm:px-5 ${period === k ? "bg-ink text-white shadow" : "text-muted hover:text-ink"}`}>{l}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Compared with {prevName}, same point in time</span>
            <button type="button" onClick={() => setLive(!live)} aria-pressed={live} className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition ${live ? "bg-good/10 text-good ring-good/25" : "bg-white text-muted ring-black/10"}`}>
              <span className={`size-2 rounded-full ${live ? "live-dot bg-good" : "bg-muted/50"}`} />{live ? "Live" : "Paused"}
            </button>
          </div>
        </div>

        {/* hero row */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="hero-card relative overflow-hidden rounded-[32px] bg-ink p-6 text-white md:p-7">
            <div className="hero-glow" aria-hidden="true" />
            <div className="relative flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="text-sm text-white/60">{PERIODS.find(x => x[0] === period)![1]} revenue</div>
                <div className="mt-1 font-mono text-[clamp(2.4rem,1.6rem+3vw,3.6rem)] font-semibold leading-none tracking-tight"><CountUp value={data.c.rev} format={money} /></div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <Delta v={pct(data.c.rev, data.p.rev)} />
                  <span className="text-white/70">{ahead >= 0 ? `${money(ahead)} ahead of` : `${money(-ahead)} behind`} {prevName}</span>
                </div>
              </div>
              <GoalRing value={todayRev} goal={goal} money={money} onEdit={setGoal} />
            </div>
            {live && lastSale && lastP && (
              <div key={lastSale.id} className="ticker relative mt-6 flex items-center gap-3 rounded-2xl bg-white/[.07] p-2.5 ring-1 ring-white/10">
                <Photo src={lastP.img} alt="" className="size-9 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 truncate text-sm"><span className="text-white/60">New sale · </span>{lastSale.lines.map(l => `${l.qty} × ${products.find(x => x.id === l.id)!.name}`).join(", ")}</div>
                <span className="shrink-0 font-mono text-sm font-semibold">{money(lastSale.total)}</span>
              </div>
            )}
            <p className="relative mt-3 text-[0.68rem] text-white/40">{live ? "Live mode adds a simulated sale every 15 seconds for this demo." : "Live mode is paused."}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {kpis.slice(1).map(([k, a, b, f]) => (
              <div key={k} className="rounded-[24px] border border-black/[.05] bg-white/80 p-4 shadow-[0_12px_32px_-20px_rgba(20,20,30,.2)] md:p-5">
                <div className="flex items-start justify-between gap-2"><span className="text-sm text-muted">{k}</span><Delta v={pct(a, b)} /></div>
                <div className="mt-3 font-mono text-2xl font-semibold tracking-tight"><CountUp value={a} format={f} /></div>
                <div className="mt-1 text-xs text-muted">vs {f(b)} {prevName}</div>
              </div>
            ))}
          </div>
        </div>

        {/* comparison chart */}
        <Card label="Revenue comparison">
          <CardHead title={`${PERIODS.find(x => x[0] === period)![1]} vs ${prevName}`} sub={mode === "run" ? "Running total of revenue" : `Revenue per ${period === "today" ? "hour" : "day"}`}
            right={<div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-xs font-medium text-muted"><span className="flex items-center gap-1.5"><i className="h-[3px] w-4 rounded-full bg-tomato" />{PERIODS.find(x => x[0] === period)![1]}</span><span className="flex items-center gap-1.5"><i className="h-0 w-4 border-t-2 border-dashed border-ink/35" />{prevName[0].toUpperCase() + prevName.slice(1)}</span></div>
              <div className="flex rounded-full bg-paper p-0.5 ring-1 ring-black/5">{([["run", "Running"], ["each", "Per " + (period === "today" ? "hour" : "day")]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k} className={`h-8 rounded-full px-3 text-xs font-semibold ${mode === k ? "bg-white shadow-sm" : "text-muted"}`}>{l}</button>)}</div>
            </div>} />
          <div className="relative" onPointerLeave={() => setHover(null)}
            onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left - 56) / (r.width - 56)) * (w.n - 1)); setHover(Math.max(0, Math.min(w.n - 1, i))); }}>
            <div className="flex">
              <div className="relative h-[240px] w-14 shrink-0 font-mono text-[0.66rem] text-muted">
                {[1, 0.5, 0].map(g => <span key={g} className="absolute right-3 -translate-y-1/2" style={{ top: `${(1 - g) * (220 / 240) * 100}%` }}>{money(maxY * g).replace(/\.\d+$/, "")}</span>)}
              </div>
              <div className="relative h-[240px] min-w-0 flex-1">
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[220px] w-full overflow-visible" aria-hidden="true">
                  <defs><linearGradient id="ar" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FF4F2E" stopOpacity=".22" /><stop offset="1" stopColor="#FF4F2E" stopOpacity="0" /></linearGradient></defs>
                  {[0, 0.5, 1].map(g => <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="#15161A" strokeOpacity=".07" vectorEffect="non-scaling-stroke" />)}
                  <path d={path(ps)} fill="none" stroke="#15161A" strokeOpacity=".35" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
                  {area && <path d={area} fill="url(#ar)" className="chart-area" />}
                  <path key={period + mode} d={curPath} fill="none" stroke="#FF4F2E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="chart-line" />
                  {hover !== null && <line x1={X(hover)} x2={X(hover)} y1="0" y2={H} stroke="#15161A" strokeOpacity=".25" vectorEffect="non-scaling-stroke" />}
                </svg>
                {cs[lastI] !== null && <span className="pulse absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-tomato ring-4 ring-tomato/20" style={{ left: `${(X(lastI) / W) * 100}%`, top: `${(Y(cs[lastI]!) / H) * 220}px` }} />}
                {hover !== null && (
                  <div className="pointer-events-none absolute top-0 z-10 w-max -translate-x-1/2 rounded-2xl bg-ink/95 px-3.5 py-2.5 text-xs text-white shadow-xl backdrop-blur" style={{ left: `clamp(80px, ${(X(hover) / W) * 100}%, calc(100% - 80px))` }}>
                    <div className="font-semibold">{period === "today" ? w.label(hover) : period === "week" ? w.label(hover) : `Day ${w.label(hover)}`}</div>
                    <div className="mt-1 flex items-center gap-2 font-mono"><i className="size-2 rounded-full bg-tomato" />{cs[hover] === null ? "not yet" : money(cs[hover]!)}</div>
                    <div className="flex items-center gap-2 font-mono text-white/70"><i className="size-2 rounded-full bg-white/40" />{ps[hover] === null ? "—" : money(ps[hover]!)}</div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-between font-mono text-[0.62rem] text-muted">
                  {Array.from({ length: w.n }).map((_, i) => <span key={i} className={w.n > 14 && i % 5 !== 0 && i !== w.n - 1 ? "invisible" : ""} style={{ width: 0, display: "flex", justifyContent: "center" }}>{w.label(i)}</span>)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* categories */}
          <Card label="Sales by category">
            <CardHead title="By category" sub={`vs ${prevName}`} />
            <ul className="space-y-4">
              {data.cats.map(c => {
                const max = Math.max(1, ...data.cats.flatMap(x => [x.cur, x.prev]));
                return (
                  <li key={c.c}>
                    <div className="flex items-center justify-between gap-2 text-sm"><span className="font-semibold">{c.c}</span><span className="flex items-center gap-2"><span className="font-mono">{money(c.cur)}</span><Delta v={pct(c.cur, c.prev)} /></span></div>
                    <div className="relative mt-2 h-2.5 rounded-full bg-paper">
                      <div className="grow h-full rounded-full bg-ink" style={{ width: `${(c.cur / max) * 100}%` }} />
                      <span className="absolute -top-1 h-[18px] w-[2px] rounded-full bg-tomato" style={{ left: `${(c.prev / max) * 100}%` }} title={`${prevName}: ${money(c.prev)}`} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted"><span className="h-3 w-[2px] rounded-full bg-tomato" /> marks {prevName} at the same point</p>
          </Card>

          {/* movers */}
          <Card label="Top products">
            <CardHead title="Top products" sub="Units sold" />
            <ul className="space-y-3">
              {data.movers.map(m => (
                <li key={m.p.id} className="flex items-center gap-3">
                  <Photo src={m.p.img} alt="" className="size-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{m.p.name}</div><div className="font-mono text-xs text-muted">{m.prev} {prevName}</div></div>
                  <span className="font-mono text-sm font-semibold">{m.cur}</span>
                  <Delta v={pct(m.cur, m.prev)} />
                </li>
              ))}
              {!data.movers.length && <li className="text-sm text-muted">No sales yet in this period.</li>}
            </ul>
          </Card>

          <div className="grid content-start gap-5">
            <Card label="Payment mix">
              <CardHead title="How people pay" />
              <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-paper">
                {Object.entries(data.mix).filter(([, v]) => v > 0).map(([k, v]) => <div key={k} className="grow h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(v / mixTotal) * 100}%`, background: MIX_C[k] }} />)}
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {Object.entries(data.mix).map(([k, v]) => <li key={k} className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: MIX_C[k] }} />{k === "Tab" ? "Pay later" : k}<span className="ml-auto font-mono text-muted">{Math.round((v / mixTotal) * 100)}%</span></li>)}
              </ul>
            </Card>
            <Card label="Needs attention">
              <CardHead title="Needs attention" />
              <ul className="space-y-2">
                {alerts.map((a, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-2xl bg-paper/80 p-2.5">
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${LEVEL[a.k].bg}`} aria-hidden="true">{LEVEL[a.k].icon}</span>
                    <p className="min-w-0 flex-1 text-sm leading-snug">{a.t}</p>
                    <button type="button" onClick={() => go("shelf", a.f)} className="h-8 shrink-0 rounded-full bg-white px-3 text-xs font-semibold shadow-sm ring-1 ring-black/5 hover:ring-ink/20">{a.a}</button>
                  </li>
                ))}
                {!alerts.length && <li className="text-sm text-muted">All clear.</li>}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
