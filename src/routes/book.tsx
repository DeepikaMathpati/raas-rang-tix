import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { createBooking, verifyPayment } from "@/lib/bookings.functions";
import {
  EVENT,
  EVENT_DATES,
  PASSES,
  SQUAD_SAVINGS,
  inr,
  type EventDate,
  type PassType,
} from "@/lib/event";
import { btnGold, inputCls, Ornament } from "@/components/festive";

export const Route = createFileRoute("/book")({
  // TanStack's search parser JSON-decodes values, so `?ref=2026` arrives as a
  // number and `?ref=true` as a boolean. Coerce back to a string, and never let
  // a malformed link take the booking page down: fall back to "no value".
  validateSearch: z.object({
    pass: z.enum(["individual", "squad"]).optional().catch(undefined),
    date: z.enum(["2026-10-16", "2026-10-17", "2026-10-18"]).optional().catch(undefined),
    ref: z
      .union([z.string(), z.number(), z.boolean()])
      .transform((value) => String(value))
      .pipe(z.string().max(32))
      .optional()
      .catch(undefined),
  }),

  head: () => ({
    meta: [
      {
        title: "Book Passes — Raas Mahotsav 2026, Kalaburagi",
      },
      {
        name: "description",
        content:
          "Book Individual (₹349) or Squad (₹1,500 for 5) passes for Raas Mahotsav 2026, 16–18 October at Royal Palace Function Hall.",
      },
      {
        property: "og:title",
        content: "Book Passes — Raas Mahotsav 2026",
      },
      {
        property: "og:description",
        content:
          "Individual ₹349 · Squad of 5 ₹1,500. Choose 16, 17 or 18 October.",
      },
      {
        property: "og:url",
        content: "/book",
      },
    ],
    links: [{ rel: "canonical", href: "/book" }],
  }),

  component: BookPage,
});

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => {
      open: () => void;
      on: (e: string, cb: (r: unknown) => void) => void;
    };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function BookPage() {
  const { pass, ref, date: initialDate } = Route.useSearch();
  const navigate = useNavigate();

  const create = useServerFn(createBooking);
  const verify = useServerFn(verifyPayment);

  const [passType, setPassType] = useState<PassType>(
    pass ?? "individual",
  );

  const [date, setDate] = useState<EventDate>(initialDate ?? "2026-10-16");

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
  });

  // For a squad, form.name is member 1 / primary contact.
  // These four fields are members 2–5.
  const [squadMembers, setSquadMembers] = useState([
    "",
    "",
    "",
    "",
  ]);

  const [busy, setBusy] = useState(false);
  const [appliedPrice, setAppliedPrice] = useState<{
    baseAmount: number;
    discountAmount: number;
    discountPercent: number;
    amount: number;
  } | null>(null);

  const p = PASSES[passType];

  // One booking always represents exactly one pass.
  const total = p.price;
  const people = p.people;

  function updateSquadMember(index: number, value: string) {
    setSquadMembers((current) =>
      current.map((member, i) => (i === index ? value : member)),
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();

    const primaryName = form.name.trim();

    if (primaryName.length < 2) {
      toast.error("Enter your full name");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    let attendeeNames: string[];

    if (passType === "individual") {
      attendeeNames = [primaryName];
    } else {
      const additionalMembers = squadMembers.map((name) => name.trim());

      if (additionalMembers.some((name) => name.length < 2)) {
        toast.error("Please enter all 5 squad member names");
        return;
      }

      attendeeNames = [primaryName, ...additionalMembers];
    }

    setBusy(true);

    try {
      const res = await create({
        data: {
          customerName: primaryName,
          mobile: form.mobile,
          email: form.email,
          eventDate: date,
          passType,
          quantity: 1,
          attendeeNames,
          referralCode: ref,
        },
      });
      setAppliedPrice({
        baseAmount: res.baseAmount,
        discountAmount: res.discountAmount,
        discountPercent: res.discountPercent,
        amount: res.amount,
      });

      if (!res.paymentsConfigured) {
        toast.message(
          "Booking reserved — online payment is not live yet.",
        );

        navigate({
          to: "/booking/$code",
          params: { code: res.bookingCode },
        });

        return;
      }

      const ok = await loadRazorpay();

      if (!ok || !window.Razorpay) {
        throw new Error("Could not load payment window");
      }

      const rzp = new window.Razorpay({
        key: res.keyId,
        order_id: res.orderId,
        amount: res.amount,
        currency: "INR",
        name: "Raas Mahotsav 2026",
        description: `${p.label} · ${date}${res.discountPercent ? ` · ${res.discountPercent}% referral discount` : ""}`,
        prefill: {
          name: primaryName,
          email: form.email,
          contact: "+91" + form.mobile,
        },
        theme: {
          color: "#c9a14a",
        },

        handler: async (r: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verify({
              data: {
                orderId: r.razorpay_order_id,
                paymentId: r.razorpay_payment_id,
                signature: r.razorpay_signature,
              },
            });

            toast.success("Payment confirmed!");
          } catch {
            toast.error(
              "We couldn't verify the payment yet. Your booking page will update once confirmed.",
            );
          }

          navigate({
            to: "/booking/$code",
            params: { code: res.bookingCode },
          });
        },

        modal: {
          ondismiss: () => {
            setBusy(false);

            navigate({
              to: "/booking/$code",
              params: { code: res.bookingCode },
            });
          },
        },
      });

      rzp.on("payment.failed", () => {
        toast.error("Payment failed. You can try again.");
        setBusy(false);
      });

      rzp.open();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong",
      );

      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-40 pt-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <h1 className="mt-4 text-center text-3xl uppercase text-gold-gradient">
        Book Your Pass
      </h1>

      <p className="text-center font-script text-3xl text-ember">
        {EVENT.tagline}
      </p>

      <ol
        aria-label="Booking steps"
        className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[0.65rem] uppercase tracking-wider text-muted-foreground"
      >
        {["Choose your night", "Choose pass", "Enter details", "Payment", "QR Pass"].map(
          (step, index) => (
            <li key={step}>
              {index > 0 && <span className="mr-2 text-gold">→</span>}
              {step}
            </li>
          ),
        )}
      </ol>

      <Ornament className="my-6" />

      <form onSubmit={submit} className="space-y-8">
        {/* STEP 1 — NIGHT */}
        <fieldset>
          <legend className="mb-3 font-display text-xs uppercase tracking-[0.2em] text-gold-soft">
            1 · Choose your night
          </legend>

          <div className="grid grid-cols-3 gap-2">
            {EVENT_DATES.map((d) => (
              <button
                type="button"
                key={d.value}
                onClick={() => setDate(d.value)}
                aria-pressed={date === d.value}
                className={`rounded-lg border p-3 text-center transition ${
                  date === d.value
                    ? "border-gold bg-gold/15 shadow-glow"
                    : "border-border bg-card/60"
                }`}
              >
                <div className="font-display text-3xl text-gold-gradient">
                  {d.day}
                </div>

                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {d.label.slice(0, 3)} · Oct
                </div>
              </button>
            ))}
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Each pass is valid for the selected night only.
          </p>
        </fieldset>

        {/* STEP 2 — PASS TYPE */}
        <fieldset>
          <legend className="mb-3 font-display text-xs uppercase tracking-[0.2em] text-gold-soft">
            2 · Pass type
          </legend>

          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(PASSES) as PassType[]).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => {
                  setPassType(k);
                  setAppliedPrice(null);
                }}
                aria-pressed={passType === k}
                className={`rounded-lg border p-4 text-left transition ${
                  passType === k
                    ? "border-gold bg-gold/15 shadow-glow"
                    : "border-border bg-card/60"
                }`}
              >
                <div className="font-display text-sm uppercase tracking-wider text-gold-soft">
                  {PASSES[k].label}
                </div>

                <div className="mt-1 font-display text-2xl text-gold-gradient">
                  {inr(PASSES[k].price)}
                </div>

                <div className="text-sm text-muted-foreground">
                  {k === "squad"
                    ? `5 people · save ${inr(SQUAD_SAVINGS)}`
                    : "1 person"}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-border bg-card/60 p-3 text-center text-sm text-muted-foreground">
            {passType === "individual"
              ? "1 booking = 1 individual pass"
              : "1 booking = 1 squad pass for 5 people"}
          </div>
        </fieldset>

        {/* STEP 3 — PRIMARY CONTACT */}
        <fieldset className="space-y-3">
          <legend className="mb-3 font-display text-xs uppercase tracking-[0.2em] text-gold-soft">
            3 · Primary contact
          </legend>

          <input
            required
            minLength={2}
            maxLength={100}
            placeholder="Full name"
            autoComplete="name"
            className={inputCls}
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
          />

          <div className="flex">
            <span className="flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground">
              +91
            </span>

            <input
              required
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              placeholder="Mobile number"
              autoComplete="tel-national"
              className={`${inputCls} rounded-l-none`}
              value={form.mobile}
              onChange={(e) =>
                setForm({
                  ...form,
                  mobile: e.target.value.replace(/\D/g, ""),
                })
              }
            />
          </div>

          <input
            required
            type="email"
            maxLength={255}
            placeholder="Email"
            autoComplete="email"
            className={inputCls}
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
          />
        </fieldset>

        {/* STEP 4 — SQUAD MEMBERS */}
        {passType === "squad" && (
          <fieldset className="space-y-3">
            <legend className="mb-1 font-display text-xs uppercase tracking-[0.2em] text-gold-soft">
              4 · Squad members
            </legend>

            <p className="mb-4 text-sm text-muted-foreground">
              The primary contact above is Member 1. Enter the other 4
              members below.
            </p>

            {squadMembers.map((member, index) => (
              <input
                key={index}
                required
                minLength={2}
                maxLength={100}
                placeholder={`Member ${index + 2} full name`}
                className={inputCls}
                value={member}
                onChange={(e) =>
                  updateSquadMember(index, e.target.value)
                }
              />
            ))}
          </fieldset>
        )}

        {/* FIXED BOTTOM SUMMARY */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <div>
              <div className="font-display text-2xl text-gold-gradient">
                {inr((appliedPrice?.amount ?? total))}
              </div>

              <div className="text-sm text-muted-foreground">
                {people} {people === 1 ? "person" : "people"} ·{" "}
                {EVENT_DATES.find((d) => d.value === date)?.short}
              </div>
              {ref && appliedPrice?.discountPercent ? (
                <div className="text-xs text-success">
                  List {inr(appliedPrice.baseAmount / 100)} · {ref.toUpperCase()}{" "}
                  {appliedPrice.discountPercent}% off
                  {" "}({inr(appliedPrice.discountAmount / 100)} saved)
                </div>
              ) : ref ? (
                <div className="text-xs text-muted-foreground">
                  Referral discount will be confirmed at checkout.
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={busy}
              className={btnGold}
            >
              {busy ? "Please wait…" : "Pay & Book"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}