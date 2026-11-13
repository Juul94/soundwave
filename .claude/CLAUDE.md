# Soundwave — Private Music Streaming PWA (Next.js)

Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript strict, npm.
UI: Tailwind CSS 4, `lucide-react` icons. Backend: Supabase (Postgres with Row Level Security, Auth, Storage).
Audio ML: TensorFlow.js + Essentia.js (WebAssembly) in the browser. Casting: Google Cast Web Sender. Hosting: Vercel.
Tests: Jest + Testing Library. Component library: Storybook 10 with the accessibility addon. i18n: own dictionary (English and Danish), no library.

Next.js 16 has breaking changes compared to older versions. Read `AGENTS.md` before writing Next.js code.

## Project Structure

```
src/
├── proxy.ts          # Auth gate: sends visitors without a session to /login
├── app/              # Routes (App Router)
│   ├── (app)/        #   Signed-in pages: library, favorites, playlists, request, profile
│   │   └── admin/    #   Admin pages + their Server Actions (actions.ts)
│   ├── api/cover/    #   Cover images, served only to signed-in users
│   └── login/ auth/ forgot-password/ set-password/   # Login, invite and password flows
├── components/       # React components (+ their *.stories.tsx)
│   ├── player/       #   PlayerProvider (queue, playback state), mini/full player, lyrics, cast
│   └── ui.tsx        #   Small shared building blocks (PageTitle, Empty)
├── services/         # Data access: Supabase queries (library.ts on the server, playlists.ts in the browser)
├── lib/              # Integrations: supabase/ clients, auth.ts, cast.ts, genreSuggest.ts
├── utils/            # Pure helper functions, no I/O (lyrics.ts)
├── constants/        # Fixed values (songs.ts, requests.ts)
├── i18n/             # dictionary.tsx (all UI texts), server.ts (getT, getLang), actions.ts (setLang)
└── types/            # Shared TypeScript types, one file per domain, exported from index.ts
__tests__/            # Jest tests, mirroring the folders in src/
.storybook/           # Storybook setup (main.ts, preview.ts)
supabase/migrations/  # Database schema, RLS policies, storage buckets
public/vendor/        # Third-party Essentia.js build — never edit
docs/ARCHITECTURE.md  # Layers and request flow
```

Path alias (tsconfig): `@/*` → `src/*`.

## Commands

- `npm run dev` / `npm run build` — dev server / prod build
- `npm run typecheck` — type check · `npm run lint` — lint
- `npm test` / `npm run test:watch` — Jest
- `npm run storybook` — component library on http://localhost:6006 · `npm run build-storybook` — static build

## Key Patterns

- Layers: pages in `src/app` load data, components in `src/components` render it, `src/services` talks to Supabase. See `docs/ARCHITECTURE.md`.
- Where new code goes: a database query → `services/`, a third-party integration → `lib/`, a pure function → `utils/`, a fixed value → `constants/`, a shared type → `types/`.
- Server first: a component is a Server Component unless it needs state, effects or browser APIs. Only then add `"use client"`.
- Every signed-in page starts with `requireUser()` and every admin page or action with `requireAdmin()` from `@/lib/auth`. `src/proxy.ts` is a first gate, not the only one.
- Pick the Supabase client by where the code runs: `client.ts` in client components, `server.ts` in Server Components and Server Actions, `admin.ts` only for admin user management.
- Row Level Security is the real access control. A new table needs RLS policies in the same migration.
- Audio and covers are private. Audio is played through short-lived signed URLs, covers go through `/api/cover`. Never make a bucket public.
- UI texts live in `src/i18n/dictionary.tsx`. Read them with `useT()` in client components and `getT()` from `@/i18n/server` on the server. Add every new text in both English and Danish.
- Shared state lives in providers (`PlayerProvider`, `FavoritesProvider`) and is read through their hooks.

## Rules

### Code Style

- All code must pass `npm run typecheck`, `npm run lint` and `npm test`.
- Style with Tailwind classes and the theme colors in `src/app/globals.css` (`text-muted`, `bg-accent`, `border-border`). No inline hex colors.
- Search for an existing component, hook, service or util before creating a new one.
- Import with the `@/` alias instead of long relative paths.
- Keep it simple: small functions, clear names, no new abstraction for a single use.

### Types

- No `any`. Every function parameter and return value that TypeScript cannot infer gets a type.
- A type used in more than one file goes in `src/types/<domain>.ts` and is imported from `@/types`.
- A type used in one file only (component props, a context shape) stays in that file.
- Import types with `import type`.

### Tests

- Tests live in `__tests__/`, in the same sub-folder as the file they test: `src/utils/lyrics.ts` → `__tests__/utils/lyrics.test.ts`.
- New logic in `src/utils` and `src/services` gets a test. Pure functions first — they need no mocks.
- Component tests use Testing Library and find elements the way a user does: `getByRole`, `getByText`. No snapshot tests.
- Mock Supabase with `jest.mock("@/lib/supabase/client")`. Tests never call a real database.

### Storybook

- Stories sit next to the component: `Cover.tsx` → `Cover.stories.tsx`.
- One story per state worth seeing (with image, without image). Set the state through `args`.
- A new shared component in `src/components` gets a story. Components that need login or data are left out until they can be shown with plain props.
- Fix what the accessibility panel reports before a story is done.

### Database

- Schema changes go in a new file in `supabase/migrations/`. Never edit a migration that has already run.
- Do not weaken an RLS policy or a database trigger without flagging it.

### Secrets & Config

- Never commit secrets. Local values go in `.env.local` (gitignored); document new variables in `.env.example` with placeholder values.
- `SUPABASE_SERVICE_ROLE_KEY` is server only. A file that uses it must import `server-only`.
- New runtime config is read from environment variables, not hardcoded.

### Safety

- Flag any change touching authentication (`proxy.ts`, `lib/auth.ts`, login and invite flows), RLS or storage access before proceeding.
- Do not add, remove or upgrade dependencies unless explicitly requested.
- The service worker (`public/sw.js`) caches only static build assets. Never cache HTML, API responses, auth or audio.
- Do not deploy to Vercel unless explicitly asked.
