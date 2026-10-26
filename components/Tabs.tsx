"use client";

import { useMemo, useState } from "react";
import type { Customer } from "@/lib/data";
import { LKR_RATE, useStore } from "@/lib/store";
import { Card, CardHead, CountUp, Sheet } from "./ui";

const DAY = 864e5;
const initials = (n: string) => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const TONES = ["#2a78d6", "#e87ba4", "#6250d6", "#1baf7a", "#FF4F2E"];
const tone = (id: string) => TONES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];

function ageDays(c: Customer) {
  if (c.tab <= 0) return 0;
  const lastPay = c.history.find(h => h.amount < 0)?.ts ?? 0;
  const charges = c.history.filter(h => h.amount > 0 && h.ts > lastPay);
  const oldest = charges.length ? Math.min(...charges.map(h => h.ts)) : Date.now();
  return Math.floor((Date.now() - oldest) / DAY);
}
function status(c: Customer) {
  if (c.tab <= 0) return { k: "Settled", cls: "bg-good/12 text-good" };
  const d = ageDays(c);
  if (d > 7) return { k: `Overdue · ${d} d`, cls: "bg-stop/10 text-stop" };
  if (c.tab / c.limit > 0.8) return { k: "Near limit", cls: "bg-warn/15 text-warn" };
  return { k: d ? `Open · ${d} d` : "Open · today", cls: "bg-black/5 text-muted" };
}

export default function Tabs() {
  const { customers, money, settle, toast, cur, addCustomer } = useStore();
  const [sel, setSel] = useState(customers.find(c => c.tab > 0)?.id ?? customers[0].id);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"balance" | "overdue" | "name">("balance");
  const [amt, setAmt] = useState("");
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState({ name: "", phone: "", limit: "50" });
  const [remind, setRemind] = useState(false);
  const rate = cur === "USD" ? 1 : LKR_RATE;

  const c = customers.find(x => x.id === sel) ?? customers[0];
  const owed = customers.reduce((a, x) => a + x.tab, 0);
  const overdue = customers.filter(x => x.tab > 0 && ageDays(x) > 7);
  const collected = customers.reduce((a, x) => a + x.history.filter(h => h.amount < 0 && h.ts > Date.now() - 7 * DAY).reduce((b, h) => b - h.amount, 0), 0);

  const list = useMemo(() => {
    const l = customers.filter(x => !q.trim() || x.name.toLowerCase().includes(q.toLowerCase()) || x.phone.includes(q));
    return [...l].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "overdue" ? ageDays(b) - ageDays(a) : b.tab - a.tab);
  }, [customers, q, sort]);

  const pay = (v: number) => { if (!(v > 0)) return; const n = Math.min(v, c.tab); settle(c.id, n); setAmt(""); toast(`${money(n)} received from ${c.name.split(" ")[0]}`); };
  const message = `Hi ${c.name.split(" ")[0]}, a friendly reminder from Tillo: your tab is ${money(c.tab)}. You can pay at the counter any time. Thank you!`;
  let running = c.tab;
  const timeline = c.history.map(h => { const row = { ...h, after: running }; running = +(running - h.amount).toFixed(2); return row; });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1400px] space-y-5 p-4 pb-32 md:p-8 md:pb-12">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <div className="relative col-span-2 overflow-hidden rounded-[28px] bg-ink p-5 text-white md:p-6 xl:col-span-1">
            <div className="hero-glow" aria-hidden="true" />
            <div className="relative text-sm text-white/60">Owed to you</div>
            <div className="relative mt-2 font-mono text-4xl font-semibold tracking-tight"><CountUp value={owed} format={money} /></div>
            <div className="relative mt-1 text-sm text-white/60">{customers.filter(x => x.tab > 0).length} open tabs</div>
          </div>
          {[["Overdue (7+ days)", overdue.reduce((a, x) => a + x.tab, 0), `${overdue.length} customer${overdue.length === 1 ? "" : "s"}`, "text-stop"], ["Collected, last 7 days", collected, "payments received", "text-good"], ["Customers", customers.length, "with a tab account", ""]].map(([k, v, s, cls], i) => (
            <Card key={k as string} className={`!p-4 md:!p-5 ${i === 2 ? "col-span-2 sm:col-span-1" : ""}`}>
              <div className="text-sm text-muted">{k as string}</div>
              <div className={`mt-2 font-mono text-2xl font-semibold tracking-tight md:text-3xl ${cls}`}><CountUp value={v as number} format={i === 2 ? (n => String(Math.round(n))) : money} /></div>
              <div className="mt-1 text-sm text-muted">{s as string}</div>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <Card label="Customers" className="!p-4 md:!p-5">
            <div className="flex gap-2">
              <label htmlFor="csearch" className="sr-only">Search customers</label>
              <input id="csearch" value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or phone" className="h-11 min-w-0 flex-1 rounded-2xl bg-paper px-4 text-sm outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-tomato" />
              <button type="button" onClick={() => setAdding(true)} className="h-11 shrink-0 rounded-2xl bg-ink px-4 text-sm font-semibold text-white hover:bg-tomato">+ New</button>
            </div>
            <div className="mt-3 flex gap-1.5" role="tablist" aria-label="Sort">
              {([["balance", "Highest balance"], ["overdue", "Oldest first"], ["name", "A–Z"]] as const).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={sort === k} onClick={() => setSort(k)} className={`h-8 rounded-full px-3 text-xs font-semibold transition ${sort === k ? "bg-ink text-white" : "bg-paper text-muted hover:text-ink"}`}>{l}</button>)}
            </div>
            <ul className="mt-4 space-y-2">
              {list.map(x => {
                const st = status(x), used = Math.min(1, x.tab / x.limit);
                return (
                  <li key={x.id}>
                    <button type="button" onClick={() => { setSel(x.id); setRemind(false); }} aria-pressed={sel === x.id}
                      className={`w-full rounded-[22px] p-3.5 text-left transition ${sel === x.id ? "bg-ink text-white shadow-lg" : "bg-paper/70 hover:bg-paper"}`}>
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white" style={{ background: tone(x.id) }}>{initials(x.name)}</span>
                        <div className="min-w-0 flex-1"><div className="truncate font-semibold">{x.name}</div><div className={`text-xs ${sel === x.id ? "text-white/60" : "text-muted"}`}>{x.phone}</div></div>
                        <div className="text-right"><div className="font-mono font-semibold">{money(x.tab)}</div><span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.66rem] font-semibold ${sel === x.id ? "bg-white/15 text-white" : st.cls}`}>{st.k}</span></div>
                      </div>
                      <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${sel === x.id ? "bg-white/15" : "bg-black/[.06]"}`}><div className={`h-full rounded-full transition-all duration-700 ${used > 0.8 ? "bg-warn" : sel === x.id ? "bg-white" : "bg-ink/70"}`} style={{ width: `${used * 100}%` }} /></div>
                    </button>
                  </li>
                );
              })}
              {!list.length && <li className="py-6 text-center text-sm text-muted">No customer matches “{q}”.</li>}
            </ul>
          </Card>

          <Card label={`${c.name} account`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="grid size-16 shrink-0 place-items-center rounded-[22px] text-xl font-bold text-white shadow-lg" style={{ background: tone(c.id) }}>{initials(c.name)}</span>
                <div><h2 className="text-xl font-bold tracking-tight">{c.name}</h2><div className="text-sm text-muted">{c.phone} · since {new Date(c.since).toLocaleDateString([], { month: "short", year: "numeric" })}</div><span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${status(c).cls}`}>{status(c).k}</span></div>
              </div>
              <div className="text-right"><div className="text-sm text-muted">Balance</div><div className="font-mono text-3xl font-semibold tracking-tight"><CountUp value={c.tab} format={money} /></div><div className="text-xs text-muted">limit {money(c.limit)}</div></div>
            </div>

            {c.tab > 0 ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="rounded-[22px] bg-paper/80 p-4">
                  <label htmlFor="pay" className="text-sm font-semibold">Record a payment</label>
                  <div className="mt-3 flex gap-2">
                    <input id="pay" inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Amount" className="h-11 min-w-0 flex-1 rounded-xl bg-white px-3 font-mono outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-tomato" />
                    <button type="button" onClick={() => pay(parseFloat(amt) / rate)} className="h-11 rounded-xl bg-ink px-5 font-semibold text-white hover:bg-tomato">Save</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">{[0.25, 0.5, 1].map(f => <button key={f} type="button" onClick={() => pay(+(c.tab * f).toFixed(2))} className="h-8 rounded-full bg-white px-3 text-xs font-semibold ring-1 ring-black/5 hover:ring-ink/20">{f === 1 ? `Full · ${money(c.tab)}` : `${f * 100}% · ${money(c.tab * f)}`}</button>)}</div>
                </div>
                <button type="button" onClick={() => setRemind(r => !r)} aria-expanded={remind} className="flex items-center justify-center gap-2 rounded-[22px] bg-tomato/10 px-5 py-4 text-sm font-semibold text-tomato ring-1 ring-tomato/20 hover:bg-tomato/15 sm:flex-col">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>Reminder
                </button>
              </div>
            ) : <div className="mt-6 rounded-[22px] bg-good/10 p-4 text-sm font-semibold text-good">✓ All paid up. Nothing due.</div>}

            {remind && c.tab > 0 && (
              <div className="pop-in mt-3 rounded-[22px] bg-paper/80 p-4">
                <div className="text-xs font-semibold text-muted">Message preview</div>
                <p className="mt-2 rounded-2xl rounded-tl-md bg-white p-3 text-sm leading-relaxed shadow-sm">{message}</p>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(message).then(() => toast("Reminder copied"), () => toast("Select the text to copy it")); }} className="mt-3 h-9 rounded-full bg-ink px-4 text-xs font-semibold text-white">Copy message</button>
              </div>
            )}

            <CardHead title="Activity" />
            <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-black/10">
              {timeline.map((h, i) => (
                <li key={i} className="relative flex items-center gap-3 rounded-2xl py-2 pr-1">
                  <span className={`relative z-[1] grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${h.amount < 0 ? "bg-good text-white" : "bg-white text-ink ring-1 ring-black/10"}`} aria-hidden="true">{h.amount < 0 ? "✓" : "+"}</span>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{h.note}</div><div className="text-xs text-muted">{new Date(h.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div></div>
                  <div className="text-right"><div className={`font-mono text-sm font-semibold ${h.amount < 0 ? "text-good" : ""}`}>{h.amount < 0 ? "−" + money(-h.amount) : "+" + money(h.amount)}</div><div className="font-mono text-[0.68rem] text-muted">bal {money(Math.max(0, h.after))}</div></div>
                </li>
              ))}
              {!timeline.length && <li className="py-3 text-sm text-muted">No activity yet. Choose “Pay later” at checkout to add to this tab.</li>}
            </ol>
          </Card>
        </div>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} side="center" label="New customer">
        <form className="space-y-4 p-6" onSubmit={e => { e.preventDefault(); if (!nc.name.trim()) return; addCustomer(nc.name.trim(), nc.phone.trim(), Math.max(1, parseFloat(nc.limit) / rate || 50)); setAdding(false); setNc({ name: "", phone: "", limit: "50" }); toast("Customer added"); }}>
          <div className="flex items-start justify-between"><h2 className="text-xl font-bold tracking-tight">New customer</h2><button type="button" onClick={() => setAdding(false)} aria-label="Close" className="grid size-10 place-items-center rounded-full bg-white text-lg ring-1 ring-black/5">×</button></div>
          {([["name", "Full name", "text", "name"], ["phone", "Phone", "tel", "tel"], ["limit", `Credit limit (${cur === "USD" ? "$" : "Rs"})`, "text", "off"]] as const).map(([k, l, t, ac]) => (
            <label key={k} className="block"><span className="text-sm font-semibold">{l}</span>
              <input id={"nc-" + k} type={t} autoComplete={ac} inputMode={k === "limit" ? "decimal" : undefined} value={nc[k]} onChange={e => setNc({ ...nc, [k]: e.target.value })} className="mt-1.5 h-11 w-full rounded-xl bg-white px-3 outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-tomato" required={k === "name"} />
            </label>
          ))}
          <button className="h-12 w-full rounded-full bg-ink font-semibold text-white hover:bg-tomato">Add customer</button>
        </form>
      </Sheet>
    </div>
  );
}
