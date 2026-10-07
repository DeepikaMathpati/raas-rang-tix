import { createFileRoute, Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PASSES, SQUAD_SAVINGS, inr } from "@/lib/event";
import { btnGold, MandalaBg, SectionTitle } from "@/components/festive";
import { PublicSiteLayout, usePublicSiteSettings } from "@/components/public-site";

export const Route = createFileRoute("/passes")({
  head: () => ({
    meta: [
      { title: "Passes — Raas Mahotsav 2026" },
      {
        name: "description",
        content: "Book an Individual pass for ₹299 or a Squad pass for five at ₹1,400. Valid for one selected night.",
      },
    ],
  }),
  component: PassesPage,
});

function PassesPage() {
  const site = usePublicSiteSettings();

  return (
    <PublicSiteLayout site={site}>
      <section className="relative px-5 py-12 sm:py-16">
        <MandalaBg className="-right-48 top-10 w-[30rem]" />
        <div className="relative">
          <SectionTitle kicker="Choose your entry" title="Passes" />
          <p className="mx-auto -mt-5 mb-8 max-w-xl text-center text-lg text-gold-soft">
            Each pass is valid for <strong>one selected night only.</strong>
          </p>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <article className="ornate-frame flex flex-col rounded-xl p-8 text-center sm:p-10">
              <h3 className="font-display uppercase tracking-widest text-gold-soft">Individual</h3>
              <div className="mt-4 font-display text-6xl text-gold-gradient">
                {inr(PASSES.individual.price)}
              </div>
              <p className="text-muted-foreground">per person</p>
              <Link to="/book" search={{ pass: "individual" }} className={`${btnGold} mt-8`}>
                Book Individual
              </Link>
            </article>
            <article className="ornate-frame relative flex flex-col rounded-xl p-8 text-center shadow-glow sm:p-10">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 font-display text-[0.7rem] uppercase tracking-widest text-accent-foreground">
                Save {inr(SQUAD_SAVINGS)}
              </span>
              <h3 className="inline-flex items-center justify-center gap-2 font-display uppercase tracking-widest text-gold-soft">
                <Users className="h-4 w-4" />
                Squad
              </h3>
              <div className="mt-4 font-display text-6xl text-gold-gradient">
                {inr(PASSES.squad.price)}
              </div>
              <p className="text-muted-foreground">for 5 people</p>
              <p className="mt-2 text-lg text-gold-soft">
                {inr(PASSES.squad.price / PASSES.squad.people)}/person
              </p>
              <Link to="/book" search={{ pass: "squad" }} className={`${btnGold} mt-6`}>
                Book Squad
              </Link>
            </article>
          </div>
        </div>
      </section>
      <section className="px-5 pb-12 text-center">
        <p className="text-muted-foreground">Choose your night and secure your pass.</p>
        <Link to="/venue" className="mt-3 inline-block text-sm text-gold underline-offset-4 hover:underline">
          Venue & dates
        </Link>
      </section>
    </PublicSiteLayout>
  );
}
