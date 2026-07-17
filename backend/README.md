# Lingo Palm backend

Django/DRF backend for the Lingo Palm language-learning project.

## Users app

`apps/users/` is implemented:

- app label `users`, `AppConfig.name = "apps.users"`;
- custom model `User` (email as the unique identifier, no `username` field);
- `AUTH_USER_MODEL = "users.User"`;
- migrations are included (`apps/users/migrations/0001_initial.py`).

**Decision:** authentication uses standard SimpleJWT via the `Authorization: Bearer <token>`
header (`rest_framework_simplejwt.authentication.JWTAuthentication`), obtained through
`POST /api/users/login/`. This is the deliberate choice for now, not a placeholder.

An httpOnly-cookie-based login/refresh/logout flow is planned for later (better XSS
resistance, at the cost of needing CSRF handling and cross-origin cookie config). The
`JWT_*_COOKIE_*` settings in `base.py` / `.env` are reserved for that future work and
currently have no effect — don't be confused if you see them unused.

In the meantime, since the access token lives in the frontend's hands: keep it in memory
(e.g. a JS variable / React state), not `localStorage` or `sessionStorage`, to limit
exposure if the site ever has an XSS bug. The refresh token can be persisted more
durably, but treat it as sensitive too.

> **Known issue to fix before shipping this to real users:** `UserSerializer` currently
> exposes `is_staff` and `is_active` as writable fields, and it's reused by both
> `UserProfileView` (`/api/users/me/`) and registration (`UserSerializerWithToken`).
> That lets any authenticated user promote themselves to staff via `PATCH /me/`, and
> lets anyone register as staff directly. Split into a self-service serializer (no
> `is_staff`/`is_active`) for `/me/` and `/register/`, and keep the current
> `UserSerializer` only for the admin-only `/api/users/` list/detail views.

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

All endpoints below require authentication (`Authorization: Bearer <access_token>`)
unless noted. Learners can read published course content and dictionary data; writes
require `is_staff=True`.

```text
POST           /api/users/register/           (public — creates a user, returns a token)
POST           /api/users/login/               (public — returns access + refresh tokens)
GET/PATCH/PUT  /api/users/me/                  (any authenticated user — own profile)
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

Creating a teaching mapping is atomic. Example:

```json
{
  "section_id": 42,
  "sense_ids": [455],
  "subtitle_words": [
    {
      "word": "look",
      "cue_id": "4",
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
      "cue_id": "5",
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

The section detail response groups related subtitle words under the same mapping ID.
The frontend can assign one color per mapping ID without inferring relationships.

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
