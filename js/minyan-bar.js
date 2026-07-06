// minyan-bar.js — Shop Local SI sitewide minyan bar
// Shows: bein hashmashos (from Hebcal zmanim) | next minyan | next shiur.
// Data comes from /data/shuls.json (updated weekly by GitHub Actions).
(function () {
  var GEONAME_STATEN_ISLAND = 5139568;

  var css = [
    "#slsi-minyan-bar{position:sticky;top:0;z-index:9999;background:#1D2B4C;color:#fff;",
    "font-family:'Nunito Sans',system-ui,sans-serif;display:flex;align-items:stretch;",
    "justify-content:space-around;padding:6px 10px;box-shadow:0 2px 8px rgba(0,0,0,.25);}",
    "#slsi-minyan-bar a{color:inherit;text-decoration:none;display:flex;align-items:center;gap:10px;padding:2px 14px;}",
    ".slsi-mb-item{display:flex;align-items:center;gap:10px;border-right:1px solid rgba(255,255,255,.15);padding-right:18px;}",
    ".slsi-mb-item:last-child{border-right:none;padding-right:0;}",
    ".slsi-mb-icon{width:34px;height:34px;border-radius:50%;background:rgba(238,159,60,.18);",
    "display:flex;align-items:center;justify-content:center;font-size:16px;flex:0 0 auto;}",
    ".slsi-mb-label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#EE9F3C;font-weight:700;line-height:1.2;}",
    ".slsi-mb-value{font-size:16px;font-weight:700;line-height:1.25;white-space:nowrap;}",
    ".slsi-mb-sub{font-size:11px;color:rgba(255,255,255,.65);line-height:1.2;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis;}",
    "@media(max-width:760px){.slsi-mb-hide-m{display:none!important;}.slsi-mb-value{font-size:14px;}}",
  ].join("");

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function item(icon, label, value, sub, hideMobile) {
    var wrap = el("div", "slsi-mb-item" + (hideMobile ? " slsi-mb-hide-m" : ""));
    var ic = el("div", "slsi-mb-icon", icon);
    var col = el("div");
    col.appendChild(el("div", "slsi-mb-label", label));
    col.appendChild(el("div", "slsi-mb-value", value));
    if (sub) col.appendChild(el("div", "slsi-mb-sub", sub));
    wrap.appendChild(ic);
    wrap.appendChild(col);
    return wrap;
  }

  function fmt(d) {
    var h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }

  function parseTime(str, hintPM) {
    var m = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/.exec(str);
    if (!m) return null;
    var h = +m[1], min = +m[2], ap = (m[3] || "").toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    if (!ap) {
      if (hintPM && h < 12) h += 12;
      else if (!hintPM && h <= 3) h += 12;
    }
    var d = new Date();
    d.setHours(h, min, 0, 0);
    return d;
  }

  function todayMatches(text) {
    var day = new Date().getDay();
    var t = text.toLowerCase();
    var names = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    var mentionsDay = /\b(sun|mon|tue|wed|thu|fri|sat|shabbos|shabbat|weekday|daily)/i.test(t);
    if (!mentionsDay) return day !== 6;
    if (/daily/.test(t)) return true;
    if (day === 6) return /shabbos|shabbat|\bsat/.test(t);
    if (/weekday/.test(t)) return day >= 1 && day <= 5;
    var range = /(sun|mon|tue|wed|thu|fri|sat)\w*\s*[-–]\s*(sun|mon|tue|wed|thu|fri|sat)/i.exec(t);
    if (range) {
      var a = names.indexOf(range[1].slice(0, 3).toLowerCase());
      var b = names.indexOf(range[2].slice(0, 3).toLowerCase());
      if (a <= b) return day >= a && day <= b;
      return day >= a || day <= b;
    }
    return t.indexOf(names[day]) !== -1;
  }

  function nextFrom(entries) {
    var now = new Date(), best = null;
    entries.forEach(function (e) {
      if (!todayMatches(e.text + " " + (e.section || ""))) return;
      var pmHint = /mincha|maariv|ma'ariv|kabbalas|kabbalat|motzei|pm/i.test(e.text + " " + (e.section || ""));
      var times = e.text.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?/g) || [];
      times.forEach(function (ts) {
        var d = parseTime(ts, pmHint);
        if (d && d > now && (!best || d < best.when)) {
          best = { when: d, entry: e, shul: e._shul };
        }
      });
    });
    return best;
  }

  function labelFor(entry) {
    var t = (entry.text + " " + (entry.section || "")).toLowerCase();
    if (/daf yomi/.test(t)) return "Daf Yomi";
    if (/shachari/.test(t)) return "Shacharis";
    if (/mincha/.test(t)) return "Mincha";
    if (/maariv|ma'ariv/.test(t)) return "Maariv";
    if (/shiur/.test(t)) return "Shiur";
    return "";
  }

  function build(zman, shulsData) {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var bar = el("div");
    bar.id = "slsi-minyan-bar";
    var link = el("a");
    link.href = "/shuls-minyanim.html";
    link.style.cssText = "display:flex;flex:1;justify-content:space-around;align-items:stretch;";

    if (zman) link.appendChild(item("🌇", "Shkia · שקיעה", zman, null, false));
    
    if (shulsData) {
      var minyanEntries = [], shiurEntries = [];
      (shulsData.shuls || []).forEach(function (s) {
        (s.minyanim || []).forEach(function (m) { m._shul = s.name; minyanEntries.push(m); });
        (s.shiurim || []).forEach(function (m) { m._shul = s.name; shiurEntries.push(m); });
      });
      var nm = nextFrom(minyanEntries);
      var ns = nextFrom(shiurEntries);
      link.appendChild(item("\uD83D\uDD52", "Next Minyan",
        nm ? (labelFor(nm.entry) + " " + fmt(nm.when)) : "See schedule",
        nm ? nm.shul : "Tap for all shuls", false));
      link.appendChild(item("\uD83D\uDCD6", "Next Shiur",
        ns ? (labelFor(ns.entry) + " " + fmt(ns.when)) : "See schedule",
        ns ? ns.shul : null, true));
    } else {
      link.appendChild(item("\uD83D\uDD52", "Next Minyan", "See schedule", "Tap for all shuls", false));
    }

    bar.appendChild(link);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  var today = new Date().toISOString().slice(0, 10);
  var zmanReq = fetch("https://www.hebcal.com/zmanim?cfg=json&geonameid=" + GEONAME_STATEN_ISLAND + "&date=" + today)
    .then(function (r) { return r.json(); })
    .then(function (z) {
      var t = z.times && (z.times.sunset || z.times.tzeit7083deg);
      return t ? fmt(new Date(t)) : null;
    })
    .catch(function () { return null; });

  var dataReq = fetch("/data/shuls.json?d=" + today)
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });

  Promise.all([zmanReq, dataReq]).then(function (res) {
    build(res[0], res[1]);
  });
})();