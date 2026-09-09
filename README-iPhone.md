# RS Sultry-Royal — Appointment Studio

A Progressive Web App for managing massage appointments at RS Sultry-Royal (managed by Malik).
It runs entirely in the browser and works offline once installed.

## What it does

| Screen | What's on it |
| --- | --- |
| **Today** | Today's schedule, next appointment with a live countdown, reminders for the next 24 hours, and today/week earnings at a glance. |
| **Book** | Add or edit a booking: client, phone, massage, date, time, duration, price, note. Warns you if a new booking overlaps an existing one. |
| **Agenda** | Every appointment grouped by day, with search and Upcoming / History / Cancelled / All filters. |
| **Clients** | Client profiles built from your bookings: visit count, total spend, next and last visit, full history, tap-to-call, private notes and "book again" prefill. |
| **Earnings** | Revenue, average ticket and completed sessions for today / this week / this month / all time, a 7-day bar chart, breakdown by massage and top clients. |
| **Settings** (⚙ top right) | Studio details, reminder times, editable massage menu (name, price, duration), backup/restore and erase. |

Reminders default to **1 day before** and **30 minutes before**; you can switch to 2 hours or 1 hour in Settings.
Reminders show as system notifications where supported, and always appear inside the app on the Today screen.

## Files

```
index.html    app shell
styles.css    theme (black + gold, mobile-first)
app.js        all app logic and storage
manifest.webmanifest, sw.js, icon-180.png, icon-512.png   PWA install + offline
```

## Put it online

The app must be hosted over HTTPS for iPhone Home Screen installation and for notifications.

### GitHub Pages

1. Create a GitHub repository.
2. Upload all files in this folder to the repository root.
3. In GitHub: Settings → Pages → deploy from the main branch / root.
4. Open the resulting HTTPS address in Safari on your iPhone.

## Install on iPhone

In Safari:

1. Open the app's HTTPS address.
2. Tap Share.
3. Tap Add to Home Screen.
4. Confirm Add.

The app then launches from the Home Screen in standalone mode. On Android and desktop Chrome an
"Install app" button appears in Settings → Backup & data.

## Important

- **All data is stored in the browser's localStorage on that one device.** It is not synced between
  phones or browsers, and it is erased if you clear Safari's site data.
- Use **Settings → Backup (JSON)** before switching phones, and **Restore from backup** on the new one.
  **Export (CSV)** gives you a spreadsheet of every appointment.
- Reminders fire while the app is open (or in the background, where the browser allows it). System
  notifications need permission granted on that device.
- After an update, the service worker cache is versioned (`rs-sultry-royal-v3`); if your phone ever
  shows an old screen, pull to refresh or remove and re-add the Home Screen icon.
