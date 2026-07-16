# Lingo Palm backend

Django/DRF backend for the Lingo Palm language-learning project.

## Important: add the users app first

`apps/users/` is intentionally empty, as requested. Before running Django commands, copy your custom users app into that directory and make sure:

- its `AppConfig.name` is `apps.users`;
- its app label is `users`;
- it defines a custom model named `User`;
- `AUTH_USER_MODEL = "users.User"` remains valid;
- its migrations are included, or you run `python manage.py makemigrations users` before the first `migrate`.

The cookie-based SimpleJWT login/refresh/logout integration is intentionally deferred until your users app code is available. The project currently configures standard SimpleJWT authentication through the `Authorization: Bearer ...` header so the rest of the API structure is complete.

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

Production requirements do not install it, and production settings never install or route the development-only `scraper_admin` app.

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

After adding the users app:

```bash
python manage.py makemigrations users dictionary courses
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

`manage.py` uses `config.settings.development` by default.

## Main models

### Dictionary

- `Entry`: one Longman entry (word + part of speech), with pronunciation and frequency stored in JSON fields.
- `Sense`: one independent dictionary sense, identified by a unique title such as `head_verb_1`.

### Courses

- `Course`: title, description, thumbnail, level, and publish state.
- `Section`: video URL, locally uploaded VTT file, order, and publish state.
- `WordSenseMapping`: one teaching unit, linked to one or more senses.
- `SubtitleWord`: one admin-selected word occurrence. Several rows can share one mapping for phrasal verbs or expressions, including non-adjacent words or words spanning cues.

## API overview

All main endpoints require authentication. Learners can read published course content and dictionary data; writes require `is_staff=True`.

```text
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

The section detail response groups related subtitle words under the same mapping ID. The frontend can assign one color per mapping ID without inferring relationships.

## Development-only scraper endpoints

These routes exist only with `config.settings.development`:

```text
POST   /api/scraper/scrape/
DELETE /api/scraper/reject/
```

Scrape request:

```json
{"word": "book"}
```

The response contains `entry_ids` and the complete newly saved entries for admin review. Duplicate words are rejected case-insensitively before Playwright starts.

Reject request:

```json
{"entry_ids": [101, 102]}
```

Rejection deletes the entries, their senses, and unreferenced pronunciation files. It is refused if a sense is already used by a course mapping.

## Production

Use:

```bash
DJANGO_SETTINGS_MODULE=config.settings.production   gunicorn config.wsgi:application
```

Production intentionally excludes `apps.scraper_admin`, never imports `longman_scraper`, and does not install Playwright.
