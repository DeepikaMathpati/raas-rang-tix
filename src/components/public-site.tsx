import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Instagram, MapPin, Menu, Music2, Phone, Ticket, TicketCheck, X } from "lucide-react";
import { EVENT, HIGHLIGHTS } from "@/lib/event";
import { getPublicSiteSettings } from "@/lib/bookings.functions";

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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/"
            aria-label="Raas Mahotsav home"
            className="font-display text-sm tracking-[0.2em] text-gold-gradient"
          >
            RAAS MAHOTSAV
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gold/50 text-gold-soft md:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="public-site-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <nav
            id="public-site-navigation"
            aria-label="Main navigation"
            className={`${menuOpen ? "flex" : "hidden"} absolute inset-x-4 top-full z-50 flex-col gap-2 rounded-lg border border-border bg-background p-3 text-[0.65rem] uppercase tracking-widest shadow-xl md:static md:flex md:flex-row md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
          >
            <Link
              to="/event"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/10 px-2.5 py-1.5 text-gold-soft shadow-glow transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold/20 hover:text-gold sm:px-3"
            >
              <Music2 className="h-3.5 w-3.5" />
              Event
            </Link>
            <Link
              to="/passes"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/10 px-2.5 py-1.5 text-gold-soft shadow-glow transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold/20 hover:text-gold sm:px-3"
            >
              <Ticket className="h-3.5 w-3.5" />
              Passes
            </Link>
            <Link
              to="/venue"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/10 px-2.5 py-1.5 text-gold-soft shadow-glow transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold/20 hover:text-gold sm:px-3"
            >
              <MapPin className="h-3.5 w-3.5" />
              Venue
            </Link>
            <Link
              to="/my-tickets"
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center gap-1 rounded-full border border-gold/70 bg-gold/20 px-2.5 py-1.5 font-display text-[0.65rem] font-semibold tracking-[0.08em] text-gold shadow-glow transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold/30 sm:px-3"
            >
              <TicketCheck className="h-3.5 w-3.5 shrink-0" />
              My Tickets
            </Link>
          </nav>
        </div>
      </header>
      {site.announcement && (
        <div className="border-b border-gold/20 bg-background/95 px-4 py-2 text-center text-sm text-gold-soft">
          {site.announcement}
        </div>
      )}
      <main>{children}</main>
      <footer className="border-t border-border px-5 pb-10 pt-10 text-center text-sm text-muted-foreground">
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
        <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
          <a
            href={site.mapUrl || EVENT.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gold"
          >
            <MapPin className="h-4 w-4" />
            Directions
          </a>
          <a
            href="https://www.instagram.com/raas_mahotsav_klb/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gold"
          >
            <Instagram className="h-4 w-4" />
            Instagram
          </a>
        </p>
        <p className="mt-5 text-xs text-muted-foreground/70">
          © 2026 Raas Mahotsav. All rights reserved.
        </p>
        <Link
          to="/auth"
          className="mt-5 inline-block text-xs uppercase tracking-[0.2em] text-muted-foreground/60 transition-colors hover:text-gold"
        >
          Organiser Login
        </Link>
      </footer>
    </div>
  );
}
