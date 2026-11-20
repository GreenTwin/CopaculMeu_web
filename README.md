# CopaculMeu Web Client (My Tree)

A modern, responsive, open-source web and mobile application for mapping, exploring, and checking in on urban trees throughout the city.

- **Initial Focus:** Timișoara, Romania (`[45.75372, 21.22571]`)
- **Technology Philosophy:** 100% Open Technologies (OpenStreetMap, Leaflet/MapLibre, React)
- **Backend Integration:** REST API with OpenAPI specification (`http://localhost:8080/v3/api-docs`)

---

## UI tests

Playwright covers the current screen: language, sign-in, the guest gate on Propose Tree, demo mode, search, and theme. The Google tests check the button on Sign In and Register, that demo mode hides it, and that a rejected token stays on the sign-in form. A completed sign-in uses the same callback as the Google button. Playwright cannot finish Google's own account chooser, and the API accepts only a token Google signed.

```bash
npm run test:e2e
```

## Technical Documentation

Detailed architectural decisions, data models, map clustering algorithms, UI design specifications, and mobile migration roadmap are documented in:

👉 **[TECHNICAL_DOCUMENTATION.md](file:///c:/Projects/compacul_meu/CopaculMeu_web/TECHNICAL_DOCUMENTATION.md)**

---

## Core Capabilities Planned
1. **Interactive Clustered Map:** OpenStreetMap-powered interface grouping dense trees into sleek, modern, glassmorphic count bubbles at higher zoom levels.
2. **Tree Inspection & Health Tracking:** Color-coded markers indicating tree vitality, soil moisture, and drought alerts.
3. **GPS-Verified Check-ins:** Proximity-validated check-in system allowing volunteers to log watering and maintenance.
4. **Mobile-First & Cross-Platform Ready:** Designed in React for easy translation to native iOS & Android (via Capacitor or React Native).