import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkInTicket, getAdminData } from "@/lib/bookings.functions";
import { EVENT_DATES, PASSES, inr } from "@/lib/event";
import { btnGold, btnOutline, inputCls } from "@/components/festive";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Raas Mahotsav 2026" },
      { name: "description", content: "Organiser dashboard." },
      { property: "og:title", content: "Admin — Raas Mahotsav 2026" },
      { property: "og:description", content: "Organiser dashboard." },
      { name: "robots", content: "noindex" },
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
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", q, status],
    queryFn: () => fetchData({ data: { q, status } }),
  });

  async function doCheckIn(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await checkIn({ data: { code } });
      const msg: Record<string, string> = {
        ok: `✓ Admitted ${r.name} (pass ${r.attendee_index}, ${r.booking_code})`,
        already_checked_in: `Already checked in at ${r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString() : ""}`,
        not_found: "Ticket not found",
        unpaid: "Booking not paid",
      };
      (r.result === "ok" ? toast.success : toast.error)(msg[r.result] ?? r.result);
      setCode("");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (data && !data.authorized)
    return (
      <div className="p-10 text-center">
        <p>Your account doesn't have organiser access yet.</p>
        <button className={`${btnOutline} mt-4`} onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>Sign out</button>
      </div>
    );
  if (!data || !data.authorized) return null;
  const { stats, bookings } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl uppercase text-gold-gradient">Organiser Dashboard</h1>
        <button className="text-sm text-muted-foreground" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>Sign out</button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Revenue", inr(stats.revenue)], ["Paid bookings", stats.paidBookings], ["Attendees", stats.attendees], ["Checked in", stats.checkedIn]].map(([l, v]) => (
          <div key={l} className="ornate-frame rounded-lg p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{l}</div>
            <div className="font-display text-2xl text-gold-gradient">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-3 text-sm text-muted-foreground">
        {EVENT_DATES.map((d) => <span key={d.value}>{d.short}: <b className="text-foreground">{stats.byDate[d.value] ?? 0}</b> attendees</span>)}
      </div>

      <form onSubmit={doCheckIn} className="ornate-frame mt-6 flex flex-col gap-3 rounded-lg p-4 sm:flex-row">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Scan or enter ticket code (T-…)" className={inputCls} required />
        <button className={btnGold}>Check in</button>
      </form>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, mobile, email, booking ID" className={inputCls} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} sm:w-48`}>
          {["all", "paid", "pending", "failed", "refunded"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-card text-xs uppercase tracking-wider text-muted-foreground">
            <tr>{["Booking", "Name", "Mobile", "Date", "Pass", "People", "Amount", "Status"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono">{b.booking_code}</td>
                <td className="px-3 py-2">{b.customer_name}<div className="text-xs text-muted-foreground">{b.email}</div></td>
                <td className="px-3 py-2">{b.mobile}</td>
                <td className="px-3 py-2">{b.event_date.slice(8)} Oct</td>
                <td className="px-3 py-2">{PASSES[b.pass_type].label} ×{b.quantity}</td>
                <td className="px-3 py-2">{b.attendee_count}</td>
                <td className="px-3 py-2">{inr(b.amount_paise / 100)}</td>
                <td className={`px-3 py-2 ${b.payment_status === "paid" ? "text-success" : "text-accent"}`}>{b.payment_status}</td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No bookings yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
