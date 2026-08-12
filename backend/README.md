# Lingo Palm backend

Django/DRF backend for the Lingo Palm language-learning project.

## Users app

`apps/users/` is implemented:

- app label `users`, `AppConfig.name = "apps.users"`;
- custom model `User` (email as the unique identifier, no `username` field);
- `AUTH_USER_MODEL = "users.User"`;
- migrations are included (`apps/users/migrations/0001_initial.py`).

**Decision:** authentication uses JWTs stored in httpOnly cookies
(`access_token` / `refresh_token`, names configurable via `JWT_ACCESS_COOKIE_NAME`
/ `JWT_REFRESH_COOKIE_NAME`), obtained through `POST /api/users/login/` or
`POST /api/users/register/`. Requests are authenticated by
`apps.users.authentication.CookieJWTAuthentication`, which reads the access
token from the cookie (SimpleJWT still does the actual validation). Unsafe
methods (POST/PUT/PATCH/DELETE) additionally require Django's CSRF token
(`X-CSRFToken` header, value read from the non-httpOnly `csrftoken` cookie).
This is the deliberate choice, not a placeholder.

Since the tokens live in httpOnly cookies, the frontend never reads or
stores them directly — it just needs to send every request with
credentials included, and attach the CSRF header on unsafe requests.

`UserSerializer` (used by `/me/`) exposes `is_staff` as a **read-only**
field so the frontend can immediately know whether the logged-in user is an
admin (to decide whether to show admin UI) without being able to write it.
`is_active` is not exposed on `/me/`. Both `is_staff` and `is_active` are
writable on `UserSerializerForAdmins`, used only by the admin-only
`/api/users/` list/detail views (`IsAdminUser`-gated).

## Expected folder layout

```text
projects/
├── longman_scraper/
│   ├── pyproject.toml
│   └── src/
└── lingo_palm/
    ├── frontend/
    └── backend/       # extract this archive here
```

The development requirements install the independent scraper package with:

```text
-e ../../longman_scraper
```

Production requirements do not install it, and production settings never install or
route the development-only `scraper_admin` app.

## Setup

```bash
cd projects/lingo_palm/backend
python -m venv .venv
```

Activate the virtual environment, then install development dependencies:

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements/development.txt
python -m playwright install chromium
```

Create the environment file:

```bash
cp .env.example .env
```

Run migrations and start the server:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

`manage.py` uses `config.settings.development` by default.

## Main models

### Users

- `User`: custom user model, authenticated by `email` instead of a username.
  `is_staff` marks admins who can write course/dictionary data; `is_active`
  controls whether the account can log in.

### Dictionary

- `Entry`: one Longman entry (word + part of speech), with pronunciation and frequency
  stored in JSON fields.
- `Sense`: one independent dictionary sense, identified by a unique title such as
  `head_verb_1`.

### Courses

- `Course`: title, description, thumbnail, level, and publish state.
- `Section`: video URL, locally uploaded VTT file, order, and publish state.
- `WordSenseMapping`: one teaching unit, linked to one or more senses.
- `SubtitleWord`: one admin-selected word occurrence. Several rows can share one
  mapping for phrasal verbs or expressions, including non-adjacent words or words
  spanning cues.

## API overview

All endpoints below require authentication (JWT in an httpOnly cookie, sent
automatically by the browser) unless noted. Learners can read published
course content and dictionary data; writes require `is_staff=True`.

```text
POST           /api/users/register/           (public — creates a user, sets auth cookies)
POST           /api/users/login/               (public — sets auth cookies)
POST           /api/users/refresh/             (public — rotates the refresh cookie; requires CSRF header)
POST           /api/users/logout/              (public — clears auth cookies; requires CSRF header)
GET/PATCH/PUT  /api/users/me/                  (any authenticated user — own profile; includes read-only is_staff)
GET            /api/users/                     (staff only — list all users)
GET/PUT/PATCH/DELETE /api/users/{id}/          (staff only — manage a specific user)

GET/POST       /api/dictionary/entries/
GET/PUT/DELETE /api/dictionary/entries/{id}/
GET/POST       /api/dictionary/senses/
GET/PUT/DELETE /api/dictionary/senses/{id}/

GET/POST       /api/courses/courses/
GET/PUT/DELETE /api/courses/courses/{id}/
GET/POST       /api/courses/sections/
GET/PUT/DELETE /api/courses/sections/{id}/
GET/POST       /api/courses/word-sense-mappings/
GET/PUT/DELETE /api/courses/word-sense-mappings/{id}/
GET/POST       /api/courses/subtitle-words/
GET/PUT/DELETE /api/courses/subtitle-words/{id}/
```

Creating a teaching mapping is atomic (the mapping and all its subtitle
words are created together, or not at all). Note the create payload uses
`section` and `senses` (matching the model's own field names directly) —
this is different from the key used to update an existing mapping's senses
(`sense_ids`, see below). This asymmetry is intentional, not a typo.

Create example — `POST /api/courses/word-sense-mappings/`:

```json
{
  "section": 42,
  "senses": [455],
  "subtitle_words": [
    {
      "word": "look",
      "cue_id": 4,
      "cue_start_time": 10.2,
      "cue_end_time": 12.7,
      "previous_cue_start_time": 7.8,
      "previous_cue_end_time": 10.1,
      "next_cue_start_time": 12.8,
      "next_cue_end_time": 15.0,
      "position_in_cue": 4
    },
    {
      "word": "up",
      "cue_id": 5,
      "cue_start_time": 12.8,
      "cue_end_time": 15.0,
      "previous_cue_start_time": 10.2,
      "previous_cue_end_time": 12.7,
      "next_cue_start_time": 15.1,
      "next_cue_end_time": 18.0,
      "position_in_cue": 1
    }
  ]
}
```

Update example — `PATCH /api/courses/word-sense-mappings/{id}/` (only the
senses can be changed after creation; section and subtitle_words are not
editable through this endpoint):

```json
{ "sense_ids": [455, 460] }
```

The section detail response (`GET /api/courses/sections/{id}/`) groups
related subtitle words under the same mapping ID. The frontend can assign
one color per mapping ID without inferring relationships.

## Development-only scraper endpoints

These routes exist only with `config.settings.development`, and require
`is_staff=True`:

```text
POST   /api/scraper/scrape/
DELETE /api/scraper/reject/
```

Scrape request:

```json
{"word": "book"}
```

The response contains `entry_ids` and the complete newly saved entries for admin
review. Duplicate words are rejected case-insensitively before Playwright starts.

Reject request:

```json
{"entry_ids": [101, 102]}
```

Rejection deletes the entries, their senses, and unreferenced pronunciation files. It
is refused if a sense is already used by a course mapping.

## Production

Use:

```bash
DJANGO_SETTINGS_MODULE=config.settings.production   gunicorn config.wsgi:application
```

Production intentionally excludes `apps.scraper_admin`, never imports
`longman_scraper`, and does not install Playwright.
