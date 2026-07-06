export default async (request, context) => {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;
  const html = await response.text();
  if (html.includes("minyan-bar.js")) return new Response(html, response);
  const tag = '<script src="/js/minyan-bar.js" defer></script>';
  const injected = html.includes("</body>")
    ? html.replace("</body>", tag + "</body>")
    : html + tag;
  return new Response(injected, response);
};

export const config = { path: "/*" };