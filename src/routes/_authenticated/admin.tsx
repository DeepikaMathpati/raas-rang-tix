import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
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
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const cameraRequestRef = useRef(0);
  const invalidQrRef = useRef<string | null>(null);

  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1;

    scannerRef.current?.destroy();
    scannerRef.current = null;

    cameraStreamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());
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
          video: {
            facingMode: { ideal: "environment" },
          },
        });
      } catch (cameraError) {
        if (
          !(cameraError instanceof Error) ||
          cameraError.name !== "OverconstrainedError"
        ) {
          throw cameraError;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
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

      if (requestId !== cameraRequestRef.current) {
        return;
      }

      scanner = new QrScanner(
        video,
        ({ data }) => {
          const ticketCode = data.trim();
          if (!/^T-[A-Z0-9]{14}$/i.test(ticketCode)) {
            if (invalidQrRef.current !== ticketCode) {
              invalidQrRef.current = ticketCode;
              setScannerError(
                "Invalid QR code. Scan a Raas Mahotsav ticket QR or enter its ticket code manually.",
              );
            }
            return;
          }

          if (scannerRef.current !== scanner) {
            return;
          }

          setScannerError(null);
          setCode(ticketCode.toUpperCase());
          stopCamera();
          toast.success("QR scanned. Press Check in to verify the ticket.");
        },
        { returnDetailedScanResult: true },
      );
      scannerRef.current = scanner;
      await scanner.start();
      if (requestId !== cameraRequestRef.current) {
        scanner.destroy();
        return;
      }
    } catch (cameraError) {
      if (requestId !== cameraRequestRef.current) {
        if (cameraStreamRef.current !== stream) {
          stream?.getTracks().forEach((track) => track.stop());
        }
        scanner?.destroy();
        return;
      }

      stopCamera();

      const errorName =
        cameraError instanceof Error ? cameraError.name : "";
      const message =
        cameraError instanceof Error ? cameraError.message : "";
      console.error("Unable to start QR scanner:", cameraError);

      if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setScannerError(
          "Camera permission was denied or blocked. Allow camera access in your browser, or enter the ticket code manually.",
        );
      } else if (
        errorName === "NotFoundError" ||
        errorName === "DevicesNotFoundError" ||
        /camera (not found|access is unavailable)/i.test(message)
      ) {
        setScannerError(
          "No camera was found on this device. Enter the ticket code manually.",
        );
      } else {
        setScannerError(
          "The camera is unavailable or could not be started. Check that it is connected and not in use, or enter the ticket code manually.",
        );
      }
    }
  }, [stopCamera]);

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

  useEffect(() => {
    if (loading || error || !data?.authorized) {
      return;
    }

    return stopCamera;
  }, [data?.authorized, error, loading, stopCamera]);

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

          <div className="mb-3 flex flex-wrap gap-3">
            {isScanning ? (
              <button
                type="button"
                className={btnOutline}
                onClick={stopCamera}
              >
                Stop camera
              </button>
            ) : (
              <button
                type="button"
                className={btnOutline}
                onClick={() => void startCamera()}
              >
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