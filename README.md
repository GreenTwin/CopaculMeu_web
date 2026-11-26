# CopaculMeu Web Client (My Tree)

A modern, responsive, open-source web and mobile application for mapping, exploring, and checking in on urban trees throughout the city.

- **Initial Focus:** Timișoara, Romania (`[45.75372, 21.22571]`)
- **Technology Philosophy:** 100% Open Technologies (OpenStreetMap, Leaflet/MapLibre, React)
- **Backend Integration:** REST API with OpenAPI specification (`http://localhost:8080/v3/api-docs`)

---

## UI tests

Playwright covers the current screen: language, sign-in, the guest gate on Propose Tree, tree search, theme, the phone menu, and the map zoom buttons. Those buttons are hidden on a phone and sit at the bottom right on wider screens. On a phone, language, theme, Settings, and the three map buttons sit in that menu. Tablets and desktops keep them in the header and along the bottom of the map. The Google tests check the button on Sign In and Register, and that a rejected token stays on the sign-in form. A completed sign-in uses the same callback as the Google button. Playwright cannot finish Google's own account chooser, and the API accepts only a token Google signed.

```bash
npm run test:e2e
```

## Local preview

`npm run dev` can sign you in as an admin and fill `/admin/users` with dummy rows. A production build ignores these flags.

Copy the two lines into `.env.local` (that file stays on your machine):

```
VITE_LOCAL_ADMIN=true
VITE_LOCAL_DUMMY_USERS=true
```

Restart the dev server after saving the file. The same preview is available for one visit at `/admin/users?localAdmin=1&localUsers=1`. Add `localAdmin=0` or `localUsers=0` to turn that flag off for the visit, including when `.env.local` has it on. Leave both off before `npm run test:e2e` if the dev server was started with them.

The dummy rows use the columns of the live `users` table: `id`, `email`, `password_hash`, `salt`, `hash_version`, `role`, `status`, `name`, `created_at`, `updated_at`, `google_sub`, `apple_sub`, `auth_method`, `password_changed_at`. The screen does not show the password hash, salt, or Google and Apple ids. `last_login_at` is not on that table yet, so the last-login column stays empty in this preview. Tree counts are the same computed field the admin list uses, not a column of `users`.

## Technical Documentation

Detailed architectural decisions, data models, map clustering algorithms, UI design specifications, and mobile migration roadmap are documented in:

👉 **[TECHNICAL_DOCUMENTATION.md](file:///c:/Projects/compacul_meu/CopaculMeu_web/TECHNICAL_DOCUMENTATION.md)**

---

## Core Capabilities Planned
1. **Interactive Clustered Map:** OpenStreetMap-powered interface grouping dense trees into sleek, modern, glassmorphic count bubbles at higher zoom levels.
2. **Tree Inspection & Health Tracking:** Color-coded markers indicating tree vitality, soil moisture, and drought alerts.
3. **GPS-Verified Check-ins:** Proximity-validated check-in system allowing volunteers to log watering and maintenance.
4. **Mobile-First & Cross-Platform Ready:** Designed in React for easy translation to native iOS & Android (via Capacitor or React Native).