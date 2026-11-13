# Soundwave

A private music streaming web app for family and friends. An admin uploads songs with cover art, genre and lyrics, and invited members can stream them, build playlists, save favorites, request new songs and cast to the TV. It installs as a PWA on phones and desktops.

> The app is invite-only. There is no public sign-up, and every song, cover and page sits behind a login. The UI is available in English and Danish.

## Features

**For members**
- **Library**: search all songs, filter by genre and sort by newest, A–Z or most played.
- **Player**: a mini player and a full-screen player with queue, shuffle, repeat (off / all / one) and seeking. Lock-screen and headset controls work through the Media Session API.
- **Lyrics** in the full player. Section tags such as `[Verse 1]` and `[Chorus]` are turned into verse breaks.
- **Playlists and favorites**: personal playlists you can add to from anywhere, and a favorites list.
- **Chromecast**: cast the current song to a TV through Google's Default Media Receiver, which shows the cover, title and artist.
- **Song requests**: ask for a new song with a title, moods, voice (male, female, duet), style notes and either your own lyrics or a description to write them from.
- **Downloads**: save a song as MP3 through a short-lived signed URL.
- **Install guide**: a step-by-step "add to home screen" screen for iOS and Android.
- **English and Danish**, switchable on the profile page.

**For admins**
- **Upload songs** with cover, genre, artist, album, description, mood tags, release date, explicit flag and lyrics. Duplicate uploads are detected by file hash.
- **Automatic genre suggestion**: two small MusiCNN models listen to 15 seconds of the track in the browser (TensorFlow.js on WebGL + Essentia.js WebAssembly). Nothing is sent to a server.
- **Genre management**: create, rename and delete genres.
- **User management**: invite members by email, resend invites, activate or deactivate accounts, change roles and remove users. The list shows pending invites and when each person last opened the app and last listened.
- **Request inbox**: read song requests and mark them as done.
- **Play counts** per song.

## Security and privacy

- **Invite-only auth** with Supabase Auth. `src/proxy.ts` sends every non-public route to the login page, and pages check the session again on the server.
- **Row Level Security everywhere**: only active members can read songs, and members can only read and write their own playlists, favorites and history. Only admins can write songs, genres and lyrics. Database triggers stop users from changing their own role or active flag.
- **Private storage buckets**: audio and covers are never public. Audio streams through short-lived signed URLs. Covers are served through `/api/cover`, which checks the session first and returns stable URLs so each device caches a cover once.
- **Server-only service key**: the Supabase service role key is used only in server actions for admin tasks (`src/lib/supabase/admin.ts` imports `server-only`).
- **Careful caching**: the service worker caches only static build assets and icons, never HTML, API responses, auth or audio, so nothing private leaks between accounts on a shared device.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4, `lucide-react` icons |
| Backend | Supabase: Postgres with RLS, Auth, Storage |
| Audio ML | TensorFlow.js, Essentia.js (WebAssembly), MusiCNN genre models |
| Casting | Google Cast Web Sender SDK |
| Platform | PWA (web manifest, service worker, generated icons), hosted on Vercel |
| Tests | Jest, Testing Library |
| Component library | Storybook 10 with the accessibility addon |
| CI | GitHub Actions: lint, typecheck and tests on every push |

## Project structure

Every folder in `src` has one job. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains the layers and how a request flows through them.

```
src/
  proxy.ts                  Auth gate for every route
  app/
    (app)/                  Signed-in app: library, favorites, playlists, request, profile
      admin/                Upload, songs, genres, users, requests (admin only)
    api/cover/              Session-checked cover images
    login/ forgot-password/ set-password/ auth/   Login, reset and invite flows
    manifest.ts pwa-icon/   PWA manifest and generated icons
  components/               React components and their Storybook stories
    player/                 PlayerProvider (queue, shuffle, repeat, signed URLs), mini/full player, lyrics, cast
    InstallGate.tsx         Install-to-home-screen guide
    I18n.tsx                Language context
  services/                 Data access: Supabase queries (library.ts, playlists.ts)
  lib/                      Integrations
    supabase/               Browser, server and admin (service role) clients
    auth.ts                 requireUser and requireAdmin
    genreSuggest.ts         In-browser genre detection
    cast.ts                 Chromecast sender
  utils/                    Pure helper functions (lyrics.ts)
  constants/                Fixed values (songs.ts, requests.ts)
  i18n/                     English and Danish texts, language helpers
  types/                    Shared TypeScript types, one file per domain
__tests__/                  Jest tests, mirroring the folders in src/
.storybook/                 Storybook setup
.claude/CLAUDE.md           Project rules for the Claude Code agent
docs/ARCHITECTURE.md        Layers, request flow, tests and component library
supabase/
  migrations/               Schema, RLS policies, storage buckets, functions
  promote_initial_admin.sql One-time script that makes the first user admin
public/
  models/genre/             MusiCNN models (TF.js format)
  vendor/essentia/          Essentia.js WebAssembly build (AGPL-3.0, unmodified)
  sw.js                     Service worker
```

## Database

| Table | Contents |
| --- | --- |
| `profiles` | One row per auth user: name, email, role (`admin` / `user`), active flag, last seen |
| `genres` | Genre names and slugs |
| `songs` | Metadata, genre, storage paths for audio and cover, duration, file hash, play count |
| `song_lyrics` | Lyrics per song |
| `favorites`, `recently_played` | Per-user favorites and listening history |
| `playlists`, `playlist_songs` | Personal playlists and their songs |
| `song_requests` | Requests with moods, voice, notes, lyrics or description, and status |

Storage has two private buckets: `audio` (MP3, max 50 MB) and `covers` (JPEG/PNG/WebP, max 5 MB). Helper functions such as `is_admin()`, `is_active_member()` and `count_play()` are `security definer` functions with a fixed `search_path`, and the RLS policies use them.

## Getting started

Requirements: Node.js 20+ and a Supabase project.

```bash
npm install
cp .env.example .env.local     # fill in your Supabase values
```

1. Run the SQL files in `supabase/migrations/` in order (Supabase SQL editor or `supabase db push`).
2. Create your own user under *Authentication > Users*. Put that email in `supabase/promote_initial_admin.sql` and run it to make yourself admin.
3. Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000, log in, and invite others from *Admin > Users*.

### Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm test             # Jest tests
npm run storybook    # component library on http://localhost:6006
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for admin user management |
| `SITE_URL` | Base URL used in invite and password-reset links |
| `NEXT_PUBLIC_MAX_AUDIO_MB` | Optional upload size limit |

## Third-party licenses

- Essentia.js is licensed under AGPL-3.0 and is shipped unmodified in `public/vendor/essentia` together with its license.
- The MusiCNN genre models come from the Essentia project (MTG, Universitat Pompeu Fabra) and are used under their own license terms.

## Security note

This repository contains no credentials or personal data. All keys are supplied through environment variables, and the live deployment is private.
