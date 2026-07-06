// minyan-bar.js — Shop Local SI sitewide minyan bar (v3: time-aware + live countdowns)
// Morning: Sof Zman Tefilla countdown + next Shacharis.
// Daytime: Shkia + next Mincha. Evening: next Maariv + next Shiur.
// Green, slim, links to /shuls.html. Data: /data/shuls.json + Hebcal zmanim.
(function () {
  var GEONAME_STATEN_ISLAND = 5139568;
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Shabbos"];
  var NAMES = { shacharis: "Shacharis", mincha: "Mincha", maariv: "Maariv" };

  var css = [
    "#slsi-minyan-bar{position:sticky;top:0;z-index:9999;background:#1E5B3F;color:#fff;",
    "font-family:'Nunito Sans',system-ui,sans-serif;display:flex;align-items:stretch;",
    "justify-content:space-around;padding:3px 8px;box-shadow:0 2px 6px rgba(0,0,0,.22);}",
    "#slsi-minyan-bar a{color:inherit;text-decoration:none;display:flex;align-items:center;gap:8px;padding:2px 10px;}",
    ".slsi-mb-item{display:flex;align-items:center;gap:8px;border-right:1px solid rgba(255,255,255,.18);padding-right:14px;}",
    ".slsi-mb-item:last-child{border-right:none;padding-right:0;}",
    ".slsi-mb-icon{width:26px;height:26px;border-radius:50%;background:rgba(238,159,60,.22);",
    "display:flex;align-items:center;justify-content:center;font-size:12px;flex:0 0 auto;}",
    ".slsi-mb-label{font-size:9.5px;letter-spacing:.11em;text-transform:uppercase;color:#F2C879;font-weight:700;line-height:1.15;}",
    ".slsi-mb-value{font-size:13.5px;font-weight:700;line-height:1.2;white-space:nowrap;}",
    ".slsi-mb-sub{font-size:10px;color:rgba(255,255,255,.7);line-height:1.15;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis;}",
    ".slsi-mb-soon{color:#FFD98E;font-weight:800;}",
    "@media(max-width:760px){.slsi-mb-hide-m{display:none!important;}.slsi-mb-value{font-size:12px;}}",
  ].join("");

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function fmt(d) {
    var h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }
  function inMin(d) {
    var mins = Math.round((d - new Date()) / 60000);
    if (mins <= 0) return "now";
    if (mins < 60) return "in " + mins + " min";
    var h = Math.floor(mins / 60), r = mins % 60;
    return "in " + h + "h" + (r ? " " + r + "m" : "");
  }
  function toDate(t, tefillah) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!m) return null;
    var h = +m[1], min = +m[2];
    if (tefillah !== "shacharis" && h < 12) h += 12;
    if (tefillah === "shacharis" && h === 12) h = 0;
    var d = new Date();
    d.setHours(h, min, 0, 0);
    return d;
  }

  function nextMinyan(shuls, prefer) {
    var now = new Date();
    var today = DAYS[new Date().getDay() === 6 ? 6 : new Date().getDay()];
    function scan(tefs) {
      var best = null;
      (shuls || []).forEach(function (s) {
        if (!s.schedule || !s.schedule[today]) return;
        tefs.forEach(function (t) {
          (s.schedule[today][t] || []).forEach(function (ts) {
            var d = toDate(ts, t);
            if (d && d > now && (!best || d < best.when)) best = { when: d, tefillah: NAMES[t], shul: s.name };
          });
        });
      });
      return best;
    }
    return (prefer && scan(prefer)) || scan(["shacharis", "mincha", "maariv"]);
  }

  function nextShiur(shuls) {
    var now = new Date(), best = null;
    (shuls || []).forEach(function (s) {
      (s.shiurim || []).forEach(function (e) {
        var times = (e.text || "").match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?/g) || [];
        times.forEach(function (ts) {
          var m = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/.exec(ts);
          if (!m) return;
          var h = +m[1], min = +m[2], ap = (m[3] || "").toUpperCase();
          if (ap === "PM" && h < 12) h += 12;
          else if (!ap && h < 11) h += 12;
          var d = new Date(); d.setHours(h, min, 0, 0);
          if (d > now && (!best || d < best.when)) best = { when: d, shul: s.name };
        });
      });
    });
    return best;
  }

  var state = { zmanim: null, data: null, els: {} };

  function phase() {
    var now = new Date();
    var z = state.zmanim || {};
    if (z.sofZmanTfilla && now < z.sofZmanTfilla) return "morning";
    if (z.sunset && now < z.sunset) return "day";
    return "evening";
  }

  function refresh() {
    var p = phase(), z = state.zmanim || {}, shuls = state.data && state.data.shuls;
    var e = state.els;

    if (p === "morning" && z.sofZmanTfilla) {
      e.zLabel.textContent = "\u05E1\u05D5\u05E3 \u05D6\u05DE\u05DF \u05EA\u05E4\u05D9\u05DC\u05D4";
      e.zValue.textContent = fmt(z.sofZmanTfilla);
      e.zSub.textContent = inMin(z.sofZmanTfilla);
      e.zIcon.textContent = "\u2600\uFE0F";
    } else if (z.sunset) {
      e.zLabel.textContent = "Shkia \u00B7 \u05E9\u05E7\u05D9\u05E2\u05D4";
      e.zValue.textContent = fmt(z.sunset);
      e.zSub.textContent = new Date() < z.sunset ? inMin(z.sunset) : "";
      e.zIcon.textContent = "\uD83C\uDF07";
    }

    var prefer = p === "morning" ? ["shacharis"] : p === "day" ? ["mincha"] : ["maariv"];
    var nm = shuls ? nextMinyan(shuls, prefer) : null;
    e.mValue.textContent = nm ? (nm.tefillah + " " + fmt(nm.when)) : "See schedule";
    e.mSub.textContent = nm ? (nm.shul + " \u00B7 " + inMin(nm.when)) : "Tap for all shuls";
    e.mSub.className = "slsi-mb-sub" + (nm && (nm.when - new Date()) < 15 * 60000 ? " slsi-mb-soon" : "");

    var ns = shuls ? nextShiur(shuls) : null;
    e.sValue.textContent = ns ? fmt(ns.when) : "See schedule";
    e.sSub.textContent = ns ? (ns.shul + " \u00B7 " + inMin(ns.when)) : "";
  }

  function build() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var bar = el("div"); bar.id = "slsi-minyan-bar";
    var link = el("a"); link.href = "/shuls.html";
    link.style.cssText = "display:flex;flex:1;justify-content:space-around;align-items:stretch;";

    function item(hideMobile) {
      var wrap = el("div", "slsi-mb-item" + (hideMobile ? " slsi-mb-hide-m" : ""));
      var icon = el("div", "slsi-mb-icon", "");
      var col = el("div");
      var label = el("div", "slsi-mb-label", "");
      var value = el("div", "slsi-mb-value", "");
      var sub = el("div", "slsi-mb-sub", "");
      col.appendChild(label); col.appendChild(value); col.appendChild(sub);
      wrap.appendChild(icon); wrap.appendChild(col);
      link.appendChild(wrap);
      return { icon: icon, label: label, value: value, sub: sub };
    }

    var z = item(false), m = item(false), s = item(true);
    state.els = {
      zIcon: z.icon, zLabel: z.label, zValue: z.value, zSub: z.sub,
      mValue: m.value, mSub: m.sub, sValue: s.value, sSub: s.sub,
    };
    m.icon.textContent = "\uD83D\uDD52"; m.label.textContent = "Next Minyan";
    s.icon.textContent = "\uD83D\uDCD6"; s.label.textContent = "Next Shiur";

    bar.appendChild(link);
    document.body.insertBefore(bar, document.body.firstChild);
    refresh();
    setInterval(refresh, 30000); // live countdowns
  }

  var today = new Date().toISOString().slice(0, 10);
  var zmanReq = fetch("https://www.hebcal.com/zmanim?cfg=json&geonameid=" + GEONAME_STATEN_ISLAND + "&date=" + today)
    .then(function (r) { return r.json(); })
    .then(function (z) {
      var t = z.times || {};
      return {
        sofZmanTfilla: t.sofZmanTfilla ? new Date(t.sofZmanTfilla) : null,
        sunset: t.sunset ? new Date(t.sunset) : null,
      };
    })
    .catch(function () { return null; });

  var dataReq = fetch("/data/shuls.json?d=" + today)
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });

  Promise.all([zmanReq, dataReq]).then(function (res) {
    state.zmanim = res[0]; state.data = res[1];
    build();
  });
})();
