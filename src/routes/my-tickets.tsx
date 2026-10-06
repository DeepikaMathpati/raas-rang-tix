import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { getMyTickets } from "@/lib/bookings.functions";
import { EVENT, PASSES, dateLabel, inr } from "@/lib/event";
import { btnGold, btnOutline, Ornament } from "@/components/festive";

type MyTickets = Awaited<ReturnType<typeof getMyTickets>>;

export const Route = createFileRoute("/my-tickets")({
  head: () => ({
    meta: [
      { title: "My Tickets — Raas Mahotsav 2026" },
      { name: "description", content: "View your Raas Mahotsav 2026 tickets." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyTicketsPage,
});

function Qr({ value }: { value: string }) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setSrc("");
    setError(false);
    void QRCode.toDataURL(value, {
      margin: 1,
      width: 280,
      color: {
        dark: "#1a0808",
        light: "#f6ecd2",
      },
    })
      .then((dataUrl) => {
        if (active) setSrc(dataUrl);
      })
      .catch((cause: unknown) => {
        console.error("Ticket QR generation failed:", cause);
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [value]);

  if (error) {
    return <p className="text-sm text-destructive">Could not generate this ticket QR code.</p>;
  }
  if (!src) {
    return <div className="mx-auto h-[280px] w-[280px] animate-pulse rounded bg-muted" />;
  }
  return (
    <img src={src} alt={`Entry QR ${value}`} width={280} height={280} className="mx-auto rounded" />
  );
}

function TicketCard({ booking }: { booking: MyTickets[number] }) {
  const isPaid = booking.payment_status === "paid";
  const pass = PASSES[booking.pass_type];

  return (
    <article className="ornate-frame min-w-0 rounded-xl p-5 sm:p-7">
      <div className="text-center">
        <p className="font-display text-sm uppercase tracking-[0.24em] text-gold-soft">
          RAAS MAHOTSAV 2026
        </p>
        <Ornament className="my-4" />
        <h2 className="font-display text-lg text-gold-gradient">{dateLabel(booking.event_date)}</h2>
      </div>

      <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm sm:text-base">
        <dt className="text-muted-foreground">Pass</dt>
        <dd>{pass.label}</dd>
        <dt className="text-muted-foreground">Attendees</dt>
        <dd>{booking.attendee_count}</dd>
        <dt className="text-muted-foreground">Payment status</dt>
        <dd className="font-display uppercase">{booking.payment_status}</dd>
        <dt className="text-muted-foreground">Amount</dt>
        <dd>{inr(booking.amount_paise / 100)}</dd>
        <dt className="text-muted-foreground">Booking code</dt>
        <dd className="break-all font-mono">{booking.booking_code}</dd>
      </dl>

      {booking.attendees.length > 0 && (
        <div className="mt-5 rounded-lg border border-border bg-card/40 p-4">
          <p className="font-display text-xs uppercase tracking-widest text-gold-soft">
            {booking.pass_type === "squad" ? "Squad Members" : "Attendee"}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {booking.attendees.map((attendee) => (
              <li key={attendee.attendee_index}>
                {booking.pass_type === "squad" && (
                  <span className="mr-2 text-gold">{attendee.attendee_index}.</span>
                )}
                {attendee.attendee_name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isPaid ? (
        <div className="mt-5 text-center">
          {booking.ticket_code ? (
            <>
              <div className="rounded-lg bg-[#f6ecd2] p-3">
                <Qr value={booking.ticket_code} />
              </div>
              <p className="mt-3 font-mono text-sm">{booking.ticket_code}</p>
              {booking.checked_in_at ? (
                <p className="mt-3 rounded-lg bg-success/10 px-4 py-2 text-sm text-success">
                  ✓ Checked in
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Ready for check-in</p>
              )}
            </>
          ) : (
            <p className="text-sm text-destructive">
              Payment is confirmed, but the ticket QR is not available yet.
            </p>
          )}
          <Link
            to="/booking/$code"
            params={{ code: booking.booking_code }}
            className={`${btnGold} mt-5 w-full`}
          >
            View Full Ticket
          </Link>
        </div>
      ) : (
        <div className="mt-5 rounded-lg bg-accent/10 px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Payment status</p>
          <p className="mt-1 font-display text-sm uppercase text-accent">
            {booking.payment_status}
          </p>
        </div>
      )}
    </article>
  );
}

function MyTicketsPage() {
  const getTickets = useServerFn(getMyTickets);
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [googleSignInLoading, setGoogleSignInLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [tickets, setTickets] = useState<MyTickets | null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState("");

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Customer session lookup failed:", error);
          setLoginError("Could not check your login. Please refresh and try again.");
        }
        setSession(data.session);
      })
      .catch((error: unknown) => {
        console.error("Customer session lookup failed:", error);
        if (active) setLoginError("Could not check your login. Please refresh and try again.");
      })
      .finally(() => {
        if (active) setSessionLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setTickets(null);
      setTicketsLoading(false);
      setTicketsError("");
      return;
    }

    let active = true;
    setTickets(null);
    setTicketsError("");
    setTicketsLoading(true);
    void getTickets()
      .then((result) => {
        if (active) setTickets(result);
      })
      .catch((error: unknown) => {
        console.error("Customer tickets load failed:", error);
        if (active) setTicketsError("Could not load your tickets. Please try again.");
      })
      .finally(() => {
        if (active) setTicketsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [getTickets, session]);

  async function signInWithGoogle() {
    setLoginError("");
    try {
      setGoogleSignInLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/my-tickets`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: unknown) {
      console.error("Customer Google sign-in failed:", error);
      setLoginError("Could not start Google sign-in. Please try again.");
    } finally {
      setGoogleSignInLoading(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Customer sign out failed:", error);
      setTicketsError("Could not sign out. Please try again.");
      return;
    }
    setTickets(null);
    await navigate({ to: "/my-tickets", replace: true });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link to="/" className="text-sm text-muted-foreground hover:text-gold">
        ← Raas Mahotsav 2026
      </Link>

      <header className="my-8 text-center">
        <p className="font-script text-3xl text-ember sm:text-4xl">{EVENT.tagline}</p>
        <h1 className="mt-1 text-2xl uppercase text-gold-gradient sm:text-4xl">My Tickets</h1>
        <Ornament className="mt-4" />
      </header>

      {sessionLoading ? (
        <p className="py-12 text-center text-muted-foreground">Checking your login…</p>
      ) : !session ? (
        <section className="ornate-frame mx-auto max-w-md rounded-xl p-6 sm:p-8">
          <h2 className="text-center font-display text-lg uppercase text-gold-soft">My Tickets</h2>
          <p className="mt-3 text-center text-muted-foreground">
            Access your Raas Mahotsav tickets securely.
          </p>
          {loginError && (
            <p role="alert" className="mt-4 text-center text-sm text-destructive">
              {loginError}
            </p>
          )}
          <button
            type="button"
            disabled={googleSignInLoading}
            onClick={() => void signInWithGoogle()}
            className={`${btnGold} mt-6 w-full`}
          >
            {googleSignInLoading ? "Connecting…" : "Continue with Google"}
          </button>
        </section>
      ) : (
        <section>
          <div className="ornate-frame mb-6 flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-display text-lg uppercase text-gold-gradient">My Tickets</h2>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {session.user.email ?? "Logged in"}
              </p>
            </div>
            <button type="button" onClick={() => void signOut()} className={btnOutline}>
              Sign Out
            </button>
          </div>

          {ticketsLoading ? (
            <p className="py-12 text-center text-muted-foreground">Loading your tickets…</p>
          ) : ticketsError ? (
            <p role="alert" className="py-8 text-center text-destructive">
              {ticketsError}
            </p>
          ) : tickets?.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {tickets.map((booking) => (
                <TicketCard key={booking.booking_code} booking={booking} />
              ))}
            </div>
          ) : (
            <div className="ornate-frame mx-auto max-w-lg rounded-xl p-6 text-center sm:p-8">
              <p className="font-display text-lg text-gold-soft">
                No tickets found for this Google account.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Please sign in with the same Google account whose email you used while booking.
              </p>
              <Link to="/book" className={`${btnGold} mt-6`}>
                Book Your Pass
              </Link>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
