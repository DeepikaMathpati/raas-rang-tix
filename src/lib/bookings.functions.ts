import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PRICE_PAISE = {
  individual: 34900,
  squad: 150000,
} as const;

const PEOPLE = {
  individual: 1,
  squad: 5,
} as const;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(len: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));

  return Array.from(
    bytes,
    (b) => ALPHABET[b % ALPHABET.length],
  ).join("");
}

const bookingInput = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters.")
      .max(100),

    mobile: z
      .string()
      .trim()
      .regex(
        /^[6-9]\d{9}$/,
        "Enter a valid 10-digit Indian mobile number.",
      ),

    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .max(255),

    eventDate: z.enum([
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]),

    passType: z.enum(["individual", "squad"]),

    // One booking = one pass/squad.
    quantity: z.literal(1),

    attendeeNames: z
      .array(
        z
          .string()
          .trim()
          .min(
            2,
            "Attendee name must contain at least 2 characters.",
          )
          .max(100),
      )
      .min(1)
      .max(5),
  })
  .superRefine((data, ctx) => {
    const expectedCount =
      data.passType === "individual" ? 1 : 5;

    if (data.attendeeNames.length !== expectedCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attendeeNames"],
        message:
          data.passType === "individual"
            ? "An individual booking requires exactly 1 attendee name."
            : "A squad booking requires exactly 5 attendee names.",
      });
    }
  });

function razorpayCreds() {
  const keyId = process.env["RAZORPAY_KEY_ID"];
  const secret = process.env["RAZORPAY_KEY_SECRET"];

  if (!keyId || !secret) {
    return null;
  }

  return {
    keyId,
    secret,
  };
}

// ============================================================
// CREATE BOOKING
// ============================================================

export const createBooking = createServerFn({
  method: "POST",
})
  .inputValidator((data) => bookingInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const amount = PRICE_PAISE[data.passType];
    const attendeeCount = PEOPLE[data.passType];

    const bookingCode =
      "RM26-" + randomCode(8);

    // --------------------------------------------------------
    // 1. Create booking
    // --------------------------------------------------------

    const {
      data: booking,
      error: bookingError,
    } = await supabaseAdmin
      .from("bookings")
      .insert({
        booking_code: bookingCode,
        customer_name: data.customerName,
        mobile: data.mobile,
        email: data.email.toLowerCase(),
        event_date: data.eventDate,
        pass_type: data.passType,
        quantity: 1,
        attendee_count: attendeeCount,
        amount_paise: amount,
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      console.error(
        "Booking insert failed:",
        bookingError,
      );

      throw new Error(
        "Could not create booking. Please try again.",
      );
    }

    // --------------------------------------------------------
    // 2. Save attendee names
    // --------------------------------------------------------

    const { error: attendeeError } =
      await supabaseAdmin
        .from("attendees")
        .insert(
          data.attendeeNames.map(
            (name, index) => ({
              booking_id: booking.id,
              attendee_index: index + 1,
              attendee_name: name,
            }),
          ),
        );

    if (attendeeError) {
      console.error(
        "Attendee insert failed:",
        attendeeError,
      );

      // Remove booking because attendee information
      // could not be saved.
      await supabaseAdmin
        .from("bookings")
        .delete()
        .eq("id", booking.id);

      throw new Error(
        "Could not save attendee details. Please try again.",
      );
    }

    // --------------------------------------------------------
    // 3. Check Razorpay configuration
    // --------------------------------------------------------

    const creds = razorpayCreds();

    if (!creds) {
      return {
        bookingCode,
        amount,
        paymentsConfigured: false as const,
      };
    }

    // --------------------------------------------------------
    // 4. Create Razorpay order
    // --------------------------------------------------------

    const razorpayResponse = await fetch(
      "https://api.razorpay.com/v1/orders",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization:
            "Basic " +
            btoa(
              `${creds.keyId}:${creds.secret}`,
            ),
        },

        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: bookingCode,

          notes: {
            booking_code: bookingCode,
            event_date: data.eventDate,
            pass_type: data.passType,
          },
        }),
      },
    );

    if (!razorpayResponse.ok) {
      const errorText =
        await razorpayResponse.text();

      console.error(
        "Razorpay order creation failed:",
        razorpayResponse.status,
        errorText,
      );

      return {
        bookingCode,
        amount,
        paymentsConfigured: false as const,
      };
    }

    const order =
      (await razorpayResponse.json()) as {
        id: string;
      };

    // --------------------------------------------------------
    // 5. Save Razorpay order ID
    // --------------------------------------------------------

    const {
      error: bookingUpdateError,
    } = await supabaseAdmin
      .from("bookings")
      .update({
        razorpay_order_id: order.id,
      })
      .eq("id", booking.id);

    if (bookingUpdateError) {
      console.error(
        "Could not save Razorpay order ID:",
        bookingUpdateError,
      );

      throw new Error(
        "Could not prepare payment. Please try again.",
      );
    }

    // --------------------------------------------------------
    // 6. Create payment record
    // --------------------------------------------------------

    const {
      error: paymentInsertError,
    } = await supabaseAdmin
      .from("payments")
      .insert({
        booking_id: booking.id,
        razorpay_order_id: order.id,
        amount_paise: amount,
        status: "pending",
      });

    if (paymentInsertError) {
      console.error(
        "Payment record creation failed:",
        paymentInsertError,
      );

      throw new Error(
        "Could not prepare payment. Please try again.",
      );
    }

    return {
      bookingCode,
      amount,
      paymentsConfigured: true as const,
      orderId: order.id,
      keyId: creds.keyId,
    };
  });

// ============================================================
// RAZORPAY SIGNATURE
// ============================================================

async function hmacHex(
  secret: string,
  message: string,
) {
  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"],
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(message),
    );

  return Array.from(
    new Uint8Array(signature),
    (b) =>
      b.toString(16).padStart(2, "0"),
  ).join("");
}

function safeEqual(
  a: string,
  b: string,
) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |=
      a.charCodeAt(i) ^
      b.charCodeAt(i);
  }

  return result === 0;
}

// ============================================================
// VERIFY PAYMENT
// ============================================================

export const verifyPayment = createServerFn({
  method: "POST",
})
  .inputValidator((data) =>
    z
      .object({
        orderId: z
          .string()
          .min(5)
          .max(64),

        paymentId: z
          .string()
          .min(5)
          .max(64),

        signature: z
          .string()
          .regex(/^[a-f0-9]{64}$/),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const creds = razorpayCreds();

    if (!creds) {
      throw new Error(
        "Payments are not configured.",
      );
    }

    // --------------------------------------------------------
    // 1. Verify Razorpay signature
    // --------------------------------------------------------

    const expectedSignature =
      await hmacHex(
        creds.secret,
        `${data.orderId}|${data.paymentId}`,
      );

    if (
      !safeEqual(
        expectedSignature,
        data.signature,
      )
    ) {
      throw new Error(
        "Payment verification failed.",
      );
    }

    const { supabaseAdmin } =
      await import(
        "@/integrations/supabase/client.server"
      );

    // --------------------------------------------------------
    // 2. Find booking
    // --------------------------------------------------------

    const {
      data: booking,
      error: bookingError,
    } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq(
        "razorpay_order_id",
        data.orderId,
      )
      .single();

    if (bookingError || !booking) {
      console.error(
        "Booking lookup failed:",
        bookingError,
      );

      throw new Error(
        "Booking not found.",
      );
    }

    // --------------------------------------------------------
    // 3. If already paid, return safely
    // --------------------------------------------------------

    if (
      booking.payment_status === "paid"
    ) {
      return {
        bookingCode:
          booking.booking_code,
      };
    }

    // --------------------------------------------------------
    // 4. Mark payment as paid
    // --------------------------------------------------------

    const paidAt =
      new Date().toISOString();

    const {
      error: paymentError,
    } = await supabaseAdmin
      .from("payments")
      .update({
        razorpay_payment_id:
          data.paymentId,
        status: "paid",
        verified_at: paidAt,
      })
      .eq(
        "razorpay_order_id",
        data.orderId,
      );

    if (paymentError) {
      console.error(
        "Payment update failed:",
        paymentError,
      );

      throw new Error(
        "Could not confirm payment.",
      );
    }

    // --------------------------------------------------------
    // 5. Mark booking as paid
    // --------------------------------------------------------

    const {
      error: bookingPaidError,
    } = await supabaseAdmin
      .from("bookings")
      .update({
        payment_status: "paid",
        paid_at: paidAt,
      })
      .eq("id", booking.id)
      .neq("payment_status", "paid");

    if (bookingPaidError) {
      console.error(
        "Booking payment update failed:",
        bookingPaidError,
      );

      throw new Error(
        "Could not confirm booking.",
      );
    }

    // --------------------------------------------------------
    // 6. Create ONE ticket / QR for the booking
    // --------------------------------------------------------

    const ticket = {
      booking_id: booking.id,
      attendee_index: 1,
      event_date: booking.event_date,
      ticket_code:
        "T-" + randomCode(14),
    };

    const {
      error: ticketError,
    } = await supabaseAdmin
      .from("tickets")
      .upsert(ticket, {
        onConflict:
          "booking_id,attendee_index",
        ignoreDuplicates: true,
      });

    if (ticketError) {
      console.error(
        "Ticket creation failed:",
        ticketError,
      );

      throw new Error(
        "Payment succeeded, but ticket creation failed. Please contact support.",
      );
    }

    return {
      bookingCode:
        booking.booking_code,
    };
  });

// ============================================================
// GET BOOKING
// ============================================================

export const getBooking = createServerFn({
  method: "GET",
})
  .inputValidator((data) =>
    z
      .object({
        code: z
          .string()
          .regex(
            /^RM26-[A-Z0-9]{8}$/,
          ),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } =
      await import(
        "@/integrations/supabase/client.server"
      );

    // --------------------------------------------------------
    // Booking
    // --------------------------------------------------------

    const {
      data: booking,
      error,
    } = await supabaseAdmin
      .from("bookings")
      .select(`
        id,
        booking_code,
        customer_name,
        mobile,
        email,
        event_date,
        pass_type,
        quantity,
        attendee_count,
        amount_paise,
        payment_status
      `)
      .eq(
        "booking_code",
        data.code,
      )
      .maybeSingle();

    if (error || !booking) {
      return null;
    }

    // --------------------------------------------------------
    // Attendees
    // --------------------------------------------------------

    let attendees: {
      attendee_index: number;
      attendee_name: string;
    }[] = [];

    const {
      data: attendeeRows,
    } = await supabaseAdmin
      .from("attendees")
      .select(
        "attendee_index, attendee_name",
      )
      .eq(
        "booking_id",
        booking.id,
      )
      .order(
        "attendee_index",
        {
          ascending: true,
        },
      );

    attendees = attendeeRows ?? [];

    // --------------------------------------------------------
    // Ticket / QR
    // --------------------------------------------------------

    let ticket: {
      ticket_code: string;
      checked_in_at: string | null;
    } | null = null;

    if (
      booking.payment_status ===
      "paid"
    ) {
      const {
        data: ticketRow,
      } = await supabaseAdmin
        .from("tickets")
        .select(
          "ticket_code, checked_in_at",
        )
        .eq(
          "booking_id",
          booking.id,
        )
        .maybeSingle();

      ticket = ticketRow ?? null;
    }

    const {
      id: _id,
      mobile: _mobile,
      email: _email,
      ...publicBooking
    } = booking;

    return {
      ...publicBooking,
      attendees,
      ticket,
    };
  });

// ============================================================
// ADMIN DATA
// ============================================================

export const getAdminData = createServerFn({
  method: "GET",
})
  .middleware([
    requireSupabaseAuth,
  ])
  .inputValidator((data) =>
    z
      .object({
        q: z
          .string()
          .max(100)
          .default(""),

        status: z
          .string()
          .max(20)
          .default("all"),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase;

    // --------------------------------------------------------
    // Check role
    // --------------------------------------------------------

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const {
      data: roleRows,
      error: roleError,
    } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    console.log("[ADMIN ROLE CHECK]", {
      userId: context.userId,
      roleRows,
      roleError: roleError?.message,
    });

    if (roleError) {
      console.error(
        "Admin role lookup failed:",
        roleError,
      );

      throw new Error(
        "Unable to verify organiser access.",
      );
    }

    const isAdmin =
      roleRows?.some(
        (row) => row.role === "admin",
      ) ?? false;

    const isStaff =
      roleRows?.some(
        (row) => row.role === "staff",
      ) ?? false;

    if (!isAdmin && !isStaff) {
      return {
        authorized: false as const,
      };
    }
    // --------------------------------------------------------
    // Bookings
    // --------------------------------------------------------

    let query = sb
      .from("bookings")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    const q = data.q
      .trim()
      .replace(
        /[%,()]/g,
        "",
      );

    if (q) {
      query = query.or(
        `booking_code.ilike.%${q}%,customer_name.ilike.%${q}%,mobile.ilike.%${q}%,email.ilike.%${q}%`,
      );
    }

    if (
      [
        "pending",
        "paid",
        "failed",
        "refunded",
      ].includes(data.status)
    ) {
      query = query.eq(
        "payment_status",
        data.status as
          | "pending"
          | "paid"
          | "failed"
          | "refunded",
      );
    }

    const {
      data: bookings,
      error: bookingsError,
    } = await query;

    if (bookingsError) {
      console.error(
        "Admin booking query failed:",
        bookingsError,
      );
    }

    // --------------------------------------------------------
    // Paid statistics
    // --------------------------------------------------------

    const {
      data: paidAll,
    } = await sb
      .from("bookings")
      .select(
        "id, amount_paise, attendee_count, event_date",
      )
      .eq(
        "payment_status",
        "paid",
      );

    // --------------------------------------------------------
    // Checked-in bookings
    // --------------------------------------------------------

    const {
      data: checkedInTickets,
    } = await sb
      .from("tickets")
      .select(`
        id,
        booking_id,
        checked_in_at
      `)
      .not(
        "checked_in_at",
        "is",
        null,
      );

    // Calculate actual people checked in.
    //
    // Individual ticket = 1 person
    // Squad ticket = 5 people

    let checkedIn = 0;

    if (
      checkedInTickets &&
      checkedInTickets.length > 0
    ) {
      const bookingIds =
        checkedInTickets.map(
          (ticket) =>
            ticket.booking_id,
        );

      const {
        data: checkedBookings,
      } = await sb
        .from("bookings")
        .select(
          "id, attendee_count",
        )
        .in(
          "id",
          bookingIds,
        );

      checkedIn =
        (checkedBookings ?? []).reduce(
          (total, booking) =>
            total +
            booking.attendee_count,
          0,
        );
    }

    // --------------------------------------------------------
    // Revenue
    // --------------------------------------------------------

    const revenue =
      (paidAll ?? []).reduce(
        (sum, booking) =>
          sum +
          booking.amount_paise,
        0,
      ) / 100;

    // --------------------------------------------------------
    // Total attendees
    // --------------------------------------------------------

    const attendees =
      (paidAll ?? []).reduce(
        (sum, booking) =>
          sum +
          booking.attendee_count,
        0,
      );

    // --------------------------------------------------------
    // Attendees by event date
    // --------------------------------------------------------

    const byDate: Record<
      string,
      number
    > = {};

    for (const booking of
      paidAll ?? []) {
      byDate[booking.event_date] =
        (byDate[
          booking.event_date
        ] ?? 0) +
        booking.attendee_count;
    }

    return {
      authorized: true as const,

      bookings:
        bookings ?? [],

      stats: {
        revenue,
        attendees,
        paidBookings:
          paidAll?.length ?? 0,
        checkedIn,
        byDate,
      },
    };
  });

// ============================================================
// CHECK-IN
// ============================================================

export const checkInTicket = createServerFn({
  method: "POST",
})
  .middleware([
    requireSupabaseAuth,
  ])
  .inputValidator((data) =>
    z
      .object({
        code: z
          .string()
          .trim()
          .min(4)
          .max(40),
      })
      .parse(data),
  )
  .handler(async ({
    context,
    data,
  }) => {
    const {
      data: result,
      error,
    } = await context.supabase.rpc(
      "check_in_ticket",
      {
        _code:
          data.code.toUpperCase(),
      },
    );

    if (error) {
      console.error(
        "Check-in failed:",
        error,
      );

      throw new Error(
        error.message ===
          "forbidden"
          ? "Not allowed"
          : "Check-in failed",
      );
    }

    return result as {
      result: string;
      name?: string;
      event_date?: string;
      attendee_count?: number;
      members?: string[];
      checked_in_at?: string;
      booking_code?: string;
    };
  });