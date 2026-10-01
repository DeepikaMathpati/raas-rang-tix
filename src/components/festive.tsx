import type { ReactNode } from "react";
import mandala from "@/assets/mandala.png";

export const btnGold =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gold-gradient px-7 py-3.5 font-display text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
export const btnOutline =
  "inline-flex items-center justify-center gap-2 rounded-full border border-gold/60 px-6 py-3 font-display text-xs uppercase tracking-[0.18em] text-gold-soft transition-colors hover:bg-gold/10";
export const inputCls =
  "w-full rounded-md border border-input bg-background/60 px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring";

export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-gold ${className}`} aria-hidden>
      <span className="divider-ornate w-16 sm:w-24" />
      <svg width="28" height="14" viewBox="0 0 28 14" fill="currentColor">
        <path d="M14 0l3 7-3 7-3-7zM4 5l2 2-2 2-2-2zM24 5l2 2-2 2-2-2z" />
      </svg>
      <span className="divider-ornate w-16 sm:w-24" />
    </div>
  );
}

export function SectionTitle({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="font-script text-3xl text-ember sm:text-4xl">{kicker}</p>
      <h2 className="mt-1 text-2xl uppercase text-gold-gradient sm:text-4xl">{title}</h2>
      <Ornament className="mt-4" />
      {children && <p className="mt-4 text-lg text-muted-foreground">{children}</p>}
    </div>
  );
}

export function MandalaBg({ className = "" }: { className?: string }) {
  return (
    <img
      src={mandala}
      alt=""
      aria-hidden
      width={1024}
      height={1024}
      loading="lazy"
      className={`pointer-events-none absolute select-none opacity-[0.07] animate-spin-slow ${className}`}
    />
  );
}

export function Diya({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M20 4c3 6 5 9 5 13a5 5 0 01-10 0c0-4 2-7 5-13z" className="fill-ember animate-flicker" />
      <path d="M4 26h32c-2 7-8 10-16 10S6 33 4 26z" className="fill-gold" />
    </svg>
  );
}
