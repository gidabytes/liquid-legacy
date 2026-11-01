/* Liquid Legacy — iPadOS 26.7.2 experience for iPad 2 / iOS 9.3.5
   ES5 only: no modules, no arrows, no template literals, no Promise, no fetch. */
(function () {
  "use strict";

  var API = "/api/legacy/v1";
  var BUILD = "2.27.1";
  var state = {
    user: null, route: "#/home", page: 0,
    theme: "ios26", look: "dark", appearance: "dark", accent: "blue",
    glass: "regular", glassMode: "standard", contrast: "normal", density: "regular",
    textScale: "regular", motion: "full", iconStyle: "default", homeWall: "aurora",
    homeBright: "mid", edit: false, focus: "off", order: [], hidden: [], readAlerts: [],
    widgetOrder: [], dock: [],
    dockPrefs: null,
    orientation: "landscape", viewport: "md",
    pollMs: 10000, dnd: false,
    timer: null, backoff: 0, online: true, pollBusy: false,
    data: { host: null, datasets: {} }, alerts: [], notes: [], chatBusy: false
  };

  var APPS = [
    { id: "gids",    name: "GIDS",           icon: "assets/icon-gids.png",     target: "#/gids",     cat: "Monitoring" },
    { id: "chat",    name: "Genie",          icon: "assets/icon-chat.png",     target: "#/chat",     cat: "AI" },
    { id: "infra",   name: "Infrastructure", icon: "assets/icon-infra.png",    target: "#/infra",    cat: "Monitoring" },
    { id: "alerts",  name: "Alerts",         icon: "assets/icon-alerts.png",   target: "#/alerts",   cat: "Monitoring" },
    { id: "status",  name: "Host Status",    icon: "assets/icon-status.png",   target: "#/status",   cat: "System" },
    { id: "settings",name: "Settings",       icon: "assets/icon-settings.png", target: "#/settings", cat: "System" },
    { id: "about",   name: "About",          icon: "assets/icon-about.png",    target: "#/about",    cat: "System" },
    { id: "calendar", name: "Calendar",      icon: "assets/icon-calendar.png", target: "#/calendar", cat: "Productivity" },
    { id: "notes",    name: "Notes",         icon: "assets/icon-notes.png",    target: "#/notes",    cat: "Productivity" },
    { id: "reminders",name: "Reminders",     icon: "assets/icon-reminders.png",target: "#/reminders",cat: "Productivity" },
    { id: "clock",    name: "Clock",         icon: "assets/icon-clock.png",    target: "#/clock",    cat: "Utilities" },
    { id: "calculator",name: "Calculator",   icon: "assets/icon-calculator.png",target:"#/calculator", cat: "Utilities" }
  ];
  var FOLDERS = [{ name: "System", apps: ["settings", "about"] }];

  /* ---------------- application registry (Phase 1) ----------------
     Built-in Liquid Legacy apps + official external launchers + user web apps.
     kind: builtin | external | custom.  External entries open their legitimate
     site in a new tab; nothing is embedded or scraped. */
  var EXTERNAL_APPS = [
    { id: "outlook",   name: "Outlook",      cat: "Productivity",  url: "https://outlook.office.com/mail/" },
    { id: "word",      name: "Word",         cat: "Productivity",  url: "https://www.office.com/launch/word" },
    { id: "excel",     name: "Excel",        cat: "Productivity",  url: "https://www.office.com/launch/excel" },
    { id: "powerpoint",name: "PowerPoint",   cat: "Productivity",  url: "https://www.office.com/launch/powerpoint" },
    { id: "onedrive",  name: "OneDrive",     cat: "Business",      url: "https://onedrive.live.com/" },
    { id: "teams",     name: "Teams",        cat: "Communication", url: "https://teams.microsoft.com/" },
    { id: "sharepoint",name: "SharePoint",   cat: "Business",      url: "https://www.office.com/sharepoint" },
    { id: "onenote",   name: "OneNote",      cat: "Productivity",  url: "https://www.office.com/launch/onenote" },
    { id: "gmail",     name: "Gmail",        cat: "Communication", url: "https://mail.google.com/" },
    { id: "gcal",      name: "Google Calendar", cat: "Productivity", url: "https://calendar.google.com/" },
    { id: "gdrive",    name: "Google Drive", cat: "Business",      url: "https://drive.google.com/" },
    { id: "gdocs",     name: "Google Docs",  cat: "Productivity",  url: "https://docs.google.com/" },
    { id: "gsheets",   name: "Google Sheets",cat: "Productivity",  url: "https://sheets.google.com/" },
    { id: "gslides",   name: "Google Slides",cat: "Productivity",  url: "https://slides.google.com/" },
    { id: "gmeet",     name: "Google Meet",  cat: "Communication", url: "https://meet.google.com/" },
    { id: "gtasks",    name: "Google Tasks", cat: "Productivity",  url: "https://tasks.google.com/" },
    { id: "notion",    name: "Notion",       cat: "Productivity",  url: "https://www.notion.so/" },
    { id: "slack",     name: "Slack",        cat: "Communication", url: "https://app.slack.com/client" },
    { id: "zoom",      name: "Zoom",         cat: "Communication", url: "https://zoom.us/" },
    { id: "trello",    name: "Trello",       cat: "Business",      url: "https://trello.com/" },
    { id: "asana",     name: "Asana",        cat: "Business",      url: "https://app.asana.com/" },
    { id: "jira",      name: "Jira",         cat: "Business",      url: "https://www.atlassian.com/software/jira" },
    { id: "github",    name: "GitHub",       cat: "Business",      url: "https://github.com/" },
    { id: "gitlab",    name: "GitLab",       cat: "Business",      url: "https://gitlab.com/" },
    { id: "facebook",  name: "Facebook",     cat: "Social",        url: "https://www.facebook.com/" },
    { id: "instagram", name: "Instagram",    cat: "Social",        url: "https://www.instagram.com/" },
    { id: "x",         name: "X",            cat: "Social",        url: "https://x.com/" },
    { id: "tiktok",    name: "TikTok",       cat: "Social",        url: "https://www.tiktok.com/" },
    { id: "youtube",   name: "YouTube",      cat: "Social",        url: "https://www.youtube.com/" },
    { id: "reddit",    name: "Reddit",       cat: "Social",        url: "https://www.reddit.com/" },
    { id: "pinterest", name: "Pinterest",    cat: "Social",        url: "https://www.pinterest.com/" },
    { id: "linkedin",  name: "LinkedIn",     cat: "Social",        url: "https://www.linkedin.com/" },
    { id: "messenger", name: "Messenger",    cat: "Communication", url: "https://www.messenger.com/" },
    { id: "whatsapp",  name: "WhatsApp",     cat: "Communication", url: "https://web.whatsapp.com/" },
    { id: "telegram",  name: "Telegram",     cat: "Communication", url: "https://web.telegram.org/" },
    { id: "discord",   name: "Discord",      cat: "Communication", url: "https://discord.com/app" },
    { id: "signal",    name: "Signal",       cat: "Communication", url: "https://signal.org/" },
    { id: "maps",      name: "Maps",         cat: "Utilities",     url: "https://www.openstreetmap.org/" }
  ];
  var LIB_CATS = ["Productivity", "Business", "Communication", "Social", "Utilities", "Liquid Legacy"];

  function loadCustomApps() {
    try {
      var raw = load("gg_custom_apps", "");
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return (arr && arr.length !== undefined) ? arr : [];
    } catch (e) { return []; }
  }
  function saveCustomApps(arr) { store("gg_custom_apps", JSON.stringify(arr)); }
  function loadTrash() {
    try {
      var raw = load("gg_trash", "");
      if (!raw) return [];
      var a = JSON.parse(raw);
      return (a && a.length !== undefined) ? a : [];
    } catch (e) { return []; }
  }
  function saveTrash(arr) { store("gg_trash", JSON.stringify(arr)); }
  function trashCustomApp(id) {
    var apps = loadCustomApps(), i, entry = null, idx = -1;
    for (i = 0; i < apps.length; i++) if (apps[i].id === id) { entry = apps[i]; idx = i; }
    if (!entry || idx < 0) return;
    var tr = loadTrash();
    if (tr.filter(function (t) { return t.id === entry.id; }).length) return;
    tr.push({ id: entry.id, app: entry, deletedAt: new Date().toLocaleString() });
    saveTrash(tr);
    apps.splice(idx, 1);
    saveCustomApps(apps);
    if (dockIds().indexOf(id) >= 0) { var d = dockIds(), k; for (k = 0; k < d.length; k++) if (d[k] === id) d.splice(k, 1); state.dock = d; store("gg_dock", d.join(",")); refreshDock(); }
    renderAppLibrary(); renderSettings();
    showBanner(entry.name + " moved to Recycle Bin", "info");
  }
  function restoreTrash(id) {
    var tr = loadTrash(), out = [], i, app = null;
    for (i = 0; i < tr.length; i++) { if (tr[i].id === id) app = tr[i].app; else out.push(tr[i]); }
    if (!app) return;
    saveTrash(out);
    var apps = loadCustomApps(), j, dup = false;
    for (j = 0; j < apps.length; j++) if (apps[j].id === app.id) dup = true;
    if (!dup) apps.push(app);
    saveCustomApps(apps);
    renderAppLibrary(); renderSettings();
    showBanner(app.name + " restored", "info");
  }
  function purgeTrash(id) {
    var tr = loadTrash(), out = [], i;
    for (i = 0; i < tr.length; i++) if (tr[i].id !== id) out.push(tr[i]);
    saveTrash(out); renderSettings();
    showBanner("Deleted permanently", "warning");
  }
  function emptyTrash() { saveTrash([]); renderSettings(); showBanner("Recycle Bin emptied", "warning"); }
  function registryEntries() {
    var out = [], i, a, cu = loadCustomApps();
    for (i = 0; i < APPS.length; i++) {
      a = APPS[i];
      out.push({ id: a.id, name: a.name, cat: "Liquid Legacy", kind: "builtin", target: a.target, icon: a.icon });
    }
    for (i = 0; i < EXTERNAL_APPS.length; i++) {
      a = EXTERNAL_APPS[i];
      out.push({ id: a.id, name: a.name, cat: a.cat, kind: "external", url: a.url });
    }
    for (i = 0; i < cu.length; i++) {
      a = cu[i];
      out.push({ id: a.id, name: a.name, cat: a.cat || "Utilities", kind: "custom", url: a.url });
    }
    return out;
  }
  function registryFind(id) {
    var all = registryEntries(), i;
    for (i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  function listLoad(key) {
    var raw = load(key, "");
    if (!raw) return [];
    var arr = raw.split(","), out = [], i;
    for (i = 0; i < arr.length; i++) if (arr[i]) out.push(arr[i]);
    return out;
  }
  function libFavs() { return listLoad("gg_lib_favs"); }
  function libRecent() { return listLoad("gg_lib_recent"); }
  function pushRecent(id) {
    var r = libRecent(), i, out = [id];
    for (i = 0; i < r.length && out.length < 8; i++) if (r[i] !== id) out.push(r[i]);
    store("gg_lib_recent", out.join(","));
  }
  function launchCounts() { return jload("gg_launch_counts", {}); }
  function recordLaunch(id) {
    if (!id) return;
    var c = launchCounts();
    c[id] = (c[id] || 0) + 1;
    jsave("gg_launch_counts", c);
  }
  function topApps(n) {
    var c = launchCounts(), ids = [], k;
    for (k in c) {
      if (!c[k] || !(findApp(k) || registryFind(k))) continue;
      ids.push(k);
    }
    ids.sort(function (a, b) { return (c[b] - c[a]) || a.localeCompare(b); });
    return ids.slice(0, n);
  }
  function toggleFav(id) {
    var f = libFavs(), at = f.indexOf(id);
    if (at >= 0) f.splice(at, 1); else f.push(id);
    store("gg_lib_favs", f.join(","));
    renderAppLibrary();
  }
  function launchEntry(entry) {
    if (!entry) return;
    recordLaunch(entry.id);
    pushRecent(entry.id);
    if (entry.kind === "builtin") { routeTo(entry.target); return; }
    var url = String(entry.url || "");
    if (!/^https?:\/\//i.test(url)) { showBanner("Only http(s) links can launch", "warning"); return; }
    if (entry.kind === "custom" && !window.confirm("Open this external website?\n" + url)) return;
    try {
      var w = window.open(url, "_blank");
      if (w) w.opener = null;
      showBanner(entry.name + " opened in a new tab", "info");
    } catch (e) { showBanner("Popup blocked — open " + entry.name + " manually", "warning"); }
  }


  /* ---------------- helpers ---------------- */
  function $(id) { return document.getElementById(id); }
  function show(el, on) { if (el) el.style.display = on ? "block" : "none"; }
  function addClass(el, c) { if (el && (" " + el.className + " ").indexOf(" " + c + " ") < 0) el.className += " " + c; }
  function removeClass(el, c) {
    if (!el) return;
    el.className = (" " + el.className + " ").replace(new RegExp("(^|\\s)" + c + "(\\s|$)", "g"), " ")
      .replace(/^\s+|\s+$/g, "");
  }
  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
  function barClass(p) { return p >= 90 ? "bad" : p >= 70 ? "warn" : ""; }
  function fmtTime(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts).substring(0, 16);
    return d.toLocaleString();
  }
  function store(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function load(k, d) { try { var v = window.localStorage.getItem(k); return (v === null) ? d : v; } catch (e) { return d; } }

  /* ---------------- diagnostics ---------------- */
  var TRACE = [];
  function trace(s) { TRACE.push(s); }
  function diag(msg, src) {
    src = src || "app";
    var box = $("diag");
    if (!box) {
      box = document.createElement("div");
      box.id = "diag";
      box.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#b3261e;" +
        "color:#fff;font:11px -apple-system,Helvetica,Arial;padding:6px 8px;white-space:pre-wrap;" +
        "max-height:40%;overflow:auto;";
      document.body.appendChild(box);
    }
    box.innerHTML += (box.innerHTML ? "<br>" : "") + msg;
    try {
      var r = new XMLHttpRequest();
      r.open("POST", API + "/client-error", true);
      r.setRequestHeader("Content-Type", "application/json");
      r.send(JSON.stringify({ message: String(msg), source: String(src || ""),
        steps: TRACE.join(" > "),
        session: (state && state.user && state.user.username) ? state.user.username : "" }));
    } catch (ignored) {}
  }
  window.onerror = function (msg, src, line, col) {
    diag("JS error: " + msg + " at " + (src || "?").split("/").pop() + ":" + line + ":" + col, src);
    return false;
  };

  /* ---------------- XHR ---------------- */
  function xhr(method, path, body, cb) {
    var req = new XMLHttpRequest(), done = false;
    function finish(err, status, text) {
      if (done) return;
      done = true;
      var data = null;
      if (text) { try { data = JSON.parse(text); } catch (e) { data = null; } }
      cb(err, status, data);
    }
    try {
      req.open(method, path, true);
      req.setRequestHeader("Accept", "application/json");
      if (body) req.setRequestHeader("Content-Type", "application/json");
      req.timeout = 15000;
      req.onreadystatechange = function () {
        if (req.readyState === 4) {
          if (req.status >= 200 && req.status < 300) finish(null, req.status, req.responseText);
          else finish({ code: req.status }, req.status, req.responseText);
        }
      };
      req.ontimeout = function () { finish({ code: 0 }, 0, null); };
      req.onerror = function () { finish({ code: 0 }, 0, null); };
      req.send(body ? JSON.stringify(body) : null);
    } catch (e) { finish({ code: 0 }, 0, null); }
  }

  /* ---------------- theme engine (single source of truth) ---------------- */
  /* Every axis is a class on <body> so iOS 9 (no CSS custom properties) gets the
     identical result to modern browsers. Nothing else may set body.className. */
  var ACCENTS = {
    blue:     { base: "#3a8dff", deep: "#0a6cf5", soft: "#7fb4ff" },
    purple:   { base: "#a98cff", deep: "#6a4cf0", soft: "#c9b6ff" },
    pink:     { base: "#ff7ab8", deep: "#e8388a", soft: "#ffb3d5" },
    green:    { base: "#4ede9a", deep: "#16a35f", soft: "#9df0c4" },
    orange:   { base: "#ffb84d", deep: "#e07b00", soft: "#ffd79a" },
    graphite: { base: "#aab2c0", deep: "#5b6473", soft: "#d3d9e2" }
  };
  var mqDark = null;

  function prefersDark() {
    try {
      if (window.matchMedia) {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) return true;
        if (window.matchMedia("(prefers-color-scheme: light)").matches) return false;
      }
    } catch (e) {}
    return true;
  }
  function effectiveLook() {
    if (state.appearance === "auto") return prefersDark() ? "dark" : "light";
    return state.appearance === "light" ? "light" : "dark";
  }
  function applyLook() {
    var cls = [];
    if (state.theme === "ios26") cls.push("theme-ios26");
    if (effectiveLook() === "light") cls.push("light");
    cls.push("acc-" + (ACCENTS[state.accent] ? state.accent : "blue"));
    cls.push("glass-" + state.glass);
    cls.push("gm-" + (state.glassMode === "clear" || state.glassMode === "tinted" ? state.glassMode : "standard"));
    if (state.contrast === "high") cls.push("contrast-high");
    cls.push("density-" + state.density);
    cls.push("text-" + state.textScale);
    if (state.motion === "reduced") cls.push("motion-reduced");
    if (state.ios9) cls.push("ios9");
    cls.push("ic-" + state.iconStyle);
    cls.push("homewall-" + state.homeWall);
    cls.push("wb-" + state.homeBright);
    if (state.edit) cls.push("editing");
    if (state.autoLogin) cls.push("auto-login");
    cls.push("orient-" + state.orientation);
    cls.push("vp-" + state.viewport);

    state.look = effectiveLook();                 // legacy field kept in sync
    document.body.className = cls.join(" ");
    applyDockPrefs();                                     // keep dock state across theme changes
    if (isStandalone() && document.body.className.indexOf("standalone") < 0) {
      document.body.className += " standalone";
    }
    store("gg_theme", state.theme);
    store("gg_look", state.look);
    store("gg_appearance", state.appearance);
    store("gg_accent", state.accent);
    store("gg_glass", state.glass);
    store("gg_glassmode", state.glassMode);
    store("gg_iconstyle", state.iconStyle);
    store("gg_home_wall", state.homeWall);
    store("gg_home_bright", state.homeBright);
    store("gg_focus", state.focus);
    store("gg_order", (state.order || []).join(","));
    store("gg_hidden", (state.hidden || []).join(","));
    store("gg_contrast", state.contrast);
    store("gg_density", state.density);
    store("gg_text", state.textScale);
    store("gg_motion", state.motion);
  }
  function setTheme(t) { state.theme = (t === "ios9") ? "ios9" : "ios26"; applyLook(); renderSettings(); }
  function setAppearance(a) {
    state.appearance = (a === "auto" || a === "light") ? a : "dark";
    applyLook(); renderSettings();
  }
  function setLook(l) { setAppearance((l === "light") ? "light" : "dark"); }   // back-compat
  function setAccent(c) { state.accent = ACCENTS[c] ? c : "blue"; applyLook(); renderSettings(); }
  function setGlass(g) { state.glass = (g === "subtle" || g === "strong") ? g : "regular"; applyLook(); renderSettings(); }
  function setGlassMode(m) {
    state.glassMode = (m === "clear" || m === "tinted") ? m : "standard";
    applyLook(); renderSettings();
  }
  function setContrast(v) { state.contrast = (v === "high") ? "high" : "normal"; applyLook(); renderSettings(); }
  function setDensity(v) { state.density = (v === "compact" || v === "comfortable") ? v : "regular"; applyLook(); renderSettings(); }
  function setTextScale(v) { state.textScale = (v === "small" || v === "large") ? v : "regular"; applyLook(); renderSettings(); }
  function setMotion(v) { state.motion = (v === "reduced") ? "reduced" : "full"; applyLook(); renderSettings(); }
  function setIconStyle(v) { state.iconStyle = /^(default|dark|clear|tinted)$/.test(v) ? v : "default"; applyLook(); renderSettings(); }
  function setHomeWall(v) { state.homeWall = /^(aurora|deep|dawn|midnight)$/.test(v) ? v : "aurora"; applyLook(); renderSettings(); }
  function setHomeBright(v) { state.homeBright = /^(low|mid|high)$/.test(v) ? v : "mid"; applyLook(); renderSettings(); }
  function setEdit(on) {
    state.edit = !!on; applyLook(); renderHome(); renderWidgets();
    if (state.page === 3) renderDashboard();
    enableWidgetDrag(); renderSettings();
  }
  function setFocus(v) {
    state.focus = /^(off|work|personal|sleep)$/.test(v) ? v : "off";
    state.dnd = (state.focus !== "off");
    store("gg_dnd", state.dnd ? "1" : "0"); store("gg_focus", state.focus);
    applyLook(); renderChrome(); renderSettings();
  }
  /* ---------------- gesture engine (Phase 8) ---------------- */
  var GEST = { longMs: 520, swipeMin: 45, dblMs: 280 };
  function gPoint(e) {
    var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    return { x: t.clientX || 0, y: t.clientY || 0 };
  }
  function gesture(el, opts) {
    if (!el) return;
    var sx = 0, sy = 0, moved = false, longT = null, lastTap = 0;
    function clearLong() { if (longT) { clearTimeout(longT); longT = null; } }
    function down(e) {
      var p = gPoint(e); sx = p.x; sy = p.y; moved = false;
      longT = setTimeout(function () { longT = null; if (!moved && opts.long) opts.long(p); }, GEST.longMs);
    }
    function move(e) {
      var p = gPoint(e);
      if (Math.abs(p.x - sx) > 9 || Math.abs(p.y - sy) > 9) { moved = true; clearLong(); }
    }
    function up(e) {
      clearLong();
      var p = gPoint(e), dx = p.x - sx, dy = p.y - sy;
      if (moved) {
        if (Math.abs(dx) > GEST.swipeMin && Math.abs(dx) > Math.abs(dy)) {
          if (opts.swipe) opts.swipe(dx > 0 ? "right" : "left", p);
        } else if (Math.abs(dy) > GEST.swipeMin) {
          if (opts.swipe) opts.swipe(dy > 0 ? "down" : "up", p);
        }
        return;
      }
      var now = new Date().getTime();
      if (now - lastTap < GEST.dblMs) { lastTap = 0; if (opts.double) opts.double(p); }
      else { lastTap = now; if (opts.tap) opts.tap(p); }
    }
    el.onmousedown = down; el.onmousemove = move; el.onmouseup = up;
    el.ontouchstart = function (e) { down(e); };   // must NOT preventDefault: it kills tap -> click
    el.ontouchmove = function (e) {
      move(e);
      var p = gPoint(e), dx = p.x - sx, dy = p.y - sy;
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) && e.preventDefault) e.preventDefault();
    };
    el.ontouchend = function (e) { up(e); };
  }
  function bindGestures() {
    var pages = $("pages");
    gesture(pages, { swipe: function (dir) {
      if (state.edit) return;
      if (dir === "left") setPage(Math.min((state.page || 0) + 1, 2));
      else if (dir === "right") setPage(Math.max((state.page || 0) - 1, 0));
    } });
    var sb = $("statusbar");
    gesture(sb, { double: function () { goHome(); } });
  }
  function watchSystemAppearance() {
    try {
      mqDark = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function () { if (state.appearance === "auto") applyLook(); };
      if (mqDark.addEventListener) mqDark.addEventListener("change", onChange);
      else if (mqDark.addListener) mqDark.addListener(onChange);
    } catch (e) {}
  }

  /* ---------------- connection ---------------- */
  function setOnline(on) {
    if (state.online === on) return;
    state.online = on;
    show($("netbanner"), !on);
    var dot = $("sb-conn");
    if (dot) dot.className = "conn-dot" + (on ? "" : " off");
    renderChrome();
  }
  function requestFailure() {
    state.backoff = Math.min(state.backoff ? state.backoff * 2 : 5, 60);
    setOnline(false);
    scheduleNext(state.backoff * 1000);
  }
  function requestSuccess() { state.backoff = 0; setOnline(true); }

  /* ---------------- polling ---------------- */
  function scheduleNext(ms) {
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    state.timer = setTimeout(pollTick, ms);
  }
  function pollTick() {
    state.timer = null;
    if (document.hidden) { scheduleNext(state.pollMs); return; }
    pollOnce();
  }
  function pollOnce() {
    if (state.pollBusy || !state.user) return;
    state.pollBusy = true;
    xhr("GET", API + "/summary", null, function (err, status, data) {
      state.pollBusy = false;
      if (err || !data || !data.ok) {
        if (status === 401) { logoutLocal(); return; }
        requestFailure();
        return;
      }
      requestSuccess();
      state.data.host = data.host || null;
      state.data.datasets = data.datasets || {};
      state.alerts = extractAlerts(state.data.datasets);
      (function () {
        var ids = [], i, fresh = null, a;
        for (i = 0; i < state.alerts.length; i++) {
          a = state.alerts[i];
          ids.push(noteId(a, i));
          if (state.lastAlertIds && state.lastAlertIds.indexOf(ids[i]) < 0 &&
              noteSev(a) !== "info" && !state.dnd) fresh = a;
        }
        state.lastAlertIds = ids;
        if (fresh && !state.bannerShown) {
          state.bannerShown = true;
          showBanner(String(fresh.title || fresh.message || "New alert"), noteSev(fresh));
          setTimeout(function () { state.bannerShown = false; }, 5000);
        }
      })();
      renderWidgets();
      renderChrome();
      if (state.route === "#/gids") renderDataset("gids_summary", "gids-body", "gids-stamp", "AETG posture");
      if (state.route === "#/infra") renderDataset("collectors", "infra-body", "infra-stamp", "Collectors");
      if (state.route === "#/alerts") renderAlerts();
      if (state.route === "#/status") renderStatusPage();
      if (state.route === "#/settings") renderSettings();
      if ((" " + $("split").className + " ").indexOf(" open ") >= 0) renderSplit();
      if ((" " + $("nc").className + " ").indexOf(" open ") >= 0) renderNotes();
      if (typeof wmRefresh === "function") wmRefresh();     // windowed apps follow the same poll
      scheduleNext(state.pollMs);
    });
  }

  /* ---------------- data shaping ---------------- */
  function extractAlerts(ds) {
    var a = ds && ds.alerts;
    if (!a) return [];
    if (a.items) return a.items.slice(0, 20);
    if (a.length !== undefined) return a.slice(0, 20);
    return [];
  }
  function flatten(obj, prefix, out, depth) {
    depth = depth || 0;
    if (!obj || depth > 2 || out.length > 12) return out;
    for (var k in obj) {
      if (!obj.hasOwnProperty(k)) continue;
      var v = obj[k];
      if (v === null || v === undefined) continue;
      if (typeof v === "object") {
        if (v.length !== undefined) out.push({ k: prefix + k, v: v.length + " item(s)" });
        else flatten(v, prefix + k + ".", out, depth + 1);
      } else out.push({ k: prefix + k, v: v });
      if (out.length > 12) return out;
    }
    return out;
  }
  function kvHtml(rows) {
    var h = "", i;
    for (i = 0; i < rows.length; i++) {
      h += '<div><span class="k">' + esc(rows[i].k) + "</span><b>" + esc(rows[i].v) + "</b></div>";
    }
    return h;
  }

  /* ---------------- home: apps ---------------- */
  function homeItems() {
    var items = [], i, j, found, f, fa, mini;
    for (i = 0; i < APPS.length; i++) {
      found = false;
      for (j = 0; j < FOLDERS.length; j++) if (FOLDERS[j].apps.indexOf(APPS[i].id) >= 0) found = true;
      if (!found) items.push({ id: APPS[i].id, kind: "app", name: APPS[i].name, icon: APPS[i].icon, target: APPS[i].target });
    }
    for (j = 0; j < FOLDERS.length; j++) {
      f = FOLDERS[j]; mini = "";
      for (i = 0; i < f.apps.length && i < 4; i++) { fa = findApp(f.apps[i]); mini += '<img src="' + (fa ? fa.icon : "") + '" alt="">'; }
      items.push({ id: f.name, kind: "folder", name: f.name, mini: mini });
    }
    return items;
  }
  function orderedHome() {
    var items = homeItems(), byId = {}, seq = [], i, id;
    for (i = 0; i < items.length; i++) byId[items[i].id] = items[i];
    for (i = 0; i < state.order.length; i++) {
      id = state.order[i];
      if (byId[id]) { seq.push(byId[id]); delete byId[id]; }
    }
    for (i = 0; i < items.length; i++) if (byId[items[i].id]) seq.push(items[i]);
    return seq;
  }
  function isHidden(id) { return state.hidden.indexOf(id) >= 0; }
  function renderHome() {
    var grid = $("apps-grid"), seq = orderedHome(), html = "", i, it;
    if (!grid) return;
    for (i = 0; i < seq.length; i++) {
      it = seq[i];
      if (isHidden(it.id) && !state.edit) continue;
      if (it.kind === "app") {
        html += '<a class="app' + (isHidden(it.id) ? " hidden-app" : "") + '" data-target="' + it.target +
                '" data-id="' + it.id + '"><img src="' + it.icon + '" alt=""><span>' + esc(it.name) + "</span>" +
                (state.edit ? '<b class="xhide" data-xhide="' + it.id + '">' + (isHidden(it.id) ? "+" : "&#215;") + "</b>" : "") +
                "</a>";
      } else {
        html += '<div class="app folder' + (isHidden(it.id) ? " hidden-app" : "") + '" data-folder="' + esc(it.name) + '">' +
                '<div class="folder-mini">' + it.mini + "</div><span>" + esc(it.name) + "</span>" +
                (state.edit ? '<b class="xhide" data-xhide="' + esc(it.name) + '">' + (isHidden(it.name) ? "+" : "&#215;") + "</b>" : "") +
                "</div>";
      }
    }
    grid.innerHTML = html;
    bindIcons(grid);
    enableGridDrag();
  }
  var gridDrag = null, gridDragOrder = [], gridDragMoved = false, gridDragX = 0, gridDragY = 0;
  function onDockPoint(e) {
    var d = $("dock");
    if (!d) return false;
    var p = gPoint(e), r = d.getBoundingClientRect();
    return (p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom);
  }
  function ensureOrder() {
    if (state.order && state.order.length) return;
    var seq = homeItems(), i;
    state.order = [];
    for (i = 0; i < seq.length; i++) state.order.push(seq[i].id);
  }
  function enableGridDrag() {
    var grid = $("apps-grid");
    if (!grid) return;
    var items = grid.getElementsByClassName("app"), i;
    for (i = 0; i < items.length; i++) {
      (function (el) {
        el.onmousedown = function (e) {
          var id = el.getAttribute("data-id") || el.getAttribute("data-folder");
          if (!id) return true;
          ensureOrder();
          gridDrag = id;
          gridDragOrder = (state.order || []).slice();
          gridDragMoved = false;
          var pt = gPoint(e); gridDragX = pt.x; gridDragY = pt.y;
          if (state.edit && e.preventDefault) e.preventDefault();
          return false;
        };
        el.ontouchstart = el.onmousedown;
      })(items[i]);
    }
  }
  function gridDragMove(e) {
    if (!gridDrag) return;
    var p = gPoint(e), el;
    if (Math.abs(p.x - gridDragX) > 8 || Math.abs(p.y - gridDragY) > 8) gridDragMoved = true;
    if (!state.edit) return;
    el = document.elementFromPoint(p.x, p.y);
    while (el && !(el.getAttribute && (el.getAttribute("data-id") || el.getAttribute("data-folder")))) el = el.parentNode;
    if (!el || !el.getAttribute) return;
    var over = el.getAttribute("data-id") || el.getAttribute("data-folder");
    if (!over || over === gridDrag) return;
    ensureOrder();
    var from = state.order.indexOf(gridDrag), to = state.order.indexOf(over);
    if (from < 0 || to < 0) return;
    state.order.splice(from, 1); state.order.splice(to, 0, gridDrag);
    renderHome();
  }
  function gridDragEnd(e) {
    if (!gridDrag) return;
    var id = gridDrag;
    gridDrag = null;
    if (onDockPoint(e)) {
      var ids = dockIds(), was = ids.indexOf(id) >= 0;
      if (!was) { toggleDockApp(id); showBanner("Added to Dock", "info"); }
      state.order = gridDragOrder.slice();
      store("gg_order", state.order.join(","));
      renderHome(); refreshDock();
      return;
    }
    if (state.edit) store("gg_order", (state.order || []).join(","));
    else if (gridDragMoved) { state.order = gridDragOrder.slice(); renderHome(); }
  }
  function dockPrefs() {
    if (state.dockPrefs) return state.dockPrefs;
    var d = { position: "bottom", autoHide: false, autoDelay: 900, mag: true, magMax: 2,
              size: 56, gap: 12, indicators: true, minimizeTo: "app", recents: false, anim: true,
              style: "classic", frequency: true, frame: false };
    try {
      var raw = load("gg_dock_prefs", "");
      if (raw) {
        var o = JSON.parse(raw), k;
        for (k in d) if (o[k] !== undefined && o[k] !== null) d[k] = o[k];
      }
    } catch (e) {}
    state.dockPrefs = d;
    return d;
  }
  function saveDockPrefs(patch) {
    var p = dockPrefs(), k;
    for (k in patch) p[k] = patch[k];
    store("gg_dock_prefs", JSON.stringify(p));
    applyDockPrefs();
    renderDock(); bindDock(); renderSettings();
  }
  function applyDockPrefs() {
    var p = dockPrefs(), body = document.body;
    body.className = body.className
      .replace(/\s*dock-(left|right|bottom|autohide|magoff|noind|noanim|frameless|style-gg27)\b/g, "")
      .replace(/^\s+/, "");
    body.className += " dock-" + p.position;
    if (p.autoHide) body.className += " dock-autohide";
    if (!p.mag) body.className += " dock-magoff";
    if (!p.indicators) body.className += " dock-noind";
    if (!p.anim) body.className += " dock-noanim";
    if (!p.frame) body.className += " dock-frameless";
    if (p.style === "gg27") body.className += " dock-style-gg27";
    body.className = body.className.replace(/\s{2,}/g, " ");
  }
  function dockIds() {
    var defaultDock = ["home", "gids", "chat", "settings", "calendar", "notes", "reminders", "clock", "calculator"];
    var ids = (state.dock && state.dock.length) ? state.dock : defaultDock, out = [], i;
    for (i = 0; i < ids.length; i++) if (ids[i]) out.push(ids[i]);
    return out;
  }
  function dockIcon(id, restore, sizeOverride, gapOverride) {
    var p = dockPrefs(), a = findApp(id), name, icon, target;
    if (id === "home") { name = "Home"; icon = "assets/icon-home.png"; target = "#/home"; }
    else if (a) { name = a.name; icon = a.icon; target = a.target; }
    else if (registryFind(id)) { var re = registryFind(id); name = re.name; icon = ""; target = re.url; }
    else return "";
    var baseSize = sizeOverride || p.size, baseGap = gapOverride || p.gap;
    var size = baseSize + "px";
    var win = window.GGWM && GGWM.find ? GGWM.find(id) : null;
    var cls = "dock-app";
    if (win) cls += " running" + (win.state === "min" ? " minimized" : "");
    return '<a class="' + cls + '" data-dock-id="' + id + '" data-target="' + target + '"' +
      (restore ? ' data-restore="' + id + '"' : "") + ">" +
      (icon
        ? '<img src="' + icon + '" alt="" style="width:' + size + ";height:" + size +
          ";margin:0 " + (baseGap / 2) + "px" + '">'
        : '<span class="dock-mono" style="width:' + size + ";height:" + size + ";line-height:" + size +
          ";font-size:" + Math.round(baseSize * 0.34) + "px;margin:0 " + (baseGap / 2) + 'px;background:hsl(' +
          libHue(name) + ',55%,42%)">' + esc(libMonogram(name)) + "</span>") +
      "<span>" + esc(name) + "</span>" +
      '<i class="dock-dot"></i></a>';
  }
  function renderDock() {
    var dock = $("dock");
    if (!dock) return;
    var p = dockPrefs(), pinned = dockIds(), i, w, seen = {}, running = [], minimized = [], recent = [];
    var wins = (window.GGWM && GGWM.list) ? GGWM.list() : [];
    for (i = 0; i < wins.length; i++) {
      w = wins[i];
      if (seen[w.app]) continue;
      seen[w.app] = 1;
      /* a minimised window gets its own Dock item when requested, even for a
         pinned app; otherwise it rides on the app's own icon */
      if (w.state === "min" && p.minimizeTo === "separate") { minimized.push(w.app); continue; }
      if (pinned.indexOf(w.app) >= 0) continue;
      running.push(w.app);
    }
    if (p.recents) {
      var rec = libRecent(), r;
      for (i = 0; i < rec.length && recent.length < 3; i++) {
        r = rec[i];
        if (pinned.indexOf(r) >= 0 || seen[r]) continue;
        if (!findApp(r)) continue;
        recent.push(r);
      }
    }
    var totalIcons = pinned.length + running.length + minimized.length + recent.length;
    if (p.frequency) totalIcons += Math.min(5, topApps(5).length);
    var avail = Math.min((window.innerWidth || 1024) * 0.94, 1040) - 44;
    var effSize = p.size, effGap = p.gap;
    if (totalIcons > 0) {
      var per = avail / totalIcons;
      if (per < p.size + p.gap) {
        effGap = Math.max(4, Math.round(p.gap * 0.5));
        effSize = Math.max(34, Math.min(p.size, Math.round(per - effGap)));
      }
    }
    function group(ids, extra) {
      var h = "", j;
      for (j = 0; j < ids.length; j++) h += dockIcon(ids[j], extra === "restore", effSize, effGap);
      return h;
    }
    var html = '<div class="dock-group" data-group="pinned">' + group(pinned) + "</div>";
    if (p.frequency) {
      var freq = [], taken = pinned.slice(), cand = topApps(5), ci;
      for (ci = 0; ci < running.length; ci++) taken.push(running[ci]);
      for (ci = 0; ci < minimized.length; ci++) taken.push(minimized[ci]);
      for (ci = 0; ci < recent.length; ci++) taken.push(recent[ci]);
      for (ci = 0; ci < cand.length && freq.length < 5; ci++) {
        if (taken.indexOf(cand[ci]) < 0 && freq.indexOf(cand[ci]) < 0) freq.push(cand[ci]);
      }
      if (freq.length) html += '<div class="dock-sep"></div><div class="dock-group" data-group="frequent">' + group(freq) + "</div>";
    }
    if (running.length) html += '<div class="dock-sep"></div><div class="dock-group" data-group="running">' + group(running) + "</div>";
    if (minimized.length) html += '<div class="dock-sep"></div><div class="dock-group" data-group="minimized">' + group(minimized, "restore") + "</div>";
    if (recent.length) html += '<div class="dock-sep"></div><div class="dock-group" data-group="recent">' + group(recent) + "</div>";
    dock.innerHTML = html;
  }
  function refreshDock() {
    if (!$("dock")) return;
    renderDock(); bindDock();
  }
  function dockBounce(id) {
    var el = document.querySelector('#dock [data-dock-id="' + id + '"]');
    if (!el || !dockPrefs().anim) return;
    addClass(el, "bounce");
    setTimeout(function () { removeClass(el, "bounce"); }, 620);
  }
  var dockDrag = null, dockDragJustEnded = 0;
  function dockDragStart(el, id, e) {
    if (!state.edit && !e) return;
    var pinned = dockIds().indexOf(id) >= 0;
    if (!pinned) return;
    var pt = gPoint(e);
    dockDrag = { id: id, startX: pt.x, startY: pt.y, moved: false, el: el };
    addClass(el, "dragging");
    addClass(document.body, "dock-dragging");
    if (e && e.preventDefault) e.preventDefault();
  }
  function dockDragMove(e) {
    if (!dockDrag) return;
    var p = gPoint(e);
    if (Math.abs(p.x - dockDrag.startX) > 8 || Math.abs(p.y - dockDrag.startY) > 8) dockDrag.moved = true;
    var el = document.elementFromPoint(p.x, p.y);
    while (el && !(el.getAttribute && el.getAttribute("data-dock-id"))) el = el.parentNode;
    if (!el || !el.getAttribute) return;
    var over = el.getAttribute("data-dock-id");
    if (!over || over === dockDrag.id) return;
    var ids = dockIds(), from = ids.indexOf(dockDrag.id), to = ids.indexOf(over);
    if (from < 0 || to < 0) return;
    dockDrag.moved = true;
    ids.splice(from, 1); ids.splice(to, 0, dockDrag.id);
    state.dock = ids;
    renderDock(); bindDock();
    var cur = document.querySelector('#dock [data-dock-id="' + dockDrag.id + '"]');
    if (cur) addClass(cur, "dragging");
  }
  function dockDragEnd(e) {
    if (!dockDrag) return;
    var d = dockDrag;
    dockDrag = null;
    dockDragJustEnded = new Date().getTime();
    removeClass(document.body, "dock-dragging");
    var el = document.querySelector('#dock [data-dock-id="' + d.id + '"]');
    if (el) removeClass(el, "dragging");
    if (d.moved) {
      var p = gPoint(e || {}), dock = $("dock"), r = dock ? dock.getBoundingClientRect() : null;
      var p2 = dockPrefs().position;
      var away = r && ((p2 === "bottom" && p.y < r.top - 60) || (p2 === "left" && p.x > r.right + 60) ||
                       (p2 === "right" && p.x < r.left - 60));
      if (away && dockIds().length > 1) {
        toggleDockApp(d.id);
        showBanner("Removed from Dock", "info");
      } else {
        store("gg_dock", dockIds().join(","));
        showBanner("Dock reordered", "info");
      }
    }
  }
  function bindDock() {
    var els = document.getElementsByClassName("dock-app"), i;
    for (i = 0; i < els.length; i++) {
      (function (el) {
        var id = el.getAttribute("data-dock-id");
        var since = null;
        el.addEventListener("mousedown", function (e) { dockDragStart(el, id, e); }, false);
        el.addEventListener("touchstart", function (e) { dockDragStart(el, id, e); }, false);
        el.onclick = function (e) {
          e.preventDefault();
          if (dockDrag) return false;
          if (new Date().getTime() - dockDragJustEnded < 600) return false;
          dockBounce(id);
          if (since && new Date().getTime() - since < 700) { since = null; return false; }
          if (el.getAttribute("data-restore")) { wmRestore(id); return false; }
          var ext = (!findApp(id) && id !== "home") ? registryFind(id) : null;
          if (ext) { launchEntry(ext); return false; }
          var win = window.GGWM && GGWM.find ? GGWM.find(id) : null;
          if (win) { if (win.state === "min") wmRestore(id); else wmFocus(id); return false; }
          routeTo(el.getAttribute("data-target") || "#/home");
          return false;
        };
        el.oncontextmenu = function (e) { if (e && e.preventDefault) e.preventDefault(); dockMenu(id); return false; };
        gesture(el, { long: function () { since = new Date().getTime(); dockMenu(id); } });
      })(els[i]);
    }
  }
  function dockMenu(id) {
    var panel = $("ctx-panel");
    if (!panel) return;
    var p = dockPrefs(), pinned = id === "home" || dockIds().indexOf(id) >= 0;
    var win = window.GGWM && GGWM.find ? GGWM.find(id) : null;
    var a = findApp(id), reg = (!a && id !== "home") ? registryFind(id) : null;
    var html = '<div class="ctx-title">' + esc(a ? a.name : (reg ? reg.name : "Home")) + "</div>";
    if (reg) html += '<div class="ctx-item" data-dockext="' + reg.id + '">Open website</div>';
    else if (!win) html += '<div class="ctx-item" data-go="' + (a ? a.target : "#/home") + '">Open</div>';
    if (win) {
      if (win.state === "min") html += '<div class="ctx-item" data-dockact="restore:' + id + '">Restore</div>';
      else {
        html += '<div class="ctx-item" data-dockact="focus:' + id + '">Show Window</div>';
        html += '<div class="ctx-item" data-dockact="min:' + id + '">Minimise</div>';
        html += '<div class="ctx-item" data-wmopen="' + id + '">Open in Window</div>';
      }
      html += '<div class="ctx-item danger" data-dockact="close:' + id + '">Close Window</div>';
    }
    if (id !== "home") {
      html += '<div class="ctx-item" data-dockact="' + (pinned ? "unpin:" : "pin:") + id + '">' +
              (pinned ? "Remove from Dock" : "Pin to Dock") + "</div>";
    }
    html += '<div class="ctx-item danger" data-close="1">Cancel</div>';
    panel.innerHTML = html;
    bindCtxDock(panel);
    addClass($("ctx"), "open");
  }
  function bindCtxDock(panel) {
    var items = panel.getElementsByClassName("ctx-item"), i;
    for (i = 0; i < items.length; i++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          var act = el.getAttribute("data-dockact"), go = el.getAttribute("data-go");
          var extId = el.getAttribute("data-dockext");
          toggleOverlay("ctx");
          if (extId) { launchEntry(registryFind(extId)); return false; }
          if (go) { routeTo(go); return false; }
          if (!act) return false;
          var parts = act.split(":"), verb = parts[0], appId = parts[1];
          if (verb === "restore") wmRestore(appId);
          else if (verb === "focus") wmFocus(appId);
          else if (verb === "min") wmMin(appId);
          else if (verb === "close") wmClose(appId);
          else if (verb === "pin") toggleDockApp(appId);
          else if (verb === "unpin") toggleDockApp(appId);
          return false;
        };
      })(items[i]);
    }
  }
  function toggleDockApp(id) {
    if (id !== "home" && !findApp(id) && !registryFind(id)) return;
    var ids = dockIds(), at = ids.indexOf(id);
    if (at >= 0) { if (ids.length <= 2) return; ids.splice(at, 1); }
    else { if (ids.length >= 12) { showBanner("Dock is full (12 icons)", "warning"); return; } ids.push(id); }
    state.dock = ids;
    store("gg_dock", ids.join(","));
    renderDock(); bindDock(); renderSettings();
  }
  function dockPrefsHtml() {
    var p = dockPrefs(), out = "", i;
    function opt(key, val, label) {
      return '<a href="#" class="theme-opt' + (String(p[key]) === String(val) ? " sel" : "") +
             '" data-dockpref="' + key + ':' + val + '">' + label + "</a>";
    }
    out += opt("position", "bottom", "Bottom") + opt("position", "left", "Left") + opt("position", "right", "Right");
    out += opt("autoHide", true, "Auto-hide on") + opt("autoHide", false, "Auto-hide off");
    out += opt("mag", true, "Magnify on") + opt("mag", false, "Magnify off");
    out += opt("size", 48, "Small") + opt("size", 56, "Medium") + opt("size", 64, "Large");
    out += opt("gap", 8, "Tight") + opt("gap", 12, "Normal") + opt("gap", 18, "Wide");
    out += opt("indicators", true, "Dots on") + opt("indicators", false, "Dots off");
    out += opt("minimizeTo", "app", "Minimise to icon") + opt("minimizeTo", "separate", "Minimise to item");
    out += opt("recents", true, "Recents on") + opt("recents", false, "Recents off");
    out += opt("anim", true, "Animations on") + opt("anim", false, "Animations off");
    out += opt("style", "classic", "Classic dock") + opt("style", "gg27", "Liquid Legacy 27 dock");
    out += opt("frequency", true, "Frequent apps on") + opt("frequency", false, "Frequent apps off");
    out += opt("frame", true, "Frame on") + opt("frame", false, "Frame off");
    out += opt("magMax", 1.5, "Zoom 1.5×") + opt("magMax", 2, "Zoom 2×") + opt("magMax", 2.5, "Zoom 2.5×");
    return out;
  }
  function bindDockPrefs() {
    var els = document.querySelectorAll("[data-dockpref]"), i;
    for (i = 0; i < els.length; i++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          var parts = String(el.getAttribute("data-dockpref")).split(":"), v = parts[1];
          var patch = {};
          if (v === "true") v = true; else if (v === "false") v = false;
          else if (/^[0-9]+$/.test(v)) v = parseInt(v, 10);
          patch[parts[0]] = v;
          saveDockPrefs(patch);
          return false;
        };
      })(els[i]);
    }
  }
  var dockPeekTimer = null;
  function initDockEdge() {
    if ($("dock-edge")) return;
    var edge = document.createElement("div");
    edge.id = "dock-edge";
    edge.className = "dock-edge";
    $("app").appendChild(edge);
    function peek(on) {
      if (on) addClass(document.body, "dock-peek");
      else removeClass(document.body, "dock-peek");
    }
    edge.onmouseenter = function () { peek(true); };
    edge.ontouchstart = function (e) {
      if (e && e.preventDefault) e.preventDefault();
      peek(!(" " + document.body.className + " ").indexOf(" dock-peek ") >= 0);
    };
    edge.onclick = function () { peek(true); };
    var dock = $("dock");
    if (dock) {
      dock.onmouseleave = function () {
        if (!dockPrefs().autoHide) return;
        if (dockPeekTimer) clearTimeout(dockPeekTimer);
        dockPeekTimer = setTimeout(function () { peek(false); }, dockPrefs().autoDelay || 900);
      };
      dock.onmouseenter = function () {
        if (dockPeekTimer) clearTimeout(dockPeekTimer);
        peek(true);
      };
    }
    document.addEventListener("mousemove", function (e) {
      if (!dockPrefs().autoHide) return;
      var p = dockPrefs().position, w = window.innerWidth, h = window.innerHeight;
      var near = (p === "bottom") ? (e.clientY >= h - 26)
               : (p === "left") ? (e.clientX <= 26)
               : (e.clientX >= w - 26);
      if (near) peek(true);
      else if ((" " + document.body.className + " ").indexOf(" dock-peek ") >= 0) {
        if (dockPeekTimer) clearTimeout(dockPeekTimer);
        dockPeekTimer = setTimeout(function () { peek(false); }, dockPrefs().autoDelay || 900);
      }
    }, false);
  }
  function initDockMagnify() {
    var dock = $("dock");
    if (!dock) return;
    dock.addEventListener("mousemove", function (e) {
      var p = dockPrefs();
      if (!p.mag) return;
      var icons = dock.getElementsByClassName("dock-app"), i;
      for (i = 0; i < icons.length; i++) {
        var el = icons[i], r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var d = Math.sqrt(Math.pow(e.clientX - cx, 2) + Math.pow(e.clientY - cy, 2));
        var reach = p.size * 2.6;
        var f = d >= reach ? 0 : 0.5 * (1 + Math.cos(Math.PI * d / reach));
        var sc = 1 + (p.magMax - 1) * f;
        var lift = (p.position === "bottom") ? -8 * f : 0;
        el.style.transform = "scale(" + sc.toFixed(3) + ") translateY(" + lift.toFixed(1) + "px)";
        el.style.zIndex = f > 0.05 ? 5 : 1;
      }
    }, false);
    dock.addEventListener("mouseleave", function () {
      var icons = dock.getElementsByClassName("dock-app"), i;
      for (i = 0; i < icons.length; i++) { icons[i].style.transform = ""; icons[i].style.zIndex = ""; }
    }, false);
  }
  function findApp(id) {
    for (var i = 0; i < APPS.length; i++) if (APPS[i].id === id) return APPS[i];
    return null;
  }
  function bindIcons(root) {
    var items = root.getElementsByClassName("app"), i;
    for (i = 0; i < items.length; i++) {
      (function (el) {
        var target = el.getAttribute("data-target"), folder = el.getAttribute("data-folder");
        var pressTimer = null, pressFired = false;
        el.onclick = function (e) {
          e.preventDefault();
          if (pressFired) { pressFired = false; return false; }   // long-press already opened the menu
          if (state.edit) {
            var eid = el.getAttribute("data-id") || el.getAttribute("data-folder");
            if (!eid) return false;
            var at = state.hidden.indexOf(eid);
            if (at >= 0) state.hidden.splice(at, 1); else state.hidden.push(eid);
            store("gg_hidden", state.hidden.join(","));
            renderHome();
            return false;
          }
          if (folder) { openContext(folder, null); return false; }
          if (target) { recordLaunch(el.getAttribute("data-id")); routeTo(target); }
          return false;
        };
        el.ontouchstart = function () {
          pressFired = false;
          pressTimer = setTimeout(function () {
            pressFired = true;
            if (folder) openContext(folder, null);
            else openContext(el.getAttribute("data-id"), target);
          }, 600);
        };
        el.ontouchend = function () { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
        el.ontouchmove = function () { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
      })(items[i]);
    }
  }

  /* ---------------- app library ---------------- */
  function libMonogram(name) {
    var parts = String(name).replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/), out = "", i;
    for (i = 0; i < parts.length && out.length < 2; i++) if (parts[i]) out += parts[i].charAt(0);
    return (out || "?").toUpperCase();
  }
  function libHue(name) {
    var h = 0, i;
    for (i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
  }
  function libTile(e) {
    var fav = libFavs().indexOf(e.id) >= 0;
    var badge = e.kind === "builtin" ? "Built-in app"
                : (e.kind === "custom" ? "Your web app" : "External launcher");
    return '<a class="lib-tile" data-app="' + e.id + '" data-kind="' + e.kind + '">' +
      '<span class="lib-mono" style="background:hsl(' + libHue(e.name) + ',55%,42%)">' + esc(libMonogram(e.name)) + "</span>" +
      '<span class="lib-name">' + esc(e.name) + "</span>" +
      '<span class="lib-badge">' + badge + (fav ? " &#9733;" : "") + "</span></a>";
  }
  function renderLibChips() {
    var box = $("lib-chips");
    if (!box) return;
    var cats = ["All"], i;
    for (i = 0; i < LIB_CATS.length; i++) cats.push(LIB_CATS[i]);
    var html = "";
    for (i = 0; i < cats.length; i++) {
      html += '<a class="lib-chip' + ((state.libCat || "All") === cats[i] ? " on" : "") +
              '" data-libcat="' + cats[i] + '">' + cats[i] + "</a>";
    }
    box.innerHTML = html;
    var chips = box.getElementsByClassName("lib-chip"), j;
    for (j = 0; j < chips.length; j++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          state.libCat = el.getAttribute("data-libcat");
          renderAppLibrary();
          return false;
        };
      })(chips[j]);
    }
  }
  function libMenu(entry) {
    var panel = $("ctx-panel");
    if (!panel) return;
    var fav = libFavs().indexOf(entry.id) >= 0;
    var inDock = entry.id === "home" || dockIds().indexOf(entry.id) >= 0;
    var html = '<div class="ctx-title">' + esc(entry.name) + "</div>" +
      '<div class="ctx-item" data-libact="launch">Open</div>';
    if (entry.kind !== "builtin") {
      html += '<div class="ctx-item" data-libact="' + (inDock ? "unpin" : "pin") + '">' +
              (inDock ? "Remove from Dock" : "Pin to Dock") + "</div>";
    }
    html += '<div class="ctx-item" data-libact="fav">' + (fav ? "Remove favourite" : "Add to favourites") + "</div>";
    if (entry.kind === "custom") html += '<div class="ctx-item danger" data-libact="remove">Delete to Recycle Bin</div>';
    html += '<div class="ctx-item danger" data-close="1">Cancel</div>';
    panel.innerHTML = html;
    var items = panel.getElementsByClassName("ctx-item"), i;
    for (i = 0; i < items.length; i++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          var act = el.getAttribute("data-libact");
          toggleOverlay("ctx");
          if (act === "launch") launchEntry(entry);
          else if (act === "pin" || act === "unpin") toggleDockApp(entry.id);
          else if (act === "fav") toggleFav(entry.id);
          else if (act === "remove") trashCustomApp(entry.id);
          return false;
        };
      })(items[i]);
    }
    addClass($("ctx"), "open");
  }
  function libCatsList() {
    var c = ["All"], i;
    for (i = 0; i < LIB_CATS.length; i++) c.push(LIB_CATS[i]);
    return c;
  }
  function libSwitch(delta) {
    var cats = libCatsList(), at = cats.indexOf(state.libCat || "All"), to;
    if (at < 0) at = 0;
    to = at + delta;
    if (to < 0 || to >= cats.length) return false;
    state.libCat = cats[to];
    renderLibChips();
    renderAppLibrary();
    var host = $("applib");
    if (host) {
      addClass(host, delta > 0 ? "lib-swap-left" : "lib-swap-right");
      setTimeout(function () { removeClass(host, "lib-swap-left"); removeClass(host, "lib-swap-right"); }, 280);
    }
    return true;
  }
  var libDrag = null, libDragX = 0, libDragY = 0, libDragMoved = false, libDragActive = false,
      libDragGhost = null, libDragTimer = null, libClickUntil = 0;
  function libDragStart(e, entry) {
    var p = gPoint(e);
    libDrag = { entry: entry };
    libDragX = p.x; libDragY = p.y;
    libDragMoved = false; libDragActive = false; libDragGhost = null;
    if (libDragTimer) clearTimeout(libDragTimer);
    libDragTimer = setTimeout(function () { if (libDrag) libDragActive = true; }, 280);
  }
  function libDragMove(e) {
    if (!libDrag) return;
    var p = gPoint(e);
    if (Math.abs(p.x - libDragX) > 8 || Math.abs(p.y - libDragY) > 8) libDragMoved = true;
    if (!libDragActive || !libDragMoved) return;
    if (!libDragGhost) {
      var g = document.createElement("div");
      g.className = "lib-ghost";
      g.innerHTML = '<span class="lib-mono" style="background:hsl(' + libHue(libDrag.entry.name) + ',55%,42%)">' +
                    esc(libMonogram(libDrag.entry.name)) + "</span>";
      document.body.appendChild(g);
      libDragGhost = g;
    }
    libDragGhost.style.left = p.x + "px";
    libDragGhost.style.top = p.y + "px";
    document.body.className = document.body.className.replace(/\s*lib-drag-over-dock\b/g, "") +
      (onDockPoint(e) ? " lib-drag-over-dock" : "");
  }
  function libDragEnd(e) {
    if (!libDrag) return;
    var id = libDrag.entry.id, active = libDragActive && libDragMoved;
    libDrag = null;
    if (libDragTimer) { clearTimeout(libDragTimer); libDragTimer = null; }
    if (libDragGhost && libDragGhost.parentNode) libDragGhost.parentNode.removeChild(libDragGhost);
    libDragGhost = null;
    libDragActive = false;
    document.body.className = document.body.className.replace(/\s*lib-drag-over-dock\b/g, "");
    if (!active) return;
    libClickUntil = new Date().getTime() + 600;
    if (onDockPoint(e)) {
      if (dockIds().indexOf(id) < 0) toggleDockApp(id);
      showBanner("Added to Dock", "info");
    }
  }
  function bindLibSwipe() {
    var page = $("page-2");
    if (!page) return;
    var sx = 0, sy = 0, swiping = false, moved = false, started = 0;
    page.addEventListener("touchstart", function (e) {
      var t = e.touches[0]; if (!t) return;
      sx = t.clientX; sy = t.clientY; swiping = false; moved = false;
      started = new Date().getTime();
    }, false);
    page.addEventListener("touchmove", function (e) {
      var t = e.touches[0]; if (!t) return;
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (libDrag && libDragActive) return;             // tile drag owns the gesture
      if (!swiping && Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.3) swiping = true;
      if (swiping) {
        moved = true;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
    }, false);
    page.addEventListener("touchend", function (e) {
      var t = e.changedTouches && e.changedTouches[0];
      var quick = new Date().getTime() - started < 700;
      if (swiping && moved && t && quick) {
        var dx = t.clientX - sx;
        e.stopPropagation();
        if (Math.abs(dx) > 56) libSwitch(dx < 0 ? 1 : -1);
      }
      swiping = false; moved = false;
    }, false);
  }
  function renderAppLibrary() {
    var host = $("applib");
    if (!host) return;
    var entries = registryEntries();
    var q = String(state.libQuery || "").toLowerCase();
    var cat = state.libCat || "All";
    var i, e, html = "", byCat = {}, order = [], keys = [], k, list;
    function matches(x) {
      if (q && x.name.toLowerCase().indexOf(q) < 0 && x.cat.toLowerCase().indexOf(q) < 0) return false;
      if (cat !== "All" && x.cat !== cat) return false;
      return true;
    }
    function section(title, items) {
      var h = '<div class="lib-section"><div class="lib-title">' + esc(title) + " (" + items.length + ')</div><div class="lib-grid">';
      for (var m = 0; m < items.length; m++) h += libTile(items[m]);
      return h + "</div></div>";
    }
    if (!q) {
      var favs = [], rec = [], f = libFavs(), r = libRecent(), j;
      for (j = 0; j < f.length; j++) { e = registryFind(f[j]); if (e && matches(e)) favs.push(e); }
      for (j = 0; j < r.length; j++) { e = registryFind(r[j]); if (e && matches(e) && favs.indexOf(e) < 0) rec.push(e); }
      if (favs.length) html += section("Favourites", favs);
      if (rec.length) html += section("Recently used", rec);
    }
    for (i = 0; i < entries.length; i++) {
      e = entries[i];
      if (!matches(e)) continue;
      if (!byCat[e.cat]) { byCat[e.cat] = []; order.push(e.cat); }
      byCat[e.cat].push(e);
    }
    for (i = 0; i < order.length; i++) {
      k = order[i];
      keys.push(k);
    }
    keys.sort();
    for (i = 0; i < keys.length; i++) html += section(keys[i], byCat[keys[i]]);
    host.innerHTML = html || '<div class="empty">No matching applications</div>';
    var tiles = host.getElementsByClassName("lib-tile"), t;
    for (t = 0; t < tiles.length; t++) {
      (function (el) {
        var entry = registryFind(el.getAttribute("data-app"));
        if (!entry) return;
        var suppressClick = false, suppressTimer = null;
        /* click covers mouse, keyboard and assistive activation; the gesture
           recogniser only adds long-press (favourite), and suppresses the
           click that follows it. */
        el.onclick = function (e) {
          e.preventDefault();
          if (suppressClick) { suppressClick = false; return false; }
          if (new Date().getTime() < libClickUntil) return false;
          launchEntry(entry);
          return false;
        };
        el.addEventListener("mousedown", function (e) { libDragStart(e, entry); }, false);
        el.addEventListener("touchstart", function (e) { libDragStart(e, entry); }, false);
        gesture(el, {
          long: function () {
            suppressClick = true;
            toggleFav(entry.id);
            showBanner(entry.name + (libFavs().indexOf(entry.id) >= 0 ? " added to favourites" : " removed from favourites"), "info");
            if (suppressTimer) clearTimeout(suppressTimer);
            suppressTimer = setTimeout(function () { suppressClick = false; }, 800);
          }
        });
      })(tiles[t]);
    }
    renderLibChips();
  }

  /* ================= PHASE 3 — built-in applications ================= */
  function jload(key, fallback) {
    try { var raw = load(key, ""); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function jsave(key, val) { store(key, JSON.stringify(val)); }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function ymdOf(y, m, d) { return y + "-" + pad2(m) + "-" + pad2(d); }
  function todayYmd() { var d = new Date(); return ymdOf(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
  function humanDate(ymd) {
    var p = String(ymd).split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
    var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return days[d.getDay()] + " " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
  }

  /* ---------------- Calendar ---------------- */
  function calEvents() { return jload("gg_cal_events", []); }
  function renderCalendar() {
    var body = $("cal-body");
    if (!body) return;
    var d = new Date();
    var cur = state.calMonth || (d.getFullYear() + "-" + pad2(d.getMonth() + 1));
    state.calMonth = cur;
    var y = parseInt(cur.substr(0, 4), 10), m = parseInt(cur.substr(5, 2), 10);
    var sel = state.calSel || todayYmd();
    var evs = calEvents(), byDay = {}, i, e;
    for (i = 0; i < evs.length; i++) {
      e = evs[i];
      if (!byDay[e.date]) byDay[e.date] = [];
      byDay[e.date].push(e);
    }
    var firstDow = new Date(y, m - 1, 1).getDay();
    var days = new Date(y, m, 0).getDate();
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    var dows = ["S","M","T","W","T","F","S"];
    var html = '<div class="cal-head">' +
      '<a class="cal-nav" data-cal-nav="prev">&#8249;</a>' +
      "<b>" + months[m - 1] + " " + y + "</b>" +
      '<a class="cal-nav" data-cal-nav="next">&#8250;</a>' +
      '<a class="cal-today" data-cal-nav="today">Today</a></div>';
    html += '<div class="cal-grid">';
    for (i = 0; i < 7; i++) html += '<div class="cal-dow">' + dows[i] + "</div>";
    for (i = 0; i < firstDow; i++) html += '<div class="cal-cell empty"></div>';
    for (i = 1; i <= days; i++) {
      var key = ymdOf(y, m, i);
      var cls = "cal-cell" + (key === sel ? " sel" : "") + (byDay[key] ? " has-ev" : "") + (key === todayYmd() ? " today" : "");
      html += '<div class="' + cls + '" data-cal-day="' + key + '">' + i + "</div>";
    }
    html += "</div>";
    html += '<div class="card"><h3>' + esc(humanDate(sel)) + "</h3>";
    var list = byDay[sel] || [];
    if (!list.length) html += '<div class="empty" style="padding:6px 0">No events</div>';
    for (i = 0; i < list.length; i++) {
      e = list[i];
      html += '<div class="cal-row"><b>' + esc(e.title) + "</b><span>" + esc(e.time || "all-day") +
              '</span><a href="#" data-cal-del="' + esc(e.id) + '">Delete</a></div>';
    }
    html += '<div class="app-form"><input id="cal-title" type="text" placeholder="New event" autocapitalize="sentences">' +
            '<input id="cal-time" type="time" style="width:96px">' +
            '<a href="#" class="theme-opt" id="cal-add">Add event</a></div>';
    html += "</div>";
    body.innerHTML = html;
    var navs = body.querySelectorAll("[data-cal-nav]"), n;
    for (n = 0; n < navs.length; n++) {
      (function (el) {
        el.onclick = function (ev) {
          ev.preventDefault();
          var act = el.getAttribute("data-cal-nav");
          if (act === "today") { state.calMonth = todayYmd().substr(0, 7); state.calSel = todayYmd(); }
          else {
            var dd = new Date(y, m - 1 + (act === "next" ? 1 : -1), 1);
            state.calMonth = dd.getFullYear() + "-" + pad2(dd.getMonth() + 1);
          }
          renderCalendar();
          return false;
        };
      })(navs[n]);
    }
    var cells = body.querySelectorAll("[data-cal-day]"), c;
    for (c = 0; c < cells.length; c++) {
      (function (el) {
        el.onclick = function () { state.calSel = el.getAttribute("data-cal-day"); renderCalendar(); };
      })(cells[c]);
    }
    var dels = body.querySelectorAll("[data-cal-del]"), k;
    for (k = 0; k < dels.length; k++) {
      (function (el) {
        el.onclick = function (ev) {
          ev.preventDefault();
          var id = el.getAttribute("data-cal-del"), all = calEvents(), out = [], q;
          for (q = 0; q < all.length; q++) if (all[q].id !== id) out.push(all[q]);
          jsave("gg_cal_events", out);
          renderCalendar();
          return false;
        };
      })(dels[k]);
    }
    var add = $("cal-add");
    if (add) {
      add.onclick = function (ev) {
        ev.preventDefault();
        var title = String(($("cal-title") || {}).value || "").replace(/^\s+|\s+$/g, "");
        if (!title) return false;
        var list2 = calEvents();
        list2.push({ id: "ev-" + new Date().getTime(), title: title, date: sel,
                     time: String(($("cal-time") || {}).value || "") });
        jsave("gg_cal_events", list2);
        renderCalendar();
        return false;
      };
    }
  }

  /* ---------------- Notes ---------------- */
  function notesAll() { return jload("gg_notes", []); }
  function notesSave(list) { jsave("gg_notes", list); }
  function renderNotesApp() {
    var body = $("note-body");
    if (!body) return;
    var list = notesAll(), i, n;
    if (state.noteEdit) {
      n = null;
      for (i = 0; i < list.length; i++) if (list[i].id === state.noteEdit) n = list[i];
      if (!n) { state.noteEdit = null; renderNotesApp(); return; }
      body.innerHTML = '<div class="note-editor">' +
        '<div class="note-bar"><a href="#" class="theme-opt" id="note-back">&#8249; Notes</a>' +
        '<a href="#" class="theme-opt" id="note-pin">' + (n.pin ? "Unpin" : "Pin") + "</a>" +
        '<a href="#" class="theme-opt" id="note-del" style="color:#ff6b6b">Delete</a></div>' +
        '<input id="note-title" class="note-title" type="text" value="' + esc(n.title) + '" placeholder="Title">' +
        '<textarea id="note-text" class="note-text" placeholder="Start writing…">' + esc(n.body) + "</textarea>" +
        '<div class="note-meta">Updated ' + esc(n.updated) + " · " + n.body.length + " characters</div></div>";
      var saveFrom = function () {
        var all = notesAll(), j;
        for (j = 0; j < all.length; j++) {
          if (all[j].id === n.id) {
            all[j].title = $("note-title").value;
            all[j].body = $("note-text").value;
            all[j].updated = new Date().toLocaleString();
          }
        }
        notesSave(all);
        var meta = body.querySelector(".note-meta");
        if (meta) meta.textContent = "Updated " + new Date().toLocaleString() + " · " + $("note-text").value.length + " characters";
      };
      $("note-title").oninput = saveFrom;
      $("note-text").oninput = saveFrom;
      $("note-back").onclick = function (e) { e.preventDefault(); state.noteEdit = null; renderNotesApp(); return false; };
      $("note-pin").onclick = function (e) {
        e.preventDefault();
        var all = notesAll(), j;
        for (j = 0; j < all.length; j++) if (all[j].id === n.id) all[j].pin = !all[j].pin;
        notesSave(all); renderNotesApp(); return false;
      };
      $("note-del").onclick = function (e) {
        e.preventDefault();
        var all = notesAll(), out = [], j;
        for (j = 0; j < all.length; j++) if (all[j].id !== n.id) out.push(all[j]);
        notesSave(out); state.noteEdit = null; renderNotesApp(); return false;
      };
      return;
    }
    var q = String(state.noteQuery || "").toLowerCase(), shown = 0;
    var listSorted = list.slice().sort(function (a, b) {
      if (!!b.pin !== !!a.pin) return b.pin ? 1 : -1;
      return String(b.updated).localeCompare(String(a.updated));
    });
    var html = '<div class="note-search"><input id="note-search" type="search" placeholder="Search notes" value="' +
      esc(state.noteQuery || "") + '"><a href="#" class="theme-opt" id="note-new">New note</a></div>';
    for (i = 0; i < listSorted.length; i++) {
      n = listSorted[i];
      if (q && (n.title + " " + n.body).toLowerCase().indexOf(q) < 0) continue;
      shown++;
      html += '<div class="note-card" data-note-open="' + esc(n.id) + '">' +
        "<b>" + esc(n.title || "Untitled") + (n.pin ? " &#9733;" : "") + "</b>" +
        "<span>" + esc(String(n.body || "").substring(0, 90)) + "</span>" +
        "<small>" + esc(n.updated || "") + '</small><a href="#" data-note-del="' + esc(n.id) + '">Delete</a></div>';
    }
    if (!shown) html += '<div class="empty">No notes yet.</div>';
    body.innerHTML = html;
    var search = $("note-search");
    if (search) search.oninput = function () { state.noteQuery = search.value; renderNotesApp(); var box = $("note-search"); if (box) { box.focus(); } };
    $("note-new").onclick = function (e) {
      e.preventDefault();
      var all = notesAll();
      var id = "nt-" + new Date().getTime();
      all.push({ id: id, title: "", body: "", pin: false, updated: new Date().toLocaleString() });
      notesSave(all); state.noteEdit = id; renderNotesApp(); return false;
    };
    var opens = body.querySelectorAll("[data-note-open]"), o;
    for (o = 0; o < opens.length; o++) {
      (function (el) {
        el.onclick = function (ev) {
          if (ev && ev.target && ev.target.getAttribute && ev.target.getAttribute("data-note-del")) return;
          ev.preventDefault(); state.noteEdit = el.getAttribute("data-note-open"); renderNotesApp(); return false;
        };
      })(opens[o]);
    }
    var nd = body.querySelectorAll("[data-note-del]"), z;
    for (z = 0; z < nd.length; z++) {
      (function (el) {
        el.onclick = function (ev) {
          ev.preventDefault(); ev.stopPropagation && ev.stopPropagation();
          var id = el.getAttribute("data-note-del"), all = notesAll(), out = [], j;
          for (j = 0; j < all.length; j++) if (all[j].id !== id) out.push(all[j]);
          notesSave(out); renderNotesApp(); return false;
        };
      })(nd[z]);
    }
  }

  /* ---------------- Reminders ---------------- */
  function remAll() { return jload("gg_reminders", []); }
  function renderReminders() {
    var body = $("rem-body");
    if (!body) return;
    var list = remAll(), i, r, f = state.remFilter || "open";
    var open = [], done = [];
    for (i = 0; i < list.length; i++) (list[i].done ? done : open).push(list[i]);
    var html = '<div class="app-form"><input id="rem-text" type="text" placeholder="New reminder" autocapitalize="sentences">' +
      '<input id="rem-due" type="date" style="width:132px"><a href="#" class="theme-opt" id="rem-add">Add</a></div>' +
      '<div class="lib-chips" style="margin:2px 0 10px">' +
      '<a class="lib-chip' + (f === "open" ? " on" : "") + '" data-rem-filter="open">Open (' + open.length + ")</a>" +
      '<a class="lib-chip' + (f === "done" ? " on" : "") + '" data-rem-filter="done">Done (' + done.length + ")</a>" +
      '<a class="lib-chip' + (f === "all" ? " on" : "") + '" data-rem-filter="all">All</a></div>';
    var show = f === "open" ? open : (f === "done" ? done : list);
    var today = todayYmd();
    for (i = 0; i < show.length; i++) {
      r = show[i];
      var overdue = !r.done && r.due && r.due < today;
      html += '<div class="rem-row' + (r.done ? " done" : "") + (overdue ? " overdue" : "") + '">' +
        '<a href="#" class="rem-check" data-rem-toggle="' + esc(r.id) + '">' + (r.done ? "&#10003;" : "") + "</a>" +
        '<div class="rem-main"><b>' + esc(r.text) + "</b><small>" +
        (r.due ? (overdue ? "Overdue · " : "Due · ") + esc(r.due) : "No date") + "</small></div>" +
        '<a href="#" data-rem-del="' + esc(r.id) + '">Delete</a></div>';
    }
    if (!show.length) html += '<div class="empty">Nothing here.</div>';
    body.innerHTML = html;
    var chips = body.querySelectorAll("[data-rem-filter]"), c;
    for (c = 0; c < chips.length; c++) {
      (function (el) { el.onclick = function (e) { e.preventDefault(); state.remFilter = el.getAttribute("data-rem-filter"); renderReminders(); return false; }; })(chips[c]);
    }
    var togs = body.querySelectorAll("[data-rem-toggle]"), t;
    for (t = 0; t < togs.length; t++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          var id = el.getAttribute("data-rem-toggle"), all = remAll(), j;
          for (j = 0; j < all.length; j++) if (all[j].id === id) all[j].done = !all[j].done;
          jsave("gg_reminders", all); renderReminders(); return false;
        };
      })(togs[t]);
    }
    var dels = body.querySelectorAll("[data-rem-del]"), d2;
    for (d2 = 0; d2 < dels.length; d2++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          var id = el.getAttribute("data-rem-del"), all = remAll(), out = [], j;
          for (j = 0; j < all.length; j++) if (all[j].id !== id) out.push(all[j]);
          jsave("gg_reminders", out); renderReminders(); return false;
        };
      })(dels[d2]);
    }
    $("rem-add").onclick = function (e) {
      e.preventDefault();
      var text = String(($("rem-text") || {}).value || "").replace(/^\s+|\s+$/g, "");
      if (!text) return false;
      var all = remAll();
      all.push({ id: "rm-" + new Date().getTime(), text: text, due: String(($("rem-due") || {}).value || ""), done: false });
      jsave("gg_reminders", all); renderReminders(); return false;
    };
  }

  /* ---------------- Clock ---------------- */
  function clockPrefs() {
    var def = { fmt24: true, world: ["UTC", "America/New_York", "Asia/Tokyo"],
                sw: { run: false, acc: 0, start: 0 }, timer: { run: false, left: 0, until: 0 }, alarms: [] };
    var p = jload("gg_clock", null), k;
    if (!p) p = def;
    else {
      for (k in def) if (p[k] === undefined || p[k] === null) p[k] = def[k];
    }
    if (!p.alarms.length !== undefined && !p.alarms) p.alarms = [];
    if (p.alarms.length === undefined) p.alarms = [];
    return p;
  }
  var ZONES = { "UTC": 0, "Europe/London": 0, "Europe/Berlin": 1, "Asia/Manila": 8, "Asia/Tokyo": 9,
                "Asia/Kolkata": 5.5, "Australia/Sydney": 10, "America/New_York": -5, "America/Chicago": -6,
                "America/Los_Angeles": -8 };
  function zoneTime(off, fmt24) {
    var now = new Date();
    var utc = now.getTime() + now.getTimezoneOffset() * 60000;
    var d = new Date(utc + off * 3600000);
    var h = d.getHours(), mi = d.getMinutes(), ap = h >= 12 ? "PM" : "AM";
    if (!fmt24) { h = h % 12; if (h === 0) h = 12; }
    return pad2(h) + ":" + pad2(mi) + (fmt24 ? "" : " " + ap);
  }
  function renderClock() {
    var body = $("clock-body");
    if (!body) return;
    var p = clockPrefs(), i, z, html = "";
    var opts = "";
    for (z in ZONES) opts += '<option value="' + z + '">' + z + "</option>";
    var now0 = new Date();
    var localH = now0.getHours(), localAp = localH >= 12 ? "PM" : "AM";
    if (!p.fmt24) { localH = localH % 12; if (localH === 0) localH = 12; }
    var localStr = pad2(localH) + ":" + pad2(now0.getMinutes()) + (p.fmt24 ? "" : " " + localAp);
    html += '<div class="card clock-card"><div id="clock-now" class="clock-now">' + localStr + "</div>" +
      '<div class="clock-sub">' + esc(new Date().toDateString()) + "</div>" +
      '<div class="app-form" style="margin-top:8px"><a href="#" class="theme-opt" id="clock-fmt">' +
      (p.fmt24 ? "24-hour" : "12-hour") + "</a></div></div>";
    html += '<div class="card"><h3>World clock</h3>';
    for (i = 0; i < p.world.length; i++) {
      z = p.world[i];
      html += '<div class="world-row"><b>' + esc(z) + "</b><span>" + zoneTime(ZONES[z] || 0, p.fmt24) +
              '</span><a href="#" data-world-del="' + esc(z) + '">Remove</a></div>';
    }
    html += '<div class="app-form"><select id="world-add">' + opts + '</select><a href="#" class="theme-opt" id="world-add-btn">Add zone</a></div></div>';
    html += '<div class="card"><h3>Alarms</h3>';
    if (!p.alarms.length) html += '<div class="empty">No alarms</div>';
    for (i = 0; i < p.alarms.length; i++) {
      var al = p.alarms[i];
      html += '<div class="rem-row"><a href="#" class="rem-check" data-alarm-toggle="' + esc(al.id) + '">' +
              (al.on ? "&#10003;" : "") + '</a><div class="rem-main"><b>' + esc(al.time) + " · " + esc(al.label || "Alarm") +
              '</b><small>only while Liquid Legacy is open</small></div><a href="#" data-alarm-del="' + esc(al.id) + '">Delete</a></div>';
    }
    html += '<div class="app-form"><input id="alarm-time" type="time" style="width:110px">' +
            '<input id="alarm-label" type="text" placeholder="Label" style="width:40%">' +
            '<a href="#" class="theme-opt" id="alarm-add">Add alarm</a></div></div>';
    html += '<div class="card"><h3>Stopwatch</h3><div id="sw-time" class="sw-time">00:00.0</div>' +
      '<div class="app-form"><a href="#" class="theme-opt" id="sw-toggle">' + (p.sw.run ? "Stop" : "Start") + "</a>" +
      '<a href="#" class="theme-opt" id="sw-reset">Reset</a></div></div>';
    html += '<div class="card"><h3>Timer</h3><div id="timer-time" class="sw-time">00:00</div>' +
      '<div class="app-form"><input id="timer-min" type="number" min="1" max="180" placeholder="minutes" style="width:110px">' +
      '<a href="#" class="theme-opt" id="timer-toggle">' + (p.timer.run ? "Stop" : "Start") + "</a></div></div>";
    body.innerHTML = html;
    $("clock-fmt").onclick = function (e) { e.preventDefault(); var q = clockPrefs(); q.fmt24 = !q.fmt24; jsave("gg_clock", q); renderClock(); return false; };
    var dels = body.querySelectorAll("[data-world-del]"), d;
    for (d = 0; d < dels.length; d++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          var q = clockPrefs(), out = [], j, zz = el.getAttribute("data-world-del");
          for (j = 0; j < q.world.length; j++) if (q.world[j] !== zz) out.push(q.world[j]);
          q.world = out; jsave("gg_clock", q); renderClock(); return false;
        };
      })(dels[d]);
    }
    $("world-add-btn").onclick = function (e) {
      e.preventDefault();
      var q = clockPrefs(), v = $("world-add").value;
      if (q.world.indexOf(v) < 0 && q.world.length < 6) q.world.push(v);
      jsave("gg_clock", q); renderClock(); return false;
    };
    $("sw-toggle").onclick = function (e) {
      e.preventDefault();
      var q = clockPrefs();
      if (q.sw.run) { q.sw.acc += (new Date().getTime() - q.sw.start) / 1000; q.sw.run = false; }
      else { q.sw.start = new Date().getTime(); q.sw.run = true; }
      jsave("gg_clock", q); renderClock(); return false;
    };
    $("sw-reset").onclick = function (e) {
      e.preventDefault(); var q = clockPrefs(); q.sw = { run: false, acc: 0, start: 0 }; jsave("gg_clock", q); renderClock(); return false;
    };
    var atogs = body.querySelectorAll("[data-alarm-toggle]"), at;
    for (at = 0; at < atogs.length; at++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          var q2 = clockPrefs(), id = el.getAttribute("data-alarm-toggle"), j;
          for (j = 0; j < q2.alarms.length; j++) if (q2.alarms[j].id === id) q2.alarms[j].on = !q2.alarms[j].on;
          jsave("gg_clock", q2); renderClock(); return false;
        };
      })(atogs[at]);
    }
    var adels = body.querySelectorAll("[data-alarm-del]"), ad;
    for (ad = 0; ad < adels.length; ad++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          var q3 = clockPrefs(), id = el.getAttribute("data-alarm-del"), out = [], j;
          for (j = 0; j < q3.alarms.length; j++) if (q3.alarms[j].id !== id) out.push(q3.alarms[j]);
          q3.alarms = out; jsave("gg_clock", q3); renderClock(); return false;
        };
      })(adels[ad]);
    }
    if ($("alarm-add")) $("alarm-add").onclick = function (e) {
      e.preventDefault();
      var t = String(($("alarm-time") || {}).value || "");
      if (!t) { showBanner("Pick an alarm time", "warning"); return false; }
      var q4 = clockPrefs();
      q4.alarms.push({ id: "al-" + new Date().getTime(), time: t,
                       label: String(($("alarm-label") || {}).value || "").replace(/^\s+|\s+$/g, ""), on: true });
      jsave("gg_clock", q4);
      showBanner("Alarm set for " + t, "info");
      state.alarmMinute = null;            // let an alarm for the current minute ring now
      renderClock();                       // its tick may replace the banner with the alarm
      return false;
    };
    $("timer-toggle").onclick = function (e) {
      e.preventDefault();
      var q = clockPrefs();
      if (q.timer.run) { q.timer.run = false; }
      else {
        var mins = parseInt(($("timer-min") || {}).value || "0", 10);
        var left = mins > 0 ? mins * 60 : (q.timer.left || 0);
        if (left > 0) { q.timer = { run: true, left: left, until: new Date().getTime() + left * 1000 }; }
      }
      jsave("gg_clock", q); renderClock(); return false;
    };
    tickClock();
  }
  function tickClock() {
    var el = $("clock-now");
    if (el) {
      var now = new Date(), q0 = clockPrefs(), h0 = now.getHours(), ap0 = h0 >= 12 ? "PM" : "AM";
      if (!q0.fmt24) { h0 = h0 % 12; if (h0 === 0) h0 = 12; }
      el.textContent = pad2(h0) + ":" + pad2(now.getMinutes()) + ":" + pad2(now.getSeconds()) + (q0.fmt24 ? "" : " " + ap0);
      var rows = document.querySelectorAll(".world-row span"), q = clockPrefs(), i, z;
      for (i = 0; i < rows.length && i < q.world.length; i++) rows[i].textContent = zoneTime(ZONES[q.world[i]] || 0, q.fmt24);
    }
    var p = clockPrefs();
    var nowMin = pad2(new Date().getHours()) + ":" + pad2(new Date().getMinutes());
    if (state.alarmMinute !== nowMin) {
      state.alarmMinute = nowMin;
      var ai;
      for (ai = 0; ai < p.alarms.length; ai++) {
        if (p.alarms[ai].on && p.alarms[ai].time === nowMin) {
          showBanner("Alarm: " + (p.alarms[ai].label || p.alarms[ai].time), "warning");
        }
      }
    }
    var sw = $("sw-time");
    if (sw) {
      var acc = p.sw.acc + (p.sw.run ? (new Date().getTime() - p.sw.start) / 1000 : 0);
      var m = Math.floor(acc / 60), sec = acc % 60;
      sw.textContent = pad2(m) + ":" + (sec < 10 ? "0" : "") + sec.toFixed(1);
    }
    var tt = $("timer-time");
    if (tt) {
      var left = p.timer.run ? Math.max(0, Math.round((p.timer.until - new Date().getTime()) / 1000)) : (p.timer.left || 0);
      tt.textContent = pad2(Math.floor(left / 60)) + ":" + pad2(left % 60);
      if (p.timer.run && left <= 0) { p.timer = { run: false, left: 0, until: 0 }; jsave("gg_clock", p); showBanner("Timer finished", "info"); }
    }
    tickStatusClock();
  }
  function startClockTicker() {
    setInterval(function () {
      if (state.route === "#/clock" || (window.GGWM && GGWM.find && GGWM.find("clock"))) tickClock();
      if (state.page === 1) updateWidgetClocks();
      if (state.page === 3) updateDashClock();
    }, 1000);
  }

  /* ---------------- Calculator ---------------- */
  function calcState() {
    if (!state.calc) {
      state.calc = jload("gg_calc", null) || { d: "0", a: null, op: null, mem: 0, hist: [] };
    }
    return state.calc;
  }
  function calcShow() { var c = calcState(); return c.d; }
  function calcPress(k) {
    var c = calcState();
    function num(x) { return parseFloat(x); }
    if (/^[0-9]$/.test(k)) {
      if (c.fresh) { c.d = k; c.fresh = false; }
      else { c.d = (c.d === "0" || c.d === "err") ? k : c.d + k; }
    }
    else if (k === ".") { if (c.d.indexOf(".") < 0) c.d += "."; }
    else if (k === "C") { c.d = "0"; c.a = null; c.op = null; }
    else if (k === "back") { c.d = c.d.length > 1 ? c.d.slice(0, -1) : "0"; }
    else if (k === "sign") { c.d = c.d.charAt(0) === "-" ? c.d.slice(1) : "-" + c.d; }
    else if (k === "%") { c.d = String(num(c.d) / 100); }
    else if (k === "+" || k === "-" || k === "*" || k === "/") {
      if (c.a !== null && c.op) c.d = String(calcEval(c.a, num(c.d), c.op));
      c.a = num(c.d); c.op = k; c.d = String(c.a); c.fresh = true;
      return;
    }
    else if (k === "=") {
      if (c.a !== null && c.op) {
        var r = calcEval(c.a, num(c.d), c.op);
        c.hist.unshift(c.a + " " + c.op + " " + c.d + " = " + r);
        if (c.hist.length > 20) c.hist.pop();
        c.d = String(r); c.a = null; c.op = null;
      }
    }
    else if (k === "M+") c.mem += num(c.d);
    else if (k === "MR") c.d = String(c.mem);
    else if (k === "MC") c.mem = 0;
    jsave("gg_calc", c);
    var disp = $("calc-disp");
    if (disp) disp.textContent = c.d;
    if (k === "=" || k === "M+" || k === "MC") renderCalculator();
  }
  function calcEval(a, b, op) {
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (op === "/") return b === 0 ? NaN : a / b;
    return b;
  }
  function renderCalculator() {
    var body = $("calc-body");
    if (!body) return;
    var c = calcState(), keys = ["C", "back", "%", "/", "7", "8", "9", "*", "4", "5", "6", "-", "1", "2", "3", "+", "0", ".", "="];
    var html = '<div class="calc-wrap"><div class="calc-hist">';
    var i = 0;
    for (i = 0; i < Math.min(4, c.hist.length); i++) html += "<div>" + esc(c.hist[i]) + "</div>";
    html += '</div><div id="calc-disp" class="calc-disp">' + esc(c.d) + "</div><div class=\"calc-grid\">";
    for (i = 0; i < keys.length; i++) {
      html += '<a href="#" class="calc-key' + (/[0-9.]/.test(keys[i]) ? " num" : "") +
              (keys[i] === "=" ? " eq" : "") + '" data-calc="' + keys[i] + '">' +
              (keys[i] === "back" ? "&#9003;" : keys[i]) + "</a>";
    }
    html += '</div><div class="calc-mem"><a href="#" class="theme-opt" data-calc="MC">MC</a>' +
            '<a href="#" class="theme-opt" data-calc="MR">MR</a><a href="#" class="theme-opt" data-calc="M+">M+</a></div></div>';
    body.innerHTML = html;
    var ks = body.querySelectorAll("[data-calc]"), k;
    for (k = 0; k < ks.length; k++) {
      (function (el) { el.onclick = function (e) { e.preventDefault(); calcPress(el.getAttribute("data-calc")); return false; }; })(ks[k]);
    }
  }

  /* ---------------- widgets ---------------- */
  function widgetDefs() {
    return {
      clock: { label: "Clock", size: "s", render: function (w) {
        var d = new Date(), hh = d.getHours() % 12; if (hh === 0) hh = 12;
        return '<div class="w-time" data-wtime="1">' + hh + ":" + pad2(d.getMinutes()) +
               (d.getHours() >= 12 ? " PM" : " AM") + '</div><small>' + d.toDateString() + "</small>";
      } },
      calendar: { label: "Upcoming events", size: "m", render: function (w) {
        var evs = calEvents(), today = todayYmd(), list = [], i;
        for (i = 0; i < evs.length; i++) if (evs[i].date >= today) list.push(evs[i]);
        list.sort(function (a, b) { return (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")); });
        if (!list.length) return '<div class="empty">No upcoming events</div>';
        var h = "";
        for (i = 0; i < list.length && i < (w.count || 3); i++) {
          h += '<div class="w-row"><b>' + esc(list[i].title) + "</b><span>" + esc(list[i].date) +
               (list[i].time ? " · " + esc(list[i].time) : "") + "</span></div>";
        }
        return h;
      } },
      reminders: { label: "Reminders", size: "m", render: function (w) {
        var all = remAll(), open = [], i;
        for (i = 0; i < all.length; i++) if (!all[i].done) open.push(all[i]);
        var h = '<div class="w-big">' + open.length + "</div><small>open reminders</small>";
        for (i = 0; i < open.length && i < (w.count || 3); i++) h += '<div class="w-row"><b>' + esc(open[i].text) + "</b></div>";
        return h;
      } },
      notes: { label: "Notes", size: "m", render: function (w) {
        var all = notesAll(), i;
        if (!all.length) return '<div class="empty">No notes</div>';
        all.sort(function (a, b) { return String(b.updated).localeCompare(String(a.updated)); });
        var h = "";
        for (i = 0; i < all.length && i < (w.count || 3); i++) h += '<div class="w-row"><b>' + esc(all[i].title || "Untitled") + "</b></div>";
        return h;
      } },
      system: { label: "System", size: "m", render: function (w) {
        var h = state.data.host || {};
        if (!h.host) return '<div class="empty">Waiting for host data…</div>';
        return '<div class="w-big">' + esc(h.load1) + "</div><small>load 1m</small>" +
               '<div class="w-row"><b>Memory</b><span>' + esc(h.mem_pct) + "%</span></div>" +
               '<div class="w-row"><b>Disk</b><span>' + esc(h.disk_pct) + "%</span></div>" +
               '<div class="w-row"><b>Uptime</b><span>' + esc(h.uptime_human) + "</span></div>";
      } },
      gids: { label: "AETG posture", size: "m", render: function (w) {
        var ds = state.data.datasets || {}, g = ds.gids_summary;
        if (!g) return '<div class="empty">Waiting for data…</div>';
        var trusted = g.trusted !== undefined ? g.trusted : (g.endpoints || 0);
        return '<div class="w-big">' + esc(trusted) + "</div><small>trusted</small>" +
               '<div class="w-row"><b>Untrusted</b><span>' + esc(g.untrusted !== undefined ? g.untrusted : "—") + "</span></div>" +
               '<div class="w-row"><b>Pending</b><span>' + esc(g.pending !== undefined ? g.pending : "—") + "</span></div>" +
               '<div class="w-row"><b>Conflicts</b><span>' + esc(g.conflicts !== undefined ? g.conflicts : "—") + "</span></div>";
      } },
      alerts: { label: "Alerts", size: "m", render: function (w) {
        var n = state.alerts.length, i, h = '<div class="w-big">' + n + "</div><small>open</small>";
        for (i = 0; i < n && i < (w.count || 2); i++) h += '<div class="w-row"><b>' + esc(String(state.alerts[i].title || state.alerts[i].message || "Alert")).substring(0, 40) + "</b></div>";
        if (!n) h += '<div class="w-row"><b>All clear</b></div>';
        return h;
      } },
      collectors: { label: "Collectors", size: "l", render: function (w) {
        var ds = state.data.datasets || {}, cs = ds.collectors;
        if (!cs) return '<div class="empty">Waiting for data…</div>';
        var list = cs.items || cs, run = 0, bad = 0, i;
        if (list && list.length !== undefined) {
          for (i = 0; i < list.length; i++) {
            var st = String((list[i] || {}).state || "").toLowerCase();
            if (st.indexOf("run") >= 0 || st.indexOf("ok") >= 0) run++; else bad++;
          }
          return '<div class="w-big">' + run + "</div><small>running · " + bad + " degraded of " + list.length + "</small>";
        }
        return '<div class="w-big">' + (Object.keys ? Object.keys(cs).length : 0) + "</div><small>entries</small>";
      } },
      weather: { label: "Weather", size: "s", render: function (w) {
        return '<div class="empty">No weather provider configured.<br><small>Liquid Legacy never invents live weather.</small></div>';
      } },
      quicknote: { label: "Quick note", size: "m", render: function (w) {
        return '<div class="app-form" style="margin:0"><input id="wq-input" type="text" placeholder="Quick note" autocapitalize="sentences">' +
               '<a href="#" class="theme-opt" id="wq-add">Save</a></div><small>Saved to Notes</small>';
      } },
      apps: { label: "App shortcuts", size: "m", render: function (w) {
        var ids = ["gids", "chat", "calendar", "notes", "reminders", "calculator"], h = '<div class="w-apps">', i;
        for (i = 0; i < ids.length; i++) {
          var a = findApp(ids[i]);
          if (!a) continue;
          h += '<a class="w-app" href="' + a.target + '" data-wgo="' + a.target + '"><img src="' + a.icon + '" alt=""><span>' + esc(a.name) + "</span></a>";
        }
        return h + "</div>";
      } }
    };
  }
  function widgetsLoad() {
    var defs = widgetDefs(), def = [];
    var raw = load("gg_widgets", "");
    if (raw) {
      try { var arr = JSON.parse(raw); if (arr && arr.length) def = arr; } catch (e) {}
    }
    if (!def.length) {
      def = [
        { id: "w1", type: "clock", size: "s" },
        { id: "w2", type: "system", size: "m" },
        { id: "w3", type: "gids", size: "m" },
        { id: "w4", type: "alerts", size: "m" },
        { id: "w5", type: "collectors", size: "l" }
      ];
    }
    state.widgets = def;
    if (!raw) widgetsSave();                 // persist the default layout immediately
    return def;
  }
  function widgetsSave() { store("gg_widgets", JSON.stringify(state.widgets || [])); }
  function renderWidgets() {
    var grid = $("widgets-grid");
    if (!grid) return;
    if (!state.widgets || !state.widgets.length) widgetsLoad();
    var defs = widgetDefs(), list = state.widgets, html = "", i, w, d, active, body;
    for (i = 0; i < list.length; i++) {
      w = list[i];
      d = defs[w.type] || defs.system;
      body = d.render(w);
      html += '<div class="widget w-' + (w.size || d.size || "m") + '" data-wid="' + esc(w.id) + '" data-wtype="' + esc(w.type) + '">' +
        '<div class="w-head"><h3>' + esc(w.type === "stack" ? "Stack" : d.label) + "</h3>" +
        (state.edit ? '<span class="w-tools">' +
          '<a href="#" data-wsize="' + esc(w.id) + '">size</a>' +
          '<a href="#" data-wopt="' + esc(w.id) + '">options</a>' +
          '<a href="#" data-wdel="' + esc(w.id) + '">remove</a></span>' : "") +
        "</div>";
      if (w.type === "stack") {
        var kids = w.stack || ["clock", "reminders", "notes"];
        active = kids[(w.at || 0) % kids.length];
        body = (defs[active] || defs.clock).render(w);
        html += '<div data-stack="' + esc(w.id) + '">' + body + '</div>' +
          '<div class="w-dots">';
        for (var k = 0; k < kids.length; k++) html += '<i class="' + (k === ((w.at || 0) % kids.length) ? "on" : "") + '"></i>';
        html += "</div>";
      } else {
        html += body;
      }
      html += "</div>";
    }
    if (state.edit) html += '<a href="#" class="widget w-s wg-add" id="wg-add">+<small>Add widget</small></a>';
    grid.innerHTML = html;

    var dels = grid.querySelectorAll("[data-wdel]"), z;
    for (z = 0; z < dels.length; z++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          var id = el.getAttribute("data-wdel"), out = [], j;
          for (j = 0; j < list.length; j++) if (list[j].id !== id) out.push(list[j]);
          state.widgets = out; widgetsSave(); renderWidgets(); return false;
        };
      })(dels[z]);
    }
    var sizes = grid.querySelectorAll("[data-wsize]"), s2;
    for (s2 = 0; s2 < sizes.length; s2++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          var id = el.getAttribute("data-wsize"), order = ["s", "m", "l"], j;
          for (j = 0; j < state.widgets.length; j++) {
            if (state.widgets[j].id === id) {
              var at = order.indexOf(state.widgets[j].size);
              state.widgets[j].size = order[(at + 1) % order.length];
            }
          }
          widgetsSave(); renderWidgets(); return false;
        };
      })(sizes[s2]);
    }
    var opts = grid.querySelectorAll("[data-wopt]"), o2;
    for (o2 = 0; o2 < opts.length; o2++) {
      (function (el) {
        el.onclick = function (e) { e.preventDefault(); openWidgetOptions(el.getAttribute("data-wopt")); return false; };
      })(opts[o2]);
    }
    var add = $("wg-add");
    if (add) add.onclick = function (e) { e.preventDefault(); renderGallery(); toggleOverlay("wgallery"); return false; };
    var stacks = grid.querySelectorAll('[data-wtype="stack"]'), st;
    for (st = 0; st < stacks.length; st++) {
      (function (el) {
        el.onclick = function (e) {
          if (e && e.target && e.target.getAttribute &&
              (e.target.getAttribute("data-wdel") || e.target.getAttribute("data-wsize"))) return;
          var id = el.getAttribute("data-wid"), j;
          e.preventDefault();
          for (j = 0; j < state.widgets.length; j++) {
            if (state.widgets[j].id === id) {
              state.widgets[j].at = ((state.widgets[j].at || 0) + 1) % (state.widgets[j].stack || []).length;
            }
          }
          widgetsSave(); renderWidgets(); return false;
        };
      })(stacks[st]);
    }
    var qn = $("wq-add");
    if (qn) {
      qn.onclick = function (e) {
        e.preventDefault();
        var v = String(($("wq-input") || {}).value || "").replace(/^\s+|\s+$/g, "");
        if (!v) return false;
        var all = notesAll();
        all.push({ id: "nt-" + new Date().getTime(), title: v.substring(0, 40), body: v, pin: false, updated: new Date().toLocaleString() });
        notesSave(all);
        $("wq-input").value = "";
        showBanner("Saved to Notes", "info");
        renderWidgets();
        return false;
      };
    }
    var apps = grid.querySelectorAll("[data-wgo]"), ap;
    for (ap = 0; ap < apps.length; ap++) {
      (function (el) {
        el.onclick = function (e) { e.preventDefault(); routeTo(el.getAttribute("data-wgo")); return false; };
      })(apps[ap]);
    }
    enableWidgetDrag();
  }
  function dashState() {
    var def = ["daily", "work", "personal"], raw = load("gg_dash_sections", "");
    if (raw) { try { var a = JSON.parse(raw); if (a && a.length !== undefined) def = a; } catch (e) {} }
    state.dashSections = def;
    return def;
  }
  function dashSave() { store("gg_dash_sections", JSON.stringify(state.dashSections || [])); }
  function dashNowText() {
    var d = new Date(), hh = d.getHours() % 12; if (hh === 0) hh = 12;
    return hh + ":" + pad2(d.getMinutes()) + (d.getHours() >= 12 ? " PM" : " AM");
  }
  function updateDashClock() { var el = $("dash-now"); if (el) el.textContent = dashNowText(); }
  function dashShorts(ids) {
    var h = '<div class="dash-shortcuts">', i, e;
    ids = ids || [];
    for (i = 0; i < ids.length; i++) {
      e = registryFind(ids[i]);
      if (!e) continue;
      h += '<a class="dash-short" href="#" data-dlaunch="' + esc(e.id) + '"><span class="lib-mono" style="background:hsl(' +
           libHue(e.name) + ',55%,42%)">' + esc(libMonogram(e.name)) + "</span><span>" + esc(e.name) + "</span></a>";
    }
    return h + "</div>";
  }
  function renderDashboard() {
    var host = $("dash");
    if (!host) return;
    var secs = dashState(), today = todayYmd(), i, k, html = "", all = ["daily", "work", "personal"];
    html += '<div class="dash-head"><b>Dashboard</b><span>' + esc(humanDate(today)) + "</span></div>";
    if (state.edit) {
      var hidden = [], any = false;
      for (i = 0; i < all.length; i++) if (secs.indexOf(all[i]) < 0) hidden.push(all[i]);
      if (hidden.length) {
        html += '<div class="dash-add">';
        for (i = 0; i < hidden.length; i++) html += '<a href="#" class="lib-chip" data-dadd="' + hidden[i] + '">+ ' + hidden[i] + "</a>";
        html += "</div>";
      }
      any = true;
    }
    for (i = 0; i < secs.length; i++) {
      var sec = secs[i];
      html += '<div class="dash-section" data-dsec="' + sec + '"><div class="dash-shead"><b>' +
              (sec === "daily" ? "Daily overview" : sec === "work" ? "Work overview" : "Personal overview") + "</b>" +
              (state.edit ? '<span class="w-tools"><a href="#" data-dup="' + sec + '">up</a>' +
                            '<a href="#" data-ddown="' + sec + '">down</a>' +
                            '<a href="#" data-ddel="' + sec + '">hide</a></span>' : "") + "</div>";
      if (sec === "daily") {
        var evs = calEvents(), up = [], rem = remAll(), openRem = [];
        for (k = 0; k < evs.length; k++) if (evs[k].date >= today) up.push(evs[k]);
        up.sort(function (a, b) { return (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")); });
        for (k = 0; k < rem.length; k++) if (!rem[k].done) openRem.push(rem[k]);
        html += '<div class="dash-card"><div id="dash-now" class="w-time">' + dashNowText() +
                '</div><small>Focus: ' + esc(state.focus === "off" ? "off" : state.focus) + "</small></div>";
        html += '<div class="dash-card"><h3>Today</h3>';
        if (!up.length) html += '<div class="empty">No events today</div>';
        for (k = 0; k < up.length && k < 4; k++) {
          html += '<div class="w-row"><b>' + esc(up[k].title) + "</b><span>" + esc(up[k].date) +
                  (up[k].time ? " · " + esc(up[k].time) : "") + "</span></div>";
        }
        html += '</div><div class="dash-card"><h3>Reminders</h3><div class="w-big">' + openRem.length + "</div>";
        for (k = 0; k < openRem.length && k < 3; k++) html += '<div class="w-row"><b>' + esc(openRem[k].text) + "</b></div>";
        html += "</div>";
        html += '<div class="dash-card"><h3>Quick note</h3><div class="app-form" style="margin:0">' +
                '<input id="dash-qn" type="text" placeholder="Write it down" autocapitalize="sentences">' +
                '<a href="#" class="theme-opt" id="dash-qn-add">Save</a></div></div>';
      } else if (sec === "work") {
        var rec = libRecent(), rids = [], j;
        for (j = 0; j < rec.length && rids.length < 5; j++) if (registryFind(rec[j])) rids.push(rec[j]);
        html += '<div class="dash-card"><h3>Recently used</h3>' + (rids.length ? dashShorts(rids) : '<div class="empty">No recent applications</div>') + "</div>";
        html += '<div class="dash-card"><h3>Microsoft 365</h3>' + dashShorts(["outlook", "word", "excel", "powerpoint", "onedrive", "teams"]) + "</div>";
        html += '<div class="dash-card"><h3>Google Workspace</h3>' + dashShorts(["gmail", "gcal", "gdrive", "gdocs", "gsheets", "gmeet"]) + "</div>";
        html += '<div class="dash-card"><h3>Projects</h3>' + dashShorts(["notion", "slack", "jira", "github"]) + "</div>";
      } else {
        var cp = clockPrefs(), favs = libFavs(), fids = [], j2;
        for (j2 = 0; j2 < favs.length && fids.length < 6; j2++) if (registryFind(favs[j2])) fids.push(favs[j2]);
        html += '<div class="dash-card"><h3>Weather</h3><div class="empty">No weather provider configured.<br><small>Liquid Legacy never invents live weather.</small></div></div>';
        html += '<div class="dash-card"><h3>World clock</h3>';
        for (j2 = 0; j2 < cp.world.length && j2 < 3; j2++) {
          html += '<div class="w-row"><b>' + esc(cp.world[j2]) + "</b><span>" + zoneTime(ZONES[cp.world[j2]] || 0, cp.fmt24) + "</span></div>";
        }
        html += "</div>";
        html += '<div class="dash-card"><h3>Favourites</h3>' + (fids.length ? dashShorts(fids) : '<div class="empty">No favourites yet</div>') + "</div>";
        html += '<div class="dash-card"><h3>Quick note</h3><div class="app-form" style="margin:0">' +
                '<input id="dash-qn2" type="text" placeholder="Write it down" autocapitalize="sentences">' +
                '<a href="#" class="theme-opt" id="dash-qn2-add">Save</a></div></div>';
      }
      html += "</div>";
    }
    host.innerHTML = html;
    var launchers = host.querySelectorAll("[data-dlaunch]"), l;
    for (l = 0; l < launchers.length; l++) {
      (function (el) { el.onclick = function (e) { e.preventDefault(); launchEntry(registryFind(el.getAttribute("data-dlaunch"))); return false; }; })(launchers[l]);
    }
    function saveQuick(id, btn) {
      var b = $(btn); if (!b) return;
      b.onclick = function (e) {
        e.preventDefault();
        var v = String(($(id) || {}).value || "").replace(/^\s+|\s+$/g, "");
        if (!v) return false;
        var all2 = notesAll();
        all2.push({ id: "nt-" + new Date().getTime(), title: v.substring(0, 40), body: v, pin: false, updated: new Date().toLocaleString() });
        notesSave(all2); $(id).value = ""; showBanner("Saved to Notes", "info");
        return false;
      };
    }
    saveQuick("dash-qn", "dash-qn-add");
    saveQuick("dash-qn2", "dash-qn2-add");
    function moveSection(sec, delta) {
      var at2 = state.dashSections.indexOf(sec), to = at2 + delta;
      if (at2 < 0 || to < 0 || to >= state.dashSections.length) return;
      state.dashSections.splice(at2, 1); state.dashSections.splice(to, 0, sec);
      dashSave(); renderDashboard();
    }
    var hides = host.querySelectorAll("[data-ddel]"), h2;
    for (h2 = 0; h2 < hides.length; h2++) {
      (function (el) { el.onclick = function (e) {
        e.preventDefault();
        var sec = el.getAttribute("data-ddel"), out = [], z;
        for (z = 0; z < state.dashSections.length; z++) if (state.dashSections[z] !== sec) out.push(state.dashSections[z]);
        state.dashSections = out; dashSave(); renderDashboard(); return false;
      }; })(hides[h2]);
    }
    var adds2 = host.querySelectorAll("[data-dadd]"), a3;
    for (a3 = 0; a3 < adds2.length; a3++) {
      (function (el) { el.onclick = function (e) {
        e.preventDefault(); state.dashSections.push(el.getAttribute("data-dadd")); dashSave(); renderDashboard(); return false;
      }; })(adds2[a3]);
    }
    var ups = host.querySelectorAll("[data-dup]"), u3;
    for (u3 = 0; u3 < ups.length; u3++) {
      (function (el) { el.onclick = function (e) { e.preventDefault(); moveSection(el.getAttribute("data-dup"), -1); return false; }; })(ups[u3]);
    }
    var downs = host.querySelectorAll("[data-ddown]"), d3;
    for (d3 = 0; d3 < downs.length; d3++) {
      (function (el) { el.onclick = function (e) { e.preventDefault(); moveSection(el.getAttribute("data-ddown"), 1); return false; }; })(downs[d3]);
    }
  }

  function openWidgetOptions(id) {
    var panel = $("ctx-panel"), w = null, i;
    for (i = 0; i < (state.widgets || []).length; i++) if (state.widgets[i].id === id) w = state.widgets[i];
    if (!panel || !w) return;
    var html = '<div class="ctx-title">Widget options</div>';
    if (/^(calendar|reminders|notes|alerts)$/.test(w.type)) {
      var cur = w.count || (w.type === "alerts" ? 2 : 3);
      html += '<div class="ctx-item" data-woptn="3">Show 3' + (cur === 3 ? " ✓" : "") + "</div>" +
              '<div class="ctx-item" data-woptn="5">Show 5' + (cur === 5 ? " ✓" : "") + "</div>" +
              '<div class="ctx-item" data-woptn="8">Show 8' + (cur === 8 ? " ✓" : "") + "</div>";
    }
    if (w.type === "clock") html += '<div class="ctx-item" data-woptfmt="1">Toggle 12/24-hour</div>';
    if (w.type === "stack") html += '<div class="ctx-item" data-woptreset="1">Reset stack to first</div>';
    if (!/^(calendar|reminders|notes|alerts)$/.test(w.type) && w.type !== "clock" && w.type !== "stack") {
      html += '<div class="ctx-item">No options for this widget</div>';
    }
    html += '<div class="ctx-item danger" data-close="1">Cancel</div>';
    panel.innerHTML = html;
    var items = panel.getElementsByClassName("ctx-item"), k;
    for (k = 0; k < items.length; k++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          toggleOverlay("ctx");
          if (el.getAttribute("data-woptn")) { w.count = parseInt(el.getAttribute("data-woptn"), 10); widgetsSave(); renderWidgets(); }
          else if (el.getAttribute("data-woptfmt")) { var q = clockPrefs(); q.fmt24 = !q.fmt24; jsave("gg_clock", q); renderWidgets(); }
          else if (el.getAttribute("data-woptreset")) { w.at = 0; widgetsSave(); renderWidgets(); }
          return false;
        };
      })(items[k]);
    }
    addClass($("ctx"), "open");
  }
  function renderGallery() {
    var box = $("wg-list");
    if (!box) return;
    var defs = widgetDefs(), h = "", k;
    for (k in defs) {
      h += '<div class="wg-row"><b>' + esc(defs[k].label) + '</b><a href="#" class="theme-opt" data-wgadd="' + k + '">Add</a></div>';
    }
    h += '<div class="wg-row"><b>Smart stack <small>clock · reminders · notes</small></b><a href="#" class="theme-opt" data-wgadd="stack">Add</a></div>';
    box.innerHTML = h;
    var btns = box.querySelectorAll("[data-wgadd]"), i;
    for (i = 0; i < btns.length; i++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          var type = el.getAttribute("data-wgadd"), defs2 = widgetDefs();
          if (state.widgets.length >= 12) { showBanner("Widget limit reached", "warning"); return false; }
          var w = { id: "w" + new Date().getTime() + Math.round(Math.random() * 99), type: type, size: "m", at: 0 };
          if (type === "stack") { w.stack = ["clock", "reminders", "notes"]; w.size = "m"; }
          else if (defs2[type]) w.size = defs2[type].size || "m";
          state.widgets.push(w);
          widgetsSave(); renderWidgets();
          if (state.page === 1) {}
          showBanner("Widget added", "info");
          return false;
        };
      })(btns[i]);
    }
  }
  var wDrag = null;
  function enableWidgetDrag() {
    var grid = $("widgets-grid");
    if (!grid || !state.edit) return;
    var ws = grid.querySelectorAll("[data-wid]"), i;
    for (i = 0; i < ws.length; i++) {
      (function (el) {
        el.onmousedown = function (e) {
          if (!state.edit) return true;
          wDrag = el.getAttribute("data-wid");
          if (e.preventDefault) e.preventDefault();
          return false;
        };
        el.ontouchstart = el.onmousedown;
      })(ws[i]);
    }
  }
  function wDragMove(e) {
    if (!wDrag) return;
    var p = gPoint(e), el = document.elementFromPoint(p.x, p.y);
    while (el && !(el.getAttribute && el.getAttribute("data-wid"))) el = el.parentNode;
    if (!el || !el.getAttribute) return;
    var over = el.getAttribute("data-wid");
    if (!over || over === wDrag) return;
    var from = -1, to = -1, i;
    for (i = 0; i < state.widgets.length; i++) {
      if (state.widgets[i].id === wDrag) from = i;
      if (state.widgets[i].id === over) to = i;
    }
    if (from < 0 || to < 0) return;
    var moved = state.widgets.splice(from, 1)[0];
    state.widgets.splice(to, 0, moved);
    wDrag = moved.id;
    renderWidgets();
  }
  function wDragEnd() {
    if (!wDrag) return;
    wDrag = null;
    widgetsSave();
  }
  function updateWidgetClocks() {
    var els = document.querySelectorAll("[data-wtime]"), i, d, hh;
    if (!els.length) return;
    d = new Date(); hh = d.getHours() % 12; if (hh === 0) hh = 12;
    for (i = 0; i < els.length; i++) {
      els[i].textContent = hh + ":" + pad2(d.getMinutes()) + (d.getHours() >= 12 ? " PM" : " AM");
    }
  }

  /* ---------------- chrome (status bar, CC values) ---------------- */
  function renderChrome() {
    var h = state.data.host || {};
    function gauge(barId, valId, pct) {
      var b = $(barId), v = $(valId);
      if (v) v.innerHTML = Math.round(pct) + "%";
      if (b) { b.style.width = Math.min(100, Math.round(pct)) + "%"; b.className = barClass(pct); }
    }
    var connV = $("cc-conn-v");
    if (connV) connV.innerHTML = state.online ? "online" : "offline";
    var loadV = $("cc-load-v");
    if (loadV && h.load1 !== undefined) loadV.innerHTML = h.load1 + " / " + h.load5;
    var loadBar = $("cc-load-bar");
    if (loadBar && h.load1 !== undefined) {
      var lp = Math.min(100, Math.round(num(h.load1, 0) / 8 * 100));
      loadBar.style.width = lp + "%"; loadBar.className = barClass(lp);
    }
    if (h.mem_pct !== undefined) gauge("cc-mem-bar", "cc-mem-v", num(h.mem_pct, 0));
    if (h.disk_pct !== undefined) gauge("cc-disk-bar", "cc-disk-v", num(h.disk_pct, 0));
    var focusV = $("cc-dnd-v"); if (focusV) focusV.innerHTML = state.focus || "off";
    var thV = $("cc-theme-v"); if (thV) thV.innerHTML = state.theme === "ios9" ? "iOS 9" : "iOS 26.7.2";
    var lkV = $("cc-look-v"); if (lkV) lkV.innerHTML = state.look;
    var thTile = $("cc-theme"), lkTile = $("cc-look"), dndTile = $("cc-dnd"), cnTile = $("cc-conn");
    if (dndTile) dndTile.className = "cc-tile" + (state.focus && state.focus !== "off" ? " on" : "");
    if (thTile) thTile.className = "cc-tile" + (state.theme === "ios26" ? " on" : "");
    if (lkTile) lkTile.className = "cc-tile" + (state.look === "light" ? " on" : "");
    if (dndTile) dndTile.className = "cc-tile" + (state.dnd ? " on" : "");
    if (cnTile) cnTile.className = "cc-tile" + (state.online ? " on" : "");
  }

  /* ---------------- panels ---------------- */
  function renderDataset(key, bodyId, stampId, title) {
    var ds = state.data.datasets[key], host = $(bodyId);
    if (!host) return;
    if (!ds) { host.innerHTML = '<div class="empty">No data yet — waiting for the next poll.</div>'; return; }
    var rows = flatten(ds, "", [], 0);
    host.innerHTML = '<div class="card"><h3>' + esc(title) + "</h3><div class=\"kv\">" +
                     kvHtml(rows) + "</div></div>";
    var st = $(stampId);
    if (st) st.innerHTML = state.online ? "live" : "offline";
  }
  function renderAlerts() {
    var host = $("alerts-body");
    if (!host) return;
    if (!state.alerts.length) { host.innerHTML = '<div class="empty">No open alerts.</div>'; return; }
    var html = "", i, a, sev, cls;
    for (i = 0; i < state.alerts.length; i++) {
      a = state.alerts[i] || {};
      sev = String(a.severity || a.priority || "info").toLowerCase();
      cls = sev.indexOf("crit") >= 0 || sev.indexOf("high") >= 0 ? "bad"
          : sev.indexOf("warn") >= 0 || sev.indexOf("med") >= 0 ? "warn" : "ok";
      html += '<div class="card"><h3><span class="pill ' + cls + '">' + esc(sev) + "</span>" +
              esc(fmtTime(a.created_at || a.timestamp || a.detected_at)) + "</h3>" +
              '<div class="kv"><b>' + esc(a.title || a.message || "Alert") + "</b><br>" +
              esc(a.description || a.detail || "") + "</div></div>";
    }
    host.innerHTML = html;
    var st = $("alerts-stamp"); if (st) st.innerHTML = state.alerts.length + " open";
    renderNotes();
  }
  function renderStatusPage() {
    var host = $("status-body"), h = state.data.host;
    if (!host || !h) return;
    var rows = [
      { k: "Host", v: h.host }, { k: "Uptime", v: h.uptime_human },
      { k: "Load 1m", v: h.load1 }, { k: "Load 5m", v: h.load5 },
      { k: "Memory", v: h.mem_used_mb + " / " + h.mem_total_mb + " MB (" + h.mem_pct + "%)" },
      { k: "Disk", v: h.disk_free_gb + " GB free of " + h.disk_total_gb + " GB" }
    ];
    host.innerHTML = '<div class="card"><h3>Host</h3><div class="kv">' + kvHtml(rows) + "</div></div>" +
      '<div class="card"><h3>Memory</h3><div class="bar"><i class="' + barClass(num(h.mem_pct, 0)) +
      '" style="width:' + Math.round(num(h.mem_pct, 0)) + '%"></i></div></div>' +
      '<div class="card"><h3>Disk</h3><div class="bar"><i class="' + barClass(num(h.disk_pct, 0)) +
      '" style="width:' + Math.round(num(h.disk_pct, 0)) + '%"></i></div></div>';
    var st = $("status-stamp"); if (st) st.innerHTML = state.online ? "live" : "offline";
  }
  function noteId(a, i) {
    return String((a.severity || a.level || "info")).toLowerCase() + "|" +
           String(a.title || a.message || a.s || ("note" + i));
  }
  function noteSev(a) {
    var v = String(a.severity || a.level || "info").toLowerCase();
    if (v.indexOf("crit") === 0 || v === "high" || v === "severe") return "critical";
    if (v.indexOf("warn") === 0 || v === "medium") return "warning";
    return "info";
  }
  function isRead(id) { return state.readAlerts.indexOf(id) >= 0; }
  function showBanner(text, sev) {
    var b = $("banner");
    if (!b) return;
    b.className = "banner show " + (sev || "info");
    b.innerHTML = '<b>' + esc(sev || "alert") + "</b>" + esc(text);
    if (showBanner.timer) clearTimeout(showBanner.timer);
    showBanner.timer = setTimeout(function () { b.className = "banner"; }, 4200);
  }
  function renderNotes() {
    var host = $("nc-body");
    if (!host) return;
    var list = state.notes.length ? state.notes : state.alerts, i, a, id, seq, html = "";
    if (!list.length) { host.innerHTML = '<div class="empty">No notifications</div>'; return; }
    var groups = { critical: [], warning: [], info: [] }, keys = ["critical", "warning", "info"];
    for (i = 0; i < list.length && i < 20; i++) {
      a = list[i] || {};
      groups[noteSev(a)].push(a);
    }
    for (var g = 0; g < keys.length; g++) {
      seq = groups[keys[g]];
      if (!seq.length) continue;
      html += '<div class="nc-group"><span>' + keys[g] + '</span><em>' + seq.length + "</em></div>";
      for (i = 0; i < seq.length; i++) {
        a = seq[i]; id = noteId(a, i);
        html += '<div class="note ' + keys[g] + (isRead(id) ? " read" : " unread") + '" data-note="' + esc(id) + '">' +
          (isRead(id) ? "" : '<b class="dot"></b>') +
          '<div class="t">' + esc(fmtTime(a.created_at || a.timestamp)) + "</div>" +
          '<div class="s">' + esc(a.title || a.message || a.s || "Notification") + "</div>" +
          '<div class="b">' + esc(a.description || a.detail || a.severity || a.b || "") + "</div></div>";
      }
    }
    host.innerHTML = html;
    var notes = host.getElementsByClassName("note"), j;
    for (j = 0; j < notes.length; j++) {
      notes[j].onclick = (function (el) {
        return function () {
          var nid = el.getAttribute("data-note");
          if (nid && state.readAlerts.indexOf(nid) < 0) {
            state.readAlerts.push(nid);
            store("gg_read", state.readAlerts.join(","));
            renderNotes();
          }
          return false;
        };
      })(notes[j]);
    }
  }
  function renderSplit() {
    var ds = state.data.datasets || {};
    var g = $("split-gids"), i2 = $("split-infra");
    if (g && ds.gids_summary) g.innerHTML = kvHtml(flatten(ds.gids_summary, "", [], 0));
    if (i2 && ds.collectors) i2.innerHTML = kvHtml(flatten(ds.collectors, "", [], 0));
  }

  /* ---------------- settings ---------------- */
  function renderSettings() {
    var host = $("settings-body");
    if (!host) return;
    var u = state.user || {};
    var accHtml = "", ak;
    var dockHtml = "", di, dockList = ["home"], dockCur = dockIds();
    for (di = 0; di < APPS.length; di++) dockList.push(APPS[di].id);
    for (di = 0; di < dockList.length; di++) {
      var did = dockList[di], dname = (did === "home") ? "Home" : (findApp(did) ? findApp(did).name : did);
      var inDock = dockCur.indexOf(did) >= 0;
      dockHtml += '<a href="#" class="theme-opt' + (inDock ? " sel" : "") + '" data-dock-toggle="' + did + '">' +
                  esc(dname) + "<small>" + (inDock ? "in dock" : "add") + "</small></a>";
    }
    for (ak in ACCENTS) {
      if (!ACCENTS.hasOwnProperty(ak)) continue;
      accHtml += '<a href="#" class="theme-opt acc-opt' + (state.accent === ak ? " sel" : "") +
                 '" data-accent="' + ak + '"><i style="background:' + ACCENTS[ak].base + '"></i>' +
                 ak.charAt(0).toUpperCase() + ak.substring(1) + "</a>";
    }
    host.innerHTML =
      '<div class="card"><h3>Dock</h3>' +
        '<div class="theme-row">' + dockPrefsHtml() + "</div>" +
        '<div style="font-size:10px;color:#7d8794;margin-top:6px">Position, auto-hide, magnification and size apply immediately. Web apps can be pinned with a long-press in the App Library.</div>' +
      "</div>" +
      '<div class="card"><h3>Data &amp; backup</h3>' +
        '<a href="#" class="theme-opt" id="data-export" style="width:47%">Export backup</a>' +
        '<a href="#" class="theme-opt" id="data-clear" style="width:47%;margin-right:0;color:#ff6b6b">Clear local data</a>' +
        '<textarea id="data-out" class="data-box" placeholder="Export appears here — select and copy"></textarea>' +
        '<textarea id="data-in" class="data-box" placeholder="Paste a Liquid Legacy backup JSON here"></textarea>' +
        '<a href="#" class="theme-opt" id="data-import" style="width:47%;margin-top:6px">Import backup</a>' +
        '<a href="#" class="theme-opt" id="data-reset-personal" style="width:47%;margin-top:6px;margin-right:0">Reset personalisation</a>' +
        '<div style="font-size:10px;color:#7d8794;margin-top:6px">Includes notes, reminders, calendar, dock, widgets and appearance. Never includes your session or password.</div>' +
      "</div>" +
      '<div class="card" id="recycle-bin"><h3>Recycle Bin</h3>' +
        trashHtml() +
      "</div>" +
      '<div class="card"><h3>Web apps</h3>' +
        '<div class="wa-form">' +
          '<input id="wa-name" type="text" placeholder="Name" autocapitalize="words">' +
          '<input id="wa-url" type="url" placeholder="https://example.com" autocapitalize="none">' +
          '<select id="wa-cat">' + waCatOptions() + "</select>" +
          '<a href="#" class="theme-opt" id="wa-add">Add web app</a>' +
        "</div>" +
        '<div id="wa-list">' + waListHtml() + "</div>" +
        '<div style="font-size:10px;color:#7d8794">Only http(s) links. External sites open in a new tab; Liquid Legacy never embeds them or asks for their passwords.</div>' +
      "</div>" +
      '<div class="card"><h3>Theme</h3>' +
        '<div class="theme-row" style="margin-bottom:8px">' +
          '<a href="#" class="theme-opt" data-preset="glass">Liquid Glass</a>' +
          '<a href="#" class="theme-opt" data-preset="clear">Clear</a>' +
          '<a href="#" class="theme-opt" data-preset="tinted">Tinted</a>' +
          '<a href="#" class="theme-opt" data-preset="classic">iOS 9 Classic</a>' +
        "</div>" +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.theme === "ios26" ? " sel" : "") + '" data-theme="ios26">iOS 26.7.2<small>Liquid glass clone</small></a>' +
          '<a href="#" class="theme-opt' + (state.theme === "ios9" ? " sel" : "") + '" data-theme="ios9">iOS 9 Classic<small>2015 look</small></a>' +
        '</div>' +
      "</div>" +
      '<div class="card"><h3>Appearance</h3>' +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.appearance === "dark" ? " sel" : "") + '" data-appearance="dark">Dark<small>always</small></a>' +
          '<a href="#" class="theme-opt' + (state.appearance === "light" ? " sel" : "") + '" data-appearance="light">Light<small>always</small></a>' +
        '</div>' +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.appearance === "auto" ? " sel" : "") + '" data-appearance="auto">Automatic<small>follows system</small></a>' +
          '<a href="#" class="theme-opt" id="appearance-state"><small>effective</small>' + (effectiveLook()) + '</a>' +
        '</div>' +
      "</div>" +
      '<div class="card"><h3>Accent</h3>' +
        '<div class="theme-row acc-row">' + accHtml + "</div>" +
      "</div>" +
      '<div class="card"><h3>Materials &amp; Text</h3>' +
        '<div class="kv"><span class="k">Liquid Glass</span><b>' + state.glassMode + "</b></div>" +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.glassMode === "standard" ? " sel" : "") + '" data-glassmode="standard">Standard<small>regular fill</small></a>' +
          '<a href="#" class="theme-opt' + (state.glassMode === "clear" ? " sel" : "") + '" data-glassmode="clear">Clear<small>wallpaper-forward</small></a>' +
        '</div>' +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.glassMode === "tinted" ? " sel" : "") + '" data-glassmode="tinted">Tinted<small>accent-tinted</small></a>' +
          '<a href="#" class="theme-opt" id="glass-state"><small>effective</small>' + state.glassMode + '</a>' +
        '</div>' +
        '<div class="kv"><span class="k">Glass intensity</span><b>' + state.glass + "</b></div>" +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.glass === "subtle" ? " sel" : "") + '" data-glass="subtle">Subtle</a>' +
          '<a href="#" class="theme-opt' + (state.glass === "regular" ? " sel" : "") + '" data-glass="regular">Regular</a>' +
          '<a href="#" class="theme-opt' + (state.glass === "strong" ? " sel" : "") + '" data-glass="strong">Strong</a>' +
        '</div>' +
        '<div class="kv"><span class="k">Contrast</span></div>' +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.contrast === "normal" ? " sel" : "") + '" data-contrast="normal">Normal</a>' +
          '<a href="#" class="theme-opt' + (state.contrast === "high" ? " sel" : "") + '" data-contrast="high">High</a>' +
        '</div>' +
        '<div class="kv"><span class="k">Text size</span></div>' +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.textScale === "small" ? " sel" : "") + '" data-text="small">Small</a>' +
          '<a href="#" class="theme-opt' + (state.textScale === "regular" ? " sel" : "") + '" data-text="regular">Regular</a>' +
          '<a href="#" class="theme-opt' + (state.textScale === "large" ? " sel" : "") + '" data-text="large">Large</a>' +
        '</div>' +
        '<div class="kv"><span class="k">Density</span></div>' +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.density === "compact" ? " sel" : "") + '" data-density="compact">Compact</a>' +
          '<a href="#" class="theme-opt' + (state.density === "regular" ? " sel" : "") + '" data-density="regular">Regular</a>' +
          '<a href="#" class="theme-opt' + (state.density === "comfortable" ? " sel" : "") + '" data-density="comfortable">Comfort</a>' +
        '</div>' +
        '<div class="kv"><span class="k">Motion</span></div>' +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.motion === "full" ? " sel" : "") + '" data-motion="full">Full</a>' +
          '<a href="#" class="theme-opt' + (state.motion === "reduced" ? " sel" : "") + '" data-motion="reduced">Reduced</a>' +
        '</div>' +
        '<div style="font-size:10px;color:#7d8794">Clone only — an iPad 2 (A5, 32-bit) cannot run iOS 26; this reproduces its visual language.</div>' +
      "</div>" +
      '<div class="card"><h3>Home Screen</h3>' +
        '<div class="kv"><span class="k">Icon appearance</span><b>' + state.iconStyle + "</b></div>" +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.iconStyle === "default" ? " sel" : "") + '" data-iconstyle="default">Default<small>full colour</small></a>' +
          '<a href="#" class="theme-opt' + (state.iconStyle === "dark" ? " sel" : "") + '" data-iconstyle="dark">Dark<small>dimmed</small></a>' +
        '</div>' +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.iconStyle === "clear" ? " sel" : "") + '" data-iconstyle="clear">Clear<small>translucent</small></a>' +
          '<a href="#" class="theme-opt' + (state.iconStyle === "tinted" ? " sel" : "") + '" data-iconstyle="tinted">Tinted<small>monochrome</small></a>' +
        '</div>' +
        '<div class="kv"><span class="k">Wallpaper</span><b>' + state.homeWall + "</b></div>" +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.homeWall === "aurora" ? " sel" : "") + '" data-homewall="aurora">Aurora</a>' +
          '<a href="#" class="theme-opt' + (state.homeWall === "deep" ? " sel" : "") + '" data-homewall="deep">Deep</a>' +
        '</div>' +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.homeWall === "dawn" ? " sel" : "") + '" data-homewall="dawn">Dawn</a>' +
          '<a href="#" class="theme-opt' + (state.homeWall === "midnight" ? " sel" : "") + '" data-homewall="midnight">Midnight</a>' +
        '</div>' +
        '<div class="kv"><span class="k">Wallpaper brightness</span></div>' +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (state.homeBright === "low" ? " sel" : "") + '" data-bright="low">Low</a>' +
          '<a href="#" class="theme-opt' + (state.homeBright === "mid" ? " sel" : "") + '" data-bright="mid">Mid</a>' +
          '<a href="#" class="theme-opt' + (state.homeBright === "high" ? " sel" : "") + '" data-bright="high">High</a>' +
        '</div>' +
        '<div class="theme-row" style="margin-top:8px">' +
          '<a href="#" class="theme-opt' + (state.edit ? " sel" : "") + '" data-edit-toggle="1">' + (state.edit ? "Done" : "Edit layout") + '<small>drag · hide</small></a>' +
          '<a href="#" class="theme-opt" data-reset-layout="1">Reset<small>default order</small></a>' +
        '</div>' +
        '<div style="font-size:10px;color:#7d8794">Icon appearances are CSS-filter approximations, not alternate icon art.</div>' +
      "</div>" +
      '<div class="card"><h3>Dock</h3>' +
        '<div class="theme-row">' + dockHtml + "</div>" +
        '<div style="font-size:10px;color:#7d8794">Two to six apps. Changes apply immediately.</div>' +
      "</div>" +
      '<div class="card"><h3>Lock Screen</h3>' +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (LOCK.wall === "aurora" ? " sel" : "") + '" data-wall="aurora">Aurora<small>blue / magenta</small></a>' +
          '<a href="#" class="theme-opt' + (LOCK.wall === "deep" ? " sel" : "") + '" data-wall="deep">Deep<small>cyan depths</small></a>' +
        '</div>' +
        '<div class="theme-row">' +
          '<a href="#" class="theme-opt' + (LOCK.wall === "dawn" ? " sel" : "") + '" data-wall="dawn">Dawn<small>light wallpaper</small></a>' +
          '<a href="#" class="theme-opt" id="lock-now">Lock now<small>screen off</small></a>' +
        '</div>' +
        '<div style="font-size:10px;color:#7d8794">In-app Lock Screen — the real iOS Lock Screen cannot be replaced.</div>' +
      "</div>" +
      '<div class="card"><h3>Accessibility</h3><div class="kv">' +
        '<div><span class="k">AssistiveTouch</span><b>' + (AT.on ? "on" : "off") + "</b></div>" +
      "</div>" +
        '<div class="theme-row" style="margin-top:8px">' +
          '<a href="#" class="theme-opt' + (AT.on ? " sel" : "") + '" data-at-toggle="1">On<small>floating menu</small></a>' +
          '<a href="#" class="theme-opt' + (AT.on ? "" : " sel") + '" data-at-toggle="0">Off<small>hidden</small></a>' +
        "</div>" +
      "</div>" +
      '<div class="card"><h3>Notifications</h3><div class="kv">' +
        '<div><span class="k">Focus (DND)</span><b>' + (state.dnd ? "on — widgets still update" : "off") + "</b></div>" +
        '<div><span class="k">Open alerts</span><b>' + state.alerts.length + "</b></div>" +
      "</div></div>" +
      '<div class="card"><h3>Monitoring</h3><div class="kv">' +
        '<div><span class="k">Poll interval</span><b>' + (state.pollMs / 1000) + 's</b></div>' +
        '<div><span class="k">Transport</span><b>' + esc(location.protocol.replace(":", "")) + "</b></div>" +
      "</div>" +
        '<div class="theme-row" style="margin-top:8px">' +
          '<a href="#" class="theme-opt' + (state.pollMs === 5000 ? " sel" : "") + '" data-poll="5000">5s<small>fast</small></a>' +
          '<a href="#" class="theme-opt' + (state.pollMs === 10000 ? " sel" : "") + '" data-poll="10000">10s<small>default</small></a>' +
          '<a href="#" class="theme-opt' + (state.pollMs === 30000 ? " sel" : "") + '" data-poll="30000">30s<small>battery</small></a>' +
        "</div>" +
      "</div>" +
      '<div class="card"><h3>Session</h3><div class="kv">' +
        '<div><span class="k">Signed in as</span><b>' + esc(u.username || "—") + "</b></div>" +
        '<div><span class="k">Mode</span><b>read-only, audited</b></div>' +
        '<div><span class="k">Build</span><b>' + BUILD + "</b></div>" +
      "</div>" +
        '<div style="margin-top:10px"><a href="#" id="refresh-now" class="theme-opt" style="width:47%">Refresh now</a>' +
        '<a href="#/about" class="theme-opt" style="width:47%;margin-right:0">About</a></div>' +
        '<div class="theme-row" style="margin-top:8px"><a href="#" id="logout-link" class="theme-opt" style="width:47%;color:#ff6b6b">Sign out</a></div>' +
      "</div>";
    bindSettings();
    bindPresets();
    bindWebApps();
    bindDockPrefs();
    bindDataTools();
    renderAbout();
  }
  function waCatOptions() {
    var out = "", i;
    for (i = 0; i < LIB_CATS.length; i++) {
      if (LIB_CATS[i] === "Liquid Legacy") continue;
      out += '<option value="' + LIB_CATS[i] + '">' + LIB_CATS[i] + "</option>";
    }
    return out;
  }
  function trashHtml() {
    var tr = loadTrash(), h = "", i;
    if (!tr.length) return '<div class="empty" style="padding:8px 0">Recycle Bin is empty. Deleted web apps can be restored here.</div>';
    for (i = 0; i < tr.length; i++) {
      h += '<div class="wa-row"><b>' + esc(tr[i].app.name) + "</b><span>" + esc(tr[i].deletedAt || "") + "</span>" +
           '<a href="#" data-trash-restore="' + esc(tr[i].id) + '" style="margin-right:64px;color:#0a84ff">Restore</a>' +
           '<a href="#" data-trash-purge="' + esc(tr[i].id) + '">Delete</a></div>';
    }
    h += '<a href="#" class="theme-opt" id="trash-empty" style="margin-top:6px;color:#ff6b6b">Empty Recycle Bin</a>';
    return h;
  }

  function waListHtml() {
    var apps = loadCustomApps(), out = "", i;
    for (i = 0; i < apps.length; i++) {
      out += '<div class="wa-row"><b>' + esc(apps[i].name) + "</b><span>" + esc(apps[i].url) +
             '</span><a href="#" data-wa-edit="' + esc(apps[i].id) + '" style="margin-right:52px;color:#0a84ff">Edit</a>' +
             '<a href="#" data-wa-remove="' + esc(apps[i].id) + '">Recycle</a></div>';
    }
    return out || '<div class="empty" style="padding:8px 0">No custom web apps yet.</div>';
  }
  function applyPreset(name) {
    if (name === "classic") { state.theme = "ios9"; state.glass = "regular"; state.glassMode = "standard"; state.appearance = "dark"; }
    else if (name === "clear") { state.theme = "ios26"; state.glass = "clear"; state.glassMode = "clear"; }
    else if (name === "tinted") { state.theme = "ios26"; state.glassMode = "tinted"; }
    else { state.theme = "ios26"; state.glass = "regular"; state.glassMode = "standard"; }
    applyLook(); renderSettings();
    showBanner("Appearance preset: " + name, "info");
  }
  function bindPresets() {
    var els = document.querySelectorAll("[data-preset]"), i;
    for (i = 0; i < els.length; i++) {
      (function (el) {
        el.onclick = function (e) { e.preventDefault(); applyPreset(el.getAttribute("data-preset")); return false; };
      })(els[i]);
    }
  }
  function bindWebApps() {
    var add = $("wa-add");
    if (add) {
      add.onclick = function (e) {
        e.preventDefault();
        var name = String(($("wa-name") || {}).value || "").replace(/^\s+|\s+$/g, "");
        var url = String(($("wa-url") || {}).value || "").replace(/^\s+|\s+$/g, "");
        var cat = ($("wa-cat") || {}).value || "Utilities";
        if (!name) { showBanner("Name is required", "warning"); return false; }
        if (!/^https?:\/\/[^\s]+$/i.test(url)) { showBanner("URL must start with http:// or https://", "warning"); return false; }
        var apps = loadCustomApps(), k, updated = false;
        if (state.waEdit) {
          for (k = 0; k < apps.length; k++) {
            if (apps[k].id === state.waEdit) {
              apps[k].name = name; apps[k].url = url; apps[k].cat = cat; updated = true;
            }
          }
        }
        if (!updated) apps.push({ id: "web-" + new Date().getTime(), name: name, url: url, cat: cat });
        state.waEdit = null;
        saveCustomApps(apps);
        renderAppLibrary(); renderSettings();
        showBanner(name + (updated ? " updated" : " added to the library"), "info");
        return false;
      };
    }
    var edits = document.querySelectorAll("[data-wa-edit]"), e2;
    for (e2 = 0; e2 < edits.length; e2++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          var id = el.getAttribute("data-wa-edit"), apps = loadCustomApps(), k;
          for (k = 0; k < apps.length; k++) {
            if (apps[k].id === id) {
              $("wa-name").value = apps[k].name;
              $("wa-url").value = apps[k].url;
              $("wa-cat").value = apps[k].cat || "Utilities";
              state.waEdit = id;
              var btn = $("wa-add");
              if (btn) btn.textContent = "Update web app";
            }
          }
          return false;
        };
      })(edits[e2]);
    }
    var rem = document.querySelectorAll("[data-wa-remove]"), i;
    for (i = 0; i < rem.length; i++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          trashCustomApp(el.getAttribute("data-wa-remove"));
          return false;
        };
      })(rem[i]);
    }
  }
  function collectBackup() {
    var data = {}, i, k;
    for (i = 0; i < localStorage.length; i++) {
      k = localStorage.key(i);
      if (k && k.indexOf("gg_") === 0) data[k] = localStorage.getItem(k);
    }
    return { app: "golden-gate", version: BUILD, exportedAt: new Date().toISOString(), data: data };
  }
  function bindDataTools() {
    var ex = $("data-export"), im = $("data-import"), cl = $("data-clear"), rp = $("data-reset-personal");
    var trs = document.querySelectorAll("[data-trash-restore]"), ti;
    for (ti = 0; ti < trs.length; ti++) {
      (function (el) {
        el.onclick = function (e) { e.preventDefault(); restoreTrash(el.getAttribute("data-trash-restore")); return false; };
      })(trs[ti]);
    }
    var trp = document.querySelectorAll("[data-trash-purge]"), tp;
    for (tp = 0; tp < trp.length; tp++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          if (window.confirm("Delete permanently? This cannot be undone.")) purgeTrash(el.getAttribute("data-trash-purge"));
          return false;
        };
      })(trp[tp]);
    }
    if ($("trash-empty")) $("trash-empty").onclick = function (e) {
      e.preventDefault();
      if (window.confirm("Empty the Recycle Bin permanently?")) emptyTrash();
      return false;
    };
    if (rp) {
      rp.onclick = function (e) {
        e.preventDefault();
        if (!window.confirm("Reset appearance, Dock, widgets, dashboard and Home layout? Your notes, events, reminders and web apps are kept.")) return false;
        var keys = ["gg_theme","gg_appearance","gg_look","gg_accent","gg_glass","gg_glassmode","gg_contrast","gg_density",
                    "gg_text","gg_motion","gg_iconstyle","gg_home_wall","gg_home_bright","gg_focus","gg_order","gg_hidden",
                    "gg_dock","gg_dock_prefs","gg_widgets","gg_widget_order","gg_dash_sections","gg_lib_favs","gg_lib_recent"], i;
        for (i = 0; i < keys.length; i++) localStorage.removeItem(keys[i]);
        showBanner("Personalisation reset — reloading", "info");
        setTimeout(function () { location.reload(); }, 400);
        return false;
      };
    }
    if (ex) {
      ex.onclick = function (e) {
        e.preventDefault();
        var json = JSON.stringify(collectBackup(), null, 2);
        var out = $("data-out");
        if (out) { out.value = json; out.focus(); out.select && out.select(); }
        showBanner("Backup ready — " + json.length + " characters", "info");
        return false;
      };
    }
    if (im) {
      im.onclick = function (e) {
        e.preventDefault();
        var raw = String(($("data-in") || {}).value || "");
        var obj;
        try { obj = JSON.parse(raw); } catch (err) { showBanner("That is not valid JSON", "warning"); return false; }
        if (!obj || !obj.data || typeof obj.data !== "object") { showBanner("Missing data object in backup", "warning"); return false; }
        if (!window.confirm("Replace local Liquid Legacy data with this backup?")) return false;
        var k, n = 0;
        for (k in obj.data) {
          if (k.indexOf("gg_") === 0 && typeof obj.data[k] === "string") { localStorage.setItem(k, obj.data[k]); n++; }
        }
        showBanner("Imported " + n + " keys — reloading", "info");
        setTimeout(function () { location.reload(); }, 400);
        return false;
      };
    }
    if (cl) {
      cl.onclick = function (e) {
        e.preventDefault();
        if (!window.confirm("Delete ALL local Liquid Legacy data (notes, events, reminders, dock, appearance)?")) return false;
        var keys = [], i, k;
        for (i = 0; i < localStorage.length; i++) { k = localStorage.key(i); if (k && k.indexOf("gg_") === 0) keys.push(k); }
        for (i = 0; i < keys.length; i++) localStorage.removeItem(keys[i]);
        showBanner("Local data cleared — reloading", "info");
        setTimeout(function () { location.reload(); }, 400);
        return false;
      };
    }
  }
  function bindSettings() {
    var opts = document.getElementsByClassName("theme-opt"), i;
    for (i = 0; i < opts.length; i++) {
      (function (el) {
        var t = el.getAttribute("data-theme"), l = el.getAttribute("data-look"), p = el.getAttribute("data-poll");
        var ap = el.getAttribute("data-appearance"), ac = el.getAttribute("data-accent"),
            gl = el.getAttribute("data-glass"), ct = el.getAttribute("data-contrast"),
            dn = el.getAttribute("data-density"), tx = el.getAttribute("data-text"),
            mo = el.getAttribute("data-motion"), gmm = el.getAttribute("data-glassmode"),
            istyle = el.getAttribute("data-iconstyle"), hwall = el.getAttribute("data-homewall"),
            hb = el.getAttribute("data-bright"), ed = el.getAttribute("data-edit-toggle"),
            rst = el.getAttribute("data-reset-layout"), dk = el.getAttribute("data-dock-toggle");
        if (t) el.onclick = function (e) { e.preventDefault(); setTheme(t); return false; };
        else if (ap) el.onclick = function (e) { e.preventDefault(); setAppearance(ap); return false; };
        else if (ac) el.onclick = function (e) { e.preventDefault(); setAccent(ac); return false; };
        else if (gl) el.onclick = function (e) { e.preventDefault(); setGlass(gl); return false; };
        else if (ct) el.onclick = function (e) { e.preventDefault(); setContrast(ct); return false; };
        else if (dn) el.onclick = function (e) { e.preventDefault(); setDensity(dn); return false; };
        else if (tx) el.onclick = function (e) { e.preventDefault(); setTextScale(tx); return false; };
        else if (gmm) el.onclick = function (e) { e.preventDefault(); setGlassMode(gmm); return false; };
        else if (istyle) el.onclick = function (e) { e.preventDefault(); setIconStyle(istyle); return false; };
        else if (hwall) el.onclick = function (e) { e.preventDefault(); setHomeWall(hwall); return false; };
        else if (hb) el.onclick = function (e) { e.preventDefault(); setHomeBright(hb); return false; };
        else if (ed) el.onclick = function (e) { e.preventDefault(); setEdit(!state.edit); return false; };
        else if (dk) el.onclick = function (e) { e.preventDefault(); toggleDockApp(dk); return false; };
        else if (rst) el.onclick = function (e) {
          e.preventDefault();
          state.order = []; state.hidden = []; state.edit = false;
          store("gg_order", ""); store("gg_hidden", ""); store("gg_hidden", "");
          applyLook(); renderHome(); renderSettings();
          return false;
        };
        else if (mo) el.onclick = function (e) { e.preventDefault(); setMotion(mo); return false; };
        else if (l) el.onclick = function (e) { e.preventDefault(); setLook(l); return false; };
        else if (p) el.onclick = function (e) {
          e.preventDefault();
          state.pollMs = parseInt(p, 10) || 10000;
          store("gg_poll", String(state.pollMs));
          scheduleNext(300);
          renderSettings();
          return false;
        };
      })(opts[i]);
    }
    var ats = document.getElementsByClassName("theme-opt"), ai;
    for (ai = 0; ai < ats.length; ai++) {
      (function (el) {
        var v = el.getAttribute("data-at-toggle");
        if (v === null) return;
        el.onclick = function (e) {
          e.preventDefault();
          AT.on = (v === "1");
          atStore(); atApply(); renderSettings();
          return false;
        };
      })(ats[ai]);
    }
    var wls = document.getElementsByClassName("theme-opt"), wi;
    for (wi = 0; wi < wls.length; wi++) {
      (function (el) {
        var wv = el.getAttribute("data-wall");
        if (!wv) return;
        el.onclick = function (e) {
          e.preventDefault();
          LOCK.wall = wv; store("gg_lock_wall", wv); renderLock(); renderSettings();
          return false;
        };
      })(wls[wi]);
    }
    var ln = $("lock-now");
    if (ln) ln.onclick = function (e) { e.preventDefault(); lock(); return false; };
    var rn = $("refresh-now");
    if (rn) rn.onclick = function (e) { e.preventDefault(); pollOnce(); return false; };
    var lo = $("logout-link");
    if (lo) lo.onclick = function (e) { e.preventDefault(); logout(); return false; };
  }
  function renderAbout() {
    var ab = $("about-body");
    if (!ab) return;
    ab.innerHTML = '<div class="card"><h3>Liquid Legacy</h3><div class="kv">' +
      '<div><span class="k">Experience</span><b>iPadOS 26.7.2 clone</b></div>' +
      '<div><span class="k">Device</span><b>iPad 2 (A1395) · iOS 9.3.5 · 1024×768</b></div>' +
      '<div><span class="k">Frontend</span><b>ES5 · no modules · no service workers</b></div>' +
      '<div><span class="k">Backend</span><b>/api/legacy/v1 · read-only allowlist</b></div>' +
      '<div><span class="k">Actions</span><b>audited · no shell execution</b></div>' +
      '<div><span class="k">Build</span><b>' + BUILD + "</b></div>" +
      "</div></div>" +
      '<div class="card"><h3>Why a clone?</h3><div class="kv">' +
      "The Apple A5 in an iPad 2 is 32-bit and stopped at iOS 9.3.5 — iOS 26 cannot be installed " +
      "on this hardware, so this reproduces its interface on top of the iOS 9 engine.</div></div>";
  }

  /* ---------------- chat ---------------- */
  function appendMsg(role, text) {
    var log = $("chat-log");
    if (!log) return;
    var d = document.createElement("div");
    d.className = "msg " + role;
    d.innerHTML = esc(text).replace(/\n/g, "<br>");
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }
  function sendChat() {
    if (state.chatBusy) return;
    var input = $("chat-input"), msg = (input.value || "").replace(/^\s+|\s+$/g, "");
    if (!msg) return;
    appendMsg("me", msg); input.value = "";
    state.chatBusy = true;
    var st = $("chat-state"); if (st) st.innerHTML = "thinking…";
    xhr("POST", API + "/genie/chat", { message: msg }, function (err, status, data) {
      state.chatBusy = false;
      if (st) st.innerHTML = "";
      if (err || !data) {
        if (status === 401) logoutLocal();
        appendMsg("genie", status === 429 ? "Rate limit reached — wait a moment." : "Genie is unavailable right now.");
        return;
      }
      appendMsg("genie", data.reply || "(empty reply)");
    });
  }

  /* ---------------- overlays ---------------- */
  function closeOverlays() {
    var ids = ["cc", "nc", "spotlight", "ctx", "split", "expose"], i;
    for (i = 0; i < ids.length; i++) removeClass($(ids[i]), "open");
  }
  function toggleOverlay(id) {
    var el = $(id);
    if (!el) return;
    var open = (" " + el.className + " ").indexOf(" open ") >= 0;
    closeOverlays();
    if (!open) addClass(el, "open");
    if (!open && id === "spotlight") {
      var inp = $("spot-input");
      if (inp) { inp.value = ""; inp.focus(); }
      renderSpotlight("");
    }
    if (!open && id === "split") renderSplit();
    if (!open && id === "expose") wmExpose();
    if (open && id === "expose") wmExposeLive(false);
    if (id === "wgallery" && open) renderGallery();
    if (!open && id === "nc") renderNotes();
  }
  function openContext(appId, target) {
    var panel = $("ctx-panel"), app = findApp(appId);
    if (!panel) return;
    var fold = null, fi;
    for (fi = 0; fi < FOLDERS.length; fi++) if (FOLDERS[fi].name === appId) fold = FOLDERS[fi];
    if (fold) {                                  /* folder: list its apps, each opens */
      var fhtml = '<div class="ctx-title">' + esc(fold.name) + "</div>";
      for (fi = 0; fi < fold.apps.length; fi++) {
        var fa = findApp(fold.apps[fi]);
        if (!fa) continue;
        fhtml += '<div class="ctx-item" data-go="' + fa.target + '">' + esc(fa.name) + "</div>";
      }
      fhtml += '<div class="ctx-item" data-go="#/about">App info</div>';
      fhtml += '<div class="ctx-item danger" data-close="1">Cancel</div>';
      panel.innerHTML = fhtml;
      bindCtxItems(panel);
      addClass($("ctx"), "open");
      return;
    }
    var html = '<div class="ctx-title">' + esc(app ? app.name : appId) + "</div>";
    if (target) html += '<div class="ctx-item" data-go="' + target + '">Open</div>';
    var wapp = target ? String(target).replace("#/", "") : "";
    if (wapp && WIN_TITLES[wapp]) html += '<div class="ctx-item" data-wmopen="' + wapp + '">Open in Window</div>';
    html += '<div class="ctx-item" data-go="#/about">App info</div>';
    html += '<div class="ctx-item danger" data-close="1">Cancel</div>';
    panel.innerHTML = html;
    bindCtxItems(panel);
      addClass($("ctx"), "open");
    }
    function bindCtxItems(panel) {
      var items = panel.getElementsByClassName("ctx-item"), i;
      for (i = 0; i < items.length; i++) {
        (function (el) {
          el.onclick = function (e) {
            e.preventDefault();
            var go = el.getAttribute("data-go");
            var wopen = el.getAttribute("data-wmopen");
            toggleOverlay("ctx");
            if (wopen) wmOpen(wopen);
            else if (go) routeTo(go);
            return false;
          };
        })(items[i]);
      }
    }
  function renderSpotlight(q) {
    var host = $("spot-results");
    if (!host) return;
    var query = String(q || "").toLowerCase(), html = "", i, a, n = 0;
    for (i = 0; i < APPS.length; i++) {
      a = APPS[i];
      if (query && a.name.toLowerCase().indexOf(query) < 0 && a.cat.toLowerCase().indexOf(query) < 0) continue;
      html += '<div class="spot-row" data-target="' + a.target + '"><img src="' + a.icon + '" alt="">' +
              esc(a.name) + "<small>" + esc(a.cat) + "</small></div>";
      n++;
    }
    var h = state.data.host;
    if (h && h.host && (!query || "host status memory disk".indexOf(query) >= 0 || h.host.toLowerCase().indexOf(query) >= 0)) {
      html += '<div class="spot-row" data-target="#/status"><img src="assets/icon-status.png" alt="">' +
              "Host Status<small>" + esc(h.host) + " · load " + esc(h.load1) + "</small></div>";
      n++;
    }
    var all = registryEntries(), k, ent, inApps;
    for (k = 0; k < all.length; k++) {
      ent = all[k];
      if (ent.kind === "builtin") continue;
      if (query && ent.name.toLowerCase().indexOf(query) < 0 && ent.cat.toLowerCase().indexOf(query) < 0) continue;
      html += '<div class="spot-row" data-app="' + ent.id + '"><span class="spot-mono">' +
              esc(libMonogram(ent.name)) + "</span>" + esc(ent.name) + "<small>" + esc(ent.cat) +
              (ent.kind === "custom" ? " · custom" : " · web") + "</small></div>";
      n++;
    }
    if (!n) html = '<div class="empty">No results</div>';
    host.innerHTML = html;
    var rows = host.getElementsByClassName("spot-row"), j;
    for (j = 0; j < rows.length; j++) {
      (function (el) {
        var appId = el.getAttribute("data-app");
        if (appId) {
          el.onclick = function () { toggleOverlay("spotlight"); launchEntry(registryFind(appId)); };
          return;
        }
        el.onclick = function () { toggleOverlay("spotlight"); routeTo(el.getAttribute("data-target")); };
      })(rows[j]);
    }
  }

  function goHome() {
    closeOverlays();
    setPage(0);
    routeTo("#/home");
    location.hash = "#/home";
  }

  /* ---------------- Lock Screen ---------------- */
  var WALLS = {
    aurora: { cls: "wall-aurora", light: false, portraitClock: "cl-top",    landscapeClock: "cl-left" },
    deep:   { cls: "wall-deep",   light: false, portraitClock: "cl-top",    landscapeClock: "cl-center" },
    dawn:   { cls: "wall-dawn",   light: true,  portraitClock: "cl-center", landscapeClock: "cl-center" }
  };
  var LOCK = { locked: true, wall: "aurora" };

  function lockClockText() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : m);
  }
  function renderLock() {
    var w = WALLS[LOCK.wall] || WALLS.aurora;
    var wall = $("lock-wall"), lk = $("lock"), content = $("lock-content");

    if (wall) wall.className = "lock-wall " + w.cls;
    if (lk) lk.className = "screen lock-screen" + (w.light ? " light-wall" : "");
    if (content) {
      var portrait = window.innerHeight > window.innerWidth;
      content.className = "lock-content " + (portrait ? w.portraitClock : w.landscapeClock);
    }

    var clock = $("lock-clock");
    if (clock) clock.innerHTML = lockClockText();

    var date = $("lock-date"), d = new Date();
    var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    var months = ["January","February","March","April","May","June","July","August",
                  "September","October","November","December"];
    if (date) date.innerHTML = days[d.getDay()] + ", " + months[d.getMonth()] + " " + d.getDate();

    var sub = $("lock-sub"), h = state.data.host;
    if (sub) {
      sub.innerHTML = h && h.host ? (esc(h.host) + "  ·  load " + esc(h.load1) + "  ·  mem " + esc(h.mem_pct) + "%")
                                  : "Liquid Legacy";
    }

    var notes = $("lock-notes"), html = "", i, a, list = state.alerts;
    for (i = 0; i < list.length && i < 3; i++) {
      a = list[i] || {};
      html += '<div class="lock-note"><div class="t">' + esc(fmtTime(a.created_at || a.timestamp)) +
              '</div><div class="s">' + esc(a.title || a.message || "Alert") + '</div><div class="b">' +
              esc(a.severity || a.description || "") + "</div></div>";
    }
    if (list.length > 3) html += '<div class="lock-note"><div class="s">' + (list.length - 3) + " more notifications</div></div>";
    if (notes) notes.innerHTML = html;
  }
  function showLock() {
    var screens = document.getElementsByClassName("screen"), i;
    for (i = 0; i < screens.length; i++) {
      if (screens[i].parentNode && screens[i].parentNode.className &&
          String(screens[i].parentNode.className).indexOf("win-body") >= 0) continue;
      removeClass(screens[i], "active");
      screens[i].style.display = "none";
    }
    var lk = $("lock");
    if (lk) { addClass(lk, "active"); lk.style.display = "block"; }
    renderLock();
  }
  function lock() {
    LOCK.locked = true;
    showLock();
    closeOverlays();
  }
  function unlock() {
    if (!LOCK.locked) return;
    LOCK.locked = false;
    var lk = $("lock"), content = $("lock-content"), wall = $("lock-wall");
    addClass(lk, "unlocking");
    if (content) content.style.transform = "translateY(-60px)";
    if (wall) wall.style.transform = "translateY(-20px)";
    setTimeout(function () {
      removeClass(lk, "unlocking");
      lk.style.display = "none";
      if (content) content.style.transform = "";
      if (wall) wall.style.transform = "";
      if (state.user) { loginLocal(state.user); }
      else { logoutLocal(); }
    }, 420);
  }
  function bindLock() {
    var lk = $("lock");
    if (!lk) return;
    var startY = 0, dy = 0, dragging = false;

    function begin(y) { dragging = true; startY = y; dy = 0; }
    function move(y) {
      if (!dragging) return;
      dy = y - startY;
      if (dy > 0) dy = dy * 0.25;                       // resist downward drag
      var content = $("lock-content"), wall = $("lock-wall");
      if (content) content.style.transform = "translateY(" + Math.round(dy * 0.7) + "px)";
      if (wall) wall.style.transform = "translateY(" + Math.round(dy * 0.25) + "px)";
    }
    function end() {
      if (!dragging) return;
      dragging = false;
      if (dy < -70) { unlock(); return; }
      var content = $("lock-content"), wall = $("lock-wall");
      if (content) content.style.transform = "";
      if (wall) wall.style.transform = "";
    }
    lk.ontouchstart = function (e) { begin(e.touches[0].clientY); };
    lk.ontouchmove = function (e) { move(e.touches[0].clientY); if (e.cancelable) e.preventDefault(); };
    lk.ontouchend = function () { end(); };
    lk.onmousedown = function (e) {
      begin(e.clientY);
      var mm = function (ev) { move(ev.clientY); };
      var mu = function () {
        document.removeEventListener("mousemove", mm, false);
        document.removeEventListener("mouseup", mu, false);
        end();
      };
      document.addEventListener("mousemove", mm, false);
      document.addEventListener("mouseup", mu, false);
    };
    var hint = $("lock-hint");
    if (hint) {
      hint.style.cursor = "pointer";
      hint.onclick = function () { unlock(); };
    }
    // adaptive clock: re-evaluate placement on rotation
    window.addEventListener("resize", function () { if (LOCK.locked) renderLock(); }, false);
  }

  /* ---------------- AssistiveTouch ---------------- */
  var AT = { on: true, x: 0, y: 0, drag: false, moved: false, startX: 0, startY: 0, ox: 0, oy: 0, ready: false };

  function atStore() {
    store("gg_at", AT.on ? "1" : "0");
    store("gg_at_pos", Math.round(AT.x) + "x" + Math.round(AT.y));
  }
  function atApply() {
    var b = $("at-button");
    if (!b) return;
    if (!AT.on) { b.style.display = "none"; return; }
    b.style.display = "block";
    atPlace(AT.x, AT.y);
  }
  function atPlace(x, y) {
    var b = $("at-button");
    if (!b) return;
    var w = window.innerWidth, h = window.innerHeight, size = 54;
    if (x < 0 || x > w - size) x = w - size - 18;
    if (y < 28 || y > h - size - 8) y = h - size - 112;
    AT.x = x; AT.y = y;
    b.style.left = Math.round(x) + "px";
    b.style.top = Math.round(y) + "px";
    b.style.right = "auto";
    b.style.bottom = "auto";
  }
  function atInitPosition() {
    var saved = load("gg_at_pos", "");
    var m = saved.match(/^(\d+)x(\d+)$/);
    var w = window.innerWidth, h = window.innerHeight;
    if (m) { atPlace(parseInt(m[1], 10), parseInt(m[2], 10)); return; }
    atPlace(w - 18 - 54, h - 112 - 54);
  }
  function atOpen() { addClass($("at-menu"), "open"); }
  function atClose() { removeClass($("at-menu"), "open"); }
  function atDispatch(action) {
    atClose();
    if (action === "home") goHome();
    else if (action === "cc") { toggleOverlay("cc"); renderChrome(); }
    else if (action === "nc") toggleOverlay("nc");
    else if (action === "search") toggleOverlay("spotlight");
    else if (action === "split") toggleOverlay("split");
    else if (action === "settings") routeTo("#/settings");
    else if (action === "appear") setLook(state.look === "dark" ? "light" : "dark");
    else if (action === "theme") setTheme(state.theme === "ios26" ? "ios9" : "ios26");
    else if (action === "lock") lock();
    else if (action === "refresh") { pollOnce(); }
  }
  function atBind() {
    var b = $("at-button");
    if (!b) return;

    function down(px, py) {
      AT.drag = true; AT.moved = false;
      AT.startX = px; AT.startY = py; AT.ox = AT.x; AT.oy = AT.y;
      addClass(b, "dragging");
    }
    function move(px, py) {
      if (!AT.drag) return;
      var dx = px - AT.startX, dy = py - AT.startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) AT.moved = true;
      if (AT.moved) atPlace(AT.ox + dx, AT.oy + dy);
    }
    function up() {
      if (!AT.drag) return;
      AT.drag = false;
      removeClass(b, "dragging");
      if (AT.moved) {
        // snap to the nearest horizontal edge, like iOS AssistiveTouch
        var w = window.innerWidth;
        var targetX = (AT.x + 27 < w / 2) ? 14 : (w - 54 - 14);
        atPlace(targetX, AT.y);
        atStore();
      }
    }

    b.ontouchstart = function (e) { var t = e.touches[0]; down(t.clientX, t.clientY); };
    b.ontouchmove = function (e) {
      var t = e.touches[0]; move(t.clientX, t.clientY);
      if (AT.moved && e.cancelable) e.preventDefault();
    };
    b.ontouchend = function (e) {
      var wasMoved = AT.moved; up();
      if (!wasMoved) { e.preventDefault(); atOpen(); }
    };
    b.onmousedown = function (e) {
      down(e.clientX, e.clientY);
      var mm = function (ev) { move(ev.clientX, ev.clientY); };
      var mu = function () {
        document.removeEventListener("mousemove", mm, false);
        document.removeEventListener("mouseup", mu, false);
        var wasMoved = AT.moved; up();
        if (!wasMoved) atOpen();
      };
      document.addEventListener("mousemove", mm, false);
      document.addEventListener("mouseup", mu, false);
      e.preventDefault();
    };
    b.onkeydown = function (e) {
      var k = e.keyCode || e.which;
      if (k === 13 || k === 32) { e.preventDefault(); atOpen(); }   // Enter / Space
    };

    var items = document.getElementsByClassName("at-item"), i;
    for (i = 0; i < items.length; i++) {
      (function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          atDispatch(el.getAttribute("data-at"));
          return false;
        };
      })(items[i]);
    }
    var close = $("at-close");
    if (close) close.onclick = function () { atClose(); return false; };
    var menu = $("at-menu");
    if (menu) menu.onclick = function (e) { if (e.target === menu) atClose(); };

    window.addEventListener("resize", function () { atPlace(AT.x, AT.y); }, false);
  }

  /* ---------------- routing ---------------- */
  function setPage(n) {
    if (n < 0) n = 0;
    var maxPage = document.getElementsByClassName("page").length - 1;
    if (n > maxPage) n = maxPage;
    state.page = n;
    var pages = document.getElementsByClassName("page"), i;
    for (i = 0; i < pages.length; i++) {
      if (i === n) { addClass(pages[i], "active"); pages[i].style.display = "block"; }
      else { removeClass(pages[i], "active"); pages[i].style.display = "none"; }
    }
    var dots = document.getElementsByClassName("dot");
    for (i = 0; i < dots.length; i++) {
      if (i === n) addClass(dots[i], "active"); else removeClass(dots[i], "active");
    }
    if (n === 1) renderWidgets();
    if (n === 2) renderAppLibrary();
    if (n === 3) renderDashboard();
  }
  function routeTo(hash) {
    var name = String(hash || "#/home").replace("#/", "") || "home";
    if (typeof wmFind === "function") {
      var ww = wmFind(name);
      if (ww) { if (ww.state === "min") wmRestore(name); wmFocus(name); return; }
    }
    state.route = "#/" + name;
    if (location.hash !== state.route) { location.hash = state.route; }
    closeOverlays();
    var screens = document.getElementsByClassName("screen"), i;
    for (i = 0; i < screens.length; i++) {
      removeClass(screens[i], "active");
      screens[i].style.display = "none";
    }
    var target = $(name) || $("home");
    addClass(target, "active");
    target.style.display = "block";
    if (name === "home") setPage(state.page || 0);
    if (name === "gids") renderDataset("gids_summary", "gids-body", "gids-stamp", "AETG posture");
    if (name === "infra") renderDataset("collectors", "infra-body", "infra-stamp", "Collectors");
    if (name === "alerts") renderAlerts();
    if (name === "status") renderStatusPage();
    if (name === "settings") renderSettings();
    if (name === "about") renderAbout();
    if (name === "calendar") renderCalendar();
    if (name === "notes") renderNotesApp();
    if (name === "reminders") renderReminders();
    if (name === "clock") renderClock();
    if (name === "calculator") renderCalculator();
    if (name === "settings" || name === "about") renderAbout();
  }

  /* ===================== window manager (Phase 7) =====================
     One engine for every app: it moves the existing .screen element into a
     window frame, so renderers, polling and state are reused unchanged.
     Windows are session-only; app state and scroll positions are preserved
     because the DOM node is moved, not rebuilt. */
  var WIN_TITLES = { gids: "GIDS", infra: "Infrastructure", alerts: "Alerts",
                     status: "Host Status", chat: "Genie", settings: "Settings", about: "About",
                     calendar: "Calendar", notes: "Notes", reminders: "Reminders",
                     clock: "Clock", calculator: "Calculator" };
  var WM = { z: 120, wins: [] };

  function wmRefresh() {
    for (var i = 0; i < WM.wins.length; i++) {
      var app = WM.wins[i].app;
      if (app === "gids") renderDataset("gids_summary", "gids-body", "gids-stamp", "AETG posture");
      else if (app === "infra") renderDataset("collectors", "infra-body", "infra-stamp", "Collectors");
      else if (app === "alerts") renderAlerts();
      else if (app === "status") renderStatusPage();
      else if (app === "settings") renderSettings();
      else if (app === "about") renderAbout();
      else if (app === "calendar") renderCalendar();
      else if (app === "notes") renderNotesApp();
      else if (app === "reminders") renderReminders();
      else if (app === "clock") renderClock();
      else if (app === "calculator") renderCalculator();
    }
  }
  function wmFind(app) {
    for (var i = 0; i < WM.wins.length; i++) if (WM.wins[i].app === app) return WM.wins[i];
    return null;
  }
  function wmViewport() {
    var w = window.innerWidth || 1024, h = window.innerHeight || 768;
    return { w: w, h: h, top: 30, bottom: 96 };
  }
  function wmClamp(r) {
    var v = wmViewport(), minW = 320, minH = 240;
    if (r.w < minW) r.w = minW;
    if (r.h < minH) r.h = minH;
    if (r.w > v.w - 16) r.w = v.w - 16;
    if (r.h > v.h - v.top - 12) r.h = v.h - v.top - 12;
    if (r.x < 8) r.x = 8;
    if (r.y < v.top) r.y = v.top;
    if (r.x + r.w > v.w - 8) r.x = v.w - 8 - r.w;
    if (r.y + r.h > v.h - 12) r.y = v.h - 12 - r.h;
    return r;
  }
  function wmApply(win) {
    var r = wmClamp(win.rect);
    win.el.style.left = r.x + "px"; win.el.style.top = r.y + "px";
    win.el.style.width = r.w + "px"; win.el.style.height = r.h + "px";
    win.el.style.zIndex = win.z;
  }
  function wmTray() {
    var tray = $("wm-tray");
    if (!tray) {
      tray = document.createElement("div"); tray.id = "wm-tray";
      document.getElementById("app").appendChild(tray);
      refreshDock();
  }
    var mins = [], i;
    for (i = 0; i < WM.wins.length; i++) if (WM.wins[i].state === "min") mins.push(WM.wins[i]);
    tray.innerHTML = "";
    for (i = 0; i < mins.length; i++) {
      var chip = document.createElement("div");
      chip.className = "wm-chip"; chip.setAttribute("data-wm-restore", mins[i].app);
      chip.innerHTML = WIN_TITLES[mins[i].app] || mins[i].app;
      chip.onclick = (function (app) { return function () { wmRestore(app); }; })(mins[i].app);
      tray.appendChild(chip);
      refreshDock();
  }
    if (mins.length) addClass(tray, "on"); else removeClass(tray, "on");
    refreshDock();
  }
  function wmOpen(app, rect) {
    if (!WIN_TITLES[app]) return null;
    var existing = wmFind(app);
    if (existing) { if (existing.state === "min") wmRestore(app); wmFocus(app); return existing; }
    var screen = $(app);
    if (!screen) return null;
    var host = $("wm");
    if (!host) {
      host = document.createElement("div"); host.id = "wm";
      document.getElementById("app").appendChild(host);
    }
    var v = wmViewport();
    var n = WM.wins.length;
    var win = {
      app: app, id: "win-" + app, z: ++WM.z, state: "normal",
      rect: rect || { x: Math.min(48 + n * 28, v.w - 420), y: Math.min(v.top + 18 + n * 26, v.h - 320),
                      w: Math.min(720, v.w - 96), h: Math.min(520, v.h - 150) }
    };
    var el = document.createElement("div");
    el.className = "win"; el.id = "win-" + app;
    el.innerHTML =
      '<div class="win-bar">' +
        '<span class="win-actions">' +
          '<a href="#" class="wmin" data-wm="min">&#8211;</a>' +
          '<a href="#" class="wmax" data-wm="max">&#9744;</a>' +
          '<a href="#" class="wclose" data-wm="close">&#215;</a>' +
        '</span>' +
        '<span class="win-title">' + (WIN_TITLES[app] || app) + '</span>' +
      '</div>' +
      '<div class="win-body"></div>' +
      '<div class="win-resize"></div>';
    host.appendChild(el);
    var body = el.getElementsByClassName("win-body")[0];
    body.appendChild(screen);                       // move, do not rebuild
    addClass(screen, "in-window"); screen.style.display = "block";
    win.el = el;
    WM.wins.push(win);
      refreshDock();
    wmApply(win);
    wmBindWindow(win);
    if (app === "gids") renderDataset("gids_summary", "gids-body", "gids-stamp", "AETG posture");
    if (app === "infra") renderDataset("collectors", "infra-body", "infra-stamp", "Collectors");
    if (app === "alerts") renderAlerts();
    if (app === "status") renderStatusPage();
    if (app === "settings") renderSettings();
    if (app === "about") renderAbout();
    if (app === "calendar") renderCalendar();
    if (app === "notes") renderNotesApp();
    if (app === "reminders") renderReminders();
    if (app === "clock") renderClock();
    if (app === "calculator") renderCalculator();
    recordLaunch(app);
    renderChrome();
    return win;
  }
  function wmBindWindow(win) {
    var el = win.el;
    var acts = el.getElementsByClassName("win-actions")[0];
    acts.onclick = function (e) {
      var t = e.target || e.srcElement;
      var act = t.getAttribute && t.getAttribute("data-wm");
      if (!act) return true;
      e.preventDefault(); e.stopPropagation();
      if (act === "close") wmClose(win.app);
      else if (act === "min") wmMin(win.app);
      else if (act === "max") wmMax(win.app);
      return false;
    };
    var bar = el.getElementsByClassName("win-bar")[0];
    bar.onmousedown = function (e) { wmStartDrag(win, e); return false; };
    bar.ontouchstart = function (e) { wmStartDrag(win, e); return false; };
    el.onmousedown = function () { wmFocus(win.app); };
    el.onclick = function (e) {
      if ((" " + document.body.className + " ").indexOf(" exposing ") >= 0) {
        wmExposeLive(false); toggleOverlay("expose"); wmFocus(win.app);
        if (e && e.stopPropagation) e.stopPropagation();
      }
    };
    var grip = el.getElementsByClassName("win-resize")[0];
    grip.onmousedown = function (e) { wmStartResize(win, e); return false; };
    grip.ontouchstart = function (e) { wmStartResize(win, e); return false; };
  }
  function wmPoint(e) {
    var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    return { x: t.clientX || 0, y: t.clientY || 0 };
  }
  function wmTrack(move, up) {
    function onMove(e) { move(wmPoint(e)); if (e.preventDefault) e.preventDefault(); }
    function onUp(e) { document.removeEventListener("mousemove", onMove, false);
                       document.removeEventListener("mouseup", onUp, false);
                       document.removeEventListener("touchmove", onMove, false);
                       document.removeEventListener("touchend", onUp, false); up(); }
    document.addEventListener("mousemove", onMove, false);
    document.addEventListener("mouseup", onUp, false);
    document.addEventListener("touchmove", onMove, false);
    document.addEventListener("touchend", onUp, false);
  }
  function wmStartDrag(win, e) {
    if ((" " + document.body.className + " ").indexOf(" exposing ") >= 0) return;
    if (win.state === "max" || win.state === "slide") return;
    wmFocus(win.app);
    var p = wmPoint(e), ox = win.rect.x - p.x, oy = win.rect.y - p.y;
    wmTrack(function (q) {
      win.rect.x = q.x + ox; win.rect.y = q.y + oy; wmApply(win);
    }, function () {});
  }
  function wmStartResize(win, e) {
    if (win.state === "max") return;
    var p = wmPoint(e), ow = win.rect.w - p.x, oh = win.rect.h - p.y;
    wmTrack(function (q) {
      win.rect.w = Math.max(320, q.x + ow); win.rect.h = Math.max(240, q.y + oh);
      wmApply(win);
    }, function () {});
  }
  function wmFocus(app) {
    var win = wmFind(app); if (!win) return;
    win.z = ++WM.z; win.el.style.zIndex = win.z;
    WM.last = app;
  }
  function wmMin(app) {
    var win = wmFind(app); if (!win) return;
    win.state = "min"; addClass(win.el, "min"); wmTray();
  }
  function wmRestore(app) {
    var win = wmFind(app); if (!win) return;
    win.state = "normal"; removeClass(win.el, "min"); wmFocus(app); wmApply(win); wmTray();
  }
  function wmMax(app) {
    var win = wmFind(app); if (!win) return;
    var v = wmViewport();
    if (win.state === "max" || win.state === "slide") {
      win.rect = win.restore || win.rect; win.state = "normal";
    } else {
      win.restore = { x: win.rect.x, y: win.rect.y, w: win.rect.w, h: win.rect.h };
      win.rect = { x: 8, y: v.top, w: v.w - 16, h: v.h - v.top - 12 };
      win.state = "max";
    }
    removeClass(win.el, "min"); wmApply(win); wmFocus(app);
  }
  function wmSlide(app) {
    var win = wmFind(app); if (!win) return;
    var v = wmViewport();
    if (win.state === "slide") { win.rect = win.restore || win.rect; win.state = "normal"; }
    else {
      win.restore = { x: win.rect.x, y: win.rect.y, w: win.rect.w, h: win.rect.h };
      win.rect = { x: v.w - 360, y: v.top, w: 352, h: v.h - v.top - 12 };
      win.state = "slide";
    }
    wmApply(win); wmFocus(app);
  }
  function wmClose(app) {
    var win = wmFind(app); if (!win) return;
    var screen = $(app);
    if (screen) {
      removeClass(screen, "in-window");
      screen.style.display = "none";
      document.getElementById("app").appendChild(screen);
    }
    if (win.el && win.el.parentNode) win.el.parentNode.removeChild(win.el);
    WM.wins.splice(WM.wins.indexOf(win), 1);
    wmTray(); renderChrome();
  }
  function wmGrid(n) {
    var v = wmViewport(), wins = WM.wins.slice(), i;
    if (!wins.length) return;
    wins.sort(function (a, b) { return b.z - a.z; });
    if (n <= 1) { wmMax(wins[0].app); return; }
    var count = wins.length;
    if (n > count) n = count;
    var cols = n;
    var rows = Math.ceil(count / cols);
    var pad = 8, gap = 8, top = v.top;
    var cellW = (v.w - pad * 2 - gap * (cols - 1)) / cols;
    var cellH = (v.h - top - 96 - gap * (rows - 1)) / rows;
    for (i = 0; i < count; i++) {
      var w = wins[i];
      w.state = "grid";
      w.rect = { x: Math.round(pad + (i % cols) * (cellW + gap)),
                 y: Math.round(top + Math.floor(i / cols) * (cellH + gap)),
                 w: Math.round(cellW), h: Math.round(cellH) };
      wmApply(w);
    }
  }
  function wmExposeLive(on) {
    var body = document.body;
    var exposing = (" " + body.className + " ").indexOf(" exposing ") >= 0;
    if (on === undefined) on = !exposing;
    var i, w;
    if (!on) {
      for (i = 0; i < WM.wins.length; i++) {
        w = WM.wins[i];
        w.el.style.transform = ""; w.el.style.transformOrigin = "";
        if (w.exposePrev) { w.rect = w.exposePrev; delete w.exposePrev; wmApply(w); }
      }
      removeClass(body, "exposing");
      return;
    }
    if (!WM.wins.length) { showBanner("No windows open", "info"); return; }
    addClass(body, "exposing");
    var v = wmViewport(), n = WM.wins.length;
    var cols = (n <= 3) ? n : Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
    var pad = 10, gap = 10;
    var cellW = (v.w - pad * 2 - gap * (cols - 1)) / cols;
    var cellH = (v.h - 130 - gap * (rows - 1)) / rows;
    for (i = 0; i < n; i++) {
      w = WM.wins[i];
      if (!w.exposePrev) w.exposePrev = { x: w.rect.x, y: w.rect.y, w: w.rect.w, h: w.rect.h };
      var sc = Math.min(cellW / w.rect.w, cellH / w.rect.h, 0.6);
      w.el.style.transformOrigin = "top left";
      w.el.style.transform = "scale(" + sc + ")";
      w.el.style.left = Math.round(pad + (i % cols) * (cellW + gap)) + "px";
      w.el.style.top = Math.round(70 + Math.floor(i / cols) * (cellH + gap)) + "px";
    }
  }
  function wmClampAll() {
    for (var i = 0; i < WM.wins.length; i++) {
      var win = WM.wins[i], v = wmViewport();
      if (win.state === "max") win.rect = { x: 8, y: v.top, w: v.w - 16, h: v.h - v.top - 12 };
      else if (win.state === "slide") win.rect = { x: v.w - 360, y: v.top, w: 352, h: v.h - v.top - 12 };
      wmApply(win);
    }
  }
  function wmExpose() {
    wmExposeLive(true);
    var bar = $("expose-body");
    if (bar) bar.innerHTML = "";
    return;
    var box = $("expose-body");
    if (!box) return;
    var html = "";
    for (var i = 0; i < WM.wins.length; i++) {
      var w = WM.wins[i];
      html += '<div class="expose-card" data-wm-app="' + w.app + '">' +
        '<h3>' + (WIN_TITLES[w.app] || w.app) + '</h3>' +
        '<div class="kv"><span class="k">size</span><b>' + w.rect.w + ' × ' + w.rect.h + '</b></div>' +
        '<div class="kv"><span class="k">state</span><b>' + w.state + '</b></div>' +
        '<div class="kv"><span class="k">z</span><b>' + w.z + '</b></div></div>';
    }
    box.innerHTML = html || '<div class="empty">No windows open</div>';
    var cards = box.getElementsByClassName("expose-card"), j;
    for (j = 0; j < cards.length; j++) {
      cards[j].onclick = (function (app) {
        return function () {
          if (wmFind(app) && wmFind(app).state === "min") wmRestore(app);
          wmFocus(app); closeOverlays();
          return false;
        };
      })(cards[j].getAttribute("data-wm-app"));
    }
  }
  /* tiny public surface: used by the UI and by the QA probes */
  window.GGWM = {
    banner: showBanner,
    edit: setEdit,
    state: function () { return { edit: state.edit, order: state.order.slice(), hidden: state.hidden.slice(), drag: gridDrag, focus: state.focus }; },
    open: wmOpen, close: wmClose, list: function () { return WM.wins; },
    focus: wmFocus, minimize: wmMin, restore: wmRestore, max: wmMax,
    slide: wmSlide, expose: wmExpose, clamp: wmClampAll, find: wmFind,
    grid: wmGrid, exposeLive: wmExposeLive,
    widgets: function () { return Array.prototype.slice.call(document.querySelectorAll("#widgets-grid .widget")).map(function (e) { return e.getAttribute("data-w"); }); },
    dock: function () { return dockIds(); },
    toggleDock: toggleDockApp,
    dockPrefs: dockPrefs, saveDockPrefs: saveDockPrefs,
    refreshDock: refreshDock, dockMenu: dockMenu,
    registry: registryEntries, launch: launchEntry, libMenu: libMenu,
    tickClock: tickClock, dockBounce: dockBounce,
    resetAlarmClock: function () { state.alarmMinute = null; },
    alarmDebug: function () { return { min: state.alarmMinute, alarms: clockPrefs().alarms, banner: (document.getElementById("banner") || {}).textContent }; },
    trash: trashCustomApp, restoreApp: restoreTrash, trashList: loadTrash, emptyTrash: emptyTrash,
    libSwitch: libSwitch, libCategory: function () { return state.libCat || "All"; },
    dataState: function () { return { host: state.data.host || null, keys: Object.keys ? Object.keys(state.data.datasets || {}) : [], alerts: state.alerts.length }; },
    dockDragStart: function (id) { var el = document.querySelector('#dock [data-dock-id="' + id + '"]'); var e = { clientX: 0, clientY: 0, preventDefault: function () {} }; dockDragStart(el, id, e); return !!dockDrag; },
    libFavs: libFavs, libRecent: libRecent
  };

  /* ---------------- session ---------------- */
  function loginLocal(user, auto) {
    trace("login");
    state.user = user || {};
    state.autoLogin = !!auto;
    applyLook();                                   // adds body.auto-login when automatic
    if (LOCK.locked) { pollOnce(); return; }       // load data behind the Lock Screen
    show($("login"), false);
    routeTo(location.hash || "#/home");
    trace("routed");
    pollOnce();
    applyDeepLink();
    setTimeout(layoutCheck, 700);
  }
  function logoutLocal() {
    state.user = null;
    if (state.autoLogin) { applyLook(); return; }
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    if (LOCK.locked) return;
    var screens = document.getElementsByClassName("screen"), i;
    for (i = 0; i < screens.length; i++) { removeClass(screens[i], "active"); screens[i].style.display = "none"; }
    var login = $("login");
    if (login) { addClass(login, "active"); login.style.display = "block"; }
  }
  function logout() {
    if (state.autoLogin) { showBanner("Automatic read-only session — sign-out disabled", "info"); return; }
    xhr("POST", API + "/session/logout", null, function () { logoutLocal(); });
  }
  function checkSession() {
    xhr("GET", API + "/session", null, function (err, status, data) {
      if (!err && data && data.ok) loginLocal(data.user, data.auto);
      else logoutLocal();
    });
  }

  /* ---------------- layout diagnostics ---------------- */
  function layoutCheck() {
    var app = $("app"), home = $("home");
    var h = window.innerHeight || document.documentElement.clientHeight;
    if (app && app.offsetHeight < 100 && h > 100) { app.style.height = h + "px"; }
    if (home && home.getBoundingClientRect().height < 100 && state.route === "#/home") {
      home.style.position = "fixed"; home.style.top = "0"; home.style.left = "0";
      home.style.width = "100%"; home.style.height = h + "px";
    }
    var visible = false, scr = document.getElementsByClassName("screen"), i;
    for (i = 0; i < scr.length; i++) if (getComputedStyle(scr[i]).display !== "none") visible = true;
    if (!visible) {
      diag("LAYOUT: no screen visible | route=" + state.route + " hash=" + location.hash, "layout");
    }
  }
  function applyFrame() {
    var w = window.innerWidth || document.documentElement.clientWidth || 0;
    var h = window.innerHeight || document.documentElement.clientHeight || 0;
    if (w < 100 || h < 100) return;
    var o = (h > w) ? "portrait" : "landscape";
    var t = w < 700 ? "xs" : (w < 900 ? "sm" : (w < 1140 ? "md" : (w < 1500 ? "lg" : "xl")));
    if (state.orientation === o && state.viewport === t) return;
    state.orientation = o;
    state.viewport = t;
    applyLook();                       // one class writer, still
  }
  function fitHeight() {
    var app = $("app"), h = window.innerHeight || document.documentElement.clientHeight || 0;
    var w = window.innerWidth || document.documentElement.clientWidth || 0;
    if (!app) return;
    // remember scroll offsets so a rotation never throws the user back to the top
    var scrollers = document.getElementsByClassName("scroll"), marks = [], i;
    for (i = 0; i < scrollers.length; i++) marks.push(scrollers[i].scrollTop || 0);
    if (h > 100) { app.style.height = h + "px"; app.style.minHeight = h + "px"; }
    if (w > 100) app.style.width = w + "px";
    applyFrame();
    if (typeof wmClampAll === "function") wmClampAll();   // windows obey the new viewport
    setTimeout(function () {
      var again = document.getElementsByClassName("scroll"), j;
      for (j = 0; j < again.length && j < marks.length; j++) {
        if (marks[j] > 0) again[j].scrollTop = marks[j];
      }
    }, 120);
  }
  function isStandalone() { return (window.navigator && window.navigator.standalone === true); }
  function applyStandaloneInset() {
    if (!isStandalone()) return;
    var app = $("app");
    if (app) {
      app.style.top = "20px";
      // the status-bar inset must come out of the height, otherwise the bottom
      // 20px of the UI (including the Genie composer) is pushed off-screen
      var h = window.innerHeight || document.documentElement.clientHeight || 0;
      if (h > 100) { app.style.height = (h - 20) + "px"; app.style.minHeight = (h - 20) + "px"; }
      if (document.body.className.indexOf("standalone") < 0) {
        document.body.className = (document.body.className + " standalone").replace(/^\s+/, "");
      }
    }
    var clock = $("sb-clock"); if (clock) clock.style.display = "none";
    var sb = $("statusbar"); if (sb) sb.style.paddingRight = "96px";
  }

  /* ---------------- clock ---------------- */
  function tickStatusClock() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    var hh = h % 12; if (hh === 0) hh = 12;
    var el = $("sb-clock");
    if (el) el.innerHTML = hh + ":" + (m < 10 ? "0" + m : m) + (h >= 12 ? " PM" : " AM");
    var w = $("w-clock-body");
    if (w && state.page === 1) renderWidgets();
    if (LOCK.locked) {
      var lc = $("lock-clock");
      if (lc) lc.innerHTML = lockClockText();
    }
  }

  /* ---------------- init ---------------- */
  function applyDeepLink() {
    var q = String(location.search || "");
    var m = q.match(/[?&]page=(\d)/);
    if (m) setPage(parseInt(m[1], 10));
    var ac = q.match(/[?&]accent=([a-z]+)/);
    if (ac && typeof setAccent === "function") setAccent(ac[1]);
    var gl = q.match(/[?&]glass=(subtle|regular|strong)/);
    if (gl && typeof setGlass === "function") setGlass(gl[1]);
    var tx = q.match(/[?&]text=(small|regular|large)/);
    if (tx && typeof setTextScale === "function") setTextScale(tx[1]);
    var de = q.match(/[?&]density=(compact|regular|comfortable)/);
    if (de && typeof setDensity === "function") setDensity(de[1]);
    var co = q.match(/[?&]contrast=(normal|high)/);
    if (co && typeof setContrast === "function") setContrast(co[1]);
    var gmm = q.match(/[?&]glassmode=(standard|clear|tinted)/);
    if (gmm && typeof setGlassMode === "function") setGlassMode(gmm[1]);
    var mo = q.match(/[?&]motion=(full|reduced)/);
    if (mo && typeof setMotion === "function") setMotion(mo[1]);
    var ap = q.match(/[?&]appearance=(dark|light|auto)/);
    if (ap && typeof setAppearance === "function") setAppearance(ap[1]);
    var lk = q.match(/[?&]look=(light|dark)/);
    if (lk) setLook(lk[1]);
    var th = q.match(/[?&]theme=(ios26|ios9)/);
    if (th) setTheme(th[1]);
    if (/[?&]lock=1/.test(q)) { lock(); }
    var wl = q.match(/[?&]wall=(aurora|deep|dawn)/);
    if (wl) { LOCK.wall = wl[1]; store("gg_lock_wall", LOCK.wall); renderLock(); }
    if (/[?&]at=1/.test(q)) { atOpen(); }
    if (/[?&]at=0/.test(q)) { AT.on = false; atApply(); }
    if (/[?&]edit=1/.test(q)) setEdit(true);
    var fq = q.match(/[?&]focus=(off|work|personal|sleep)/);
    if (fq) setFocus(fq[1]);
    var iq = q.match(/[?&]iconstyle=(default|dark|clear|tinted)/);
    if (iq) setIconStyle(iq[1]);
    var hq = q.match(/[?&]homewall=(aurora|deep|dawn|midnight)/);
    if (hq) setHomeWall(hq[1]);
    var bq = q.match(/[?&]bright=(low|mid|high)/);
    if (bq) setHomeBright(bq[1]);
    var wn = q.match(/[?&]win=([a-z,]+)/);
    if (wn && window.GGWM) {
      var wapps = wn[1].split(","), wj;
      for (wj = 0; wj < wapps.length; wj++) if (WIN_TITLES[wapps[wj]]) wmOpen(wapps[wj]);
    }
    var da = q.match(/[?&]dockadd=([A-Za-z0-9_,-]+)/);
    if (da) {
      var adds = da[1].split(","), ai, cur = dockIds();
      for (ai = 0; ai < adds.length && cur.length < 6; ai++) {
        if (!findApp(adds[ai]) && !registryFind(adds[ai])) continue;
        if (cur.indexOf(adds[ai]) < 0) cur.push(adds[ai]);
      }
      state.dock = cur;
      store("gg_dock", cur.join(","));
      refreshDock();
    }
    if (q.match(/[?&]dockframe=0/) !== null) saveDockPrefs({ frame: false });
    if (q.match(/[?&]dockframe=1/) !== null) saveDockPrefs({ frame: true });
    var ds = q.match(/[?&]dockstyle=(classic|gg27)/);
    if (ds) saveDockPrefs({ style: ds[1] });
    var dk = q.match(/[?&]dock=(bottom|left|right)/);
    if (dk) saveDockPrefs({ position: dk[1] });
    if (/[?&]autohide=1/.test(q)) saveDockPrefs({ autoHide: true });
    if (/[?&]autohide=0/.test(q)) saveDockPrefs({ autoHide: false });
    if (/[?&]mag=0/.test(q)) saveDockPrefs({ mag: false });
    if (/[?&]mag=1/.test(q)) saveDockPrefs({ mag: true });
    var sz = q.match(/[?&]dockicon=([0-9]{2})/);
    if (sz) saveDockPrefs({ size: parseInt(sz[1], 10) });
    var lay = q.match(/[?&]layout=([1-4])/);
    if (lay) wmGrid(parseInt(lay[1], 10));
    var o = q.match(/[?&]open=([a-z]+)/);
    if (o) {
      var map = { cc: "cc", nc: "nc", spot: "spotlight", split: "split", expose: "expose", widgets: "wgallery", wgallery: "wgallery" };
      var id = map[o[1]];
      if (id === "wgallery") renderGallery();
      if (id) toggleOverlay(id);
    }
  }

  function init() {
    try {
      state.theme = load("gg_theme", "ios26");
      state.appearance = load("gg_appearance", load("gg_look", "dark"));
      state.accent = load("gg_accent", "blue");
      state.glass = load("gg_glass", "regular");
      state.glassMode = load("gg_glassmode", "standard");
      state.contrast = load("gg_contrast", "normal");
      state.density = load("gg_density", "regular");
      state.textScale = load("gg_text", "regular");
      state.motion = load("gg_motion", "full");
      state.ios9 = /OS 9_/.test(String(navigator.userAgent || ""));   // A5-class device
      state.iconStyle = load("gg_iconstyle", "default");
      state.homeWall = load("gg_home_wall", "aurora");
      state.homeBright = load("gg_home_bright", "mid");
      state.focus = load("gg_focus", "off");
      state.dnd = state.focus !== "off";
      state.order = (load("gg_order", "") || "").split(",");
      state.widgetOrder = (load("gg_widget_order", "") || "").split(",");
      state.dock = (load("gg_dock", "") || "").split(",");
      if (state.dock.length === 1 && !state.dock[0]) state.dock = [];
      if (!load("gg_dock_expanded", "") && state.dock.length) {
        var addOns = ["calendar", "notes", "reminders", "clock", "calculator"], ai2;
        for (ai2 = 0; ai2 < addOns.length && state.dock.length < 12; ai2++) {
          if (state.dock.indexOf(addOns[ai2]) < 0) state.dock.push(addOns[ai2]);
        }
        store("gg_dock", state.dock.join(","));
        store("gg_dock_expanded", "1");
      }
      if (state.widgetOrder.length === 1 && !state.widgetOrder[0]) state.widgetOrder = [];
      if (state.dock.length === 1 && !state.dock[0]) state.dock = [];
      state.hidden = (load("gg_hidden", "") || "").split(",");
      state.readAlerts = (load("gg_read", "") || "").split(",");
      if (state.order.length === 1 && !state.order[0]) state.order = [];
      if (state.hidden.length === 1 && !state.hidden[0]) state.hidden = [];
      if (state.readAlerts.length === 1 && !state.readAlerts[0]) state.readAlerts = [];
      watchSystemAppearance();
      state.pollMs = parseInt(load("gg_poll", "10000"), 10) || 10000;
      state.dnd = load("gg_dnd", "0") === "1";
      LOCK.wall = (function () {
        var w = load("gg_lock_wall", "aurora");
        return WALLS[w] ? w : "aurora";
      })();
      applyLook();
      fitHeight();
      applyStandaloneInset();
      window.addEventListener("resize", fitHeight, false);
      window.addEventListener("orientationchange", function () { setTimeout(fitHeight, 350); }, false);
      tickClock(); setInterval(tickClock, 30000);

      AT.on = load("gg_at", "1") === "1";
      atBind();
      atInitPosition();
      atApply();

      bindGestures();
      bindLibSwipe();
      document.addEventListener("mousemove", function (e) { gridDragMove(e); wDragMove(e); dockDragMove(e); libDragMove(e); }, false);
      document.addEventListener("mouseup", function (e) { gridDragEnd(e); wDragEnd(); dockDragEnd(e); libDragEnd(e); }, false);
      document.addEventListener("touchmove", function (e) { gridDragMove(e); wDragMove(e); dockDragMove(e); }, false);
      document.addEventListener("touchend", function (e) { gridDragEnd(e); wDragEnd(); dockDragEnd(e); }, false);
      bindLock();
      LOCK.locked = !/[?&]unlock=1/.test(String(location.search || ""));
      if (LOCK.locked) showLock();

      renderHome();
      renderAppLibrary();
      renderWidgets();
      renderChrome();

      $("login-btn").onclick = doLogin;
      $("login-pass").onkeydown = function (e) {
        if ((e.keyCode || e.which) === 13) doLogin();
      };
      $("chat-send").onclick = sendChat;
      $("chat-input").onkeydown = function (e) {
        if ((e.keyCode || e.which) === 13) { e.preventDefault(); sendChat(); }
      };
      $("edge-cc").onclick = function () { toggleOverlay("cc"); renderChrome(); };
      $("edge-nc").onclick = function () { toggleOverlay("nc"); };
      $("cc-close").onclick = function () { toggleOverlay("cc"); };
      $("cc-home").onclick = function (e) { e.preventDefault(); goHome(); return false; };
      $("cc-lock").onclick = function (e) { e.preventDefault(); lock(); return false; };
      $("sb-host").onclick = goHome;
      $("nc-close").onclick = function () { toggleOverlay("nc"); };
      $("nc-clear").onclick = function (e) { e.preventDefault(); state.notes = []; state.alerts = []; renderNotes(); return false; };
      $("cc-split").onclick = function (e) { e.preventDefault(); toggleOverlay("split"); return false; };
      var br = $("cc-bright"), vo = $("cc-volume");
      if (br) br.onchange = function () { state.brightness = parseInt(br.value, 10); store("gg_bright", String(br.value)); };
      if (vo) vo.onchange = function () { state.volume = parseInt(vo.value, 10); store("gg_volume", String(vo.value)); };
      var rec = $("cc-rec");
      if (rec) rec.onclick = function (e) {
        e.preventDefault();
        state.recording = !state.recording;
        rec.className = "cc-btn" + (state.recording ? " rec-on" : "");
        rec.innerHTML = state.recording ? "&#9679; Recording (simulated)" : "Screen record";
        var note = $("cc-rec-note");
        if (note) note.innerHTML = state.recording ? "simulated" : "";
        return false;
      };
      var med = $("cc-media");
      if (med) med.onclick = function (e) { e.preventDefault(); showBanner("No media session is visible to a browser", "info"); return false; };
      var atb = $("cc-at");
      if (atb) atb.onclick = function (e) { e.preventDefault(); toggleOverlay("cc"); atOpen(); return false; };
      var lays = document.querySelectorAll("[data-wm-layout]"), li;
      for (li = 0; li < lays.length; li++) {
        (function (el) {
          el.onclick = function (e) {
            e.preventDefault();
            wmGrid(parseInt(el.getAttribute("data-wm-layout"), 10) || 2);
            toggleOverlay("cc");
            return false;
          };
        })(lays[li]);
      }
      var cce = $("cc-expose");
      if (cce) cce.onclick = function (e) { e.preventDefault(); toggleOverlay("expose"); return false; };
      $("split-close").onclick = function () { toggleOverlay("split"); };
      var exc = $("expose-close");
      if (exc) exc.onclick = function () { toggleOverlay("expose"); };
      $("sb-search").onclick = function () { toggleOverlay("spotlight"); };
      $("spot-input").onkeyup = function () { renderSpotlight(this.value); };
      $("spot-close").onclick = function () { toggleOverlay("spotlight"); };
      $("cc-dnd").onclick = function () {
        var order = ["off", "work", "personal", "sleep"];
        setFocus(order[(order.indexOf(state.focus) + 1) % order.length]);
      };
      $("cc-dnd")._legacy = function () {
        state.dnd = !state.dnd; store("gg_dnd", state.dnd ? "1" : "0"); renderChrome();
      };
      $("cc-theme").onclick = function () { setTheme(state.theme === "ios26" ? "ios9" : "ios26"); };
      $("cc-look").onclick = function () { setLook(state.look === "dark" ? "light" : "dark"); };

      var dots = document.getElementsByClassName("dot"), i;
      for (i = 0; i < dots.length; i++) {
        (function (el) {
          el.onclick = function () { setPage(parseInt(el.getAttribute("data-page"), 10) || 0); };
        })(dots[i]);
      }
      applyDockPrefs();
      renderDock();
      bindDock();
      initDockEdge();
      initDockMagnify();
      var libSearch = $("lib-search");
      if (libSearch) {
        libSearch.oninput = function () { state.libQuery = libSearch.value; renderAppLibrary(); };
      }
      state.libQuery = ""; state.libCat = "All";
      /* page swiping is owned by gesture() — a second touch handler would double-advance */

      document.onkeydown = function (e) {
        var k = e.keyCode || e.which, mod = e.metaKey || e.ctrlKey, alt = e.altKey;
        var exposing = (" " + document.body.className + " ").indexOf(" exposing ") >= 0;
        function openOverlay(id) { return (" " + $(id).className + " ").indexOf(" open ") >= 0; }
        if (k === 27) {
          if (exposing) { wmExposeLive(false); toggleOverlay("expose"); return; }
          if (openOverlay("at-menu")) { atClose(); return; }
          if (openOverlay("cc") || openOverlay("nc") || openOverlay("spotlight") ||
              openOverlay("ctx") || openOverlay("split")) { closeOverlays(); return; }
          if (state.edit) { setEdit(false); return; }
          goHome(); return;
        }
        if (state.route === "#/calculator" && !/INPUT|TEXTAREA|SELECT/.test(String((e.target || {}).tagName || ""))) {
          var ck = String.fromCharCode(k);
          if (/[0-9.]/.test(ck)) { calcPress(ck); return; }
          if (ck === "+" || ck === "-" || ck === "*" || ck === "/") { calcPress(ck); return; }
          if (k === 13 || ck === "=") { calcPress("="); return; }
          if (k === 8) { calcPress("back"); return; }
          if (k === 27) { calcPress("C"); return; }
        }
        if (!mod) return;
        if (k === 72) { goHome(); return; }                               // Cmd/Ctrl+H
        if (k === 65 && e.shiftKey) { atOpen(); return; }                 // Cmd/Ctrl+Shift+A
        if (alt && k === 69) { toggleOverlay("expose"); return; }         // Alt+E
        if (alt && k === 83) { toggleOverlay("split"); return; }          // Alt+S
        if (alt && k === 87 && WM.last) { wmClose(WM.last); return; }     // Alt+W
        if (alt && k === 77 && WM.last) { wmMin(WM.last); return; }       // Alt+M
        if (alt && k === 70 && WM.last) { wmMax(WM.last); return; }       // Alt+F
      };
      window.onhashchange = function () { routeTo(location.hash); };
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) pollOnce();
      }, false);

      setPage(0);
      checkSession();
      scheduleNext(state.pollMs);
    } catch (e) {
      diag("init failed: " + (e && e.message), "init");
    }
  }
  function doLogin() {
    var u = $("login-user").value, p = $("login-pass").value, errEl = $("login-error");
    errEl.innerHTML = "";
    if (!u || !p) { errEl.innerHTML = "Enter username and password."; return; }
    $("login-btn").disabled = true;
    xhr("POST", API + "/session", { username: u, password: p }, function (err, status, data) {
      $("login-btn").disabled = false;
      if (err || !data || !data.ok) {
        errEl.innerHTML = status === 401 ? "Invalid credentials." : "Cannot reach the host.";
        return;
      }
      $("login-pass").value = "";
      loginLocal(data.user);
    });
  }

  if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(init, 0);
  else document.addEventListener("DOMContentLoaded", init, false);
})();
