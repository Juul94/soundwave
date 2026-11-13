# Architecture

Soundwave is a Next.js App Router app. Every folder in `src` has one job, so it is clear where new code goes.

| Folder | Job | Example |
| --- | --- | --- |
| `src/app` | Routes. A page loads its data on the server and passes it to components. | `app/(app)/page.tsx` |
| `src/components` | What the user sees and clicks. | `components/SongList.tsx` |
| `src/services` | Data access. The functions that query Supabase. | `services/library.ts` |
| `src/lib` | Integrations with outside systems: Supabase clients, auth, Chromecast, genre models. | `lib/auth.ts` |
| `src/utils` | Pure helper functions. Same input always gives the same output. | `utils/lyrics.ts` |
| `src/constants` | Fixed values used in several places. | `constants/requests.ts` |
| `src/i18n` | All UI texts in English and Danish, and the functions that pick the language. | `i18n/dictionary.tsx` |
| `src/types` | Shared TypeScript types, one file per domain. | `types/song.ts` |

## How a request flows

1. `src/proxy.ts` runs first. A visitor without a session is sent to `/login`.
2. The page in `src/app` runs on the server (a Server Component). It checks the session again and reads data through a function in `src/services`, for example `searchSongs` in `services/library.ts`.
3. The page renders components from `src/components` with that data.
4. When the user changes something, a client component calls a Server Action (for example `app/(app)/admin/actions.ts`) or a function in `src/services` (for example `services/playlists.ts`).
5. The database has the last word. Row Level Security in Postgres decides what each user may read and write, so a bug in the UI cannot leak another user's data.

## Folders

```
src/
  proxy.ts            Auth gate for every route
  app/
    (app)/            Pages for signed-in members
      admin/          Admin pages and their Server Actions
    api/cover/        Cover images, served only to signed-in users
    login/ ...        Login, invite and password flows
  components/
    player/           The audio player: state (PlayerProvider), mini and full player, queue, lyrics, cast
    ui.tsx            Small shared building blocks (PageTitle, Empty)
  services/
    library.ts        Search songs, list genres, favorites and history (server)
    playlists.ts      Create, rename, delete and fill playlists (browser)
  lib/
    supabase/         Three clients: browser, server and admin (service role, server only)
    auth.ts           requireUser and requireAdmin
    cast.ts           Chromecast sender
    genreSuggest.ts   In-browser genre detection
  utils/
    lyrics.ts         Splits raw lyrics into lines and verses
  constants/
    songs.ts          Columns to select for a song
    requests.ts       Moods and voices for song requests
  i18n/
    dictionary.tsx    English and Danish texts
    server.ts         getLang and getT for Server Components
    actions.ts        setLang Server Action
  types/
    song.ts profile.ts playlist.ts request.ts lyrics.ts player.ts actions.ts
    index.ts          Re-exports everything, so imports are `from "@/types"`
__tests__/            Jest tests, mirroring the folders in src/
supabase/migrations/  Database schema and security policies
```

## Rules of thumb

- **Server first.** A component is a Server Component unless it needs state, effects or browser APIs. Then it gets `"use client"`.
- **Shared state lives in providers.** `PlayerProvider` holds the queue and playback state. `FavoritesProvider` holds the favorites. Components read them through hooks.
- **Types in one place.** A type used in more than one file is declared once in `src/types` and imported from `@/types`. A type used in one file only, such as component props, stays in that file.
- **Secrets stay on the server.** Files that use the service role key import `server-only`, so the build fails if one is pulled into the browser.

## Tests

Tests live in `__tests__/`, in the same sub-folder as the file they test.

| Kind | Tool | Example |
| --- | --- | --- |
| Logic | Jest | `__tests__/utils/lyrics.test.ts` checks that lyrics are split into lines and verses |
| Components | Jest and Testing Library | `__tests__/components/Cover.test.tsx` checks the image, lazy loading and the fallback |

```bash
npm test            # run all tests once
npm run test:watch  # re-run on save
npm run lint        # ESLint
npm run typecheck   # TypeScript
```

GitHub Actions runs lint, typecheck and tests on every push and pull request (`.github/workflows/ci.yml`).

## Component library

Storybook shows the shared components one at a time, outside the app, so they can be seen and checked without logging in.

A story is one component in one state. Stories sit next to the component and end in `.stories.tsx`.

| Component | Stories |
| --- | --- |
| `PageTitle`, `Empty` (`ui.tsx`) | Title only, with sub text, empty state, empty state with action |
| `Cover` | With image, gradient fallback for two different songs |
| `Logo` | Default, large, animated mark |

```bash
npm run storybook        # http://localhost:6006
npm run build-storybook  # static build in storybook-static/
```

The setup is in `.storybook/`. `preview.ts` loads the app's `globals.css`, so components look the same as in the app. The accessibility addon checks every story for problems such as low contrast.
