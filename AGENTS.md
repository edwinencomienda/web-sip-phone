# AGENTS.md

## Build & Development Commands

- `pnpm dev` - Start Vite dev server
- `pnpm build` - Compile TypeScript and build with Vite
- `pnpm lint` - Run ESLint on all TypeScript files
- No test runner configured; add Jest/Vitest if needed

## Architecture & Structure

React + TypeScript + Vite SPA using shadcn/ui components. Path alias `@/*` maps to `src/*`.

**Key directories:**

- `src/components/` - React components (UI + shadcn/ui)
- `src/lib/` - Utilities and helper functions
- `src/assets/` - Static assets
- `public/` - Vite public assets

## Code Style & Conventions

- **TypeScript** - Use strict types, prefer interfaces over types for component props
- **React** - Functional components with hooks; use React 19 features
- **Imports** - Use `@/` alias for internal imports (e.g., `import { Button } from '@/components/ui/button'`)
- **Linting** - ESLint with React Hooks, React Refresh, TypeScript strict rules; run `pnpm lint` before commits
- **Styling** - Tailwind CSS v4 + CSS variables; use `clsx`/`cn()` for conditional classes
- **Icons** - Lucide React via shadcn/ui
- **Components** - Use shadcn/ui base-lyra style; keep components in `src/components/ui/` or feature folders

## Main library to build Web SIP Phone App

https://jssip.net/
