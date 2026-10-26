"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/data";

export function Photo({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [ok, setOk] = useState(true);
  const pos = /(^|\s)absolute/.test(className) ? "" : "relative";
  return (
    <div className={`${pos} overflow-hidden bg-[linear-gradient(135deg,#e6e1d6,#cfc7b8)] ${className}`}>
      {ok && <img src={src} alt={alt} loading="lazy" decoding="async" draggable={false} onError={() => setOk(false)} className="absolute inset-0 size-full object-cover" />}
    </div>
  );
}

export type Level = "out" | "low" | "ok";
export const level = (p: Product): Level => (p.stock <= 0 ? "out" : p.stock <= p.min ? "low" : "ok");
export const LEVEL = {
  out: { label: "Out of stock", short: "Out", text: "text-stop", bg: "bg-stop", soft: "bg-stop/12", icon: "✕" },
  low: { label: "Running low", short: "Low", text: "text-warn", bg: "bg-warn", soft: "bg-warn/15", icon: "!" },
  ok: { label: "In stock", short: "OK", text: "text-good", bg: "bg-good", soft: "bg-good/12", icon: "✓" },
} as const;

export function StockChip({ p, compact = false }: { p: Product; compact?: boolean }) {
  const l = LEVEL[level(p)];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${l.soft} ${l.text}`}>
      <span className={`grid size-3.5 place-items-center rounded-full text-[0.55rem] text-white ${l.bg}`} aria-hidden="true">{l.icon}</span>
      {compact ? (p.stock > 0 ? `${p.stock} left` : "Out") : l.label}
    </span>
  );
}

/** Animated number that eases to its new value. */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(value); return; }
    const from = v, t0 = performance.now(); let raf = 0;
    const f = (t: number) => { const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3); setV(from + (value - from) * e); if (k < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{format(v)}</>;
}

export function Spark({ data, className = "" }: { data: number[]; className?: string }) {
  const max = Math.max(1, ...data), w = 100 / data.length;
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={className} aria-hidden="true">
      <line x1="0" x2="100" y1="31.5" y2="31.5" stroke="currentColor" strokeOpacity=".15" strokeWidth=".6" />
      {data.map((d, i) => { const h = Math.max(1.2, (d / max) * 30); return <rect key={i} x={i * w + w * 0.18} y={31 - h} width={w * 0.64} height={h} rx="1" fill="currentColor" opacity={i === data.length - 1 ? 1 : 0.45} />; })}
    </svg>
  );
}

export function Sheet({ open, onClose, children, side = "right", label }: { open: boolean; onClose: () => void; children: React.ReactNode; side?: "right" | "center"; label: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k); const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [open, onClose]);
  return (
    <div className={`fixed inset-0 z-50 ${open ? "visible" : "invisible"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-ink/40 backdrop-blur-[3px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={label}
        className={side === "right"
          ? `absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[28px] bg-paper shadow-2xl transition-transform duration-300 ease-out sm:inset-y-3 sm:left-auto sm:right-3 sm:max-h-none sm:w-[440px] sm:rounded-[28px] ${open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-[110%] sm:translate-y-0"}`
          : `absolute left-1/2 top-1/2 max-h-[90dvh] w-[min(94vw,520px)] -translate-x-1/2 overflow-y-auto rounded-[28px] bg-paper shadow-2xl transition duration-300 ${open ? "-translate-y-1/2 scale-100 opacity-100" : "-translate-y-[45%] scale-95 opacity-0"}`}>
        {children}
      </div>
    </div>
  );
}

export const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded-md border border-line bg-white px-1.5 py-0.5 font-mono text-[0.68rem] font-medium text-muted shadow-[0_1px_0_#d9d4c8]">{children}</kbd>
);

export const I = {
  sell: <path d="M4 7h16l-1.5 10.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5zM9 7V5.5a3 3 0 0 1 6 0V7" />,
  shelf: <path d="M4 4v16M20 4v16M4 9h16M4 15h16M7 9V6.5h4V9M13 15v-3.5h4V15M8 20v-2.5h3V20" />,
  insights: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  tabs: <path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2zM9 9h6M9 13h4" />,
  search: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
};
export function Ico({ d, className = "size-5" }: { d: React.ReactNode; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
}

export function Card({ className = "", children, label }: { className?: string; children: React.ReactNode; label?: string }) {
  return <section aria-label={label} className={`card rounded-[28px] border border-black/[.05] bg-white/80 p-5 shadow-[0_1px_2px_rgba(20,20,30,.04),0_12px_32px_-18px_rgba(20,20,30,.18)] backdrop-blur-xl md:p-6 ${className}`}>{children}</section>;
}

export function CardHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h2 className="text-[1.05rem] font-bold tracking-tight">{title}</h2>{sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}</div>
      {right}
    </div>
  );
}

export function Delta({ v, invert = false }: { v: number | null; invert?: boolean }) {
  if (v === null || !isFinite(v)) return <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold text-muted">new</span>;
  const up = v >= 0, good = invert ? !up : up;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${good ? "bg-good/12 text-good" : "bg-stop/10 text-stop"}`}>
      <span aria-hidden="true">{up ? "↑" : "↓"}</span>{Math.abs(v).toFixed(Math.abs(v) < 10 ? 1 : 0)}%
    </span>
  );
}

const CONFETTI = ["#FF4F2E", "#2a78d6", "#e87ba4", "#6250d6", "#1baf7a", "#F2B233"];
export function Confetti({ fire }: { fire: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => { if (!fire) return; setOn(true); const t = setTimeout(() => setOn(false), 3200); return () => clearTimeout(t); }, [fire]);
  if (!on) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden="true">
      {Array.from({ length: 90 }).map((_, i) => {
        const left = (i * 37) % 100, delay = (i % 15) * 0.06, dur = 2.2 + ((i * 13) % 10) / 10, rot = (i * 47) % 360, w = 6 + (i % 4) * 2;
        return <span key={i} className="confetti absolute top-[-20px] rounded-[2px]" style={{ left: `${left}%`, width: w, height: w * 1.6, background: CONFETTI[i % CONFETTI.length], animationDelay: `${delay}s`, animationDuration: `${dur}s`, transform: `rotate(${rot}deg)` }} />;
      })}
    </div>
  );
}
