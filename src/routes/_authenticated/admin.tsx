import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  checkInTicket,
  getAdminData,
} from "@/lib/bookings.functions";
import {
  EVENT_DATES,
  PASSES,
  inr,
} from "@/lib/event";
import {
  btnGold,
  btnOutline,
  inputCls,
} from "@/components/festive";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      {
        title: "Admin — Raas Mahotsav 2026",
      },
      {
        name: "description",
        content: "Organiser dashboard.",
      },
      {
        property: "og:title",
        content: "Admin — Raas Mahotsav 2026",
      },
      {
        property: "og:description",
        content: "Organiser dashboard.",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),

  component: Admin,
});

function Admin() {
  const navigate = useNavigate();

  const fetchData = useServerFn(getAdminData);
  const checkIn = useServerFn(checkInTicket);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [code, setCode] = useState("");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAdminData() {
    try {
      setLoading(true);
      setError(null);

      console.log("Loading admin data...");

      const result = await fetchData({
        data: {
          q,
          status,
        },
      });

      console.log("Admin data received:", result);

      setData(result);
    } catch (err) {
      console.error("Admin data failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load organiser dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, [q, status]);

  async function doCheckIn(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    if (!code.trim()) return;

    try {
      const r = await checkIn({
        data: {
          code: code.trim(),
        },
      });

      const msg: Record<string, string> = {
        ok: `✓ Admitted ${
          r.attendee_count ?? 1
        } attendee(s) (${r.booking_code ?? ""})`,

        already_checked_in: `Already checked in at ${
          r.checked_in_at
            ? new Date(
                r.checked_in_at,
              ).toLocaleTimeString()
            : ""
        }`,

        not_found: "Ticket not found",

        unpaid: "Booking not paid",
      };

      if (r.result === "ok") {
        toast.success(
          msg[r.result] ?? "Check-in successful",
        );
      } else {
        toast.error(
          msg[r.result] ?? r.result,
        );
      }

      setCode("");

      await loadAdminData();
    } catch (err) {
      console.error("Check-in failed:", err);

      toast.error(
        err instanceof Error
          ? err.message
          : "Check-in failed",
      );
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-gold-gradient">
            Raas Mahotsav
          </div>

          <div className="mt-3 text-muted-foreground">
            Loading organiser dashboard…
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="ornate-frame max-w-xl rounded-lg p-8 text-center">
          <h1 className="text-2xl text-gold-gradient">
            Admin Dashboard
          </h1>

          <p className="mt-4 text-red-400">
            {error}
          </p>

          <button
            className={`${btnGold} mt-6`}
            onClick={loadAdminData}
          >
            Try again
          </button>

          <button
            className={`${btnOutline} mt-3`}
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // NOT AUTHORISED
  // --------------------------------------------------

  if (data && !data.authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="ornate-frame max-w-md rounded-lg p-8 text-center">
          <h1 className="text-2xl text-gold-gradient">
            Organiser Access Required
          </h1>

          <p className="mt-4 text-muted-foreground">
            Your account is logged in, but it does
            not have organiser access yet.
          </p>

          <button
            className={`${btnOutline} mt-6`}
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        No admin data available.
      </div>
    );
  }

  const {
    stats,
    bookings,
  } = data;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Raas Mahotsav 2026
            </div>

            <h1 className="mt-1 text-3xl uppercase text-gold-gradient">
              Organiser Dashboard
            </h1>
          </div>

          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            Sign out
          </button>
        </div>

        {/* STATS */}
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [
              "Revenue",
              inr(stats.revenue),
            ],
            [
              "Paid bookings",
              stats.paidBookings,
            ],
            [
              "Attendees",
              stats.attendees,
            ],
            [
              "Checked in",
              stats.checkedIn,
            ],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="ornate-frame rounded-lg p-5"
            >
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {label}
              </div>

              <div className="mt-2 font-display text-2xl text-gold-gradient">
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* DATE STATS */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {EVENT_DATES.map((d) => (
            <span key={d.value}>
              {d.short}:{" "}
              <b className="text-foreground">
                {stats.byDate?.[d.value] ?? 0}
              </b>{" "}
              attendees
            </span>
          ))}
        </div>

        {/* CHECK-IN */}
        <div className="ornate-frame mt-8 rounded-lg p-5">
          <div className="mb-3">
            <div className="text-lg text-gold-gradient">
              Entry Check-in
            </div>

            <div className="text-sm text-muted-foreground">
              Scan a QR code or enter the ticket code manually.
            </div>
          </div>

          <form
            onSubmit={doCheckIn}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase())
              }
              placeholder="Ticket code — T-…"
              className={inputCls}
              required
            />

            <button
              type="submit"
              className={btnGold}
            >
              Check in
            </button>
          </form>
        </div>

        {/* SEARCH */}
        <div className="mt-8">
          <div className="mb-3 text-lg text-gold-gradient">
            Bookings
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={q}
              onChange={(e) =>
                setQ(e.target.value)
              }
              placeholder="Search name, mobile, email or booking ID"
              className={inputCls}
            />

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
              className={`${inputCls} sm:w-48`}
            >
              {[
                "all",
                "paid",
                "pending",
                "failed",
                "refunded",
              ].map((s) => (
                <option
                  key={s}
                  value={s}
                >
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* BOOKINGS TABLE */}
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[850px] text-left text-sm">

            <thead className="bg-card text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {[
                  "Booking",
                  "Name",
                  "Mobile",
                  "Date",
                  "Pass",
                  "People",
                  "Amount",
                  "Status",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-3 py-3"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {bookings.map((b: any) => (
                <tr
                  key={b.id}
                  className="border-t border-border"
                >
                  <td className="px-3 py-3 font-mono">
                    {b.booking_code}
                  </td>

                  <td className="px-3 py-3">
                    <div>
                      {b.customer_name}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {b.email}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    {b.mobile}
                  </td>

                  <td className="px-3 py-3">
                    {b.event_date.slice(8)} Oct
                  </td>

                  <td className="px-3 py-3">
                    {PASSES[b.pass_type as "individual" | "squad"]?.label ?? b.pass_type}
                  </td>

                  <td className="px-3 py-3">
                    {b.attendee_count}
                  </td>

                  <td className="px-3 py-3">
                    {inr(
                      b.amount_paise / 100,
                    )}
                  </td>

                  <td
                    className={`px-3 py-3 ${
                      b.payment_status === "paid"
                        ? "text-success"
                        : "text-accent"
                    }`}
                  >
                    {b.payment_status}
                  </td>
                </tr>
              ))}

              {bookings.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No bookings yet.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

      </div>
    </div>
  );
}