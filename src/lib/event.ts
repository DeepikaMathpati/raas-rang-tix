export const EVENT = {
  name: "Raas Mahotsav 2026",
  subtitle: "Navratri Raas Mahotsav",
  tagline: "Raas Rang Dhamaka",
  city: "Kalaburagi, Karnataka",
  time: "5 PM – 11 PM",
  venueName: "Royal Palace Function Hall",
  venueAddress: "Dhanwantri Hospital Road, Kootnoor, Kalaburagi, Karnataka 585102",
  mapUrl: "https://maps.app.goo.gl/Wcbgg6gzdn8LSUNH7",
  phone: "+91 9916977793",
  phoneHref: "tel:+919916977793",
  whatsappHref: "https://wa.me/919916977793",
  secondaryPhone: "+91 9986297793",
  secondaryPhoneHref: "tel:+919986297793",
  coPartner: "Blooming Minds International School, Kalaburagi",
  startsAt: "2026-10-16T17:00:00+05:30",
} as const;

export const EVENT_DATES = [
  { value: "2026-10-16", day: "16", label: "Friday", short: "16 Oct" },
  { value: "2026-10-17", day: "17", label: "Saturday", short: "17 Oct" },
  { value: "2026-10-18", day: "18", label: "Sunday", short: "18 Oct" },
] as const;
export type EventDate = (typeof EVENT_DATES)[number]["value"];

export const PASSES = {
  individual: { label: "Individual Pass", price: 349, people: 1 },
  squad: { label: "Squad Pass", price: 1500, people: 5 },
} as const;
export type PassType = keyof typeof PASSES;
export const SQUAD_SAVINGS = PASSES.individual.price * 5 - PASSES.squad.price; // 245

export const HIGHLIGHTS = [
  "Dandiya & Garba",
  "Music & Entertainment",
  "Shopping Stalls",
  "Gujarati Snacks",
  "Photo Booth",
  "Many More Exciting Stalls",
] as const;

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
export const dateLabel = (v: string) => {
  const d = EVENT_DATES.find((x) => x.value === v);
  return d ? `${d.label}, ${d.day} October 2026` : v;
};
