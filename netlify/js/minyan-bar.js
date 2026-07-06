// Auto-adds the minyan bar to every page on the site.
// Place this file at: netlify/edge-functions/minyan-bar.js
// Nothing else to configure — Netlify picks it up on the next deploy.

export default async (request, context) => {
  const response = await context.next();

  // Only touch HTML pages — leave images, CSS, JSON, etc. alone
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();

  // Don't add it twice if a page already includes it
  if (html.includes("minyan-bar.js")) {
    return new Response(html, response);
  }

  const tag = '<script src="/js/minyan-bar.js" defer></script>';
  const injected = html.includes("</body>")
    ? html.replace("</body>", tag + "</body>")
    : html + tag;

  return new Response(injected, response);
};

export const config = { path: "/*" };