export function buildDjangoBrowserUrl(path: string) {
  if (/^https?:\/\//iu.test(path)) return path;

  // Free Vercel/Render domains cannot share cookies. Production requests use
  // our own /api route; local development keeps its direct Django connection.
  const origin = process.env.NODE_ENV === "production"
    ? ""
    : process.env.NEXT_PUBLIC_DJANGO_ORIGIN ?? "http://localhost:8000";
  const queryIndex = path.indexOf("?");
  const pathname = queryIndex >= 0 ? path.slice(0, queryIndex) : path;
  const query = queryIndex >= 0 ? path.slice(queryIndex) : "";
  const relative = pathname.replace(/^\/?api\//u, "").replace(/^\/+|\/+$/gu, "");

  return `${origin.replace(/\/+$/u, "")}/api/${relative}/${query}`;
}
