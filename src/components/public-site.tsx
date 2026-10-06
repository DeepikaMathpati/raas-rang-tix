import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Phone } from "lucide-react";
import { EVENT, HIGHLIGHTS } from "@/lib/event";
import { getPublicSiteSettings } from "@/lib/bookings.functions";
import { btnGold } from "@/components/festive";

export type PublicSiteSettings = {
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

const DEFAULT_SETTINGS: PublicSiteSettings = {
  tagline: EVENT.tagline,
  time: EVENT.time,
  venueName: EVENT.venueName,
  venueAddress: EVENT.venueAddress,
  mapUrl: EVENT.mapUrl,
  phone: EVENT.phone,
  coPartner: EVENT.coPartner,
  announcement: "",
  introText: `Celebrate Navratri in Kalaburagi with three evenings of Dandiya and Garba, music, stalls and festive flavours — all under one roof at the ${EVENT.venueName}. Dress in your finest chaniya choli or kediyu and join the circle.`,
  highlights: [...HIGHLIGHTS],
};

export function usePublicSiteSettings() {
  const getSettings = useServerFn(getPublicSiteSettings);
  const [site, setSite] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    void getSettings()
      .then((raw) => {
        if (!active || !raw || typeof raw !== "object" || Array.isArray(raw)) return;
        const value = raw as Partial<PublicSiteSettings>;
        setSite((current) => ({
          ...current,
          ...value,
          highlights:
            Array.isArray(value.highlights) && value.highlights.length
              ? value.highlights
              : current.highlights,
        }));
      })
      .catch((error: unknown) => {
        console.error("Public site settings load failed:", error);
      });

    return () => {
      active = false;
    };
  }, [getSettings]);

  return site;
}

export function PublicSiteLayout({
  site,
  children,
}: {
  site: PublicSiteSettings;
  children: ReactNode;
}) {
  const phoneHref = `tel:${site.phone.replace(/[^0-9+]/g, "")}`;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-3">
          <Link to="/" className="font-display text-sm tracking-[0.2em] text-gold-gradient">
            RAAS MAHOTSAV
          </Link>
          <nav className="order-3 flex w-full justify-center gap-5 whitespace-nowrap text-[0.65rem] uppercase tracking-widest text-muted-foreground md:order-none md:w-auto md:gap-6 md:text-sm">
            <Link to="/" className="hover:text-gold">
              Home
            </Link>
            <Link to="/event" className="hover:text-gold">
              Event
            </Link>
            <Link to="/passes" className="hover:text-gold">
              Passes
            </Link>
            <Link to="/venue" className="hover:text-gold">
              Venue
            </Link>
          </nav>
          <Link
            to="/book"
            className="rounded-full bg-gold-gradient px-4 py-2 font-display text-xs font-semibold uppercase tracking-widest text-primary-foreground shadow-glow"
          >
            Book Now
          </Link>
        </div>
      </header>
      {site.announcement && (
        <div className="border-b border-gold/20 bg-background/95 px-4 py-2 text-center text-sm text-gold-soft">
          {site.announcement}
        </div>
      )}
      <main>{children}</main>
      <footer className="border-t border-border px-5 pb-24 pt-10 text-center text-sm text-muted-foreground sm:pb-10">
        <p className="font-display tracking-[0.2em] text-gold-soft">RAAS MAHOTSAV 2026</p>
        <p className="mt-2">{site.venueAddress}</p>
        <p className="mt-1">Co-Partner: {site.coPartner}</p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-3">
          <a href={phoneHref} className="inline-flex items-center gap-1 text-gold">
            <Phone className="h-4 w-4" />
            {site.phone}
          </a>
          <a href={EVENT.secondaryPhoneHref} className="inline-flex items-center gap-1 text-gold">
            <Phone className="h-4 w-4" />
            {EVENT.secondaryPhone}
          </a>
        </p>
        <Link
          to="/auth"
          className="mt-5 inline-block text-xs uppercase tracking-[0.2em] text-muted-foreground/60 transition-colors hover:text-gold"
        >
          Organiser Login
        </Link>
      </footer>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 p-3 backdrop-blur sm:hidden">
        <Link to="/book" className={`${btnGold} w-full`}>
          Book Now
        </Link>
      </div>
    </div>
  );
}
