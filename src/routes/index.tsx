import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, Phone, Music, ShoppingBag, Camera, Utensils, Sparkles, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import hero from "@/assets/hero.jpg";
import { EVENT, EVENT_DATES, HIGHLIGHTS, PASSES, SQUAD_SAVINGS, inr } from "@/lib/event";
import { btnGold, btnOutline, Diya, MandalaBg, Ornament, SectionTitle } from "@/components/festive";

const TITLE = "Raas Mahotsav 2026 — Navratri Dandiya & Garba in Kalaburagi | 16–18 Oct";
const DESC =
  "Raas Rang Dhamaka! Navratri Raas Mahotsav at Royal Palace Function Hall, Kalaburagi. 16, 17, 18 October 2026, 5 PM–11 PM. Passes ₹349 or Squad of 5 for ₹1,500.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: "Raas Mahotsav 2026 · Raas Rang Dhamaka" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:title", content: "Raas Mahotsav 2026 · Raas Rang Dhamaka" },
      { name: "twitter:description", content: DESC },
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
            address: { "@type": "PostalAddress", streetAddress: "Dhanwantri Hospital Road, Kootnoor", addressLocality: "Kalaburagi", addressRegion: "Karnataka", postalCode: "585102", addressCountry: "IN" },
          },
          offers: [
            { "@type": "Offer", name: "Individual Pass", price: "349", priceCurrency: "INR" },
            { "@type": "Offer", name: "Squad Pass (5 people)", price: "1500", priceCurrency: "INR" },
          ],
        }),
      },
    ],
  }),
  component: Home,
});

const ICONS = [Sparkles, Music, ShoppingBag, Utensils, Camera, Sparkles];

function useCountdown(target: string) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const t = new Date(target).getTime();
    const tick = () => setLeft(Math.max(0, t - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  if (left === null) return null;
  const s = Math.floor(left / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

function Countdown() {
  const c = useCountdown(EVENT.startsAt);
  const units = [["Days", c?.d], ["Hours", c?.h], ["Mins", c?.m], ["Secs", c?.s]] as const;
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4" aria-label="Countdown to the first night">
      {units.map(([l, v]) => (
        <div key={l} className="ornate-frame rounded-md px-2 py-3 text-center sm:px-5">
          <div className="font-display text-2xl text-gold-gradient tabular-nums sm:text-4xl">{v === undefined ? "--" : String(v).padStart(2, "0")}</div>
          <div className="mt-1 text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">{l}</div>
        </div>
      ))}
    </div>
  );
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="#top" className="font-display text-sm tracking-[0.2em] text-gold-gradient">RAAS MAHOTSAV</a>
        <nav className="hidden gap-6 text-sm uppercase tracking-widest text-muted-foreground md:flex">
          <a href="#highlights" className="hover:text-gold">Highlights</a>
          <a href="#passes" className="hover:text-gold">Passes</a>
          <a href="#venue" className="hover:text-gold">Venue</a>
          <a href="#faq" className="hover:text-gold">FAQ</a>
        </nav>
        <Link to="/book" className="rounded-full bg-gold-gradient px-4 py-2 font-display text-xs font-semibold uppercase tracking-widest text-primary-foreground">Book Pass</Link>
      </div>
    </header>
  );
}

function Home() {
  return (
    <div id="top" className="overflow-x-hidden">
      <Nav />

      {/* HERO */}
      <section className="relative flex min-h-[100svh] items-end pb-12 pt-24 sm:items-center">
        <img src={hero} alt="" width={1088} height={1440} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" />
        <MandalaBg className="-right-40 -top-40 w-[34rem] opacity-[0.12]" />
        <div className="relative mx-auto w-full max-w-4xl px-5 text-center animate-rise">
          <p className="text-xs uppercase tracking-[0.35em] text-gold-soft">{EVENT.subtitle} · {EVENT.city}</p>
          <h1 className="mt-4 text-5xl leading-none text-gold-gradient drop-shadow sm:text-7xl md:text-8xl">RAAS<br />MAHOTSAV</h1>
          <p className="mt-1 font-display text-xl tracking-[0.5em] text-gold-soft sm:text-2xl">2026</p>
          <p className="mt-3 font-script text-4xl text-ember sm:text-5xl">{EVENT.tagline}</p>
          <Ornament className="my-6" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-lg">
            <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-gold" />16 · 17 · 18 October</span>
            <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-gold" />{EVENT.time}</span>
          </div>
          <p className="mt-2 inline-flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4 text-gold" />{EVENT.venueName}, Kootnoor, Kalaburagi</p>
          <div className="mx-auto mt-8 max-w-md"><Countdown /></div>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/book" className={btnGold}>Book Your Pass</Link>
            <a href="#passes" className={btnOutline}>View Passes · from {inr(349)}</a>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="relative px-5 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <SectionTitle kicker="Jai Mata Di" title="Three Nights of Raas" />
          <p className="text-xl leading-relaxed text-foreground/90">
            Celebrate Navratri in Kalaburagi with three evenings of Dandiya and Garba, music, stalls and festive flavours —
            all under one roof at the {EVENT.venueName}. Dress in your finest chaniya choli or kediyu and join the circle.
          </p>
          <p className="mt-6 text-sm uppercase tracking-[0.25em] text-muted-foreground">Co-Partner</p>
          <p className="mt-1 font-display text-gold-soft">{EVENT.coPartner}</p>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section id="highlights" className="relative px-5 py-20">
        <MandalaBg className="-left-48 top-10 w-[30rem]" />
        <SectionTitle kicker="What awaits" title="Festival Highlights" />
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-3">
          {HIGHLIGHTS.map((h, i) => {
            const Icon = ICONS[i];
            return (
              <div key={h} className="ornate-frame rounded-lg p-5 text-center transition-transform hover:-translate-y-1 sm:p-7">
                <Icon className="mx-auto h-7 w-7 text-gold" />
                <h3 className="mt-3 font-display text-sm uppercase tracking-wider text-gold-soft sm:text-base">{h}</h3>
              </div>
            );
          })}
        </div>
      </section>

      {/* DATES */}
      <section className="px-5 py-20">
        <SectionTitle kicker="Mark your nights" title="Event Dates" />
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-3 sm:gap-6">
          {EVENT_DATES.map((d) => (
            <div key={d.value} className="ornate-frame rounded-t-full rounded-b-lg px-2 pb-6 pt-10 text-center">
              <Diya className="mx-auto h-8 w-8" />
              <div className="mt-2 font-display text-5xl text-gold-gradient sm:text-6xl">{d.day}</div>
              <div className="text-sm uppercase tracking-[0.2em] text-gold-soft">October</div>
              <div className="mt-1 text-muted-foreground">{d.label}</div>
              <div className="mt-2 text-sm">{EVENT.time}</div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-muted-foreground">Each pass is valid for the single date you choose.</p>
      </section>

      {/* PASSES */}
      <section id="passes" className="relative px-5 py-20">
        <SectionTitle kicker="Choose your entry" title="Passes" />
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="ornate-frame flex flex-col rounded-xl p-8 text-center">
            <h3 className="font-display uppercase tracking-widest text-gold-soft">{PASSES.individual.label}</h3>
            <div className="mt-4 font-display text-6xl text-gold-gradient">{inr(349)}</div>
            <p className="text-muted-foreground">per person · one night</p>
            <Link to="/book" search={{ pass: "individual" }} className={`${btnOutline} mt-8`}>Book Individual</Link>
          </div>
          <div className="ornate-frame relative flex flex-col rounded-xl p-8 text-center shadow-glow">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 font-display text-[0.7rem] uppercase tracking-widest text-accent-foreground">Save {inr(SQUAD_SAVINGS)}</span>
            <h3 className="inline-flex items-center justify-center gap-2 font-display uppercase tracking-widest text-gold-soft"><Users className="h-4 w-4" />{PASSES.squad.label}</h3>
            <div className="mt-4 font-display text-6xl text-gold-gradient">{inr(1500)}</div>
            <p className="text-muted-foreground">for 5 people · one night</p>
            <p className="mt-2 text-sm text-foreground/80">vs {inr(349 * 5)} for five individual passes</p>
            <Link to="/book" search={{ pass: "squad" }} className={`${btnGold} mt-6`}>Book Squad</Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-5 py-16">
        <SectionTitle kicker="Simple & secure" title="How Booking Works" />
        <ol className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {["Choose your night & pass", "Pay securely online", "Get QR passes for entry"].map((s, i) => (
            <li key={s} className="ornate-frame rounded-lg p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient font-display text-primary-foreground">{i + 1}</div>
              <p className="mt-3 text-lg">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ATMOSPHERE */}
      <section className="px-5 py-16">
        <SectionTitle kicker="The mood" title="An Evening of Lanterns & Rhythm" />
        <div className="ornate-frame mx-auto max-w-4xl overflow-hidden rounded-xl p-2">
          <img src={hero} alt="Illustrated Navratri night with lanterns and garba dancers" width={1088} height={1440} loading="lazy" className="h-80 w-full rounded-lg object-cover sm:h-[28rem]" />
        </div>
        <p className="mt-3 text-center text-sm text-muted-foreground">Artistic illustration of the festive atmosphere.</p>
      </section>

      {/* VENUE */}
      <section id="venue" className="px-5 py-20">
        <SectionTitle kicker="Find us" title="Venue" />
        <div className="ornate-frame mx-auto max-w-2xl rounded-xl p-8 text-center">
          <MapPin className="mx-auto h-8 w-8 text-gold" />
          <h3 className="mt-3 font-display text-xl text-gold-soft">{EVENT.venueName}</h3>
          <p className="mt-2 text-lg">{EVENT.venueAddress}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a href={EVENT.mapUrl} target="_blank" rel="noopener noreferrer" className={btnOutline}>Open in Google Maps</a>
            <a href={EVENT.phoneHref} className={btnOutline}><Phone className="h-4 w-4" />{EVENT.phone}</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-5 py-20">
        <SectionTitle kicker="Good to know" title="FAQ" />
        <Accordion type="single" collapsible className="mx-auto max-w-2xl">
          {[
            ["Which dates and timings?", `16, 17 and 18 October 2026, ${EVENT.time} each evening.`],
            ["Is one pass valid for all three nights?", "No. Each pass is valid for the single date you select while booking."],
            ["What is the Squad Pass?", `One booking for 5 people at ₹1,500 — you save ${inr(SQUAD_SAVINGS)} compared to five individual passes. Each person gets their own QR ticket.`],
            ["How do I enter?", "After payment, you'll get a booking page with QR passes. Show the QR at the entrance; each QR can be scanned only once."],
            ["Where is the venue?", EVENT.venueAddress],
            ["Who do I contact for help?", `Call or WhatsApp ${EVENT.phone}.`],
          ].map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left font-display text-sm uppercase tracking-wider text-gold-soft">{q}</AccordionTrigger>
              <AccordionContent className="text-lg text-foreground/85">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA + FOOTER */}
      <section className="relative overflow-hidden px-5 py-24 text-center">
        <MandalaBg className="left-1/2 top-1/2 w-[40rem] -translate-x-1/2 -translate-y-1/2 opacity-10" />
        <p className="relative font-script text-5xl text-ember">Aavo Ramva!</p>
        <h2 className="relative mt-2 text-3xl uppercase text-gold-gradient sm:text-5xl">Join the Circle</h2>
        <Link to="/book" className={`${btnGold} relative mt-8`}>Book Your Pass</Link>
      </section>
      <footer className="border-t border-border px-5 pb-28 pt-10 text-center text-sm text-muted-foreground sm:pb-10">
        <p className="font-display tracking-[0.2em] text-gold-soft">RAAS MAHOTSAV 2026</p>
        <p className="mt-2">{EVENT.venueAddress}</p>
        <p className="mt-1">Co-Partner: {EVENT.coPartner}</p>
        <p className="mt-1"><a href={EVENT.phoneHref} className="text-gold">{EVENT.phone}</a></p>
      </footer>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 p-3 backdrop-blur sm:hidden">
        <Link to="/book" className={`${btnGold} w-full`}>Book Pass · from {inr(349)}</Link>
      </div>
    </div>
  );
}
