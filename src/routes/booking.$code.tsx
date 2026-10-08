import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { getBooking, getCustomerBooking } from "@/lib/bookings.functions";
import { EVENT, PASSES, dateLabel, inr } from "@/lib/event";
import { btnOutline, Ornament } from "@/components/festive";

const bookingQuery = (code: string) =>
  queryOptions({
    queryKey: ["booking", code],
    queryFn: () =>
      /^[a-f0-9]{64}$/.test(code)
        ? getBooking({ data: { token: code } })
        : getCustomerBooking({ data: { code } }),
    // While payment is pending, keep checking so the QR pass appears on its
    // own once payment is confirmed (the page promises exactly that).
    refetchInterval: (query) =>
      query.state.data?.payment_status === "pending" ? 5000 : false,
    refetchOnWindowFocus: true,
  });

export const Route = createFileRoute("/booking/$code")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      bookingQuery(params.code),
    ),

  head: () => ({
    meta: [
      {
        title: "Your Booking — Raas Mahotsav 2026",
      },
      {
        name: "description",
        content:
          "Your Raas Mahotsav 2026 booking and QR entry pass.",
      },
      {
        property: "og:title",
        content: "Your Booking — Raas Mahotsav 2026",
      },
      {
        property: "og:description",
        content:
          "Booking status and QR entry pass.",
      },
      {
        name: "robots",
        content: "noindex",
      },
      {
        name: "referrer",
        content: "no-referrer",
      },
    ],
  }),

  errorComponent: () => (
    <div className="p-10 text-center">
      Couldn't load this booking.
    </div>
  ),

  notFoundComponent: () => (
    <div className="p-10 text-center">
      Booking not found.
    </div>
  ),

  component: BookingPage,
});

function Qr({ value }: { value: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    QRCode.toDataURL(value, {
      margin: 1,
      width: 240,
      color: {
        dark: "#1a0808",
        light: "#f6ecd2",
      },
    }).then(setSrc);
  }, [value]);

  return src ? (
    <img
      src={src}
      alt={`Entry QR ${value}`}
      width={240}
      height={240}
      className="mx-auto rounded"
    />
  ) : (
    <div className="mx-auto h-[240px] w-[240px] animate-pulse rounded bg-muted" />
  );
}

function BookingPage() {
  const { code } = Route.useParams();

  const { data: b } = useSuspenseQuery(
    bookingQuery(code),
  );

  if (!b) {
    return (
      <div className="p-10 text-center">
        Booking not found.{" "}
        <Link
          to="/"
          className="text-gold underline"
        >
          Home
        </Link>
      </div>
    );
  }

  const paid = b.payment_status === "paid";

  const isSquad = b.pass_type === "squad";

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link
        to="/"
        className="text-sm text-muted-foreground hover:text-gold"
      >
        ← Raas Mahotsav 2026
      </Link>

      {/* BOOKING SUMMARY */}
      <div className="ornate-frame mt-4 rounded-xl p-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Booking ID
        </p>

        <p className="font-display text-2xl text-gold-gradient">
          {b.booking_code}
        </p>

        <span
          className={`mt-3 inline-block rounded-full px-4 py-1 text-xs uppercase tracking-widest ${
            paid
              ? "bg-success/20 text-success"
              : "bg-accent/20 text-accent"
          }`}
        >
          {paid
            ? "Paid · Confirmed"
            : b.payment_status === "pending"
              ? "Payment pending"
              : b.payment_status}
        </span>

        <Ornament className="my-5" />

        <dl className="grid grid-cols-2 gap-3 text-left text-base">
          <dt className="text-muted-foreground">
            Name
          </dt>

          <dd>{b.customer_name}</dd>

          <dt className="text-muted-foreground">
            Night
          </dt>

          <dd>{dateLabel(b.event_date)}</dd>

          <dt className="text-muted-foreground">
            Pass
          </dt>

          <dd>{PASSES[b.pass_type].label}</dd>

          <dt className="text-muted-foreground">
            Admits
          </dt>

          <dd>{b.attendee_count}</dd>

          <dt className="text-muted-foreground">
            Amount
          </dt>

          <dd>
            {inr(b.amount_paise / 100)}
          </dd>
        </dl>

        {!paid && (
          <p className="mt-5 text-muted-foreground">
            Your QR entry pass will appear here once your
            payment is confirmed. Need help? Call{" "}
            <a
              href={EVENT.phoneHref}
              className="text-gold"
            >
              {EVENT.phone}
            </a>
            {" or "}
            <a href={EVENT.secondaryPhoneHref} className="text-gold">
              {EVENT.secondaryPhone}
            </a>
            .
          </p>
        )}
      </div>

      {/* ATTENDEE LIST */}
      {paid && isSquad && b.attendees?.length > 0 && (
        <div className="ornate-frame mt-8 rounded-xl p-5">
          <div className="text-center">
            <p className="font-display text-sm uppercase tracking-widest text-gold-soft">
              Squad Members
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {b.attendee_count} people · One QR for the entire squad
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {b.attendees.map((attendee) => (
              <div
                key={attendee.attendee_index}
                className="flex items-center gap-3 rounded-lg border border-border bg-card/40 px-4 py-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/40 text-xs text-gold">
                  {attendee.attendee_index}
                </span>

                <span className="text-sm">
                  {attendee.attendee_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INDIVIDUAL ATTENDEE */}
      {paid &&
        !isSquad &&
        b.attendees?.length > 0 && (
        <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Entry for
            </p>

          <p className="mt-1 font-display text-lg text-gold-soft">
            {b.attendees[0]?.attendee_name}
          </p>
        </div>
      )}

      {/* ONE QR PER BOOKING */}
      {paid && b.ticket && (
        <div className="mt-8">
          <div className="ornate-frame rounded-xl p-6 text-center">
            <p className="font-display text-sm uppercase tracking-[0.2em] text-gold-soft">
              Entry Pass
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {isSquad
                ? "One QR · admits all 5 squad members"
                : "One QR · admits 1 person"}
            </p>

            <div className="my-5 rounded-lg bg-[#f6ecd2] p-3">
              <Qr value={b.ticket.ticket_code} />
            </div>

            <p className="font-mono text-sm">
              {b.ticket.ticket_code}
            </p>

            {b.ticket.checked_in_at && (
              <div className="mt-3 rounded-lg bg-success/10 px-4 py-2 text-sm text-success">
                ✓ Checked in
              </div>
            )}

            {!b.ticket.checked_in_at && (
              <p className="mt-3 text-xs text-muted-foreground">
                Present this QR at the entrance on{" "}
                {dateLabel(b.event_date)}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* IMPORTANT NOTE */}
      {paid && (
        <div className="mt-5 rounded-lg border border-gold/20 bg-gold/5 p-4 text-center text-sm text-muted-foreground">
          <p>
            Save or screenshot this page before arriving.
          </p>

          <p className="mt-1">
            This pass is valid only for{" "}
            <span className="text-gold-soft">
              {dateLabel(b.event_date)}
            </span>
            .
          </p>

          {isSquad && (
            <p className="mt-1">
              One QR admits all {b.attendee_count} squad
              members together.
            </p>
          )}
        </div>
      )}

      {/* VENUE */}
      <div className="mt-8 text-center">
        <a
          href={EVENT.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={btnOutline}
        >
          Venue directions
        </a>
      </div>
    </div>
  );
}
