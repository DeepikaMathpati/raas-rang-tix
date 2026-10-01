import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PRICE_PAISE = { individual: 34900, squad: 150000 } as const;
const PEOPLE = { individual: 1, squad: 5 } as const;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(len: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

const bookingInput = z.object({
  customerName: z.string().trim().min(2).max(100),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().trim().email().max(255),
  eventDate: z.enum(["2026-10-16", "2026-10-17", "2026-10-18"]),
  passType: z.enum(["individual", "squad"]),
  quantity: z.number().int().min(1).max(10),
});

function razorpayCreds() {
  const keyId = process.env["RAZORPAY_KEY_ID"];
  const secret = process.env["RAZORPAY_KEY_SECRET"];
  return keyId && secret ? { keyId, secret } : null;
}

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => bookingInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const amount = PRICE_PAISE[data.passType] * data.quantity;
    const bookingCode = "RM26-" + randomCode(8);

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        booking_code: bookingCode,
        customer_name: data.customerName,
        mobile: data.mobile,
        email: data.email.toLowerCase(),
        event_date: data.eventDate,
        pass_type: data.passType,
        quantity: data.quantity,
        attendee_count: PEOPLE[data.passType] * data.quantity,
        amount_paise: amount,
      })
      .select("id")
      .single();
    if (error || !booking) {
      console.error("booking insert failed", error);
      throw new Error("Could not create booking. Please try again.");
    }

    const creds = razorpayCreds();
    if (!creds) {
      return { bookingCode, amount, paymentsConfigured: false as const };
    }

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${creds.keyId}:${creds.secret}`),
      },
      body: JSON.stringify({ amount, currency: "INR", receipt: bookingCode, notes: { booking_code: bookingCode } }),
    });
    if (!res.ok) {
      console.error("Razorpay order failed", res.status, await res.text());
      return { bookingCode, amount, paymentsConfigured: false as const };
    }
    const order = (await res.json()) as { id: string };
    await supabaseAdmin.from("bookings").update({ razorpay_order_id: order.id }).eq("id", booking.id);
    await supabaseAdmin.from("payments").insert({ booking_id: booking.id, razorpay_order_id: order.id, amount_paise: amount });

    return { bookingCode, amount, paymentsConfigured: true as const, orderId: order.id, keyId: creds.keyId };
  });

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      orderId: z.string().min(5).max(64),
      paymentId: z.string().min(5).max(64),
      signature: z.string().regex(/^[a-f0-9]{64}$/),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const creds = razorpayCreds();
    if (!creds) throw new Error("Payments are not configured.");
    const expected = await hmacHex(creds.secret, `${data.orderId}|${data.paymentId}`);
    if (!safeEqual(expected, data.signature)) throw new Error("Payment verification failed.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking } = await supabaseAdmin
      .from("bookings").select("*").eq("razorpay_order_id", data.orderId).single();
    if (!booking) throw new Error("Booking not found.");

    if (booking.payment_status !== "paid") {
      await supabaseAdmin.from("payments")
        .update({ razorpay_payment_id: data.paymentId, status: "paid", verified_at: new Date().toISOString() })
        .eq("razorpay_order_id", data.orderId);
      await supabaseAdmin.from("bookings")
        .update({ payment_status: "paid", paid_at: new Date().toISOString() })
        .eq("id", booking.id).neq("payment_status", "paid");
      const tickets = Array.from({ length: booking.attendee_count }, (_, i) => ({
        booking_id: booking.id,
        attendee_index: i + 1,
        event_date: booking.event_date,
        ticket_code: "T-" + randomCode(14),
      }));
      // unique(booking_id, attendee_index) makes this idempotent
      await supabaseAdmin.from("tickets").upsert(tickets, { onConflict: "booking_id,attendee_index", ignoreDuplicates: true });
    }
    return { bookingCode: booking.booking_code };
  });

export const getBooking = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ code: z.string().regex(/^RM26-[A-Z0-9]{8}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b } = await supabaseAdmin
      .from("bookings")
      .select("id, booking_code, customer_name, event_date, pass_type, quantity, attendee_count, amount_paise, payment_status")
      .eq("booking_code", data.code).maybeSingle();
    if (!b) return null;
    let tickets: { ticket_code: string; attendee_index: number; checked_in_at: string | null }[] = [];
    if (b.payment_status === "paid") {
      const { data: t } = await supabaseAdmin.from("tickets")
        .select("ticket_code, attendee_index, checked_in_at").eq("booking_id", b.id).order("attendee_index");
      tickets = t ?? [];
    }
    const { id: _id, ...rest } = b;
    return { ...rest, tickets };
  });

// ---------- Admin ----------
export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ q: z.string().max(100).default(""), status: z.string().max(20).default("all") }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const [{ data: isAdmin }, { data: isStaff }] = await Promise.all([
      sb.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      sb.rpc("has_role", { _user_id: context.userId, _role: "staff" }),
    ]);
    if (!isAdmin && !isStaff) return { authorized: false as const };

    let query = sb.from("bookings").select("*").order("created_at", { ascending: false }).limit(200);
    const q = data.q.trim().replace(/[%,()]/g, "");
    if (q) query = query.or(`booking_code.ilike.%${q}%,customer_name.ilike.%${q}%,mobile.ilike.%${q}%,email.ilike.%${q}%`);
    if (["pending", "paid", "failed", "refunded"].includes(data.status)) query = query.eq("payment_status", data.status as "paid");
    const { data: bookings } = await query;

    const { data: paidAll } = await sb.from("bookings").select("amount_paise, attendee_count, event_date").eq("payment_status", "paid");
    const { count: checkedIn } = await sb.from("tickets").select("id", { count: "exact", head: true }).not("checked_in_at", "is", null);
    const revenue = (paidAll ?? []).reduce((s, b) => s + b.amount_paise, 0) / 100;
    const attendees = (paidAll ?? []).reduce((s, b) => s + b.attendee_count, 0);
    const byDate: Record<string, number> = {};
    for (const b of paidAll ?? []) byDate[b.event_date] = (byDate[b.event_date] ?? 0) + b.attendee_count;

    return {
      authorized: true as const,
      bookings: bookings ?? [],
      stats: { revenue, attendees, paidBookings: paidAll?.length ?? 0, checkedIn: checkedIn ?? 0, byDate },
    };
  });

export const checkInTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().min(4).max(40) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: r, error } = await context.supabase.rpc("check_in_ticket", { _code: data.code.toUpperCase() });
    if (error) throw new Error(error.message === "forbidden" ? "Not allowed" : "Check-in failed");
    return r as { result: string; name?: string; checked_in_at?: string; attendee_index?: number; booking_code?: string };
  });
