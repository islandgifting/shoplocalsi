// minyan-bar.js — Shop Local SI sitewide minyan bar (v2: green, slimmer)
// Shows: Shkia (from Hebcal) | next minyan | next shiur. Links to /shuls.html.
(function () {
  var GEONAME_STATEN_ISLAND = 5139568;
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Shabbos"];

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
    ".slsi-mb-sub{font-size:10px;color:rgba(255,255,255,.7);line-height:1.15;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;}",
    "@media(max-width:760px){.slsi-mb-hide-m{display:none!important;}.slsi-mb-value{font-size:12px;}}",
  ].join("");

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function item(icon, label, value, sub, hideMobile) {
    var wrap = el("div", "slsi-mb-item" + (hideMobile ? " slsi-mb-hide-m" : ""));
    wrap.appendChild(el("div", "slsi-mb-icon", icon));
    var col = el("div");
    col.appendChild(el("div", "slsi-mb-label", label));
    col.appendChild(el("div", "slsi-mb-value", value));
    if (sub) col.appendChild(el("div", "slsi-mb-sub", sub));
    wrap.appendChild(col);
    return wrap;
  }

  function fmt(d) {
    var h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }

  // "7:10" + which tefillah -> Date today (Shacharis = AM, Mincha/Maariv = PM)
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

  function nextMinyan(shuls) {
    var now = new Date();
    var today = DAYS[new Date().getDay() === 6 ? 6 : new Date().getDay()];
    var names = { shacharis: "Shacharis", mincha: "Mincha", maariv: "Maariv" };
    var best = null;
    (shuls || []).forEach(function (s) {
      if (!s.schedule || !s.schedule[today]) return;
      ["shacharis", "mincha", "maariv"].forEach(function (t) {
        (s.schedule[today][t] || []).forEach(function (ts) {
          var d = toDate(ts, t);
          if (d && d > now && (!best || d < best.when)) {
            best = { when: d, tefillah: names[t], shul: s.name };
          }
        });
      });
    });
    return best;
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
          else if (!ap && h < 11) h += 12; // most shiurim are evening
          var d = new Date(); d.setHours(h, min, 0, 0);
          if (d > now && (!best || d < best.when)) best = { when: d, shul: s.name, text: e.text };
        });
      });
    });
    return best;
  }

  function build(zman, data) {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var bar = el("div");
    bar.id = "slsi-minyan-bar";
    var link = el("a");
    link.href = "/shuls.html";
    link.style.cssText = "display:flex;flex:1;justify-content:space-around;align-items:stretch;";

    if (zman) link.appendChild(item("\uD83C\uDF07", "Shkia \u00B7 \u05E9\u05E7\u05D9\u05E2\u05D4", zman, null, false));

    var shuls = data && data.shuls;
    var nm = shuls ? nextMinyan(shuls) : null;
    var ns = shuls ? nextShiur(shuls) : null;
    link.appendChild(item("\uD83D\uDD52", "Next Minyan",
      nm ? (nm.tefillah + " " + fmt(nm.when)) : "See schedule",
      nm ? nm.shul : "Tap for all shuls", false));
    link.appendChild(item("\uD83D\uDCD6", "Next Shiur",
      ns ? fmt(ns.when) : "See schedule",
      ns ? ns.shul : null, true));

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
