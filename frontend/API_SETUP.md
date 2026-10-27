# Django requests and deployment

## Local development

Copy `.env.example` to `.env.local`, install dependencies with `npm install`,
then run `npm run dev`. Run Django on port 8000 and open the frontend at
`http://localhost:3000`.

Use the same browser-facing hostname for both applications: `localhost:3000`
and `localhost:8000`, or `127.0.0.1:3000` and `127.0.0.1:8000`. If using the
latter, update `NEXT_PUBLIC_DJANGO_ORIGIN` accordingly. Cookies are shared
across ports, but not between `localhost` and `127.0.0.1`.

## Requests and authentication

Client Components use `apiClient`. During `npm run dev`, it calls Django directly
using `NEXT_PUBLIC_DJANGO_ORIGIN` (default `http://localhost:8000`). In production
(`next build` / `next start`), it calls same-origin `/api/*` URLs through the
Next.js API proxy, even if an old public Django origin is still set. It sends
cookies, adds the CSRF header for mutations, parses responses, and refreshes/retries
expired sessions. No page or component needs its own proxy code.

Server Components use `djangoServerFetch` with `DJANGO_ORIGIN`, forwarding
cookies from the incoming request. If omitted, `DJANGO_ORIGIN` defaults to
`NEXT_PUBLIC_DJANGO_ORIGIN`, then `http://localhost:8000` for development.
It can be an internal address reachable by the Next.js server.

`/auth/refresh` remains a dedicated server-rendering authentication route:
it refreshes through Django, forwards `Set-Cookie`, and redirects back so the
browser can send the new cookies when rendering the page again.

The more-specific `/api/backend-media/*` route continues to serve Django media
URLs used by thumbnails and subtitles; the API catch-all does not replace it.

## Production: Vercel frontend and Render backend

The frontend is `https://lingo-palm-frontend.vercel.app`. In Vercel's project
settings, set the server-only environment variable below to the actual Render
URL, then deploy. Use `frontend` as Vercel's root directory and the Next.js preset.

```dotenv
DJANGO_ORIGIN=https://YOUR-RENDER-SERVICE.onrender.com
```

Do not use the placeholder literally. No `NEXT_PUBLIC_DJANGO_ORIGIN` is required
in production. Keep database credentials on Render only. Enable Vercel Fluid
compute (the default) for the proxy's 120-second duration, allowing time for a
sleeping Render free service to wake up. The first request may still be slow.

Run Django with `config.settings.production` and the values in
`backend/.env.production.example`, including:

```dotenv
CORS_ALLOWED_ORIGINS=
CSRF_TRUSTED_ORIGINS=https://lingo-palm-frontend.vercel.app
JWT_COOKIE_DOMAIN=
CSRF_COOKIE_DOMAIN=
```

The proxy forwards cookies, the original `Origin`, and `X-CSRFToken` to Render.
It relays each `Set-Cookie` separately, so cookies belong to the Vercel frontend
and are available for server-rendered pages. JWT cookies remain HttpOnly and
Secure; the CSRF cookie remains readable. Django still checks CSRF on mutations.
API responses are never cached. The destination is fixed by `DJANGO_ORIGIN`,
and the proxy does not follow upstream redirects to other hosts.

Do not set a cookie domain to `.vercel.app` or `.onrender.com`. Preview domains
need their exact origins added to Django's CSRF allowlist if you want to use them.
The same proxy approach also works with future custom domains.

When switching an existing deployment from shared-domain cookies, clear the old
access/refresh/CSRF cookies and sign in again to avoid duplicate cookie names.

## Verification

- `npm test`: development requests, production routing, cookie/CSRF forwarding,
  multipart bodies, validation errors, refresh/logout, and proxy failure cases.
- `npm run lint`: ESLint.
- `npm run build`: production build.
- From `backend`: `.venv/Scripts/python.exe manage.py test apps.users`.

After deployment, verify registration/login, a protected server-rendered page,
a CSRF-protected update, token refresh, and logout in the browser.
