/* RS Sultry-Royal — Appointment Studio
   Offline-first PWA. All data lives in localStorage on this device. */
(function () {
  "use strict";

  /* ---------------- storage ---------------- */

  const KEY = {
    appts: "rsAppointments",
    services: "rsServices",
    settings: "rsSettings",
    notes: "rsClientNotes",
    alerts: "rsAlerts"
  };

  const DEFAULT_SERVICES = [
    { id: "svc-swedish", name: "Massage Swedish", price: 100, duration: 60 },
    { id: "svc-deep", name: "Massage deep tissues", price: 150, duration: 60 },
    { id: "svc-plus", name: "Massage Swedish plus", price: 180, duration: 90 }
  ];

  const DEFAULT_SETTINGS = {
    business: "RS Sultry-Royal",
    manager: "Malik",
    currency: "€",
    leads: [1440, 30]
  };

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return clone(fallback);
      const val = JSON.parse(raw);
      return val === null || val === undefined ? clone(fallback) : val;
    } catch (e) {
      return clone(fallback);
    }
  }

  function save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      toast("Storage is full — nothing was saved.");
    }
  }

  /* ---------------- state ---------------- */

  let appts = load(KEY.appts, []);
  let services = load(KEY.services, DEFAULT_SERVICES);
  let settings = Object.assign(clone(DEFAULT_SETTINGS), load(KEY.settings, {}));
  let notes = load(KEY.notes, {});
  let alerts = load(KEY.alerts, []);

  let tab = "home";
  let query = "";
  let filter = "upcoming";
  let range = "month";
  let editingId = null;
  let deferredPrompt = null;

  if (!Array.isArray(appts)) appts = [];
  if (!Array.isArray(services) || !services.length) services = clone(DEFAULT_SERVICES);
  if (!Array.isArray(settings.leads)) settings.leads = clone(DEFAULT_SETTINGS.leads);
  if (!Array.isArray(alerts)) alerts = [];

  /* ---------------- helpers ---------------- */

  const $ = (sel) => document.querySelector(sel);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

  function money(n) {
    return settings.currency + num(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function parseDT(a) { return new Date(a.date + "T" + String(a.time || "00:00").slice(0, 5)); }

  function byDT(a, b) { return parseDT(a) - parseDT(b); }

  function isPast(a) { return parseDT(a).getTime() < Date.now(); }

  function fmtTime(t) {
    const d = new Date("2000-01-01T" + String(t || "00:00").slice(0, 5));
    return isNaN(d) ? String(t || "") : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  function fmtDay(iso) {
    const d = new Date(iso + "T00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  }

  function fmtDayShort(iso) {
    const d = new Date(iso + "T00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }

  function dayLabel(iso) {
    const t = todayISO();
    if (iso === t) return "Today · " + fmtDayShort(iso);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tIso = tomorrow.getFullYear() + "-" + pad(tomorrow.getMonth() + 1) + "-" + pad(tomorrow.getDate());
    if (iso === tIso) return "Tomorrow · " + fmtDayShort(iso);
    return fmtDay(iso);
  }

  function fromNow(ms) {
    const diff = Math.round((ms - Date.now()) / 60000);
    if (diff <= 0) return "now";
    if (diff < 60) return "in " + diff + " min";
    const h = Math.floor(diff / 60), m = diff % 60;
    if (h < 24) return "in " + h + " h" + (m ? " " + m + " min" : "");
    const d = Math.floor(h / 24);
    return "in " + d + " day" + (d > 1 ? "s" : "");
  }

  function clientKey(a) {
    const digits = String(a.clientPhone || "").replace(/\D/g, "");
    if (digits.length >= 6) return "p" + digits.slice(-9);
    return "n" + String(a.clientName || "").trim().toLowerCase();
  }

  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  }

  function serviceByName(name) {
    return services.find((s) => s.name === name) || null;
  }

  function durationOf(a) {
    const svc = serviceByName(a.massage);
    return num(a.duration) || (svc ? num(svc.duration) : 60);
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* ---------------- reminders ---------------- */

  const timers = new Map();

  function clearTimers() {
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
  }

  function scheduleAll() {
    clearTimers();
    appts.filter((a) => a.status !== "cancelled").forEach(scheduleOne);
  }

  function scheduleOne(a) {
    const start = parseDT(a).getTime();
    settings.leads.forEach((lead) => {
      const delay = start - lead * 60000 - Date.now();
      if (delay > 0 && delay < 2147483647) {
        timers.set(a.id + ":" + lead, setTimeout(() => fireReminder(a, lead), delay));
      }
    });
  }

  function leadLabel(lead) {
    if (lead >= 1440) return "tomorrow";
    if (lead >= 60) return "in " + Math.round(lead / 60) + " hour" + (lead >= 120 ? "s" : "");
    return "in " + lead + " minutes";
  }

  function fireReminder(a, lead) {
    pushAlert(a, lead);
    const body = a.massage + " " + leadLabel(lead) + " — " + fmtTime(a.time) + " · " + a.clientName + " · " + a.clientPhone;
    if (window.Notification && Notification.permission === "granted") {
      try { new Notification("RS Sultry-Royal Reminder", { body: body, tag: a.id + ":" + lead }); }
      catch (e) { /* some browsers require a service worker registration */ }
    }
    toast("Reminder: " + a.clientName + " — " + a.massage + " " + leadLabel(lead) + ".");
    if (tab === "home") render();
  }

  function pushAlert(a, lead) {
    alerts.unshift({
      id: uid(), at: Date.now(), apptId: a.id, lead: lead,
      title: a.clientName + " — " + a.massage,
      when: fmtDayShort(a.date) + " · " + fmtTime(a.time),
      sub: leadLabel(lead) + " · " + a.clientPhone
    });
    alerts = alerts.slice(0, 12);
    save(KEY.alerts, alerts);
  }

  // "granted" | "denied" | "default" | "unsupported"
  function notifState() {
    if (!("Notification" in window) || !window.Notification) return "unsupported";
    try { return Notification.permission; } catch (e) { return "unsupported"; }
  }

  function requestNotifications() {
    if (notifState() === "unsupported") {
      toast("This browser has no notifications — reminders will show inside the app.");
      return;
    }
    Notification.requestPermission().then((p) => {
      if (p === "granted") {
        toast("Notifications enabled.");
        try { new Notification("RS Sultry-Royal", { body: "You will be reminded before each appointment." }); } catch (e) {}
      } else {
        toast("Permission not granted — reminders will show inside the app.");
      }
      if (tab === "home" || tab === "settings") render();
    });
  }



  /* ---------------- derived data ---------------- */

  function activeAppts() { return appts.filter((a) => a.status !== "cancelled"); }

  function sortedUpcoming() {
    return activeAppts().filter((a) => !isPast(a)).sort(byDT);
  }

  function nextAppointment() { return sortedUpcoming()[0] || null; }

  function dueSoon() {
    return sortedUpcoming().filter((a) => parseDT(a).getTime() - Date.now() <= 24 * 3600 * 1000);
  }

  function clientList() {
    const map = new Map();
    appts.forEach((a) => {
      const k = clientKey(a);
      if (!map.has(k)) map.set(k, { key: k, name: a.clientName, phone: a.clientPhone, visits: [] });
      map.get(k).visits.push(a);
    });
    return Array.from(map.values()).map((c) => {
      const sorted = c.visits.slice().sort(byDT);
      const past = sorted.filter(isPast);
      const upcoming = sorted.filter((a) => !isPast(a) && a.status !== "cancelled");
      const billed = c.visits.filter((a) => a.status !== "cancelled");
      return {
        key: c.key,
        name: c.name,
        phone: c.phone,
        count: c.visits.length,
        spend: billed.reduce((s, a) => s + num(a.price), 0),
        last: past.length ? past[past.length - 1] : null,
        next: upcoming[0] || null,
        history: sorted.slice().reverse(),
        note: notes[c.key] || ""
      };
    }).sort((a, b) => {
      if (a.next && b.next) return byDT(a.next, b.next);
      if (a.next) return -1;
      if (b.next) return 1;
      const al = a.last ? parseDT(a.last).getTime() : 0;
      const bl = b.last ? parseDT(b.last).getTime() : 0;
      return bl - al;
    });
  }

  function rangeBounds(r) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    if (r === "today") end.setDate(end.getDate() + 1);
    else if (r === "week") {
      const dow = (start.getDay() + 6) % 7; // Monday = 0
      start.setDate(start.getDate() - dow);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 7);
    } else if (r === "month") {
      start.setDate(1);
      end.setTime(new Date(start.getFullYear(), start.getMonth() + 1, 1).getTime());
    } else {
      start.setTime(0);
      end.setTime(4102444800000); // year 2100
    }
    return { start: start.getTime(), end: end.getTime() };
  }

  function inRange(a, b) {
    const t = parseDT(a).getTime();
    return t >= b.start && t < b.end;
  }

  /* ---------------- conflict detection ---------------- */

  function endOf(a) { return parseDT(a).getTime() + durationOf(a) * 60000; }

  function conflictFor(candidate) {
    const s = parseDT(candidate).getTime();
    const e = s + (num(candidate.duration) || 60) * 60000;
    return appts.find((a) => {
      if (a.id === candidate.id || a.status === "cancelled") return false;
      return s < endOf(a) && parseDT(a).getTime() < e;
    }) || null;
  }

  /* ---------------- views ---------------- */

  const TABS = [
    { id: "home", label: "Today", ic: "◈" },
    { id: "book", label: "Book", ic: "✚" },
    { id: "schedule", label: "Agenda", ic: "▤" },
    { id: "clients", label: "Clients", ic: "☺" },
    { id: "stats", label: "Earnings", ic: "▲" }
  ];

  function renderTabs() {
    $("#tabs").innerHTML = TABS.map((t) =>
      '<button role="tab" data-action="nav" data-tab="' + t.id + '" aria-selected="' + (tab === t.id) + '">' +
      '<span class="ic" aria-hidden="true">' + t.ic + "</span><span>" + t.label + "</span></button>"
    ).join("");
  }

  function apptCard(a) {
    const past = isPast(a);
    const soon = !past && parseDT(a).getTime() - Date.now() <= 2 * 3600 * 1000;
    const cls = ["appt"];
    if (past) cls.push("past");
    if (a.status === "cancelled") cls.push("cancelled");
    if (a.status === "done") cls.push("done");

    const badge = a.status === "done" ? '<span class="badge done">Done</span>'
      : a.status === "cancelled" ? '<span class="badge cancelled">Cancelled</span>'
      : soon ? '<span class="badge soon">Soon</span>' : "";

    return '<div class="' + cls.join(" ") + '">' +
      '<div class="appt-top"><div class="appt-title">' + esc(a.massage || "Massage") + " " + badge + "</div>" +
      '<div class="price-pill">' + money(a.price) + "</div></div>" +
      "<p><strong>" + esc(a.clientName) + '</strong> · <a href="tel:' + esc(String(a.clientPhone).replace(/[^+\d]/g, "")) + '">' + esc(a.clientPhone) + "</a></p>" +
      '<p><span class="when">' + esc(dayLabel(a.date)) + " · " + esc(fmtTime(a.time)) + "</span> · " + durationOf(a) + " min</p>" +
      (a.note ? "<p><strong>Note:</strong> " + esc(a.note) + "</p>" : "") +
      '<div class="appt-actions">' +
        (a.status === "done"
          ? '<button class="btn btn-ghost btn-sm" data-action="reopen" data-id="' + a.id + '">Reopen</button>'
          : '<button class="btn btn-ghost btn-sm" data-action="done" data-id="' + a.id + '">Mark done</button>') +
        (a.status === "cancelled"
          ? '<button class="btn btn-ghost btn-sm" data-action="reopen" data-id="' + a.id + '">Restore</button>'
          : '<button class="btn btn-ghost btn-sm" data-action="cancel" data-id="' + a.id + '">Cancel booking</button>') +
        '<button class="btn btn-ghost btn-sm" data-action="edit" data-id="' + a.id + '">Edit</button>' +
        '<button class="btn btn-danger btn-sm" data-action="delete" data-id="' + a.id + '">Delete</button>' +
      "</div></div>";
  }

  function viewHome() {
    const today = todayISO();
    const todays = activeAppts().filter((a) => a.date === today).sort(byDT);
    const next = nextAppointment();
    const week = rangeBounds("week");
    const weekRev = activeAppts().filter((a) => inRange(a, week)).reduce((s, a) => s + num(a.price), 0);
    const todayRev = todays.reduce((s, a) => s + num(a.price), 0);
    const upcomingCount = sortedUpcoming().length;

    let html = "";

    // reminders
    const soon = dueSoon();
    if (soon.length || alerts.length) {
      html += '<section class="card"><h2>Reminders' +
        (notifState() !== "granted" ? '<button class="btn btn-ghost btn-sm" data-action="notify">Enable alerts</button>' : "") +
        "</h2>";
      soon.slice(0, 4).forEach((a) => {
        html += '<div class="alert"><span class="ic" aria-hidden="true">◈</span><div><strong>' +
          esc(a.clientName) + " — " + esc(a.massage) + "</strong><br>" +
          esc(fmtDayShort(a.date)) + " at " + esc(fmtTime(a.time)) + " · " + fromNow(parseDT(a).getTime()) +
          ' · <a href="tel:' + esc(String(a.clientPhone).replace(/[^+\d]/g, "")) + '">' + esc(a.clientPhone) + "</a></div></div>";
      });
      alerts.slice(0, 4).forEach((al) => {
        const d = new Date(al.at);
        html += '<div class="alert"><span class="ic" aria-hidden="true">✓</span><div>' +
          esc(al.title) + "<br>" + esc(al.when) + " · " + esc(al.sub) +
          '<br><span style="color:#8d8578;font-size:12px">Reminded ' + esc(d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })) + "</span>" +
          '</div><button class="btn btn-ghost btn-sm" data-action="dismiss-alert" data-id="' + al.id + '">×</button></div>';
      });
      html += "</section>";
    }

    // next up
    html += '<section class="card"><h2>Today<span style="color:var(--muted);font-size:12px;font-family:inherit;letter-spacing:0">' +
      esc(fmtDay(today)) + "</span></h2>";
    if (next) {
      html += '<div class="kv"><span class="name">Next up<small>' + esc(next.clientName) + " · " + esc(next.massage) +
        "</small></span><span class=\"val\">" + esc(fmtTime(next.time)) + "<br><small style=\"color:var(--muted);font-size:11px\">" +
        fromNow(parseDT(next).getTime()) + "</small></span></div>";
    }
    html += '<div class="stat-grid" style="margin-top:14px">' +
      statCard("Today", money(todayRev), todays.length + " appointment" + (todays.length === 1 ? "" : "s")) +
      statCard("This week", money(weekRev), "Mon–Sun") +
      statCard("Upcoming", String(upcomingCount), "booked ahead") +
      statCard("Clients", String(clientList().length), "in the book") +
      "</div>";

    html += todays.length
      ? todays.map(apptCard).join("")
      : '<div class="empty"><span class="big">◈</span>No appointments today.<br>Enjoy the quiet, or book someone in.</div>';

    html += '<div class="btn-row"><button class="btn btn-primary" data-action="nav" data-tab="book">Book an appointment</button></div>';
    html += "</section>";

    return html;
  }

  function statCard(k, v, s) {
    return '<div class="stat"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div><div class="s">' + esc(s) + "</div></div>";
  }

  function viewBook() {
    const a = editingId ? appts.find((x) => x.id === editingId) : null;
    const opts = services.map((s) =>
      '<option value="' + esc(s.name) + '" data-price="' + num(s.price) + '" data-duration="' + num(s.duration) + '"' +
      (a && a.massage === s.name ? " selected" : "") + ">" + esc(s.name) + " — " + money(s.price) + " · " + num(s.duration) + " min</option>"
    ).join("");

    return '<section class="card"><h2>' + (a ? "Edit appointment" : "Book an appointment") + "</h2>" +
      '<form id="apptForm" novalidate>' +
      (a ? '<input type="hidden" id="editingId" value="' + esc(a.id) + '">' : "") +
      "<label for=\"clientName\">Client name</label>" +
      '<input type="text" id="clientName" placeholder="e.g. Sophie Dubois" required value="' + esc(a ? a.clientName : "") + '">' +
      '<label for="clientPhone">Client contact number</label>' +
      '<input type="tel" id="clientPhone" placeholder="+32 470 00 00 00" required value="' + esc(a ? a.clientPhone : "") + '">' +
      '<label for="massage">Massage type</label>' +
      '<select id="massage" required><option value="">Select a massage</option>' + opts + "</select>" +
      '<div class="row"><div><label for="date">Date</label><input type="date" id="date" required value="' + esc(a ? a.date : todayISO()) + '"></div>' +
      '<div><label for="time">Time</label><input type="time" id="time" required value="' + esc(a ? a.time : defaultTime()) + '"></div></div>' +
      '<div class="row"><div><label for="duration">Duration (min)</label><input type="number" id="duration" min="15" step="15" value="' +
      esc(a ? durationOf(a) : 60) + '"></div>' +
      '<div><label for="price">Price (' + esc(settings.currency) + ')</label><input type="number" id="price" min="0" step="1" value="' +
      esc(a ? num(a.price) : 100) + '"></div></div>' +
      '<label for="note">Note</label><textarea id="note" placeholder="Preferences, injuries, access codes...">' + esc(a ? a.note : "") + "</textarea>" +
      '<div class="field-error" id="formError"></div>' +
      '<div class="btn-row" style="margin-top:16px">' +
      '<button class="btn btn-primary" type="submit">' + (a ? "Update appointment" : "Save appointment") + "</button>" +
      (a ? '<button class="btn btn-ghost" type="button" data-action="cancel-edit">Cancel</button>' : "") +
      "</div></form></section>";
  }

  function defaultTime() {
    const d = new Date();
    d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
    if (d.getHours() >= 22) { d.setHours(22, 0, 0, 0); }
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function scheduleListHTML() {
    let list = appts.slice().sort(byDT);
    if (filter === "upcoming") list = list.filter((a) => !isPast(a) || a.status === "done");
    if (filter === "past") list = list.filter((a) => isPast(a));
    if (filter === "cancelled") list = list.filter((a) => a.status === "cancelled");

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((a) =>
        String(a.clientName).toLowerCase().includes(q) ||
        String(a.clientPhone).toLowerCase().includes(q) ||
        String(a.massage).toLowerCase().includes(q) ||
        String(a.note || "").toLowerCase().includes(q));
    }

    if (filter === "past") list = list.reverse();

    if (!list.length) {
      return '<div class="empty"><span class="big">▤</span>Nothing here yet.</div>';
    }

    const groups = new Map();
    list.forEach((a) => {
      if (!groups.has(a.date)) groups.set(a.date, []);
      groups.get(a.date).push(a);
    });
    const keys = Array.from(groups.keys()).sort((x, y) => (filter === "past" ? y.localeCompare(x) : x.localeCompare(y)));

    return keys.map((k) =>
      '<div class="day-head">' + esc(dayLabel(k)) + " · " + groups.get(k).length + "</div>" +
      groups.get(k).map(apptCard).join("")
    ).join("");
  }

  function viewSchedule() {
    const chips = [["upcoming", "Upcoming"], ["past", "History"], ["cancelled", "Cancelled"], ["all", "All"]]
      .map(([id, label]) => '<button class="chip" data-action="filter" data-filter="' + id + '" aria-pressed="' + (filter === id) + '">' + label + "</button>").join("");

    return '<section class="card"><h2>Agenda</h2>' +
      '<input type="search" id="searchInput" placeholder="Search name, phone, massage..." value="' + esc(query) + '">' +
      '<div class="chips" style="margin-top:12px">' + chips + "</div>" +
      '<div id="scheduleList">' + scheduleListHTML() + "</div></section>";
  }

  function viewClients() {
    const list = clientList();
    if (!list.length) return '<section class="card"><h2>Clients</h2><div class="empty"><span class="big">☺</span>No clients yet — they appear here after the first booking.</div></section>';

    return '<section class="card"><h2>Clients<span style="color:var(--muted);font-size:12px;font-family:inherit;letter-spacing:0">' +
      list.length + " total</span></h2>" +
      list.map((c) => {
        const meta = [];
        if (c.next) meta.push("Next: " + fmtDayShort(c.next.date) + " " + fmtTime(c.next.time));
        else if (c.last) meta.push("Last: " + fmtDayShort(c.last.date));
        meta.push(c.count + " visit" + (c.count === 1 ? "" : "s"));
        meta.push(money(c.spend) + " total");

        return '<div class="client" data-client="' + esc(c.key) + '">' +
          '<div class="client-head" data-action="toggle-client" data-key="' + esc(c.key) + '">' +
          '<div class="avatar">' + esc(initials(c.name)) + "</div>" +
          "<div style=\"flex:1;min-width:0\"><div class=\"client-name\">" + esc(c.name) + "</div>" +
          '<div class="client-meta">' + esc(meta.join(" · ")) + "</div></div>" +
          '<span style="color:var(--gold);font-size:12px">' + (c.next ? "▾" : "▸") + "</span></div>" +
          '<div class="client-body">' +
          '<div class="btn-row" style="margin-top:0">' +
          '<a class="btn btn-ghost btn-sm" style="text-align:center;line-height:22px;text-decoration:none" href="tel:' + esc(String(c.phone).replace(/[^+\d]/g, "")) + '">Call client</a>' +
          '<button class="btn btn-ghost btn-sm" data-action="book-again" data-key="' + esc(c.key) + '">Book again</button>' +
          "</div>" +
          '<label for="note-' + esc(c.key) + '">Private note</label>' +
          '<textarea id="note-' + esc(c.key) + '" style="min-height:64px" data-note="' + esc(c.key) + '" placeholder="Preferences, allergies, favourite pressure...">' + esc(c.note) + "</textarea>" +
          '<button class="btn btn-ghost btn-sm" style="margin-top:8px" data-action="save-note" data-key="' + esc(c.key) + '">Save note</button>' +
          '<div style="margin-top:12px">' + c.history.slice(0, 12).map((a) =>
            '<div class="history-item"><span>' + esc(fmtDayShort(a.date)) + " · " + esc(fmtTime(a.time)) + " — " + esc(a.massage) +
            (a.status === "cancelled" ? " <em style=\"color:#ff9d99\">(cancelled)</em>" : "") + "</span><span style=\"color:var(--gold)\">" + money(a.price) + "</span></div>"
          ).join("") + "</div></div></div>";
      }).join("") + "</section>";
  }

  function viewStats() {
    const chips = [["week", "This week"], ["month", "This month"], ["today", "Today"], ["all", "All time"]]
      .map(([id, label]) => '<button class="chip" data-action="range" data-range="' + id + '" aria-pressed="' + (range === id) + '">' + label + "</button>").join("");

    const b = rangeBounds(range);
    const list = activeAppts().filter((a) => inRange(a, b));
    const revenue = list.reduce((s, a) => s + num(a.price), 0);
    const done = list.filter((a) => a.status === "done" || isPast(a));
    const upcoming = list.filter((a) => !isPast(a));
    const avg = list.length ? revenue / list.length : 0;

    // per service
    const bySvc = new Map();
    list.forEach((a) => {
      const k = a.massage || "Massage";
      if (!bySvc.has(k)) bySvc.set(k, { name: k, count: 0, revenue: 0 });
      const e = bySvc.get(k);
      e.count++; e.revenue += num(a.price);
    });
    const svcRows = Array.from(bySvc.values()).sort((x, y) => y.revenue - x.revenue);
    const maxRev = svcRows.reduce((m, s) => Math.max(m, s.revenue), 0);

    // last 7 days chart
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const iso = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
      const rev = activeAppts().filter((a) => a.date === iso).reduce((s, a) => s + num(a.price), 0);
      days.push({ iso: iso, rev: rev, label: d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2) });
    }
    const maxDay = days.reduce((m, d) => Math.max(m, d.rev), 0) || 1;

    const topClients = clientList().slice().sort((x, y) => y.spend - x.spend).slice(0, 5);

    return '<section class="card"><h2>Earnings</h2><div class="chips">' + chips + "</div>" +
      '<div class="stat-grid">' +
      statCard("Revenue", money(revenue), list.length + " booking" + (list.length === 1 ? "" : "s")) +
      statCard("Average", money(avg), "per booking") +
      statCard("Completed", String(done.length), "sessions delivered") +
      statCard("Still to come", money(upcoming.reduce((s, a) => s + num(a.price), 0)), upcoming.length + " ahead") +
      "</div></section>" +

      '<section class="card"><h2>Last 7 days</h2><div class="chart">' +
      days.map((d) => '<div class="col"><div class="amt">' + (d.rev ? money(d.rev) : "") + "</div>" +
        '<div class="bar" style="height:' + Math.round((d.rev / maxDay) * 100) + '%"></div>' +
        '<div class="lbl">' + esc(d.label) + "</div></div>").join("") +
      "</div></section>" +

      '<section class="card"><h2>By massage</h2>' +
      (svcRows.length ? svcRows.map((s) =>
        '<div style="padding:10px 0;border-bottom:1px dashed rgba(212,175,55,.16)">' +
        '<div class="kv" style="border:none;padding:0"><span class="name">' + esc(s.name) + "<small>" + s.count + " booked</small></span>" +
        '<span class="val">' + money(s.revenue) + "</span></div>" +
        '<div class="meter"><span style="width:' + Math.round((s.revenue / (maxRev || 1)) * 100) + '%"></span></div></div>'
      ).join("") : '<div class="empty">No bookings in this period.</div>') +
      "</section>" +

      '<section class="card"><h2>Top clients</h2>' +
      (topClients.length ? topClients.map((c) =>
        '<div class="kv"><span class="name">' + esc(c.name) + "<small>" + c.count + " visit" + (c.count === 1 ? "" : "s") + "</small></span>" +
        '<span class="val">' + money(c.spend) + "</span></div>"
      ).join("") : '<div class="empty">No clients yet.</div>') +
      "</section>";
  }

  function viewSettings() {
    const perm = notifState();
    const leadOpts = [[1440, "1 day before"], [120, "2 hours before"], [60, "1 hour before"], [30, "30 minutes before"]];

    return '<button class="back-link" data-action="nav" data-tab="home">‹ Back to today</button>' +
      '<section class="card"><h2>Studio</h2>' +
      '<div class="row"><div><label for="setBusiness">Business name</label><input id="setBusiness" value="' + esc(settings.business) + '"></div>' +
      '<div><label for="setManager">Managed by</label><input id="setManager" value="' + esc(settings.manager) + '"></div></div>' +
      '<div><label for="setCurrency">Currency symbol</label><input id="setCurrency" value="' + esc(settings.currency) + '" maxlength="3"></div>' +
      '<div class="btn-row"><button class="btn btn-primary" data-action="save-settings">Save studio details</button></div></section>' +

      '<section class="card"><h2>Reminders</h2>' +
      '<p class="section-note">Current permission: <strong style="color:var(--gold)">' + esc(perm) + "</strong>. " +
      (perm === "granted" ? "Alerts will appear even when the app is in the background." :
        perm === "denied" ? "Your browser blocked alerts — re-enable them in site settings. Reminders still show inside the app." :
        "Tap enable to receive alerts before each appointment.") + "</p>" +
      (perm !== "granted" ? '<div class="btn-row"><button class="btn btn-ghost" data-action="notify">Enable notifications</button></div>' : "") +
      "<label>Remind me</label>" +
      leadOpts.map(([mins, label]) =>
        '<label style="font-weight:400;display:flex;align-items:center;gap:10px;margin:8px 0">' +
        '<input type="checkbox" data-lead="' + mins + '" style="width:auto;min-height:auto" ' +
        (settings.leads.indexOf(mins) > -1 ? "checked" : "") + "> " + esc(label) + "</label>"
      ).join("") +
      '<div class="btn-row"><button class="btn btn-ghost" data-action="save-leads">Save reminder times</button></div></section>' +

      '<section class="card"><h2>Massage menu</h2>' +
      '<p class="section-note">Prices and durations pre-fill the booking form. Editing them does not change existing bookings.</p>' +
      services.map((s) =>
        '<div class="row-3" style="align-items:end;margin-bottom:10px">' +
        '<div style="grid-column:span 3"><label>Name</label><input data-svc-name="' + s.id + '" value="' + esc(s.name) + '"></div>' +
        "<div><label>Price</label><input type=\"number\" min=\"0\" data-svc-price=\"" + s.id + '" value="' + num(s.price) + '"></div>' +
        "<div><label>Minutes</label><input type=\"number\" min=\"15\" step=\"15\" data-svc-dur=\"" + s.id + '" value="' + num(s.duration) + '"></div>' +
        '<div><button class="btn btn-danger btn-sm" style="width:100%" data-action="del-service" data-id="' + s.id + '">Remove</button></div>' +
        "</div>"
      ).join("") +
      '<div class="btn-row"><button class="btn btn-ghost" data-action="add-service">Add massage</button>' +
      '<button class="btn btn-primary" data-action="save-services">Save menu</button></div></section>' +

      '<section class="card"><h2>Backup & data</h2>' +
      '<p class="section-note">Everything is stored in this browser only. Export a backup before switching phones or clearing Safari data.</p>' +
      '<div class="btn-row"><button class="btn btn-ghost" data-action="export-json">Backup (JSON)</button>' +
      '<button class="btn btn-ghost" data-action="export-csv">Export (CSV)</button></div>' +
      '<div class="btn-row"><button class="btn btn-ghost" data-action="import">Restore from backup</button>' +
      (deferredPrompt ? '<button class="btn btn-primary" data-action="install">Install app</button>' : "") +
      "</div>" +
      '<input type="file" id="importFile" accept="application/json,.json" style="display:none">' +
      '<div class="btn-row"><button class="btn btn-danger" data-action="clear-all">Erase all data</button></div>' +
      '<p class="section-note" style="margin-top:12px">' + appts.length + " appointments · " + clientList().length + " clients · " +
      "stored on this device</p></section>";
  }

  /* ---------------- render ---------------- */

  function render() {
    renderTabs();
    const view = $("#view");
    const fn = { home: viewHome, book: viewBook, schedule: viewSchedule, clients: viewClients, stats: viewStats, settings: viewSettings }[tab];
    view.innerHTML = (fn || viewHome)();
    afterRender();
  }

  function afterRender() {
    if (tab === "book") initBookForm();
    if (tab === "settings") initSettings();
  }

  function initBookForm() {
    const form = $("#apptForm");
    if (!form) return;
    const sel = $("#massage");
    const price = $("#price");
    const dur = $("#duration");

    sel.addEventListener("change", () => {
      const opt = sel.options[sel.selectedIndex];
      if (opt && opt.dataset.price) price.value = opt.dataset.price;
      if (opt && opt.dataset.duration) dur.value = opt.dataset.duration;
    });
    if (sel.selectedIndex > 0) {
      const opt = sel.options[sel.selectedIndex];
      if (opt && opt.dataset.price && !editingId) price.value = opt.dataset.price;
      if (opt && opt.dataset.duration && !editingId) dur.value = opt.dataset.duration;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitBooking();
    });
  }

  function submitBooking() {
    const err = $("#formError");
    const name = $("#clientName").value.trim();
    const phone = $("#clientPhone").value.trim();
    const massage = $("#massage").value;
    const date = $("#date").value;
    const time = $("#time").value;
    const duration = Math.max(15, parseInt($("#duration").value, 10) || 60);
    const price = Math.max(0, num($("#price").value));
    const note = $("#note").value.trim();
    const id = $("#editingId") ? $("#editingId").value : null;

    const problem = !name ? "Please enter the client name."
      : !phone ? "Please enter a contact number."
      : !massage ? "Please choose a massage."
      : !date ? "Please pick a date."
      : !time ? "Please pick a time." : "";

    if (problem) {
      err.textContent = problem;
      err.style.display = "block";
      return;
    }
    err.style.display = "none";

    const record = { id: id || uid(), clientName: name, clientPhone: phone, massage: massage,
      price: price, date: date, time: time, duration: duration, note: note,
      status: id ? (appts.find((a) => a.id === id) || {}).status || "booked" : "booked",
      createdAt: id ? (appts.find((a) => a.id === id) || {}).createdAt || Date.now() : Date.now() };

    const clash = conflictFor(record);
    if (clash && !confirm("This overlaps with " + clash.clientName + "’s " + clash.massage + " at " + fmtTime(clash.time) +
        " on " + fmtDayShort(clash.date) + ".\n\nSave anyway?")) return;

    if (id) appts = appts.map((a) => (a.id === id ? record : a));
    else appts.push(record);

    save(KEY.appts, appts);
    scheduleAll();

    if (id) { editingId = null; tab = "schedule"; }
    render();
    toast(id ? "Appointment updated." : "Appointment saved for " + name + ".");
  }

  function initSettings() {
    const file = $("#importFile");
    if (file) file.addEventListener("change", handleImport);
  }

  /* ---------------- actions ---------------- */

  const ACTIONS = {
    nav: (el) => { tab = el.dataset.tab; render(); window.scrollTo(0, 0); },

    notify: () => requestNotifications(),

    edit: (el) => { editingId = el.dataset.id; tab = "book"; render(); window.scrollTo(0, 0); },

    "cancel-edit": () => { editingId = null; tab = "schedule"; render(); },

    delete: (el) => {
      const a = appts.find((x) => x.id === el.dataset.id);
      if (!a || !confirm("Delete the " + fmtDayShort(a.date) + " " + fmtTime(a.time) + " appointment for " + a.clientName + "? This cannot be undone.")) return;
      appts = appts.filter((x) => x.id !== el.dataset.id);
      save(KEY.appts, appts);
      scheduleAll();
      render();
      toast("Appointment deleted.");
    },

    done: (el) => setStatus(el.dataset.id, "done", "Marked as done."),
    reopen: (el) => setStatus(el.dataset.id, "booked", "Reopened."),
    cancel: (el) => setStatus(el.dataset.id, "cancelled", "Booking cancelled."),

    filter: (el) => {
      filter = el.dataset.filter;
      document.querySelectorAll("[data-action=filter]").forEach((b) => b.setAttribute("aria-pressed", String(b === el)));
      $("#scheduleList").innerHTML = scheduleListHTML();
    },

    "toggle-client": (el) => el.closest(".client").classList.toggle("open"),

    "save-note": (el) => {
      const key = el.dataset.key;
      const area = document.querySelector('[data-note="' + key + '"]');
      if (!area) return;
      notes[key] = area.value.trim();
      save(KEY.notes, notes);
      toast("Note saved.");
    },

    "book-again": (el) => {
      const c = clientList().find((x) => x.key === el.dataset.key);
      if (!c) return;
      editingId = null;
      tab = "book";
      render();
      const last = c.history[0];
      $("#clientName").value = c.name;
      $("#clientPhone").value = c.phone;
      if (last) {
        $("#massage").value = last.massage;
        $("#price").value = num(last.price);
        $("#duration").value = durationOf(last);
        if (last.note) $("#note").value = last.note;
      }
      toast("Prefilled from " + c.name + "’s last visit.");
    },

    "dismiss-alert": (el) => {
      alerts = alerts.filter((a) => a.id !== el.dataset.id);
      save(KEY.alerts, alerts);
      render();
    },

    range: (el) => {
      range = el.dataset.range;
      document.querySelectorAll("[data-action=range]").forEach((b) => b.setAttribute("aria-pressed", String(b === el)));
      render();
    },

    "save-settings": () => {
      settings.business = $("#setBusiness").value.trim() || DEFAULT_SETTINGS.business;
      settings.manager = $("#setManager").value.trim() || DEFAULT_SETTINGS.manager;
      settings.currency = $("#setCurrency").value.trim() || "€";
      save(KEY.settings, settings);
      render();
      toast("Studio details saved.");
    },

    "save-leads": () => {
      const picked = Array.from(document.querySelectorAll("[data-lead]")).filter((c) => c.checked).map((c) => parseInt(c.dataset.lead, 10));
      settings.leads = picked.length ? picked.sort((a, b) => b - a) : clone(DEFAULT_SETTINGS.leads);
      save(KEY.settings, settings);
      scheduleAll();
      toast("Reminder times saved.");
    },

    "add-service": () => {
      services.push({ id: "svc-" + uid(), name: "New massage", price: 100, duration: 60 });
      save(KEY.services, services);
      render();
    },

    "del-service": (el) => {
      if (services.length <= 1) { toast("You need at least one massage on the menu."); return; }
      services = services.filter((s) => s.id !== el.dataset.id);
      save(KEY.services, services);
      render();
    },

    "save-services": () => {
      services = services.map((s) => ({
        id: s.id,
        name: (document.querySelector('[data-svc-name="' + s.id + '"]') || {}).value || s.name,
        price: num((document.querySelector('[data-svc-price="' + s.id + '"]') || {}).value),
        duration: Math.max(15, parseInt((document.querySelector('[data-svc-dur="' + s.id + '"]') || {}).value, 10) || 60)
      }));
      save(KEY.services, services);
      toast("Menu saved.");
    },

    "export-json": () => {
      const payload = { app: "RS Sultry-Royal", version: 2, exportedAt: new Date().toISOString(),
        appointments: appts, services: services, settings: settings, clientNotes: notes };
      download("sultry-royal-backup-" + todayISO() + ".json", JSON.stringify(payload, null, 2), "application/json");
      toast("Backup downloaded.");
    },

    "export-csv": () => {
      const rows = [["Date", "Time", "Client", "Phone", "Massage", "Duration", "Price", "Status", "Note"]];
      appts.slice().sort(byDT).forEach((a) => rows.push([a.date, fmtTime(a.time), a.clientName, a.clientPhone,
        a.massage, durationOf(a), num(a.price), a.status || "booked", (a.note || "").replace(/\r?\n/g, " ")]));
      const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
      download("sultry-royal-appointments-" + todayISO() + ".csv", csv, "text/csv;charset=utf-8");
      toast("CSV exported.");
    },

    import: () => $("#importFile").click(),

    install: async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt = null;
      render();
    },

    "clear-all": () => {
      if (!confirm("Erase every appointment, client note and setting on this device?\n\nThis cannot be undone. Export a backup first if you are unsure.")) return;
      if (!confirm("Really erase everything?")) return;
      [KEY.appts, KEY.services, KEY.settings, KEY.notes, KEY.alerts].forEach((k) => localStorage.removeItem(k));
      appts = []; services = clone(DEFAULT_SERVICES); settings = clone(DEFAULT_SETTINGS); notes = {}; alerts = [];
      scheduleAll();
      tab = "home";
      render();
      toast("All data erased.");
    }
  };

  function setStatus(id, status, msg) {
    appts = appts.map((a) => (a.id === id ? Object.assign({}, a, { status: status }) : a));
    save(KEY.appts, appts);
    scheduleAll();
    render();
    toast(msg);
  }

  function handleImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const incoming = Array.isArray(data) ? data : data.appointments;
        if (!Array.isArray(incoming)) throw new Error("No appointments found");
        if (!confirm("Restore " + incoming.length + " appointment(s)? This replaces the data currently on this device.")) return;
        appts = incoming.map((a) => Object.assign({}, a, {
          id: a.id || uid(),
          status: a.status || "booked",
          duration: num(a.duration) || 60,
          price: num(a.price),
          clientName: a.clientName || "",
          clientPhone: a.clientPhone || "",
          massage: a.massage || "Massage",
          date: a.date || todayISO(),
          time: a.time || "09:00"
        }));
        if (Array.isArray(data.services) && data.services.length) services = data.services;
        if (data.settings) settings = Object.assign(clone(DEFAULT_SETTINGS), data.settings);
        if (data.clientNotes) notes = data.clientNotes;
        save(KEY.appts, appts); save(KEY.services, services); save(KEY.settings, settings); save(KEY.notes, notes);
        scheduleAll();
        tab = "schedule";
        render();
        toast("Restored " + appts.length + " appointments.");
      } catch (err) {
        toast("That file could not be read as a backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function download(filename, text, type) {
    const blob = new Blob([text], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ---------------- global listeners ---------------- */

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const fn = ACTIONS[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "searchInput") {
      query = e.target.value;
      const list = $("#scheduleList");
      if (list) list.innerHTML = scheduleListHTML();
    }
  });

  // Settings are reached from the home screen and the earnings screen.
  document.addEventListener("dblclick", (e) => {
    if (e.target.closest(".logo")) { tab = "settings"; render(); window.scrollTo(0, 0); }
  });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  // Keep the Today screen fresh (countdowns, reminder list).
  setInterval(() => { if (tab === "home") render(); }, 60000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { scheduleAll(); if (tab === "home") render(); }
  });

  scheduleAll();
  render();
})();
