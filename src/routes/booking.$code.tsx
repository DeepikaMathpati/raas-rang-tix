import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { getBooking } from "@/lib/bookings.functions";
import { EVENT, PASSES, dateLabel, inr } from "@/lib/event";
import { btnOutline, Ornament } from "@/components/festive";

const bookingQuery = (code: string) =>
  queryOptions({ queryKey: ["booking", code], queryFn: () => getBooking({ data: { code } }) });

export const Route = createFileRoute("/booking/$code")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(bookingQuery(params.code)),
  head: () => ({
    meta: [
      { title: "Your Booking — Raas Mahotsav 2026" },
      { name: "description", content: "Your Raas Mahotsav 2026 booking and QR entry passes." },
      { property: "og:title", content: "Your Booking — Raas Mahotsav 2026" },
      { property: "og:description", content: "Booking status and QR entry passes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => <div className="p-10 text-center">Couldn't load this booking.</div>,
  notFoundComponent: () => <div className="p-10 text-center">Booking not found.</div>,
  component: BookingPage,
});

function Qr({ value }: { value: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: 240, color: { dark: "#1a0808", light: "#f6ecd2" } }).then(setSrc);
  }, [value]);
  return src ? <img src={src} alt={`QR ${value}`} width={200} height={200} className="mx-auto rounded" /> : <div className="mx-auto h-[200px] w-[200px] animate-pulse rounded bg-muted" />;
}

function BookingPage() {
  const { code } = Route.useParams();
  const { data: b } = useSuspenseQuery(bookingQuery(code));
  if (!b) return <div className="p-10 text-center">Booking not found. <Link to="/" className="text-gold underline">Home</Link></div>;
  const paid = b.payment_status === "paid";

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link to="/" className="text-sm text-muted-foreground hover:text-gold">← Raas Mahotsav 2026</Link>
      <div className="ornate-frame mt-4 rounded-xl p-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Booking ID</p>
        <p className="font-display text-2xl text-gold-gradient">{b.booking_code}</p>
        <span className={`mt-3 inline-block rounded-full px-4 py-1 text-xs uppercase tracking-widest ${paid ? "bg-success/20 text-success" : "bg-accent/20 text-accent"}`}>
          {paid ? "Paid · Confirmed" : b.payment_status === "pending" ? "Payment pending" : b.payment_status}
        </span>
        <Ornament className="my-5" />
        <dl className="grid grid-cols-2 gap-3 text-left text-base">
          <dt className="text-muted-foreground">Name</dt><dd>{b.customer_name}</dd>
          <dt className="text-muted-foreground">Night</dt><dd>{dateLabel(b.event_date)}</dd>
          <dt className="text-muted-foreground">Pass</dt><dd>{PASSES[b.pass_type].label} × {b.quantity}</dd>
          <dt className="text-muted-foreground">Admits</dt><dd>{b.attendee_count}</dd>
          <dt className="text-muted-foreground">Amount</dt><dd>{inr(b.amount_paise / 100)}</dd>
        </dl>
        {!paid && (
          <p className="mt-5 text-muted-foreground">
            Your passes appear here once payment is confirmed. Need help? Call <a href={EVENT.phoneHref} className="text-gold">{EVENT.phone}</a>.
          </p>
        )}
      </div>

      {paid && (
        <div className="mt-8 space-y-5">
          <p className="text-center text-muted-foreground">Save or screenshot this page. Each QR admits one person, once, on {dateLabel(b.event_date)}.</p>
          {b.tickets.map((t) => (
            <div key={t.ticket_code} className="ornate-frame rounded-xl p-5 text-center">
              <p className="font-display text-sm uppercase tracking-widest text-gold-soft">Pass {t.attendee_index} of {b.attendee_count}</p>
              <div className="my-3"><Qr value={t.ticket_code} /></div>
              <p className="font-mono text-sm">{t.ticket_code}</p>
              {t.checked_in_at && <p className="mt-1 text-sm text-accent">Checked in</p>}
            </div>
          ))}
        </div>
      )}
      <div className="mt-8 text-center">
        <a href={EVENT.mapUrl} target="_blank" rel="noopener noreferrer" className={btnOutline}>Venue directions</a>
      </div>
    </div>
  );
}
