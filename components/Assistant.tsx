"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { level } from "./ui";

const DAY = 864e5;
const sod = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const SUGGEST = ["How are sales today?", "What should I reorder?", "Best seller this week?", "When is the shop busiest?", "Who owes me money?", "Which item earns the most?"];

type Msg = { from: "me" | "bot"; text: string };

export default function Assistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "Hi! Ask me about sales, stock or tabs. I answer from this store's data." }]);
  const [q, setQ] = useState(""); const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null); const input = useRef<HTMLInputElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 200); }, [open]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [open, onClose]);

  const answer = (raw: string): string => {
    const s = raw.toLowerCase(), { sales, products, money, daysLeft, customers, velocity } = store;
    const now = Date.now(), t0 = sod(now);
    const rev = (a: number, b: number) => sales.filter(x => x.ts >= a && x.ts < b).reduce((acc, x) => acc + x.total, 0);
    const units = (a: number) => { const m: Record<string, number> = {}; for (const x of sales) if (x.ts >= a) for (const l of x.lines) m[l.id] = (m[l.id] || 0) + l.qty; return m; };
    if (/reorder|restock|low|run out|stock/.test(s)) {
      const l = products.filter(p => p.stock <= p.min || daysLeft(p) < 3).sort((a, b) => daysLeft(a) - daysLeft(b)).slice(0, 5);
      return l.length ? "These need attention first:\n" + l.map(p => `• ${p.name}: ${p.stock} left${p.stock ? `, about ${Math.max(1, Math.round(daysLeft(p)))} day(s) at the current pace` : " (out of stock)"}`).join("\n") + "\n\nOpen Shelf → Reorder list for suggested quantities." : "Stock looks healthy. Nothing is close to running out.";
    }
    if (/best|top|popular|seller/.test(s)) {
      const m = units(now - 7 * DAY), top = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return "Top sellers in the last 7 days:\n" + top.map(([id, u], i) => `${i + 1}. ${products.find(p => p.id === id)!.name}: ${u} sold`).join("\n");
    }
    if (/busy|busiest|hour|rush|peak/.test(s)) {
      const h = Array(24).fill(0); for (const x of sales) if (x.ts >= now - 7 * DAY) h[new Date(x.ts).getHours()]++;
      const top = h.map((v, i) => [i, v]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([i]) => i).sort((a, b) => a - b);
      const f = (i: number) => (i % 12 || 12) + (i < 12 ? " am" : " pm");
      return `Over the last 7 days the busiest hours were around ${f(top[0])} and ${f(top[1])}. Plan extra stock and staff before then.`;
    }
    if (/owe|tab|credit|debt|pay later/.test(s)) {
      const open = customers.filter(c => c.tab > 0).sort((a, b) => b.tab - a.tab);
      return open.length ? `${money(open.reduce((a, c) => a + c.tab, 0))} is owed across ${open.length} tabs:\n` + open.map(c => `• ${c.name}: ${money(c.tab)}`).join("\n") : "Nobody owes you anything right now.";
    }
    if (/margin|profit|earn|money maker/.test(s)) {
      const l = [...products].map(p => ({ p, m: (p.price - p.cost) * velocity(p.id) })).sort((a, b) => b.m - a.m).slice(0, 3);
      return "Biggest profit per day, based on margin × sales pace:\n" + l.map((x, i) => `${i + 1}. ${x.p.name}: about ${money(x.m)} a day (${Math.round(((x.p.price - x.p.cost) / x.p.price) * 100)}% margin)`).join("\n");
    }
    if (/week/.test(s)) {
      const dow = (new Date(now).getDay() + 6) % 7, ws = t0 - dow * DAY, el = now - ws;
      const a = rev(ws, now), b = rev(ws - 7 * DAY, ws - 7 * DAY + el), d = b ? ((a - b) / b) * 100 : 0;
      return `This week so far: ${money(a)}. Last week at the same point: ${money(b)} (${d >= 0 ? "up" : "down"} ${Math.abs(d).toFixed(0)}%).`;
    }
    if (/today|sales|revenue|doing|how/.test(s)) {
      const a = rev(t0, now), b = rev(t0 - DAY, now - DAY), d = b ? ((a - b) / b) * 100 : 0;
      const out = products.filter(p => level(p) === "out").length;
      return `Today so far: ${money(a)} from ${sales.filter(x => x.ts >= t0).length} bills. Yesterday by this time: ${money(b)}${b ? ` (${d >= 0 ? "up" : "down"} ${Math.abs(d).toFixed(0)}%)` : ""}. Daily goal: ${Math.round((a / store.goal) * 100)}% reached.${out ? ` ${out} item(s) are out of stock.` : ""}`;
    }
    return "I can answer questions about today's or this week's sales, best sellers, busy hours, reorders, profit and tabs. Try one of the suggestions.";
  };

  const ask = (text: string) => {
    if (!text.trim() || typing) return;
    setMsgs(m => [...m, { from: "me", text }]); setQ(""); setTyping(true);
    setTimeout(() => { setMsgs(m => [...m, { from: "bot", text: answer(text) }]); setTyping(false); }, 650);
  };

  return (
    <div className={`fixed inset-0 z-[55] ${open ? "visible" : "invisible"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-ink/30 backdrop-blur-[2px] transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Ask Tillo"
        className={`absolute inset-x-0 bottom-0 flex h-[86dvh] flex-col overflow-hidden rounded-t-[32px] bg-paper shadow-2xl transition-transform duration-300 sm:inset-y-3 sm:left-auto sm:right-3 sm:h-auto sm:w-[420px] sm:rounded-[32px] ${open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-[110%] sm:translate-y-0"}`}>
        <div className="ask-head relative flex items-center justify-between overflow-hidden px-5 py-4 text-white">
          <div className="relative flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-white/15 text-lg backdrop-blur">✦</span><div><div className="font-bold">Ask Tillo</div><div className="text-xs text-white/70">Answers from your store data</div></div></div>
          <button type="button" onClick={onClose} aria-label="Close" className="relative grid size-10 place-items-center rounded-full bg-white/15 text-lg">×</button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {msgs.map((m, i) => (
            <div key={i} className={`msg flex ${m.from === "me" ? "justify-end" : ""}`}>
              <div className={`max-w-[85%] whitespace-pre-line rounded-[20px] px-4 py-2.5 text-sm leading-relaxed ${m.from === "me" ? "rounded-br-md bg-ink text-white" : "rounded-bl-md bg-white shadow-sm ring-1 ring-black/5"}`}>{m.text}</div>
            </div>
          ))}
          {typing && <div className="flex"><div className="flex gap-1 rounded-[20px] rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">{[0, 1, 2].map(i => <span key={i} className="dot size-1.5 rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />)}</div></div>}
          <div ref={end} />
        </div>
        <div className="border-t border-black/5 p-3">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">{SUGGEST.map(s => <button key={s} type="button" onClick={() => ask(s)} className="h-8 shrink-0 rounded-full bg-white px-3 text-xs font-semibold shadow-sm ring-1 ring-black/5 hover:ring-tomato/40">{s}</button>)}</div>
          <form onSubmit={e => { e.preventDefault(); ask(q); }} className="flex gap-2">
            <label htmlFor="ask" className="sr-only">Ask a question</label>
            <input id="ask" ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Ask about sales, stock, tabs…" className="h-12 min-w-0 flex-1 rounded-2xl bg-white px-4 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-tomato" />
            <button className="grid size-12 place-items-center rounded-2xl bg-tomato text-white" aria-label="Send"><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
          </form>
          <p className="mt-2 text-center text-[0.66rem] text-muted">Demo: rule-based answers. The real version can connect to an AI model.</p>
        </div>
      </div>
    </div>
  );
}
