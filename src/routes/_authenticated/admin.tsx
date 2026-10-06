import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { toast } from "sonner";
import { Copy, ExternalLink, LogOut, RefreshCw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  checkInTicket,
  createReferral,
  getAdminData,
  setReferralActive,
  updateSiteSettings,
} from "@/lib/bookings.functions";
import { EVENT_DATES, PASSES, inr } from "@/lib/event";
import { btnGold, btnOutline, inputCls } from "@/components/festive";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Raas Mahotsav 2026" },
      { name: "description", content: "Raas Mahotsav organiser control center." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type AdminData = Awaited<ReturnType<typeof getAdminData>>;

type SiteSettings = {
  tagline: string;
  time: string;
  venueName: string;
  venueAddress: string;
  mapUrl: string;
  phone: string;
  coPartner: string;
  announcement: string;
  introText: string;
  highlights: string[];
};

const DEFAULT_SETTINGS: SiteSettings = {
  tagline: "Raas Rang Dhamaka",
  time: "5 PM – 11 PM",
  venueName: "Royal Palace Function Hall",
  venueAddress: "Dhanwantri Hospital Road, Kootnoor, Kalaburagi, Karnataka 585102",
  mapUrl: "https://www.google.com/maps/place/Royal+palace+Function+hall/@17.2998627,76.8247469,17z/",
  phone: "+91 9916977793",
  coPartner: "Blooming Minds International School, Kalaburagi",
  announcement: "",
  introText:
    "Celebrate Navratri in Kalaburagi with three evenings of Dandiya and Garba, music, stalls and festive flavours — all under one roof at the Royal Palace Function Hall. Dress in your finest chaniya choli or kediyu and join the circle.",
  highlights: [
    "Dandiya & Garba",
    "Music & Entertainment",
    "Shopping Stalls",
    "Gujarati Snacks",
    "Photo Booth",
    "Many More Exciting Stalls",
  ],
};

function normaliseSettings(value: unknown): SiteSettings {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<SiteSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    highlights:
      Array.isArray(raw.highlights) && raw.highlights.length > 0
        ? raw.highlights.filter((x): x is string => typeof x === "string")
        : DEFAULT_SETTINGS.highlights,
  };
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="ornate-frame rounded-lg p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl text-gold-gradient">{value}</div>
    </div>
  );
}

function Admin() {
  const navigate = useNavigate();
  const fetchData = useServerFn(getAdminData);
  const checkIn = useServerFn(checkInTicket);
  const createReferralFn = useServerFn(createReferral);
  const setReferralActiveFn = useServerFn(setReferralActive);
  const updateSiteSettingsFn = useServerFn(updateSiteSettings);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("all");
  const [attendeeQ, setAttendeeQ] = useState("");
  const [attendeeDate, setAttendeeDate] = useState("all");
  const [code, setCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [referralName, setReferralName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [savingReferral, setSavingReferral] = useState(false);

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [savingSiteSettings, setSavingSiteSettings] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const cameraRequestRef = useRef(0);
  const invalidQrRef = useRef<string | null>(null);

  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1;
    scannerRef.current?.destroy();
    scannerRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setScannerError(null);
    invalidQrRef.current = null;

    const video = videoRef.current;
    if (!video) {
      setScannerError("Camera preview is unavailable. Enter the ticket code manually.");
      return;
    }

    const requestId = cameraRequestRef.current;
    let stream: MediaStream | null = null;
    let scanner: QrScanner | null = null;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is unavailable in this browser.");
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
      } catch (cameraError) {
        if (!(cameraError instanceof Error) || cameraError.name !== "OverconstrainedError") {
          throw cameraError;
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      }

      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      cameraStreamRef.current = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      setIsScanning(true);
      await video.play();

      scanner = new QrScanner(
        video,
        ({ data: scannedData }) => {
          const ticketCode = scannedData.trim();
          if (!/^T-[A-Z0-9]{14}$/i.test(ticketCode)) {
            if (invalidQrRef.current !== ticketCode) {
              invalidQrRef.current = ticketCode;
              setScannerError("Invalid QR code. Scan a Raas Mahotsav ticket QR.");
            }
            return;
          }

          if (scannerRef.current !== scanner) return;
          setScannerError(null);
          setCode(ticketCode.toUpperCase());
          stopCamera();
          toast.success("QR scanned. Press Check in to verify the ticket.");
        },
        { returnDetailedScanResult: true },
      );

      scannerRef.current = scanner;
      await scanner.start();
    } catch (cameraError) {
      if (requestId !== cameraRequestRef.current) {
        if (cameraStreamRef.current !== stream) {
          stream?.getTracks().forEach((track) => track.stop());
        }
        scanner?.destroy();
        return;
      }

      stopCamera();
      const errorName = cameraError instanceof Error ? cameraError.name : "";
      if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setScannerError(
          "Camera permission was denied. Allow camera access or enter the ticket code manually.",
        );
      } else {
        setScannerError("The camera could not be started. Enter the ticket code manually.");
      }
    }
  }, [stopCamera]);

  // Keep the latest successful payload in a ref so reloads (search, filter,
  // check-in, refresh) never swap the whole page for the loading screen. That
  // used to unmount the tabs and drop the organiser back on "Stats" every time.
  const hasDataRef = useRef(false);
  const settingsLoadedRef = useRef(false);
  const loadRequestRef = useRef(0);

  const loadAdminData = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    try {
      if (!hasDataRef.current) setLoading(true);
      setError(null);
      const result = await fetchData({ data: { q: debouncedQ, status } });
      // Ignore stale responses from an older search/filter.
      if (requestId !== loadRequestRef.current) return;
      hasDataRef.current = true;
      setData(result);
      // Only seed the settings form once, so a reload cannot wipe unsaved edits.
      if (result?.settings && !settingsLoadedRef.current) {
        settingsLoadedRef.current = true;
        setSiteSettings(normaliseSettings(result.settings));
      }
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      const message = err instanceof Error ? err.message : "Failed to load organiser dashboard.";
      if (hasDataRef.current) toast.error(message);
      else setError(message);
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, [fetchData, debouncedQ, status]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAdminData();
    } finally {
      setRefreshing(false);
    }
  }, [loadAdminData]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    return stopCamera;
  }, [stopCamera]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(id);
  }, [q]);

  async function doCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      const r = await checkIn({ data: { code: code.trim() } });
      if (r.result === "ok") {
        toast.success(`Admitted ${r.attendee_count ?? 1} attendee(s) · ${r.booking_code ?? ""}`);
      } else if (r.result === "already_checked_in") {
        toast.error(
          `Already checked in at ${r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString() : "an earlier time"}.`,
        );
      } else if (r.result === "not_found") {
        toast.error("Ticket not found.");
      } else if (r.result === "unpaid") {
        toast.error("Booking has not been paid.");
      } else {
        toast.error(String(r.result));
      }
      setCode("");
      await loadAdminData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed.");
    }
  }

  async function addReferral(e: React.FormEvent) {
    e.preventDefault();
    setSavingReferral(true);
    try {
      await createReferralFn({
        data: {
          name: referralName.trim(),
          code: referralCode.trim().toUpperCase(),
        },
      });
      toast.success("Referral created.");
      setReferralName("");
      setReferralCode("");
      await loadAdminData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create referral.");
    } finally {
      setSavingReferral(false);
    }
  }

  async function toggleReferral(id: string, active: boolean) {
    try {
      await setReferralActiveFn({ data: { id, active } });
      toast.success(active ? "Referral activated." : "Referral paused.");
      await loadAdminData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update referral.");
    }
  }

  async function saveWebsiteSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSiteSettings(true);
    try {
      const cleaned = {
        ...siteSettings,
        highlights: siteSettings.highlights.map((x) => x.trim()).filter(Boolean),
      };
      const result = await updateSiteSettingsFn({ data: cleaned });
      setSiteSettings(cleaned);
      toast.success("Website settings saved.");
      setData((current) =>
        current && current.authorized ? { ...current, settings: result.settings } : current,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save website settings.");
    } finally {
      setSavingSiteSettings(false);
    }
  }

  async function copyReferral(link: string) {
    const url = `${window.location.origin}${link}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Referral link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  const filteredAttendees = useMemo(() => {
    const rows = data?.attendees ?? [];
    const needle = attendeeQ.trim().toLowerCase();
    return rows.filter((row) => {
      const booking = row.booking ?? {};
      const matchesText =
        !needle ||
        [
          row.attendee_name,
          booking.customer_name,
          booking.mobile,
          booking.email,
          booking.booking_code,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(needle),
        );
      const matchesDate = attendeeDate === "all" || booking.event_date === attendeeDate;
      return matchesText && matchesDate;
    });
  }, [data?.attendees, attendeeDate, attendeeQ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-gold-gradient">Raas Mahotsav</div>
          <div className="mt-3 text-muted-foreground">Loading organiser dashboard…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="ornate-frame max-w-xl rounded-lg p-8 text-center">
          <h1 className="text-2xl text-gold-gradient">Admin Dashboard</h1>
          <p className="mt-4 text-red-400">{error}</p>
          <button className={`${btnGold} mt-6`} onClick={() => void loadAdminData()}>
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

  if (data && !data.authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="ornate-frame max-w-md rounded-lg p-8 text-center">
          <h1 className="text-2xl text-gold-gradient">Organiser Access Required</h1>
          <p className="mt-4 text-muted-foreground">
            Your account does not have organiser access yet.
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

  if (!data) return null;

  const { stats, bookings, referrals } = data;
  const isAdmin = data.role === "admin";

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Raas Mahotsav 2026
            </div>
            <h1 className="mt-1 text-3xl uppercase text-gold-gradient">Admin Control Center</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin ? "Admin access" : "Staff access"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btnOutline} onClick={() => void refresh()} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              className={btnOutline}
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>

        <Tabs defaultValue="stats" className="mt-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="attendees">Attendees</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="checkin">QR Check-in</TabsTrigger>
            <TabsTrigger value="website">Website Control</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              <StatCard label="Total bookings" value={stats.totalBookings} />
              <StatCard label="Paid bookings" value={stats.paidBookings} />
              <StatCard label="Revenue" value={inr(stats.revenue)} />
              <StatCard label="Attendees" value={stats.attendees} />
              <StatCard label="Checked in" value={stats.checkedIn} />
              <StatCard label="Remaining" value={stats.remaining} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="ornate-frame rounded-lg p-5">
                <div className="text-lg text-gold-gradient">By date</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {EVENT_DATES.map((d) => (
                    <div
                      key={d.value}
                      className="rounded-lg border border-border bg-card/50 p-4 text-center"
                    >
                      <div className="font-display text-2xl text-gold-gradient">
                        {stats.byDate?.[d.value] ?? 0}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                        {d.short}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ornate-frame rounded-lg p-5">
                <div className="text-lg text-gold-gradient">By pass</div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-card/50 p-4 text-center">
                    <div className="font-display text-2xl text-gold-gradient">
                      {stats.byPass?.individual ?? 0}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                      Individual
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card/50 p-4 text-center">
                    <div className="font-display text-2xl text-gold-gradient">
                      {stats.byPass?.squad ?? 0}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                      Squad
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 text-lg text-gold-gradient">Bookings</div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, mobile, email, booking or referral"
                  className={inputCls}
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`${inputCls} sm:w-48`}
                >
                  {["all", "paid", "pending", "failed", "refunded"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[950px] text-left text-sm">
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
                      "Referral",
                      "Status",
                    ].map((heading) => (
                      <th key={heading} className="px-3 py-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="px-3 py-3 font-mono">{b.booking_code}</td>
                      <td className="px-3 py-3">
                        <div>{b.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{b.email}</div>
                      </td>
                      <td className="px-3 py-3">{b.mobile}</td>
                      <td className="px-3 py-3">{b.event_date.slice(8)} Oct</td>
                      <td className="px-3 py-3">
                        {PASSES[b.pass_type as "individual" | "squad"]?.label ?? b.pass_type}
                      </td>
                      <td className="px-3 py-3">{b.attendee_count}</td>
                      <td className="px-3 py-3">{inr(b.amount_paise / 100)}</td>
                      <td className="px-3 py-3 font-mono">{b.referral_code ?? "—"}</td>
                      <td className="px-3 py-3">{b.payment_status}</td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        No bookings found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="attendees" className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={attendeeQ}
                onChange={(e) => setAttendeeQ(e.target.value)}
                placeholder="Search attendee, customer, mobile, email or booking"
                className={inputCls}
              />
              <select
                value={attendeeDate}
                onChange={(e) => setAttendeeDate(e.target.value)}
                className={`${inputCls} sm:w-48`}
              >
                <option value="all">All dates</option>
                {EVENT_DATES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.short}
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-card text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {[
                      "Attendee",
                      "Booking",
                      "Customer",
                      "Mobile",
                      "Date",
                      "Pass",
                      "Payment",
                      "Check-in",
                    ].map((h) => (
                      <th key={h} className="px-3 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendees.map((row) => {
                    const b = row.booking ?? {};
                    return (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-3 py-3 font-medium">{row.attendee_name}</td>
                        <td className="px-3 py-3 font-mono">{b.booking_code ?? "—"}</td>
                        <td className="px-3 py-3">
                          {b.customer_name ?? "—"}
                          <div className="text-xs text-muted-foreground">{b.email ?? ""}</div>
                        </td>
                        <td className="px-3 py-3">{b.mobile ?? "—"}</td>
                        <td className="px-3 py-3">
                          {b.event_date ? `${b.event_date.slice(8)} Oct` : "—"}
                        </td>
                        <td className="px-3 py-3">{b.pass_type ?? "—"}</td>
                        <td className="px-3 py-3">{b.payment_status ?? "—"}</td>
                        <td className="px-3 py-3">
                          {row.checked_in_at
                            ? new Date(row.checked_in_at).toLocaleString()
                            : "Not yet"}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAttendees.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No attendees found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="referrals" className="mt-6 space-y-6">
            {isAdmin && (
              <form onSubmit={addReferral} className="ornate-frame rounded-lg p-5">
                <div className="text-lg text-gold-gradient">Create referral</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Give a person or group a code they can share.
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
                  <input
                    required
                    value={referralName}
                    onChange={(e) => setReferralName(e.target.value)}
                    placeholder="Referral name (e.g. Priya)"
                    className={inputCls}
                  />
                  <input
                    required
                    value={referralCode}
                    onChange={(e) =>
                      setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))
                    }
                    placeholder="Code (e.g. PRIYA)"
                    className={inputCls}
                  />
                  <button type="submit" disabled={savingReferral} className={btnGold}>
                    {savingReferral ? "Saving…" : "Create"}
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-card text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {["Referral", "Code", "Bookings", "Attendees", "Revenue", "Link", "Active"].map(
                      (h) => (
                        <th key={h} className="px-3 py-3">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-3">{r.name}</td>
                      <td className="px-3 py-3 font-mono">{r.code}</td>
                      <td className="px-3 py-3">{r.bookings}</td>
                      <td className="px-3 py-3">{r.attendees}</td>
                      <td className="px-3 py-3">{inr(r.revenue)}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button className={btnOutline} onClick={() => void copyReferral(r.link)}>
                            <Copy className="h-4 w-4" /> Copy
                          </button>
                          <a className={btnOutline} href={r.link} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" /> Open
                          </a>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {isAdmin ? (
                          <Switch
                            checked={r.active}
                            onCheckedChange={(checked) => void toggleReferral(r.id, checked)}
                          />
                        ) : r.active ? (
                          "Active"
                        ) : (
                          "Paused"
                        )}
                      </td>
                    </tr>
                  ))}
                  {referrals.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No referrals yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="checkin" className="mt-6">
            <div className="ornate-frame rounded-lg p-5">
              <div className="mb-3">
                <div className="text-lg text-gold-gradient">Entry Check-in</div>
                <div className="text-sm text-muted-foreground">
                  Scan a QR code or enter the ticket code manually.
                </div>
              </div>

              <div className="mb-3 flex flex-wrap gap-3">
                {isScanning ? (
                  <button type="button" className={btnOutline} onClick={stopCamera}>
                    Stop camera
                  </button>
                ) : (
                  <button type="button" className={btnOutline} onClick={() => void startCamera()}>
                    Start camera scanner
                  </button>
                )}
              </div>

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                aria-label="Ticket QR scanner camera preview"
                className={
                  isScanning
                    ? "mb-3 aspect-video max-h-80 w-full rounded-lg bg-black object-contain sm:max-w-md"
                    : "hidden"
                }
              />

              {scannerError && (
                <p role="alert" className="mb-3 text-sm text-red-400">
                  {scannerError}
                </p>
              )}

              <form onSubmit={doCheckIn} className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ticket code — T-…"
                  className={inputCls}
                  required
                />
                <button type="submit" className={btnGold}>
                  Check in
                </button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="website" className="mt-6">
            <form onSubmit={saveWebsiteSettings} className="ornate-frame rounded-lg p-5 space-y-5">
              <div>
                <div className="text-lg text-gold-gradient">Website Control</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Update the content shown on the existing public website. The page design and
                  booking flow stay unchanged.
                </div>
              </div>

              {!isAdmin && (
                <div className="rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground">
                  Staff can view website settings but only admins can save changes.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {(
                  [
                    ["tagline", "Tagline"],
                    ["time", "Event time"],
                    ["venueName", "Venue name"],
                    ["venueAddress", "Venue address"],
                      ["mapUrl", "Venue map link"],
                      ["phone", "Contact number"],
                      ["coPartner", "Co-partner"],
                    ] as const
                ).map(([key, label]) => (
                  <label key={key} className="space-y-2 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <input
                      disabled={!isAdmin}
                      value={siteSettings[key]}
                      onChange={(e) =>
                        setSiteSettings((current) => ({ ...current, [key]: e.target.value }))
                      }
                      className={inputCls}
                    />
                  </label>
                ))}
              </div>

              <label className="block space-y-2 text-sm">
                <span className="text-muted-foreground">Announcement (leave blank to hide)</span>
                <input
                  disabled={!isAdmin}
                  value={siteSettings.announcement}
                  onChange={(e) =>
                    setSiteSettings((current) => ({ ...current, announcement: e.target.value }))
                  }
                  className={inputCls}
                />
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-muted-foreground">Intro text</span>
                <Textarea
                  disabled={!isAdmin}
                  value={siteSettings.introText}
                  onChange={(e) =>
                    setSiteSettings((current) => ({ ...current, introText: e.target.value }))
                  }
                  className="min-h-28"
                />
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-muted-foreground">Highlights (one per line)</span>
                <Textarea
                  disabled={!isAdmin}
                  value={siteSettings.highlights.join("\n")}
                  onChange={(e) =>
                    setSiteSettings((current) => ({
                      ...current,
                      highlights: e.target.value.split("\n"),
                    }))
                  }
                  className="min-h-36"
                />
              </label>

              {isAdmin && (
                <button type="submit" className={btnGold} disabled={savingSiteSettings}>
                  {savingSiteSettings ? "Saving…" : "Save website changes"}
                </button>
              )}
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
