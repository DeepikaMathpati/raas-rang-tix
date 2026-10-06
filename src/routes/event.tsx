import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Music, ShoppingBag, Sparkles, Utensils } from "lucide-react";
import bloomingMindsLogo from "@/assets/blooming-minds-international-school.jpeg";
import parvatiSilksLogo from "@/assets/parvati-silks.jpeg";
import veerabhadreshwaraEventsLogo from "@/assets/veerabhadreshwara-events.jpeg";
import { EVENT, HIGHLIGHTS } from "@/lib/event";
import { btnGold, MandalaBg, SectionTitle } from "@/components/festive";
import { PublicSiteLayout, usePublicSiteSettings } from "@/components/public-site";

export const Route = createFileRoute("/event")({
  head: () => ({
    meta: [
      { title: "The Event — Raas Mahotsav 2026" },
      {
        name: "description",
        content: "Explore the Garba, Dandiya, music, food, stalls, attractions and prizes at Raas Mahotsav.",
      },
    ],
  }),
  component: EventPage,
});

const ICONS = [Sparkles, Music, ShoppingBag, Utensils, Camera, Sparkles];

function EventPage() {
  const site = usePublicSiteSettings();
  const highlights = [...new Set([...site.highlights, ...HIGHLIGHTS, "Other attractions"])];

  return (
    <PublicSiteLayout site={site}>
      <section className="relative px-5 py-12 sm:py-16">
        <MandalaBg className="-left-48 top-10 w-[30rem]" />
        <div className="relative">
          <SectionTitle kicker="Jai Mata Di" title="The Event">
            {site.introText}
          </SectionTitle>
          <h3 className="mb-6 text-center font-display text-sm uppercase tracking-[0.25em] text-gold-soft">
            What's included
          </h3>
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-3">
            {highlights.map((highlight, index) => {
              const Icon = ICONS[index] ?? Sparkles;
              return (
                <article key={highlight} className="ornate-frame rounded-lg p-5 text-center sm:p-7">
                  <Icon className="mx-auto h-7 w-7 text-gold" />
                  <h4 className="mt-3 font-display text-sm uppercase tracking-wider text-gold-soft sm:text-base">
                    {highlight}
                  </h4>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-10">
        <SectionTitle kicker="Celebrate in style" title="Amazing Prizes" />
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
          {["Best Dancer", "Best Costume", "Best Couple", "Best Group"].map((prize) => (
            <article key={prize} className="ornate-frame rounded-lg p-5 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-gold" />
              <h3 className="mt-3 font-display text-sm uppercase tracking-wider text-gold-soft">
                {prize}
              </h3>
            </article>
          ))}
        </div>
      </section>

      <section className="section-spark px-5 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="ornate-frame mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl px-8 py-6 sm:flex-row sm:text-left">
            <img
              src={bloomingMindsLogo}
              alt={`${site.coPartner} logo`}
              width={112}
              height={112}
              loading="lazy"
              className="h-28 w-28 shrink-0 rounded-full bg-white object-cover"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Proud Co-Partner
              </p>
              <p className="mt-2 font-display text-lg text-gold-soft">{site.coPartner}</p>
            </div>
          </div>

          <div className="mt-12">
            <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Our Sponsors
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                { name: "Parvati Silks", logo: parvatiSilksLogo },
                { name: "Veerabhadreshwara Events", logo: veerabhadreshwaraEventsLogo },
              ].map((sponsor) => (
                <div
                  key={sponsor.name}
                  className="ornate-frame flex min-h-32 items-center justify-center gap-4 rounded-xl p-5"
                >
                  <img
                    src={sponsor.logo}
                    alt={`${sponsor.name} logo`}
                    width={104}
                    height={104}
                    loading="lazy"
                    className="h-24 w-24 shrink-0 rounded-full bg-white object-contain"
                  />
                  <span className="text-left font-display text-base font-semibold uppercase tracking-wider text-gold-soft sm:text-lg">
                    {sponsor.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-10">
        <SectionTitle kicker="Relive the energy" title="Event Videos" />
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {[
            { title: "Raas Event Highlights", src: "/event-videos/raas-event-highlights.mov" },
            { title: "Raas Celebration", src: "/event-videos/raas-event-celebration.mp4?v=2" },
          ].map((video) => (
            <article key={video.src} className="ornate-frame rounded-xl p-3">
              <h3 className="mb-3 text-center font-display text-lg text-gold-soft">{video.title}</h3>
              <video
                className="aspect-video w-full rounded-lg bg-black object-contain"
                controls
                playsInline
                preload="metadata"
              >
                <source src={video.src} />
                Your browser does not support embedded videos.
              </video>
            </article>
          ))}
        </div>
        <p className="mt-6 text-center">
          <a
            href="https://www.instagram.com/raas_mahotsav_klb?stkn=cWFzcDN5dnZmdXV0"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gold-soft underline-offset-4 hover:underline"
          >
            Follow @raas_mahotsav_klb on Instagram
          </a>
        </p>
      </section>

      <section className="px-5 py-12 text-center">
        <p className="font-script text-4xl text-ember">{EVENT.tagline}</p>
        <Link to="/passes" className={`${btnGold} mt-5`}>
          Explore Passes
        </Link>
      </section>
    </PublicSiteLayout>
  );
}
