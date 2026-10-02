import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { createBooking, verifyPayment } from "@/lib/bookings.functions";
import { EVENT, EVENT_DATES, PASSES, SQUAD_SAVINGS, inr, type EventDate, type PassType } from "@/lib/event";
import { btnGold, inputCls, Ornament } from "@/components/festive";

export const Route = createFileRoute("/book")({
  validateSearch: z.object({ pass: z.enum(["individual", "squad"]).optional() }),
  head: () => ({
    meta: [
      { title: "Book Passes — Raas Mahotsav 2026, Kalaburagi" },
      { name: "description", content: "Book Individual (₹349) or Squad (₹1,500 for 5) passes for Raas Mahotsav 2026, 16–18 October at Royal Palace Function Hall." },
      { property: "og:title", content: "Book Passes — Raas Mahotsav 2026" },
      { property: "og:description", content: "Individual ₹349 · Squad of 5 ₹1,500. Choose 16, 17 or 18 October." },
      { property: "og:url", content: "/book" },
    ],
    links: [{ rel: "canonical", href: "/book" }],
  }),
  component: BookPage,
});

declare global {
  interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function BookPage() {
  const { pass } = Route.useSearch();
  const navigate = useNavigate();
  const create = useServerFn(createBooking);
  const verify = useServerFn(verifyPayment);
  const [passType, setPassType] = useState<PassType>(pass ?? "individual");
  const [date, setDate] = useState<EventDate>("2026-10-16");
  const [qty, setQty] = useState(1);
  const [form, setForm] = useState({ name: "", mobile: "", email: "" });
  const [busy, setBusy] = useState(false);

  const p = PASSES[passType];
  const total = p.price * qty;
  const people = p.people * qty;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setBusy(true);
    try {
      const res = await create({ data: { customerName: form.name, mobile: form.mobile, email: form.email, eventDate: date, passType, quantity: qty } });
      if (!res.paymentsConfigured) {
        toast.message("Booking reserved — online payment is not live yet.");
        navigate({ to: "/booking/$code", params: { code: res.bookingCode } });
        return;
      }
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) throw new Error("Could not load payment window");
      const rzp = new window.Razorpay({
        key: res.keyId,
        order_id: res.orderId,
        amount: res.amount,
        currency: "INR",
        name: "Raas Mahotsav 2026",
        description: `${p.label} × ${qty} · ${date}`,
        prefill: { name: form.name, email: form.email, contact: "+91" + form.mobile },
        theme: { color: "#c9a14a" },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await verify({ data: { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature } });
            toast.success("Payment confirmed!");
          } catch {
            toast.error("We couldn't verify the payment yet. Your booking page will update once confirmed.");
          }
          navigate({ to: "/booking/$code", params: { code: res.bookingCode } });
        },
        modal: { ondismiss: () => { setBusy(false); navigate({ to: "/booking/$code", params: { code: res.bookingCode } }); } },
      });
      rzp.on("payment.failed", () => toast.error("Payment failed. You can try again."));
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-40 pt-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold"><ArrowLeft className="h-4 w-4" />Back</Link>
      <h1 className="mt-4 text-center text-3xl uppercase text-gold-gradient">Book Your Pass</h1>
      <p className="text-center font-script text-3xl text-ember">{EVENT.tagline}</p>
      <Ornament className="my-6" />

      <form onSubmit={submit} className="space-y-8">
        <fieldset>
          <legend className="mb-3 font-display text-xs uppercase tracking-[0.2em] text-gold-soft">1 · Choose your night</legend>
          <div className="grid grid-cols-3 gap-2">
            {EVENT_DATES.map((d) => (
              <button type="button" key={d.value} onClick={() => setDate(d.value)} aria-pressed={date === d.value}
                className={`rounded-lg border p-3 text-center transition ${date === d.value ? "border-gold bg-gold/15 shadow-glow" : "border-border bg-card/60"}`}>
                <div className="font-display text-3xl text-gold-gradient">{d.day}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{d.label.slice(0, 3)} · Oct</div>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 font-display text-xs uppercase tracking-[0.2em] text-gold-soft">2 · Pass type</legend>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(PASSES) as PassType[]).map((k) => (
              <button type="button" key={k} onClick={() => setPassType(k)} aria-pressed={passType === k}
                className={`rounded-lg border p-4 text-left transition ${passType === k ? "border-gold bg-gold/15 shadow-glow" : "border-border bg-card/60"}`}>
                <div className="font-display text-sm uppercase tracking-wider text-gold-soft">{PASSES[k].label}</div>
                <div className="mt-1 font-display text-2xl text-gold-gradient">{inr(PASSES[k].price)}</div>
                <div className="text-sm text-muted-foreground">{k === "squad" ? `5 people · save ${inr(SQUAD_SAVINGS)}` : "1 person"}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-card/60 p-3">
            <span>Quantity</span>
            <div className="flex items-center gap-4">
              <button type="button" aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))} className="rounded-full border border-gold/50 p-2"><Minus className="h-4 w-4" /></button>
              <span className="w-6 text-center font-display text-xl">{qty}</span>
              <button type="button" aria-label="Increase" onClick={() => setQty((q) => Math.min(10, q + 1))} className="rounded-full border border-gold/50 p-2"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-3 font-display text-xs uppercase tracking-[0.2em] text-gold-soft">3 · Your details</legend>
          <input required minLength={2} maxLength={100} placeholder="Full name" autoComplete="name" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="flex">
            <span className="flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground">+91</span>
            <input required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} placeholder="Mobile number" autoComplete="tel-national" className={`${inputCls} rounded-l-none`} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })} />
          </div>
          <input required type="email" maxLength={255} placeholder="Email" autoComplete="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </fieldset>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <div>
              <div className="font-display text-2xl text-gold-gradient">{inr(total)}</div>
              <div className="text-sm text-muted-foreground">{people} {people === 1 ? "person" : "people"} · {EVENT_DATES.find((d) => d.value === date)?.short}</div>
            </div>
            <button type="submit" disabled={busy} className={btnGold}>{busy ? "Please wait…" : "Pay & Book"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
