# Direct Django requests

## Local development

Copy `.env.example` to `.env.local`, install dependencies with `npm install`,
then run `npm run dev`. Run Django on port 8000 and open the frontend at
`http://localhost:3000`.

Use the same browser-facing hostname for both applications: `localhost:3000`
and `localhost:8000`, or `127.0.0.1:3000` and `127.0.0.1:8000`. If using the
latter, update `NEXT_PUBLIC_DJANGO_ORIGIN` accordingly. Cookies are shared
across ports, but not between `localhost` and `127.0.0.1`.

## Requests and authentication

Client Components use `apiClient`, which calls Django directly using
`NEXT_PUBLIC_DJANGO_ORIGIN`. It sends cookies with `credentials: "include"`,
adds the CSRF header for mutations, parses responses, and refreshes/retries
expired sessions. There is no general `/api/backend/*` gateway.

Server Components use `djangoServerFetch` with `DJANGO_ORIGIN`, forwarding
cookies from the incoming request. If omitted, `DJANGO_ORIGIN` defaults to
`NEXT_PUBLIC_DJANGO_ORIGIN`, then `http://localhost:8000` for development.
It can be an internal address reachable by the Next.js server.

`/auth/refresh` remains a dedicated server-rendering authentication route:
it refreshes through Django, forwards `Set-Cookie`, and redirects back so the
browser can send the new cookies when rendering the page again.

The separate `/api/backend-media/*` route still serves existing Django media
URLs used by thumbnails and subtitles. Removing the API gateway does not
change media delivery.

## Production: lingopalm.com and api.lingopalm.com

Use `.env.production.example` as the frontend deployment template. Set
`NEXT_PUBLIC_DJANGO_ORIGIN=https://api.lingopalm.com` **before building**;
Next.js embeds public environment variables into the browser bundle.
Rebuild when changing this address. Use HTTPS on both domains.

Run Django with `config.settings.production` and the values in
`backend/.env.production.example`, including:

```dotenv
CORS_ALLOWED_ORIGINS=https://lingopalm.com
CSRF_TRUSTED_ORIGINS=https://lingopalm.com,https://api.lingopalm.com
JWT_COOKIE_DOMAIN=.lingopalm.com
CSRF_COOKIE_DOMAIN=.lingopalm.com
```

Django allows credentialed CORS requests. Its production settings use secure,
shared-domain JWT and CSRF cookies. JWT cookies remain HttpOnly; the CSRF
cookie is readable so the frontend can send `X-CSRFToken`. Shared JWT cookies
also let Next.js authenticate server-rendered pages. Logout expires cookies
using the same domain used when setting them.

When migrating a running deployment from host-only gateway cookies, clear the
old access/refresh/CSRF cookies for both hosts and sign in again. Old host-only
cookies and new domain cookies can otherwise coexist with the same names.

## Verification

- `npm test`: direct API requests, uploads, validation errors, and refresh flows.
- `npm run lint`: ESLint.
- `npm run build`: production build.
- From `backend`: `.venv/Scripts/python.exe manage.py test apps.users`.

After deployment, verify registration/login, a protected server-rendered page,
a CSRF-protected update, token refresh, and logout in the browser.
