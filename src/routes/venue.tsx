import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { MapPin } from "lucide-react";
import { EVENT, EVENT_DATES } from "@/lib/event";
import { btnGold, SectionTitle } from "@/components/festive";
import { PublicSiteLayout, usePublicSiteSettings } from "@/components/public-site";

export const Route = createFileRoute("/venue")({
  head: () => ({
    meta: [
      { title: "Venue & Dates — Raas Mahotsav 2026" },
      {
        name: "description",
        content: "Choose your night and get directions to Royal Palace Function Hall, Kalaburagi.",
      },
    ],
  }),
  component: VenuePage,
});

function VenueQr({ value }: { value: string }) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setSrc("");
    setError(false);
    void QRCode.toDataURL(value, {
      margin: 1,
      width: 180,
      color: { dark: "#1a0808", light: "#f6ecd2" },
    })
      .then((dataUrl) => {
        if (active) setSrc(dataUrl);
      })
      .catch((cause: unknown) => {
        console.error("Venue directions QR generation failed:", cause);
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [value]);

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Could not generate the venue QR code.
      </p>
    );
  }
  if (!src) {
    return <div className="mx-auto h-[180px] w-[180px] animate-pulse rounded bg-muted" />;
  }
  return (
    <img
      src={src}
      alt="Scan for Royal Palace Function Hall directions"
      width={180}
      height={180}
    />
  );
}

function VenuePage() {
  const site = usePublicSiteSettings();
  const mapUrl = site.mapUrl || EVENT.mapUrl;

  return (
    <PublicSiteLayout site={site}>
      <section className="px-5 py-12 sm:py-16">
        <SectionTitle kicker="Join us in Kalaburagi" title="Venue & Dates" />
        <div className="mx-auto max-w-4xl">
          <h3 className="mb-4 text-center font-display text-sm uppercase tracking-[0.2em] text-gold-soft">
            Choose your night
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {EVENT_DATES.map((date) => (
              <Link
                key={date.value}
                to="/book"
                search={{ date: date.value }}
                className="ornate-frame rounded-lg p-4 text-center transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <span className="block font-display text-2xl text-gold-gradient sm:text-3xl">
                  {date.day} OCT
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{date.label}</span>
              </Link>
            ))}
          </div>

          <div className="ornate-frame mt-8 grid items-center gap-8 rounded-xl p-6 text-center sm:grid-cols-[1fr_auto] sm:p-8 sm:text-left">
            <div>
              <MapPin className="mx-auto h-8 w-8 text-gold sm:mx-0" />
              <h3 className="mt-3 font-display text-xl text-gold-soft">{site.venueName}</h3>
              <p className="mt-2 text-muted-foreground">
                Dhanwantri Hospital Road, Kootnoor, Kalaburagi
              </p>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${btnGold} mt-5`}
              >
                Get Directions
              </a>
            </div>
            <div className="mx-auto rounded-lg bg-[#f6ecd2] p-3">
              <VenueQr value={mapUrl} />
              <p className="mt-2 text-center text-xs text-[#1a0808]">Scan for venue directions</p>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteLayout>
  );
}
