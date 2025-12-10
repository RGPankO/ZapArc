# ⚙️ Tech Stack Overview

## 🧱 Monorepo & Tooling
- **Package manager:** [`pnpm`](https://pnpm.io/) – efficient workspace manager  
- **Monorepo management:** native pnpm workspaces (no Nx)  
- **Type system:** [`TypeScript`](https://www.typescriptlang.org/) – shared types across apps  
- **Linting & formatting:** `ESLint`, `Prettier`, `lint-staged`, `Husky`  
- **Env management:** `dotenv` + `zod` for schema validation  
- **CI/CD:** GitHub Actions or Expo EAS pipelines  

## 🧮 Backend (Monolith API)
- **Framework:** [`Express`](https://expressjs.com/)  
- **API layer:** 
  - Option A - **tRPC** - (end-to-end type-safe RPC) 
  - Option B - **NestJS**
- **Database:** [`PostgreSQL`](https://www.postgresql.org/)  
- **ORM:** [`Prisma`](https://www.prisma.io/)  
- **Auth:** Google OAuth2 via [`passport-google-oauth20`](https://www.passportjs.org/packages/passport-google-oauth20/)  
- **Payments:** [`Stripe`](https://stripe.com/docs/api) SDK + webhook integration  
- **Validation & typing:** [`Zod`](https://zod.dev/) shared across client and server  

---

---

## 📱 Mobile App (Frontend)
- **Framework:** [`React Native`](https://reactnative.dev/) via [`Expo`](https://expo.dev/) (managed workflow)  
- **Navigation:** [`React Navigation`](https://reactnavigation.org/)  
- **State management:** [`Zustand`](https://github.com/pmndrs/zustand)  
- **Data fetching:** [`@trpc/client`](https://trpc.io/) + React Query integration  
- **UI library:**  
  - [`React Native Paper`](https://callstack.github.io/react-native-paper/) – ready-made components (Material Design 3)  
  - [`Tamagui`](https://tamagui.dev/) – performant cross-platform design system  
  - NativeWind (Tailwind CSS for React Native) - consistent styling
- **Auth:** [`expo-auth-session`](https://docs.expo.dev/versions/latest/sdk/auth-session/) for Google OAuth2  
- **Payments:** [`@stripe/stripe-react-native`](https://stripe.com/docs/payments/accept-a-payment?platform=react-native)  

---


## 🧪 Testing
- **Test runner:** [`Vitest`](https://vitest.dev/)  
- **Component tests (mobile):** [`@testing-library/react-native`](https://testing-library.com/docs/react-native-testing-library/intro/)  
- **API tests (server):** [`supertest`](https://github.com/ladjs/supertest)  

---

## 🧭 Folder Layout
```plaintext
template/
├── apps/
│   ├── mobile/               # Expo app
│   └── server/               # Express + tRPC + Prisma API
│
├── packages/
│   ├── schema/               # Shared Zod & Prisma types
│   ├── domain/               # Framework-independent logic
│   ├── api-client/           # tRPC client setup
│   ├── ui/                   # Cross-platform UI library
│   ├── config/               # Shared configs
│   ├── feature-auth-core/    # Auth domain logic
│   ├── feature-auth-mobile/  # Auth screens/hooks
│   ├── feature-auth-server/  # Auth routers/controllers
│   └── ...other features
│
│
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Alternative Structure

```plaintext
template/
├── apps/
│   ├── mobile/                     # React Native (Expo) app
│   │   ├── app/                    # Screens & navigation
│   │   ├── components/             # UI components
│   │   ├── features/               # Feature-specific logic (auth, payments, etc.)
│   │   │   ├── auth/
│   │   │   │   ├── hooks/
│   │   │   │   ├── screens/
│   │   │   │   └── utils/
│   │   │   ├── payments/
│   │   │   └── profile/
│   │   ├── hooks/                  # App-level hooks (global state, tRPC client, etc.)
│   │   ├── providers/              # Context providers (AuthProvider, ThemeProvider)
│   │   ├── utils/                  # Helpers & constants
│   │   ├── trpc/                   # tRPC client setup
│   │   ├── env.ts
│   │   ├── App.tsx
│   │   └── package.json
│   │
│   └── server/                     # Express + tRPC backend
│       ├── src/
│       │   ├── main.ts             # Server entry point
│       │   ├── env.ts
│       │   ├── prisma/
│       │   │   ├── client.ts
│       │   │   └── schema.prisma
│       │   ├── trpc/
│       │   │   ├── index.ts        # Root router
│       │   ├── features/
│       │   │   ├── auth/           # Google OAuth, JWT, refresh tokens
│       │   │   ├── payments/      # Stripe handlers, routers & webhooks
│       │   │       ├── payments.router.ts  
│       │   │   └── user/
│       │   ├── services/           # Database or external service logic
│       │   ├── utils/              # Shared helpers
│       │   └── index.ts
│       ├── Dockerfile
│       ├── docker-compose.yml
│       └── package.json
│
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
└── package.json

```

## 🐳 Using Docker
You can use Docker to spin up a local PostgreSQL instance for development.  
A simple `docker-compose.yml` can be placed at the project root:

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: apppass
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🧰 Project Replication via AI (Simplified Copy-Paste Prompt)

You are a code generator. **Replicate the current repository** into a new pnpm workspace, **rename everything** to the new project name, and **install only the modules that are listed below**.  
Rule: **if a module line is removed, it is NOT installed.**  
If a kept module has dependencies (e.g., `auth-google` or `payments-stripe`), **auto-include** their required deps.

### Project
- New workspace name: <NEW_PROJECT_NAME>

### Actions
1) Copy the entire repo structure (apps/mobile, apps/server, scripts, root files).
2) Rename all references to `<NEW_PROJECT_NAME>` (root, mobile Expo config, server package name, README title).
3) From the list below, **install only the modules that remain**. Remove any line to exclude.
4) Prune code for excluded modules (delete feature folders, routers/screens, imports, env keys).
5) Keep workspace configs the same (pnpm workspace, TS, ESLint/Prettier/Husky).

### Selected Modules (delete lines to exclude)
- trpc-core
- db-prisma
- docker-postgres
- auth-google
- payments-stripe
- profile
- ui-tamagui
- tests-vitest

