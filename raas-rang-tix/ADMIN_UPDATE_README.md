# Raas Mahotsav Admin Update

This update keeps the existing user-facing design, booking flow, Razorpay payment flow, ticket/QR flow, and QR check-in flow intact.

## Admin additions

- Stats dashboard with bookings, revenue, attendees, check-in, remaining, date-wise and pass-wise stats.
- Attendee list with search and date filter.
- Referral management with referral codes, shareable `/book?ref=CODE` links, active/pause control, and referral performance.
- Existing QR check-in scanner and manual ticket-code check-in.
- Website Control for editable public content: tagline, time, venue, phone, co-partner, announcement, intro text, and highlights.

## Required Supabase step

Run the new migration in the Supabase SQL editor before using the new admin features:

`supabase/migrations/20261006123000_admin_control_referrals_site_settings.sql`

It creates the `referrals` and `site_settings` tables and adds `referral_code` to `bookings`.

## Environment

The real `.env` file is intentionally not included in this ZIP. Keep your existing local `.env` in the project root.

Required server variables remain the same as the existing project, including Supabase and Razorpay credentials.
