// Auto-adds the site chrome (emergency strip, top bar, nav, footer, minyan bar)
// to every HTML page on the site.
// Place this file at: netlify/edge-functions/minyan-bar.js
// Nothing else to configure — Netlify picks it up on the next deploy.

const NAV_LINKS = [
  ["/", "Home", "home"],
  ["/directory.html", "Directory", "directory"],
  ["/marketplace.html", "Market", "marketplace"],
  ["/simcha.html", "Simchas", "simcha"],
  ["/coupons.html", "Coupons", "coupons"],
  ["/advertise.html", "Ads", "advertise"],
  ["/jobs.html", "Jobs", "jobs"],
  ["/realty.html", "Realty", "realty"],
  ["/community.html", "Community", "community"],
  ["/shuls.html", "Shuls", "shuls"],
  ["/shiurim.html", "Shiurim", "shiurim"],
  ["/eruv.html", "Eruv", "eruv"],
  ["/mikvah.html", "Mikvah", "mikvah"],
];

const HEAD_CSS = `
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Caveat:wght@600;700&display=swap" rel="stylesheet">
<style>
.slsi-inj-emstrip{background:#cc2222;padding:.38rem 2rem;display:flex;justify-content:center;align-items:center;gap:1.25rem;flex-wrap:wrap;font-size:.68rem;font-weight:600;font-family:'Montserrat',sans-serif;color:#fff;}
.slsi-inj-emstrip a{color:rgba(255,255,255,.92);text-decoration:none;}
.slsi-inj-emstrip a:hover{color:#fff;}
.slsi-inj-emstrip .sep{color:rgba(255,255,255,.35);}
.slsi-inj-emstrip .em-label{color:rgba(255,255,255,.6);font-size:.62rem;letter-spacing:1px;text-transform:uppercase;}
.slsi-inj-topbar{background:#0d2137;padding:.42rem 2.5rem;display:flex;align-items:center;justify-content:space-between;font-size:.7rem;font-family:'Montserrat',sans-serif;color:#fff;}
.slsi-inj-topbar .tag{color:rgba(255,255,255,.9);text-align:center;flex:1;text-transform:uppercase;letter-spacing:2px;font-weight:700;font-size:.65rem;}
.slsi-inj-topbar .right{display:flex;gap:1rem;align-items:center;}
.slsi-inj-topbar .right a{color:rgba(255,255,255,.7);font-size:.72rem;text-decoration:none;}
.slsi-inj-topbar .right a:hover{color:#fff;}
.slsi-inj-nav{background:#fff;border-bottom:1px solid #dde4ea;padding:0 2.5rem;display:flex;align-items:center;justify-content:space-between;min-height:70px;box-shadow:0 2px 16px rgba(11,31,58,.07);font-family:'Montserrat',sans-serif;flex-wrap:wrap;gap:.5rem;}
.slsi-inj-nav .brand{display:flex;align-items:center;gap:.7rem;text-decoration:none;padding:.6rem 0;}
.slsi-inj-nav .brand img{height:56px;width:56px;object-fit:contain;}
.slsi-inj-nav .brand .words{display:flex;flex-direction:column;line-height:1;}
.slsi-inj-nav .brand .row{display:flex;align-items:baseline;gap:.2rem;}
.slsi-inj-nav .brand .shop{font-size:1.15rem;font-weight:800;color:#0b1f3a;letter-spacing:1px;text-transform:uppercase;}
.slsi-inj-nav .brand .local{font-size:1.15rem;font-weight:800;color:#3e7c59;letter-spacing:1px;text-transform:uppercase;}
.slsi-inj-nav .brand .si{font-size:.55rem;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#0b1f3a;margin-top:.15rem;}
.slsi-inj-nav ul{display:flex;list-style:none;margin:0;padding:0;flex-wrap:wrap;align-items:center;}
.slsi-inj-nav ul a{font-size:.7rem;font-weight:600;color:#1a2a3a;letter-spacing:.5px;text-transform:uppercase;padding:.5rem .65rem;text-decoration:none;position:relative;}
.slsi-inj-nav ul a:hover{color:#3e7c59;}
.slsi-inj-nav ul a.on{color:#3e7c59;}
.slsi-inj-nav ul a.on::after{content:'';position:absolute;bottom:-2px;left:.65rem;right:.65rem;height:2px;background:#3e7c59;border-radius:1px;}
.slsi-inj-nav .cta{background:#3e7c59;color:#fff;padding:.48rem 1.05rem;border-radius:50px;font-weight:700;font-size:.68rem;letter-spacing:.3px;text-transform:uppercase;text-decoration:none;white-space:nowrap;}
.slsi-inj-nav .cta:hover{background:#4a9469;}
.slsi-inj-foot{background:#0b1f3a;color:#fff;padding:2.5rem 2rem 1.25rem;font-family:'Montserrat',sans-serif;border-top:4px solid #3e7c59;margin-top:3rem;}
.slsi-inj-foot .inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2rem;}
.slsi-inj-foot h4{font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:.75rem;}
.slsi-inj-foot ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:.4rem;}
.slsi-inj-foot a{color:rgba(255,255,255,.85);text-decoration:none;font-size:.78rem;}
.slsi-inj-foot a:hover{color:#7ee8a2;}
.slsi-inj-foot .bottom{max-width:1100px;margin:1.5rem auto 0;border-top:1px solid rgba(255,255,255,.08);padding-top:1rem;font-size:.7rem;color:rgba(255,255,255,.6);text-align:center;}
@media(max-width:768px){
  .slsi-inj-topbar{display:none;}
  .slsi-inj-emstrip{gap:.5rem;font-size:.6rem;padding:.3rem .75rem;}
  .slsi-inj-nav{padding:0 1rem;}
  .slsi-inj-nav ul a{font-size:.62rem;padding:.4rem .35rem;letter-spacing:.2px;}
}
</style>`;

const EMSTRIP = `
<div class="slsi-inj-emstrip">
  <span class="em-label">Emergency</span>
  <a href="tel:7182301000">Hatzolah 718-230-1000</a><span class="sep">·</span>
  <a href="tel:7183702121">Shomrim 718-370-2121</a><span class="sep">·</span>
  <a href="tel:7187614444">Shmira 718-761-4444</a><span class="sep">·</span>
  <a href="tel:7187612428">Chaveirim 718-761-2428</a><span class="sep">·</span>
  <a href="tel:7188717299">Chavivim 718-871-7299</a><span class="sep">·</span>
  <a href="tel:7188544548">Misaskim 718-854-4548</a>
</div>
<div class="slsi-inj-topbar">
  <div style="width:100px"></div>
  <div class="tag">Support Local · Strengthen Community</div>
  <div class="right">
    <a href="mailto:info@shoplocalsi.com">✉ Email</a>
    <a href="/donate.html">❤ Donate</a>
  </div>
</div>`;

function buildNav(currentPath) {
  const links = NAV_LINKS.map(([href, label, key]) => {
    const active = currentPath === href || (currentPath === "/" && key === "home");
    return `<li><a href="${href}"${active ? ' class="on"' : ""}>${label}</a></li>`;
  }).join("");
  return `<nav class="slsi-inj-nav">
  <a class="brand" href="/">
    <img src="/logo.png" alt="Shop Local SI" onerror="this.style.display='none'">
    <div class="words">
      <div class="row"><span class="shop">Shop</span><span class="local">Local</span></div>
      <div class="si">Staten Island</div>
    </div>
  </a>
  <ul>${links}</ul>
  <a class="cta" href="/advertise.html">List Your Business</a>
</nav>`;
}

const FOOTER = `
<footer class="slsi-inj-foot">
  <div class="inner">
    <div>
      <h4>Explore</h4>
      <ul>
        <li><a href="/directory.html">Directory</a></li>
        <li><a href="/marketplace.html">Marketplace</a></li>
        <li><a href="/coupons.html">Coupons</a></li>
        <li><a href="/simcha.html">Simcha</a></li>
        <li><a href="/jobs.html">Jobs</a></li>
      </ul>
    </div>
    <div>
      <h4>Community</h4>
      <ul>
        <li><a href="/shuls.html">Shuls &amp; Minyanim</a></li>
        <li><a href="/shiurim.html">Shiurim</a></li>
        <li><a href="/eruv.html">Willowbrook Eruv</a></li>
        <li><a href="/mikvah.html">Mikvaos</a></li>
        <li><a href="/community.html">Community Resources</a></li>
      </ul>
    </div>
    <div>
      <h4>Support COJO</h4>
      <ul>
        <li><a href="/donate.html">❤ Donate to COJO</a></li>
        <li><a href="/advertise.html">Advertise / List</a></li>
      </ul>
    </div>
    <div>
      <h4>Emergency</h4>
      <ul>
        <li><a href="tel:7182301000">Hatzolah 718-230-1000</a></li>
        <li><a href="tel:7183702121">Shomrim 718-370-2121</a></li>
        <li><a href="tel:7188544548">Misaskim 718-854-4548</a></li>
      </ul>
    </div>
  </div>
  <div class="bottom">© 2026 Shop Local Staten Island · Strengthening our community · <a href="mailto:info@shoplocalsi.com" style="color:#7ee8a2;text-decoration:none;">info@shoplocalsi.com</a></div>
</footer>`;

export default async (request, context) => {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  let html = await response.text();
  const url = new URL(request.url);
  const pathname = url.pathname;

  // ---- Minyan bar script (unchanged) ----
  if (!html.includes("minyan-bar.js")) {
    const tag = '<script src="/js/minyan-bar.js" defer></script>';
    html = html.includes("</body>") ? html.replace("</body>", tag + "</body>") : html + tag;
  }

  // ---- Site chrome: only inject on pages that don't already have their own ----
  // Skip pages that already declare .slsi-inj-nav (nothing does) OR that already
  // contain a top-level <nav> element (like index.html). This is the safe rule:
  // if a page already has a <nav>, leave it alone.
  const hasOwnNav = /<nav[\s>]/i.test(html);
  if (!hasOwnNav) {
    // Add CSS in head
    if (html.includes("</head>")) {
      html = html.replace("</head>", HEAD_CSS + "</head>");
    }
    // Add strip + nav right after <body>
    const nav = buildNav(pathname);
    if (/<body[^>]*>/i.test(html)) {
      html = html.replace(/<body([^>]*)>/i, `<body$1>${EMSTRIP}${nav}`);
    }
    // Add footer before </body>
    if (html.includes("</body>")) {
      html = html.replace("</body>", FOOTER + "</body>");
    }
  }

  return new Response(html, response);
};

export const config = { path: "/*" };