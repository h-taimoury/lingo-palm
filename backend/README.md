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
- `Section`: optional Local video URL (`local_video_url`) and Hosted video URL
  (`hosted_video_url`), locally uploaded VTT file, order, and publish state.
  Migration `courses.0004` renames the old `video_url` column without losing its
  values. Both URL fields accept omission or an empty string through the API.
- `WordSenseMapping`: one teaching unit, linked to one or more senses.
- `SubtitleWord`: one admin-selected word occurrence. Several rows can share one
  mapping for phrasal verbs or expressions, including non-adjacent words or words
  spanning cues.

### My Vocabulary

- `Vocabulary`: one row per (`user`, `sense`) — the learner's own
  learned/known-senses collection. Fields: `already_known` (learner already
  knew this sense before using the platform, so it shouldn't count toward
  "learned via the site" activity stats), `needs_review` (whether this
  sense should currently surface in review/flashcard-style features), and
  `created_at`. `already_known` and `needs_review` are independent booleans
  — the backend never forces one to be the logical negation of the other at
  the database level, though certain bulk actions set both together (see
  API overview below). Unique constraint on (`user`, `sense`).

  There is deliberately no separate "learned whole Entry" or "learned whole
  word" model or action — a learner saying "I know the word book" does not
  mean every sense Longman records for "book" (see the design note in the
  API overview below). Word/entry-level actions were considered and
  removed; every write to `Vocabulary` operates on an explicit list of
  sense ids.

  `apps.my_vocabulary` depends only on `apps.users` and `apps.dictionary` —
  it has no knowledge of `apps.courses`. `apps.courses` is the one allowed
  to depend on `apps.my_vocabulary` (same one-directional dependency
  pattern as `courses` -> `dictionary`), which is how section/course
  progress percentages get computed (see API overview below).

## API overview

All endpoints below require authentication (JWT in an httpOnly cookie, sent
automatically by the browser) unless noted. Learners can read published
course content and dictionary data; writes require `is_staff=True`. The
`my-vocabulary` endpoints are the one exception to the staff/non-staff
split — every authenticated user, staff or not, only ever sees and affects
their own vocabulary rows.

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
GET            /api/courses/sections/{id}/taught-senses/
GET/POST       /api/courses/word-sense-mappings/
GET/PUT/DELETE /api/courses/word-sense-mappings/{id}/
GET/POST       /api/courses/subtitle-words/
GET/PUT/DELETE /api/courses/subtitle-words/{id}/

GET            /api/my-vocabulary/vocabulary/
POST           /api/my-vocabulary/vocabulary/bulk-action/
```

Use `GET /api/dictionary/senses/?needs_translation=true` for the translation
queue. It returns paginated senses used in at least one section (including draft
sections) whose translation is null or empty. Each sense appears once even if it
is used in several sections. Save a translation with
`PATCH /api/dictionary/senses/{id}/` and `{"translation": "دویدن"}`; the sense
will no longer appear in the queue. Omitting the filter or setting it to `false`
leaves the normal sense list unchanged.

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

### Section and course progress

`GET /api/courses/courses/{id}/` (course detail, nested sections) and
`GET /api/courses/sections/{id}/` (section detail) both include
`new_words_count` and `learned_percentage`, computed live per-request for
the calling user by comparing the set of distinct senses taught by that
section/course against the caller's `my_vocabulary` rows. These two fields
are **not** included on the plain course/section list responses — computing
them for every card in a list would be too expensive, so they only appear
on retrieve/detail.

### Taught senses for a section

`GET /api/courses/sections/{id}/taught-senses/` returns a flat (not
paginated) array of every distinct sense taught by the section, each
annotated with the calling user's `my_vocabulary` state for that sense
(`is_learned`, and — only when `is_learned` is true — `already_known` /
`needs_review`). This is the endpoint backing the "senses taught in this
section" panel; the frontend splits the response into interactable "new"
senses (`is_learned: false`) and non-interactable "already learned" ones.

## My Vocabulary bulk actions

All writes to a learner's vocabulary collection go through one endpoint,
`POST /api/my-vocabulary/vocabulary/bulk-action/`, reused across every
place in the UI where a learner acts on a list of senses (the section's
taught-senses panel, and both lists — "needs review" / "doesn't need
review" — on the `/my-vocabulary` page). There is no separate
create/update/delete endpoint for a single `Vocabulary` row; a single
sense is just a one-item `sense_ids` array.

Request:

```json
{ "action": "set_already_known", "sense_ids": [55, 56] }
```

`action` is one of six fixed values:

| action | effect | applies to |
|---|---|---|
| `set_already_known` | `already_known=True`, `needs_review=False` | creates a row if none exists |
| `unset_already_known` | `already_known=False`, `needs_review=True` | existing rows only |
| `set_learned` | `already_known=False`, `needs_review=True` (defaults) | creates a row if none exists |
| `unset_learned` | deletes the row entirely | existing rows only (others silently ignored) |
| `set_needs_review` | `needs_review=True` only, `already_known` untouched | existing rows only |
| `unset_needs_review` | `needs_review=False` only, `already_known` untouched | existing rows only |

Response is the full, current list of affected `Vocabulary` rows for every
action except `unset_learned`, which instead returns:

```json
{
  "detail": "The vocabulary entries for these senses were deleted.",
  "sense_ids": [55, 56]
}
```

**There is no "mark whole word/entry as learned" action.** This was
deliberately removed: a learner saying "I know the word book" does not
mean literally every sense Longman records for "book" — some, like a rare
"part of a very large book, e.g. the Bible" sense, are not implied by that
claim even for an advanced learner. If the frontend wants a "whole
word/entry" convenience, it must resolve the actual sense list client-side
(e.g. via `/api/dictionary/entries/` or
`/api/dictionary/senses/?search=<word>`), show it to the user for
confirmation, and submit the confirmed `sense_ids` — the backend will never
silently expand a word or entry into "all its senses."

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

Returned entries are checked by headword and `source_entry_id`, because Longman
has two distinct `Junior` entries with neither a part of speech nor a homonym
number. The scraper stores `entry:<HTML ID>`, falling back to `sense:<first sense
HTML ID>` when the entry has no ID. Missing both IDs fails with an explicit error.
`homonym_num` remains Longman's original number; no numbers are invented.
Migration `dictionary.0008` adds the optional source ID and makes headword plus
source ID unique. Existing/manual entries retain an empty source ID and the
legacy uniqueness rule (headword, part of speech, homonym number). Save validation
also checks legacy conflicts when a new source ID is supplied; it does not
automatically backfill, merge, or replace existing entries. A URL alias such as
`take-off` cannot bypass these checks by returning the headword `take off`.
Headword capitalization is preserved: `passion` and `Passion` can be distinct
dictionary entries. The existing `(entry, title)` constraint prevents repeated
sense titles within an entry. Bulk mapping imports only link existing sense IDs.
Run `python manage.py migrate` before relying on the new database protection.
Existing conflicting entries must be reviewed if the migration fails; it does
not automatically delete or merge dictionary data.

Reject request:

```json
{"entry_ids": [101, 102]}
```

Rejection deletes the entries, their senses, and unreferenced pronunciation files. It
is refused if a sense is already used by a course mapping.

## Subtitle occurrence ownership

`courses.0003` enforces one mapping per exact subtitle occurrence using the
database constraint `unique_subtitle_occurrence_per_section` on
`(section, cue_id, word, position_in_cue)`. Punctuation and case are preserved;
`position_in_cue` is the occurrence number for that exact token, not its absolute
token index. Repeated words in different cues or sections remain valid.

`SubtitleWord.section` is an internal key derived from its mapping by `save()`
and `bulk_create()`. SQLite/PostgreSQL triggers enforce agreement with the parent
mapping even for direct SQL writes. Moving a mapping with subtitle words to a
different section is rejected. Direct bulk updates must keep both keys consistent.
Normal API creates/edits reject overlaps with HTTP 400; bulk import continues to
skip occupied occurrences. Database uniqueness also protects concurrent writes.

The migration backfills existing records and refuses existing overlaps without
deleting or merging data. Other database engines require equivalent consistency
guards before this migration can run. Future migrations rebuilding these tables
must preserve/reinstall the guards.

## Production

### Neon database

Install `requirements/production.txt` on Render; the shared requirements include
the Psycopg PostgreSQL driver. Set `DATABASE_URL` in Render's environment to the
connection URL from Neon, retaining `sslmode=require` and any other security
parameters supplied by Neon. Production requires an explicit PostgreSQL URL.
Pooled URLs are supported; use a direct URL for migrations and data imports.

Locally, `backend/.env` is ignored by Git. You may keep a `NEON_DATABASE_URL`
there while preparing deployment, but that variable alone does not switch the
application to Neon. Only `DATABASE_URL` selects the active database; leaving it
unset preserves the existing local SQLite default. To use Neon locally, set
`DATABASE_URL` to the Neon URL in the command's environment before starting Django.
Never commit real credentials to either example environment file.

Migrations create tables, but do not copy existing SQLite course or dictionary
data. Transfer that data separately before switching the deployed app to Neon.

Use:

```bash
DJANGO_SETTINGS_MODULE=config.settings.production   gunicorn config.wsgi:application
```

Production intentionally excludes `apps.scraper_admin`, never imports
`longman_scraper`, and does not install Playwright.

### Render free demo

The repository-root `render.yaml` creates one free Python web service using
`backend` as its root directory. It does not create a Render database: Neon is
the database. Choose a Render region close to your Neon project when creating
the service. Python stays on the 3.12 series via `backend/.python-version`.

For manual setup, use:

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Build command | `bash build.sh` |
| Start command | `bash start.sh` |
| Health check | `/healthz/` |
| Instance | Free |

Set these environment variables in Render, not in Git:

- `DJANGO_SETTINGS_MODULE=config.settings.production`
- `DJANGO_SECRET_KEY`: generate a long random secret (the Blueprint generates it).
- `DATABASE_URL`: your direct Neon connection string, retaining SSL parameters.
- `CSRF_TRUSTED_ORIGINS=https://lingo-palm-frontend.vercel.app`

Render's own hostname is added to `ALLOWED_HOSTS` automatically. Set
`ALLOWED_HOSTS` only for additional custom hostnames. Leave `JWT_COOKIE_DOMAIN`
and `CSRF_COOKIE_DOMAIN` unset or empty for the free-domain demo.

The build installs production dependencies, checks deployment settings, and
collects Django/admin static assets. The start script applies pending migrations
before starting one Gunicorn worker with four threads. A failed migration stops
startup. This startup migration approach is for a single-instance demo; move
migrations to a release/pre-deploy job before scaling. The health check does not
query Neon, so Render's polling does not keep the database awake.

#### Public course files

Git now includes JPG/JPEG/PNG/WebP thumbnails, VTT subtitles, and MP3 pronunciation
files under their existing `media/course_thumbnails`, `media/section_subtitles`,
and `media/pronunciation_audios` directories. Include these newly visible files
when committing. WhiteNoise serves those bundled directories at `/media/` with
`DEBUG=False`, plus collected admin assets at `/static/`. Existing database file
paths are unchanged. Subtitles have the `text/vtt` content type; audio supports
range requests. All bundled assets are public, just as in development.

Author files locally, commit them, and redeploy. WhiteNoise indexes files at
startup; runtime uploads are not supported by this deployment workflow and
Render's ephemeral disk does not preserve them. Do not edit/delete bundled
course files through the production admin. Newly authored course records must
also be transferred to Neon: deploying files does not synchronize SQLite data.
SQLite files, `.env`, and private transfer backups remain ignored by Git.

#### Vercel authentication contract

The free Vercel and Render domains cannot share a cookie domain. The frontend
must proxy browser `/api/` requests through its own origin to Render, forwarding
cookies, `Origin`, and `X-CSRFToken`, and relaying every `Set-Cookie` header.
Browser requests must use relative same-origin API URLs. Server-side requests
use `DJANGO_ORIGIN=https://<your-service>.onrender.com` and forward cookies.
The frontend now implements this proxy automatically in production; its local
development mode keeps direct browser API requests. Set `DJANGO_ORIGIN` in Vercel
to the actual Render service URL before deploying the frontend.
No cross-origin CORS allowlist is needed for this proxy arrangement. Do not set
a cookie domain to `.vercel.app` or `.onrender.com`. If both apps later use
sibling custom subdomains, the existing shared-domain/CORS settings still work.

#### Local development and verification

Keep using `python manage.py runserver` with development requirements and local
SQLite. No Render environment variables are required locally. Production file
middleware and secure-cookie defaults are only enabled by production settings;
development media serving, scraper routes, and localhost behavior stay intact.

To run deployment regression tests as well, install production dependencies
alongside development dependencies, then run:

```bash
python manage.py test config apps.users apps.courses apps.dictionary apps.my_vocabulary
```

Do not run tests against the Neon database. The default development settings
use a separate SQLite test database when `DATABASE_URL` is unset.
