import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
const PRICE_PAISE = {
  individual: 29900,
  squad: 140000,
} as const;
const PEOPLE = {
  individual: 1,
  squad: 5,
} as const;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
const bookingInput = z
  .object({
    customerName: z.string().trim().min(2, "Name must contain at least 2 characters.").max(100),
    mobile: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
    email: z.string().trim().email("Enter a valid email address.").max(255),
    eventDate: z.enum(["2026-10-16", "2026-10-17", "2026-10-18"]),
    passType: z.enum(["individual", "squad"]),
    // One booking = one pass/squad.
    quantity: z.literal(1),
    attendeeNames: z
      .array(z.string().trim().min(2, "Attendee name must contain at least 2 characters.").max(100))
      .min(1)
      .max(5),
    referralCode: z.string().trim().max(32).optional(),
  })
  .superRefine((data, ctx) => {
    const expectedCount = data.passType === "individual" ? 1 : 5;
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const amount = PRICE_PAISE[data.passType];
    const attendeeCount = PEOPLE[data.passType];
    let referralCode = data.referralCode ? data.referralCode.toUpperCase() : null;
    if (referralCode) {
      const { data: referral } = await supabaseAdmin
        .from("referrals")
        .select("code")
        .eq("code", referralCode)
        .eq("active", true)
        .maybeSingle();
      if (!referral) {
        referralCode = null;
      }
    }
    const bookingCode = "RM26-" + randomCode(8);
    // --------------------------------------------------------
    // 1. Create booking
    // --------------------------------------------------------
    const { data: booking, error: bookingError } = await supabaseAdmin
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
        referral_code: referralCode,
      })
      .select("id")
      .single();
    if (bookingError || !booking) {
      console.error("Booking insert failed:", bookingError);
      throw new Error("Could not create booking. Please try again.");
    }
    // --------------------------------------------------------
    // 2. Save attendee names
    // --------------------------------------------------------
    const { error: attendeeError } = await supabaseAdmin.from("attendees").insert(
      data.attendeeNames.map((name, index) => ({
        booking_id: booking.id,
        attendee_index: index + 1,
        attendee_name: name,
      })),
    );
    if (attendeeError) {
      console.error("Attendee insert failed:", attendeeError);
      // Remove booking because attendee information
      // could not be saved.
      await supabaseAdmin.from("bookings").delete().eq("id", booking.id);
      throw new Error("Could not save attendee details. Please try again.");
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
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${creds.keyId}:${creds.secret}`),
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
    });
    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("Razorpay order creation failed:", razorpayResponse.status, errorText);
      return {
        bookingCode,
        amount,
        paymentsConfigured: false as const,
      };
    }
    const order = (await razorpayResponse.json()) as {
      id: string;
    };
    // --------------------------------------------------------
    // 5. Save Razorpay order ID
    // --------------------------------------------------------
    const { error: bookingUpdateError } = await supabaseAdmin
      .from("bookings")
      .update({
        razorpay_order_id: order.id,
      })
      .eq("id", booking.id);
    if (bookingUpdateError) {
      console.error("Could not save Razorpay order ID:", bookingUpdateError);
      throw new Error("Could not prepare payment. Please try again.");
    }
    // --------------------------------------------------------
    // 6. Create payment record
    // --------------------------------------------------------
    const { error: paymentInsertError } = await supabaseAdmin.from("payments").insert({
      booking_id: booking.id,
      razorpay_order_id: order.id,
      amount_paise: amount,
      status: "pending",
    });
    if (paymentInsertError) {
      console.error("Payment record creation failed:", paymentInsertError);
      throw new Error("Could not prepare payment. Please try again.");
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
async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const razorpayOrderResponse = z.object({
  id: z.string(),
  amount: z.number().int(),
  amount_paid: z.number().int(),
  amount_due: z.number().int(),
  currency: z.string(),
  status: z.string(),
});

const razorpayPaymentResponse = z.object({
  id: z.string(),
  order_id: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
  captured: z.boolean(),
});

async function parseRazorpayResponse<T extends z.ZodType>(
  response: Response,
  schema: T,
): Promise<z.infer<T>> {
  if (!response.ok) {
    throw new Error("Payment verification failed.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Payment verification failed.");
    }
    throw error;
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Payment verification failed.");
  }
  return parsed.data;
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
        orderId: z.string().min(5).max(64),
        paymentId: z.string().min(5).max(64),
        signature: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const creds = razorpayCreds();
    if (!creds) {
      throw new Error("Payments are not configured.");
    }
    // --------------------------------------------------------
    // 1. Verify Razorpay signature
    // --------------------------------------------------------
    const expectedSignature = await hmacHex(creds.secret, `${data.orderId}|${data.paymentId}`);
    if (!safeEqual(expectedSignature, data.signature)) {
      throw new Error("Payment verification failed.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // --------------------------------------------------------
    // 2. Find booking
    // --------------------------------------------------------
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("razorpay_order_id", data.orderId)
      .single();
    if (bookingError || !booking) {
      console.error("Booking lookup failed:", bookingError);
      throw new Error("Booking not found.");
    }

    // --------------------------------------------------------
    // 3. Verify payment and order state with Razorpay.
    // --------------------------------------------------------
    const authorization = "Basic " + btoa(`${creds.keyId}:${creds.secret}`);
    const [orderResponse, paymentResponse] = await Promise.all([
      fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(data.orderId)}`, {
        headers: { Authorization: authorization },
      }),
      fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(data.paymentId)}`, {
        headers: { Authorization: authorization },
      }),
    ]);
    const [order, payment] = await Promise.all([
      parseRazorpayResponse(orderResponse, razorpayOrderResponse),
      parseRazorpayResponse(paymentResponse, razorpayPaymentResponse),
    ]);
    const expectedAmount = booking.amount_paise;
    if (
      order.id !== data.orderId ||
      order.amount !== expectedAmount ||
      order.amount_paid !== expectedAmount ||
      order.amount_due !== 0 ||
      order.currency !== "INR" ||
      order.status !== "paid" ||
      payment.id !== data.paymentId ||
      payment.order_id !== data.orderId ||
      payment.amount !== expectedAmount ||
      payment.currency !== "INR" ||
      payment.status !== "captured" ||
      payment.captured !== true
    ) {
      throw new Error("Payment verification failed.");
    }

    // --------------------------------------------------------
    // 4-6. Mark payment + booking as paid (first verification only).
    // If the booking is already paid we still fall through to make
    // sure its ticket exists, so a failed earlier attempt can be
    // repaired by simply retrying.
    // --------------------------------------------------------
    let justPaid = false;
    if (booking.payment_status !== "paid") {
      const paidAt = new Date().toISOString();
      const { error: paymentError } = await supabaseAdmin
        .from("payments")
        .update({
          razorpay_payment_id: data.paymentId,
          status: "paid",
          verified_at: paidAt,
        })
        .eq("razorpay_order_id", data.orderId);
      if (paymentError) {
        console.error("Payment update failed:", paymentError);
        throw new Error("Could not confirm payment.");
      }
      const { data: updatedRows, error: bookingPaidError } = await supabaseAdmin
        .from("bookings")
        .update({
          payment_status: "paid",
          paid_at: paidAt,
        })
        .eq("id", booking.id)
        .neq("payment_status", "paid")
        .select("id");
      if (bookingPaidError) {
        console.error("Booking payment update failed:", bookingPaidError);
        throw new Error("Could not confirm booking.");
      }
      // Only the request that actually flipped the status sends the email,
      // so concurrent/duplicate verifications cannot double-send it.
      justPaid = (updatedRows?.length ?? 0) > 0;
    }
    // --------------------------------------------------------
    // 7. Create ONE ticket / QR for the booking
    // --------------------------------------------------------
    const ticket = {
      booking_id: booking.id,
      attendee_index: 1,
      event_date: booking.event_date,
      ticket_code: "T-" + randomCode(14),
    };
    const { error: ticketError } = await supabaseAdmin.from("tickets").upsert(ticket, {
      onConflict: "booking_id,attendee_index",
      ignoreDuplicates: true,
    });
    if (ticketError) {
      console.error("Ticket creation failed:", ticketError);
      throw new Error("Payment succeeded, but ticket creation failed. Please contact support.");
    }
    if (!justPaid) {
      return { bookingCode: booking.booking_code };
    }
    const resendApiKey = process.env["RESEND_API_KEY"];
    const resendFromEmail = process.env["RESEND_FROM_EMAIL"];
    if (!resendApiKey || !resendFromEmail) {
      console.error(
        "Ticket confirmation email skipped: configure RESEND_API_KEY and RESEND_FROM_EMAIL.",
      );
    } else {
      try {
        const { data: savedTicket, error: savedTicketError } = await supabaseAdmin
          .from("tickets")
          .select("ticket_code")
          .eq("booking_id", booking.id)
          .eq("attendee_index", 1)
          .single();
        if (savedTicketError || !savedTicket) {
          throw new Error("Could not load the saved ticket for its confirmation email.");
        }
        const { data: attendeeRows, error: attendeeEmailError } = await supabaseAdmin
          .from("attendees")
          .select("attendee_index, attendee_name")
          .eq("booking_id", booking.id)
          .order("attendee_index", {
            ascending: true,
          });
        if (attendeeEmailError) {
          throw new Error(
            `Could not load attendee names for the confirmation email: ${attendeeEmailError.message}`,
          );
        }
        const { default: QRCode } = await import("qrcode");
        const qrImage = await QRCode.toBuffer(savedTicket.ticket_code, {
          type: "png",
          margin: 1,
          width: 240,
          color: {
            dark: "#1a0808",
            light: "#f6ecd2",
          },
        });
        const escapeHtml = (value: string) =>
          value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
        const attendeeNames = (attendeeRows ?? []).map((attendee) => attendee.attendee_name);
        const attendeeList = attendeeNames.length
          ? attendeeNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")
          : `<li>${escapeHtml(booking.customer_name)}</li>`;
        const eventDate = new Intl.DateTimeFormat("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${booking.event_date}T00:00:00Z`));
        const passType = booking.pass_type === "squad" ? "Squad Pass" : "Individual Pass";
        const amountPaid = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(booking.amount_paise / 100);
        const safeCustomerName = escapeHtml(booking.customer_name);
        const safeBookingCode = escapeHtml(booking.booking_code);
        const safeTicketCode = escapeHtml(savedTicket.ticket_code);
        const html = `
          <div style="font-family: Arial, sans-serif; color: #1a0808; line-height: 1.6;">
            <h1>Raas Mahotsav Ticket Confirmation</h1>
            <p>Hello ${safeCustomerName}, your payment is confirmed.</p>
            <p><strong>Booking code:</strong> ${safeBookingCode}</p>
            <p><strong>Event date:</strong> ${escapeHtml(eventDate)}</p>
            <p><strong>Pass type:</strong> ${passType}</p>
            <p><strong>Number of attendees:</strong> ${booking.attendee_count}</p>
            <p><strong>Attendees:</strong></p>
            <ul>${attendeeList}</ul>
            <p><strong>Amount paid:</strong> ${amountPaid}</p>
            <p><strong>Ticket code:</strong> ${safeTicketCode}</p>
            <p><img src="cid:raas-ticket-qr" width="240" height="240" alt="Ticket QR code for ${safeTicketCode}" /></p>
            <p><strong>Please show this QR code at the entrance.</strong></p>
            <p><strong>Venue:</strong><br />
              Royal Palace Function Hall,<br />
              Dhanwantri Hospital Road, Kootnoor,<br />
              Kalaburagi, Karnataka – 585102
            </p>
            <p><strong>Event time:</strong> 5:00 PM – 11:00 PM</p>
            <p><strong>Event dates:</strong> 16, 17, 18 October 2026</p>
          </div>
        `;
        const text = [
          "Raas Mahotsav Ticket Confirmation",
          `Customer: ${booking.customer_name}`,
          `Booking code: ${booking.booking_code}`,
          `Event date: ${eventDate}`,
          `Pass type: ${passType}`,
          `Number of attendees: ${booking.attendee_count}`,
          `Attendees: ${attendeeNames.join(", ") || booking.customer_name}`,
          `Amount paid: ${amountPaid}`,
          `Ticket code: ${savedTicket.ticket_code}`,
          "Please show this QR code at the entrance.",
          "Venue: Royal Palace Function Hall, Dhanwantri Hospital Road, Kootnoor, Kalaburagi, Karnataka – 585102",
          "Event time: 5:00 PM – 11:00 PM",
          "Event dates: 16, 17, 18 October 2026",
        ].join("\n");
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: [booking.email],
            subject: `Raas Mahotsav Ticket Confirmation — ${booking.booking_code}`,
            html,
            text,
            attachments: [
              {
                filename: "raas-mahotsav-ticket-qr.png",
                content: qrImage.toString("base64"),
                content_type: "image/png",
                content_id: "raas-ticket-qr",
              },
            ],
          }),
        });
        if (!emailResponse.ok) {
          console.error("Ticket confirmation email failed:", {
            bookingCode: booking.booking_code,
            status: emailResponse.status,
            statusText: emailResponse.statusText,
          });
        }
      } catch (emailError) {
        console.error("Ticket confirmation email failed:", {
          bookingCode: booking.booking_code,
          error: emailError,
        });
      }
    }
    return {
      bookingCode: booking.booking_code,
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
        code: z.string().regex(/^RM26-[A-Z0-9]{8}$/),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // --------------------------------------------------------
    // Booking
    // --------------------------------------------------------
    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select(
        `
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
      `,
      )
      .eq("booking_code", data.code)
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
    const { data: attendeeRows } = await supabaseAdmin
      .from("attendees")
      .select("attendee_index, attendee_name")
      .eq("booking_id", booking.id)
      .order("attendee_index", {
        ascending: true,
      });
    attendees = attendeeRows ?? [];
    // --------------------------------------------------------
    // Ticket / QR
    // --------------------------------------------------------
    let ticket: {
      ticket_code: string;
      checked_in_at: string | null;
    } | null = null;
    if (booking.payment_status === "paid") {
      const { data: ticketRow } = await supabaseAdmin
        .from("tickets")
        .select("ticket_code, checked_in_at")
        .eq("booking_id", booking.id)
        .maybeSingle();
      ticket = ticketRow ?? null;
    }
    const { id: _id, mobile: _mobile, email: _email, ...publicBooking } = booking;
    return {
      ...publicBooking,
      attendees,
      ticket,
    };
  });

function getClaimEmail(claims: unknown) {
  if (typeof claims !== "object" || claims === null || !("email" in claims)) {
    return null;
  }

  const email = claims.email;
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
}

export const getMyTickets = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const authenticatedUserEmail = getClaimEmail(context.claims);
    if (!authenticatedUserEmail) {
      throw new Error("No authenticated email address was found for this account.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, booking_code, customer_name, mobile, event_date, pass_type, attendee_count, amount_paise, payment_status",
      )
      .eq("email", authenticatedUserEmail)
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error("Customer bookings lookup failed:", bookingsError);
      throw new Error("Could not load your tickets.");
    }

    if (!bookings?.length) {
      return [];
    }

    const bookingIds = bookings.map((booking) => booking.id);
    const [{ data: attendees, error: attendeesError }, { data: tickets, error: ticketsError }] =
      await Promise.all([
        supabaseAdmin
          .from("attendees")
          .select("booking_id, attendee_index, attendee_name")
          .in("booking_id", bookingIds)
          .order("attendee_index", { ascending: true }),
        supabaseAdmin
          .from("tickets")
          .select("booking_id, ticket_code, checked_in_at")
          .in("booking_id", bookingIds),
      ]);

    if (attendeesError) {
      console.error("Customer attendee lookup failed:", attendeesError);
      throw new Error("Could not load attendee details for your tickets.");
    }
    if (ticketsError) {
      console.error("Customer ticket lookup failed:", ticketsError);
      throw new Error("Could not load ticket codes for your bookings.");
    }

    return bookings.map((booking) => {
      const ticket = tickets?.find((row) => row.booking_id === booking.id);
      return {
        booking_code: booking.booking_code,
        customer_name: booking.customer_name,
        mobile: booking.mobile,
        event_date: booking.event_date,
        pass_type: booking.pass_type,
        attendee_count: booking.attendee_count,
        amount_paise: booking.amount_paise,
        payment_status: booking.payment_status,
        attendees: (attendees ?? [])
          .filter((attendee) => attendee.booking_id === booking.id)
          .map(({ attendee_index, attendee_name }) => ({
            attendee_index,
            attendee_name,
          })),
        ticket_code: ticket?.ticket_code ?? null,
        checked_in_at: ticket?.checked_in_at ?? null,
      };
    });
  });
// ============================================================
// ADMIN DATA
// ============================================================
function sanitizeSearchText(value: string) {
  return value.trim().replace(/[%,()]/g, "");
}
async function requireAdminRole(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roleRows, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error("Unable to verify organiser access.");
  const isAdmin = roleRows?.some((row) => row.role === "admin") ?? false;
  const isStaff = roleRows?.some((row) => row.role === "staff") ?? false;
  return { isAdmin, isStaff };
}
const siteSettingsSchema = z.object({
  tagline: z.string().trim().min(1).max(120),
  time: z.string().trim().min(1).max(80),
  venueName: z.string().trim().min(1).max(120),
  venueAddress: z.string().trim().min(1).max(255),
  mapUrl: z
    .string()
    .trim()
    .url()
    .max(500)
    .default("https://www.google.com/maps/dir/?api=1&destination=17.2998627%2C76.8247469"),
  phone: z.string().trim().min(7).max(30),
  coPartner: z.string().trim().max(160),
  announcement: z.string().trim().max(240),
  introText: z.string().trim().max(600),
  highlights: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
});
// PostgREST caps every response at 1000 rows by default, which would silently
// truncate the dashboard totals once there are more than 1000 bookings/tickets.
// This pages through a query until every row has been read.
async function fetchAllRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const PAGE_SIZE = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { data: rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}

export const getAdminData = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        q: z.string().max(100).default(""),
        status: z.string().max(20).default("all"),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { isAdmin, isStaff } = await requireAdminRole(context.userId);
    if (!isAdmin && !isStaff) return { authorized: false as const };
    let query = supabaseAdmin
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const q = sanitizeSearchText(data.q);
    if (q) {
      query = query.or(
        `booking_code.ilike.%${q}%,customer_name.ilike.%${q}%,mobile.ilike.%${q}%,email.ilike.%${q}%,referral_code.ilike.%${q}%`,
      );
    }
    if (["pending", "paid", "failed", "refunded"].includes(data.status)) {
      query = query.eq("payment_status", data.status as "pending" | "paid" | "failed" | "refunded");
    }
    const [
      bookingsResult,
      allBookingsResult,
      paidResult,
      ticketsResult,
      attendeesResult,
      referralsResult,
      settingsResult,
    ] = await Promise.all([
      query,
      fetchAllRows((from, to) =>
        supabaseAdmin
          .from("bookings")
          .select(
            "id, attendee_count, payment_status, amount_paise, pass_type, event_date, referral_code",
          )
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllRows((from, to) =>
        supabaseAdmin
          .from("bookings")
          .select("id, amount_paise, attendee_count, event_date, pass_type, referral_code")
          .eq("payment_status", "paid")
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllRows((from, to) =>
        supabaseAdmin
          .from("tickets")
          .select("booking_id, checked_in_at")
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllRows((from, to) =>
        supabaseAdmin
          .from("attendees")
          .select(
            "id, booking_id, attendee_index, attendee_name, created_at, booking:bookings(id, booking_code, customer_name, mobile, email, event_date, pass_type, attendee_count, amount_paise, payment_status, referral_code)",
          )
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to),
      ),
      supabaseAdmin
        .from("referrals")
        .select("id, code, name, active, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("site_settings").select("value").eq("id", "main").maybeSingle(),
    ]);
    if (bookingsResult.error) throw new Error("Could not load bookings.");
    if (attendeesResult.error) throw new Error("Could not load attendees.");
    if (referralsResult.error) throw new Error("Could not load referrals.");
    if (allBookingsResult.error || paidResult.error || ticketsResult.error) {
      throw new Error("Could not load dashboard statistics.");
    }
    const allBookings = allBookingsResult.data ?? [];
    const paidAll = paidResult.data ?? [];
    const tickets = ticketsResult.data ?? [];
    const bookingById = new Map(allBookings.map((b) => [b.id, b]));
    const checkedInMap = new Map(
      tickets.map((ticket) => [ticket.booking_id, ticket.checked_in_at]),
    );
    let checkedIn = 0;
    let checkedInBookings = 0;
    for (const ticket of tickets) {
      if (!ticket.checked_in_at) continue;
      const booking = bookingById.get(ticket.booking_id);
      if (booking) {
        checkedIn += booking.attendee_count;
        checkedInBookings += 1;
      }
    }
    const revenue = paidAll.reduce((sum, booking) => sum + booking.amount_paise, 0) / 100;
    const attendees = paidAll.reduce((sum, booking) => sum + booking.attendee_count, 0);
    const byDate: Record<string, number> = {};
    for (const booking of paidAll) {
      byDate[booking.event_date] = (byDate[booking.event_date] ?? 0) + booking.attendee_count;
    }
    const byPass = {
      individual: paidAll.filter((b) => b.pass_type === "individual").length,
      squad: paidAll.filter((b) => b.pass_type === "squad").length,
    };
    const referralStats = new Map<
      string,
      { bookings: number; attendees: number; revenue: number }
    >();
    for (const booking of paidAll) {
      if (!booking.referral_code) continue;
      const current = referralStats.get(booking.referral_code) ?? {
        bookings: 0,
        attendees: 0,
        revenue: 0,
      };
      current.bookings += 1;
      current.attendees += booking.attendee_count;
      current.revenue += booking.amount_paise / 100;
      referralStats.set(booking.referral_code, current);
    }
    const referrals = (referralsResult.data ?? []).map((referral) => ({
      ...referral,
      bookings: referralStats.get(referral.code)?.bookings ?? 0,
      attendees: referralStats.get(referral.code)?.attendees ?? 0,
      revenue: referralStats.get(referral.code)?.revenue ?? 0,
      link: `/book?ref=${encodeURIComponent(referral.code)}`,
    }));
    const attendeesWithCheckin = (attendeesResult.data ?? []).map((row) => ({
      ...row,
      checked_in_at: checkedInMap.get(row.booking_id) ?? null,
    }));
    return {
      authorized: true as const,
      role: isAdmin ? ("admin" as const) : ("staff" as const),
      bookings: bookingsResult.data ?? [],
      attendees: attendeesWithCheckin,
      referrals,
      settings: settingsResult.data?.value ?? null,
      stats: {
        totalBookings: allBookings.length,
        paidBookings: paidAll.length,
        pendingBookings: allBookings.filter((b) => b.payment_status === "pending").length,
        failedBookings: allBookings.filter((b) => b.payment_status === "failed").length,
        refundedBookings: allBookings.filter((b) => b.payment_status === "refunded").length,
        revenue,
        attendees,
        checkedIn,
        remaining: Math.max(0, attendees - checkedIn),
        checkedInBookings,
        byDate,
        byPass,
      },
    };
  });
export const createReferral = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        name: z.string().trim().min(2).max(100),
        code: z
          .string()
          .trim()
          .min(3)
          .max(24)
          .regex(/^[A-Z0-9-]+$/i),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { isAdmin } = await requireAdminRole(context.userId);
    if (!isAdmin) throw new Error("Only admins can manage referrals.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("referrals").insert({
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      active: true,
    });
    if (error) {
      if (error.code === "23505") throw new Error("That referral code already exists.");
      throw new Error("Could not create referral.");
    }
    return { ok: true as const };
  });
export const setReferralActive = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    const { isAdmin } = await requireAdminRole(context.userId);
    if (!isAdmin) throw new Error("Only admins can manage referrals.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("referrals")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error("Could not update referral.");
    return { ok: true as const };
  });
export const updateSiteSettings = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => siteSettingsSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { isAdmin } = await requireAdminRole(context.userId);
    if (!isAdmin) throw new Error("Only admins can edit website settings.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ id: "main", value: data }, { onConflict: "id" });
    if (error) throw new Error("Could not save website settings.");
    return { ok: true as const, settings: data };
  });
export const getPublicSiteSettings = createServerFn({
  method: "GET",
}).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("id", "main")
    .maybeSingle();
  return data?.value ?? null;
});
// ============================================================
// CHECK-IN
// ============================================================
export const checkInTicket = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        code: z.string().trim().min(4).max(40),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: result, error } = await context.supabase.rpc("check_in_ticket", {
      _code: data.code.toUpperCase(),
    });
    if (error) {
      console.error("Check-in failed:", error);
      throw new Error(error.message === "forbidden" ? "Not allowed" : "Check-in failed");
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
