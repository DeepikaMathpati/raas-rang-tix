# Raas Rang Dhamaka Tickets

Build a production-oriented mobile-first event ticketing website for "Raas Mahotsav 2026" in Kalaburagi, Karnataka, using the attached poster as the visual reference. Event: Navratri Raas Mahotsav, tagline "Raas Rang Dhamaka"; dates 16, 17, 18 October 2026; time 5 PM–11 PM; venue Royal Palace Function Hall, Dhanwantri Hospital Road, Kootnoor, Kalaburagi, Karnataka 585102; individual ₹299/person; Squad Pass ₹1,400/5 people; contact +91 9916977793; co-partner Blooming Minds International School, Kalaburagi. Included: Dandiya & Garba, Music & Entertainment, Shopping Stalls, Gujarati Snacks, Photo Booth, Many More Exciting Stalls.

Design: premium traditional Indian Navratri night, deep black/maroon/burgundy, antique gold, warm amber/orange glow, ornate Indian borders, subtle rangoli/mandala motifs, diyas/lanterns, tasteful dandiya/garba cues, elegant serif + script typography, cinematic but restrained motion. Do not make it look like a generic SaaS site.

Build: hero with countdown, dates, venue, Book Your Pass CTA; event introduction; highlights; dates; ticket pricing; booking flow; venue/map link; atmosphere/gallery using only supplied visuals without inventing real event photos; FAQ; final CTA/footer.

Ticket booking foundation: customer name, mobile, email, selected date (16/17/18 Oct), pass type, quantity, attendee count, amount, booking ID, payment status, ticket/check-in status. Treat each pass as valid for the selected single date unless changed later. Squad = 5 people for ₹1,400 and should be one booking linked to five attendee tickets later. Show ₹95 savings versus five individual passes.

Use Supabase/Postgres if available. Create sensible bookings, attendees/tickets, and payments schema with secure server-side operations/RLS. Create protected admin foundation with bookings, search, payment status, check-in status, revenue and attendee totals. Prepare unique QR ticket/check-in structure that prevents duplicate check-in.

Create a clean Razorpay integration boundary and test-mode-ready flow, but do NOT fake successful payments and do NOT expose secrets in frontend code. Payment verification must be server-side. Optimize for mobile/WhatsApp/social traffic. Add SEO and Open Graph basics. Use exact supplied event data and do not invent performers, sponsors, discounts, or facilities. Prioritize polished visual design plus a working booking/database foundation over unnecessary features.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://raas-rang-tix.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/77d9bf95-2367-4de2-a21e-0b0d28ace4c8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
