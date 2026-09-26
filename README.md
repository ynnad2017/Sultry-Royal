# Sultry Royal - Booking Management App

A luxury-themed internal booking management app for massage appointments.

## Features
- **Dashboard** with stats, revenue tracking, today's appointments, and personal notes
- **Booking creation** with massage type selection, extra services, and payment methods
- **Booking management** with search, status filtering, detail view, and editing
- **Animated welcome screen** with gold branding

## Tech Stack
- React + TypeScript (ZiteJS framework)
- Tailwind CSS with custom gold/black luxury theme
- Playfair Display + Manrope fonts
- Framer Motion animations

## Massage Services
- Swedish Massage — €100
- Deep Tissue Massage — €150
- Swedish Deep Tensions — €180
- Breath Massage — €250
- Massage Extra — €50

## Backend Endpoints
- `createBooking` — Create with auto pricing and visit tracking
- `getBookings` — Fetch with sorting (upcoming first)
- `updateBooking` — Edit with price recalculation
- `deleteBooking` — Permanent removal
- `getDashboardStats` — Aggregated stats via SQL
