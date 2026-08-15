# M11 Frontend Architecture

## Overview

The MigrationGuard frontend is a React single-page application (SPA) built with Vite and TypeScript. It consumes the Fastify REST API and provides authenticated access to the verification dashboard and research website.

## Tech Stack

| Concern        | Technology                   |
| -------------- | ---------------------------- |
| Framework      | React 18                     |
| Build tool     | Vite                         |
| Language       | TypeScript (strict mode)     |
| Routing        | React Router v6              |
| Styling        | CSS Modules (vanilla CSS)    |
| Auth           | JWT (localStorage)           |
| HTTP           | `fetch` (native)             |
| Static serving | Nginx (production container) |

## Directory Structure

```
apps/frontend/
├── src/
│   ├── main.tsx               # Entrypoint
│   ├── App.tsx                # Router root
│   ├── contexts/
│   │   └── AuthContext.tsx    # JWT auth state
│   ├── layouts/
│   │   ├── MainLayout.tsx     # Public layout (header/footer)
│   │   └── DashboardLayout.tsx # Authenticated sidebar layout
│   ├── pages/
│   │   ├── Home.tsx           # Research/landing page
│   │   ├── Login.tsx          # JWT login form
│   │   ├── Dashboard.tsx      # Overview stats
│   │   ├── Runs.tsx           # Verification run history
│   │   └── RunDetail.tsx      # Run detail + evidence + reviewer actions
│   └── index.css              # Global design tokens
├── nginx.conf                 # SPA routing + API proxy
├── Dockerfile                 # Multi-stage build
└── package.json
```

## Routing

| Path                  | Component   | Auth Required |
| --------------------- | ----------- | ------------- |
| `/`                   | `Home`      | No            |
| `/login`              | `Login`     | No            |
| `/dashboard`          | `Dashboard` | Yes           |
| `/dashboard/runs`     | `Runs`      | Yes           |
| `/dashboard/runs/:id` | `RunDetail` | Yes           |

## Authentication Flow

1. User submits credentials to `/api/auth/login`
2. On success, JWT stored in `localStorage`
3. `AuthContext` reads JWT on mount, decodes payload for role/user info
4. Protected routes redirect to `/login` if JWT absent
5. `Authorization: Bearer <token>` header injected on all authenticated API calls

## API Communication

The frontend communicates via relative `/api/*` paths. In development (`npm run dev`), Vite's proxy rewrites these to `http://localhost:3001`. In production (Docker), Nginx's reverse proxy handles the routing to `backend:3001`.

## Design System

- **Dark mode first**: `--color-bg: #0a0f1a`, `--color-surface: #111827`
- **Accent**: electric blue `#3b82f6` with hover states
- **Typography**: Inter (Google Fonts)
- **Spacing**: 8px base grid
- **Components**: CSS Modules with BEM-inspired naming
