import { createFileRoute, Link } from "@tanstack/react-router";
import hero from "@/assets/hero.jpg";
import { EVENT } from "@/lib/event";
import { btnGold, btnOutline, MandalaBg } from "@/components/festive";
import { CinematicHeroEffects } from "@/components/cinematic-hero-effects";
import { PublicSiteLayout, usePublicSiteSettings } from "@/components/public-site";

const DESCRIPTION =
  "Raas Rang Dhamaka! Navratri Raas Mahotsav at Royal Palace Function Hall, Kalaburagi. 16, 17, 18 October 2026, 5 PM–11 PM.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Raas Mahotsav 2026 — Navratri Dandiya & Garba in Kalaburagi | 16–18 Oct",
      },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Raas Mahotsav 2026 · Raas Rang Dhamaka" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "/" },
      { name: "twitter:title", content: "Raas Mahotsav 2026 · Raas Rang Dhamaka" },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Event",
          name: "Raas Mahotsav 2026 — Navratri Raas Mahotsav",
          startDate: "2026-10-16T17:00:00+05:30",
          endDate: "2026-10-18T23:00:00+05:30",
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: {
            "@type": "Place",
            name: EVENT.venueName,
            geo: {
              "@type": "GeoCoordinates",
              latitude: 17.2998627,
              longitude: 76.8247469,
            },
            address: {
              "@type": "PostalAddress",
              streetAddress: "Dhanwantri Hospital Road, Kootnoor",
              addressLocality: "Kalaburagi",
              addressRegion: "Karnataka",
              postalCode: "585102",
              addressCountry: "IN",
            },
          },
          offers: [
            { "@type": "Offer", name: "Individual Pass", price: "349", priceCurrency: "INR" },
            {
              "@type": "Offer",
              name: "Squad Pass (5 people)",
              price: "1500",
              priceCurrency: "INR",
            },
          ],
        }),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const site = usePublicSiteSettings();

  return (
    <PublicSiteLayout site={site}>
      <section className="cinematic-hero relative flex min-h-[calc(100svh-76px)] items-end overflow-hidden pb-14 pt-16 sm:items-center">
        <img
          src={hero}
          alt=""
          width={1088}
          height={1440}
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
        <div className="hero-image-grade absolute inset-0" />
        <CinematicHeroEffects />
        <MandalaBg className="-right-40 -top-40 w-[34rem] opacity-[0.12]" />
        <div className="hero-content relative z-10 mx-auto w-full max-w-4xl px-5 text-center animate-rise">
          <h1
            className="hero-title text-5xl leading-none sm:text-7xl md:text-8xl"
            data-title="RAAS MAHOTSAV"
          >
            <span>RAAS</span>
            <br />
            <span>MAHOTSAV</span>
          </h1>
          <p className="mt-1 font-display text-xl tracking-[0.5em] text-gold-soft sm:text-2xl">
            2026
          </p>
          <p className="hero-tagline mt-3 font-script text-4xl text-ember sm:text-5xl">
            {site.tagline}
          </p>
          <p className="mt-4 font-display text-base uppercase tracking-[0.16em] text-gold-soft sm:text-lg">
            Three nights. One unforgettable celebration.
          </p>
          <p className="mt-5 text-lg text-foreground/90">16 • 17 • 18 October</p>
          <p className="mt-1 text-muted-foreground">{site.time}</p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/book" className={`${btnGold} hero-cta`}>
              Book Your Pass
            </Link>
            <Link to="/event" className={btnOutline}>
              Explore
            </Link>
          </div>
          <p className="mt-8 text-xs uppercase tracking-[0.2em] text-gold-soft sm:text-sm">
            Garba <span className="px-1 text-gold">•</span> Dandiya
            <span className="px-1 text-gold">•</span> Music
            <span className="px-1 text-gold">•</span> Food
            <span className="px-1 text-gold">•</span> Stalls
          </p>
        </div>
      </section>
    </PublicSiteLayout>
  );
}
