# 🌩️ CLOUD NET

### India's Intelligent Real-Time Weather Observation, Verification & Atmospheric Awareness Platform

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.14-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4.8-FF6384?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![Open-Meteo](https://img.shields.io/badge/Open--Meteo-Free_API-00B4D8)](https://open-meteo.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**CloudNet** is a full-stack, production-grade meteorological intelligence and situational awareness platform built exclusively for India's weather landscape. It aggregates **live Open-Meteo sensor telemetry**, **citizen crowdsource reports**, and **simulated social media feeds** into a unified operational cockpit — running entirely in the browser with **zero backend infrastructure**.

---

## 📑 Table of Contents

- [Project Overview](#-project-overview)
- [System Architecture](#-system-architecture)
- [How AI Is Used](#-how-ai-is-used)
- [End-to-End Data Flow](#-end-to-end-data-flow)
- [Core Features](#-core-features)
- [Technology Stack](#-technology-stack)
- [Service Layer Deep-Dive](#-service-layer-deep-dive)
- [Component Map](#-component-map)
- [Directory Structure](#-directory-structure)
- [Gaps & Improvement Roadmap](#-gaps--improvement-roadmap)
- [Getting Started](#-getting-started)
- [Configuration & Integration](#-configuration--integration)
- [Deployment Guide](#-deployment-guide)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌐 Project Overview

CloudNet is a **zero-backend, client-side weather intelligence platform** that demonstrates how modern browser APIs, free open-data APIs, and rule-based AI can be combined to build a production-quality operational dashboard.

**Core problem it solves:** India receives hundreds of hyperlocal weather events daily — from IMD bulletins, citizen reports, and social media. There is no unified public-facing platform to aggregate, deduplicate, and verify all of these in real time. CloudNet fills that gap.

**Key design decisions:**
- **No API keys needed** — uses only free, open APIs (Open-Meteo, Nominatim, OpenStreetMap, Zippopotam)
- **No backend** — all state lives in browser memory + `localStorage`, with a `SpatialHashGrid` as the in-memory geospatial store
- **No hardcoded seed events** — all data is pulled live from Open-Meteo APIs on every cold start
- **AI is rule-based + pattern-matching**, not LLM-powered — making it deterministic, fast, and offline-capable
- **40+ Indian cities** polled in parallel every 45 seconds via `Promise.allSettled()`

---

## 🏗️ System Architecture

```
+---------------------------+  +--------------------+  +-----------------------+
|     Live Data Sources     |  | Geocoding Services |  |   Simulation Engine   |
| Open-Meteo (40+ cities)   |  | Nominatim / OSM    |  | Synthetic tweet gen   |
| Citizen GPS form submit   |  | Open-Meteo Geocode |  | Big Data batch (300+) |
| Simulated Twitter/X feed  |  | Zippopotam PIN API |  | Scenario injectors    |
+---------------------------+  +--------------------+  +-----------------------+
              |                         |                         |
              v                         v                         v
+------------------------------------------------------------------+
|              Intelligent Processing Engine  (processingEngine.ts)|
|  1. Spam & Text Filter  (13 pattern blacklist)                   |
|  2. India Geo-Fence     (Lat 5-38N, Lng 67-99E)                  |
|  3. Haversine Dedup     (<= 18km radius + <= 4h window)          |
|  4. NLP Classifier      (keyword scoring -> 7 IMD categories)    |
|  5. Confidence Scorer   (source trust + NLP match)               |
|  6. Verification Tag    (verified / unverified / flagged / dup)  |
+------------------------------------------------------------------+
              |
              v
+------------------------------------------------------------------+
|              State & Persistence Layer                            |
|  inMemoryEventsCache (primary)                                   |
|  localStorage cloudnet_weather_events_v2 (top 1000, serialized)  |
|  SpatialHashGrid (20km cells, O(1) bucket lookup)                |
|  Custom Event Bus: window.dispatchEvent('cloudnet_events_updated')|
+------------------------------------------------------------------+
              |
   +----------+----------+----------+----------+----------+
   v          v          v          v          v          v
MapView   LiveFeed   Analytics  Chatbot   AdminPanel  HyperLocal
Leaflet   Stream     Chart.js   NLP AI    Moderation  GPS+PIN+Loc
```

### Component Communication Pattern

All state flows **top-down** from `App.tsx`. Cross-component sync uses a **custom DOM event bus**:
- `saveEvents()` dispatches `cloudnet_events_updated` on `window`
- `App.tsx` listens and calls `setEvents(e.detail)` to trigger React re-render
- This avoids prop-drilling while keeping state in a single source of truth

---

## 🤖 How AI Is Used

CloudNet uses **5 distinct AI/intelligence layers**. Here is an honest breakdown of each:

### 1. Rule-Based NLP Event Classifier (`processingEngine.ts → classifyEventCategory`)

**What it does:** Classifies incoming free-text weather reports into one of 7 IMD categories.

**How it works:**
- Maintains `CATEGORY_KEYWORDS` — 7 categories × 10–15 domain keywords including regional Indian terms: *barish, bijli, kalbaishakhi, kohra, loo, andhi, Norwester*
- Scores each category by keyword hit count across the combined text
- Returns the highest-scoring category + confidence score (55%–99%)
- Fallback: `rainfall` at 45% confidence when no keywords match

**Strength:** Handles Indian regional vocabulary well. Fast, deterministic, no external calls.

**Weakness:** Fails on typos, sarcasm, code-mixed Hindi-English. No semantic understanding.

**Upgrade path:** Replace with TF-IDF weighted scoring or a lightweight ONNX fastText model (~2MB) for 10x better accuracy on noisy social text.

---

### 2. Automated Verification & Deduplication Engine (`processingEngine.ts → evaluateEventRules`)

**What it does:** Assigns a verification status to every incoming event before it hits the UI.

**Pipeline (runs in order — first match wins):**
1. **Spam gate** — scans for 13 banned patterns (`crypto`, `casino`, `bit.ly`, `giveaway`, etc.)
2. **Geo-fence gate** — validates coordinates are within India's bounding box; flags if outside
3. **Text length gate** — rejects reports with fewer than 8 characters
4. **Haversine deduplication** — for every existing event: if category matches AND distance ≤ 18km AND time diff ≤ 4h → mark `duplicate`, link to parent via `mergedWithId`
5. **Source trust scoring** — API events → `verified` + 95%+ confidence; citizen → `unverified` + 65–88%; Twitter → boosted 10% if contains `#imd`

**Strength:** Very accurate for structured API data. Deduplication prevents alert fatigue effectively.

**Weakness:** Spam detection is keyword-only and can be bypassed with slight obfuscation. No anomaly detection (e.g., 47°C reported in Shimla in January would pass through).

---

### 3. WMO Code → IMD Category Mapper (`weatherApi.ts → mapWmoToCategory`)

**What it does:** Translates raw Open-Meteo WMO codes + live telemetry readings into structured IMD event categories.

**Priority logic (first match wins):**
1. Temperature ≥ 42°C → `heatwave` (≥45°C = `extreme`)
2. Wind ≥ 45 km/h → `strong wind`
3. WMO 95/96/99 → `thunderstorm`
4. WMO 45/48 → `fog`
5. Precipitation > 25mm → `flooding`
6. Any precipitation → `rainfall`
7. Temp ≥ 38°C + Wind ≥ 28 km/h → `dust storm`
8. Default → `rainfall` at `low` severity

**Gap:** Many WMO codes (71–77 blizzard, 56–57 ice, drizzle sub-codes) all collapse to `rainfall` default. Should be expanded to cover all 100 WMO codes.

---

### 4. Conversational AI Weather Chatbot (`aiWeatherAssistant.ts → generateAIWeatherResponse`)

**What it does:** Natural language query → live-data-injected weather briefing.

**How it works:**
- City detection: iterates all 40+ `MAJOR_INDIAN_CITIES`, checks if query `includes(city.name.toLowerCase())`
- Category detection: keyword matches for rain/flood/storm/heat/fog/dust/wind
- Injects live `events[]` data (temperature, severity, description, confidence score) into response
- Returns optional `suggestedAction` (type: `focus_city` or `filter_category`) that triggers real UI interaction

**Action chip integration:** When user clicks "Focus Mumbai on Map" chip, `onFocusCity('Mumbai')` is called, which centers the Leaflet map and shifts the atmospheric mood.

**Weakness:** Cannot handle compound queries ("flooding AND storm in Mumbai"), follow-up questions, or conversational context. Each message is stateless.

**Upgrade path (highest impact):** Replace `generateAIWeatherResponse()` with a Gemini API call:
```typescript
// Current: keyword matching
const response = generateAIWeatherResponse(query, events);

// Upgraded: Gemini API with event context
const response = await callGeminiWithContext(query, events);
// Events serialized as JSON context in system prompt
// Enables: Hindi queries, compound filters, follow-ups, nuanced safety advice
// Cost: Free tier (Gemini 2.0 Flash) — no billing required
```
The chat UI, action chips, and data interfaces are already fully built. Only the response generator needs to change.

---

### 5. Spatial Hash Grid (`spatialIndex.ts → SpatialHashGrid`)

**What it does:** In-memory 2D geospatial index for fast proximity and bounding-box queries.

**How it works:**
- Divides India into 20km × 20km grid cells
- Maps each event to a `latCell:lngCell` string key in a `Map<string, WeatherEvent[]>`
- `queryRadius(lat, lng, radiusKm)` — expands to neighboring cells, runs Haversine exact-match on candidates
- `queryBoundingBox(box, maxLimit)` — returns up to 600 events visible within map viewport
- Global singleton `globalSpatialGrid` shared across all services

**Performance:** O(1) cell lookup, scales to thousands of events with sub-millisecond query times.

---

## 🔄 End-to-End Data Flow

### Cold Start (First Load)
```
Browser opens → App.tsx mounts
  → getStoredEvents() checks localStorage
    → Empty: returns [], shows loading skeleton
  → fetchAllIndianCitiesLiveWeather() fires
    → Promise.allSettled([40+ fetchLiveCityWeather() calls])
    → Each call: Open-Meteo /v1/forecast → mapWmoToCategory() → WeatherEvent
  → batchAddEvents(liveCitiesData)
    → merge with existing → saveEvents()
    → inMemoryEventsCache updated
    → localStorage persisted (top 1000)
    → SpatialHashGrid rebuilt
    → window.dispatchEvent('cloudnet_events_updated')
  → App.tsx: setEvents(e.detail)
  → Loading skeleton dismissed, all components render
```

### Auto-Refresh (Every 45 Seconds)
```
setInterval(45000) fires → fetchAllIndianCitiesLiveWeather()
  → New events prepended via batchAddEvents()
  → UI updates reactively via custom event bus
```

### Citizen Report Submission
```
User fills CitizenReportModal
  → 1-tap GPS: navigator.geolocation.getCurrentPosition()
    → Closest city matched by min Euclidean distance from MAJOR_INDIAN_CITIES
  → handleSubmit() → addEventWithProcessing(rawEvent)
    → evaluateEventRules() runs full 5-stage pipeline
    → Returns: { event, isDuplicate, isFlagged, flagReason }
  → saveUserReport() → cloudnet_user_reports_v1 localStorage key
  → onReportSubmitted(result.event) → App.tsx setEvents()
  → confetti() fires → AI result badge shown
```

### Hyperlocal "My Area" GPS Flow
```
User enables "My Area" toggle
  → GPS permission requested
  → reverseGeocodeCoords(lat, lng) → Nominatim API
    → Returns: { name: 'Bandra', state: 'Maharashtra' }
  → fetchLiveCoordinatesWeather(lat, lng, name, state)
    → Open-Meteo /v1/forecast?latitude=...&longitude=...
    → mapWmoToCategory() → WeatherEvent
  → handleSelectHyperlocalEvent() → addEventWithProcessing() → storage
  → Map centers on pin, atmospheric mood shifts
```

### PIN Code Search Flow
```
User enters 6-digit PIN → searchByPinCode(pin)
  → Try 1: Zippopotam API (https://api.zippopotam.us/in/{pin})
  → Try 2: Open-Meteo Geocoding (fallback)
  → Try 3: Nominatim postalcode search (final fallback)
  → Resolved coords → fetchLiveCoordinatesWeather() → event created
```

### Map Click → Microclimate Fetch
```
User clicks anywhere on Leaflet canvas
  → onMapClickCoords(lat, lng) in App.tsx
  → reverseGeocodeCoords(lat, lng) → locality name
  → fetchLiveCoordinatesWeather(lat, lng, name) → live event
  → handleSelectHyperlocalEvent() → stored + displayed
```

### Admin Moderation Flow
```
Admin authenticates (PIN: admin123 → localStorage 'cloudnet_admin_auth_v1')
  → AdminPanel renders paginated event table (40/page)
  → Verify → updateEventStatus(id, 'verified') → confidence set to max(95, existing)
  → Flag → updateEventStatus(id, 'flagged') → confidence set to 10
  → Delete → deleteEvent(id) → filtered from array
  → Export CSV → exportEventsAsCsv() → data-URL download
  → Export JSON → exportEventsAsJson() → JSON data-URL download
```

---

## ✨ Core Features

### 🛰️ Real-Time Multi-Source Ingestion
- **Open-Meteo Live API** — 40+ Indian cities fetched in parallel, auto-polled every 45s
- **Citizen GPS Reports** — modal with 1-tap GPS, photo evidence, AI verification feedback
- **Simulated Social Stream** — random-city tweet generator injected through full processing pipeline
- **Hyperlocal GPS** — "My Area" neighborhood-level microclimate via device GPS + reverse geocoding

### 🧠 Automated Intelligence Pipeline
- Haversine spatial deduplication (18km / 4h window) with parent event `duplicateCount` increment
- India territory geo-fencing (lat/lng bounding box)
- Keyword NLP classifier with Indian regional vocabulary (7 categories)
- Confidence scoring by source trust + NLP match quality (0–99%)
- Spam interception with 13-pattern blacklist

### 🗺️ Interactive Geospatial Radar Map
- Leaflet.js with custom category-colored SVG markers per event
- Doppler radar sweep animation overlay (CSS keyframe animation)
- Click any coordinate on the map canvas → instant live microclimate fetch
- Viewport-culled rendering via `SpatialHashGrid.queryBoundingBox()`
- All `FilterBar` selections propagate live to visible map markers

### 🌦️ Atmospheric Immersion Engine (`WeatherAtmosphere.tsx`)
- Full-screen HTML Canvas particle engine — 7 unique weather modes
- **Rainfall**: diagonal rain streaks + surface splash ripples
- **Thunderstorm**: stochastic lightning flashes with storm ambiance
- **Flooding**: water-reflection shimmer + moisture particles
- **Heatwave**: radiant heat mirage waves + solar glare
- **Fog**: drifting volumetric mist layers
- **Dust Storm**: terracotta dust clouds + sand particles
- **Strong Wind**: horizontal aerodynamic slipstream streaks
- Radial gradient ambient glow overlay per weather type (700ms CSS transition)

### 🤖 AI Weather Copilot Chatbot
- Floating chat UI with 6 quick-question chips
- City-specific briefings with live telemetry injected (temp, wind, humidity, pressure)
- Category-level summaries with IMD-style safety advisories
- Interactive action chips: "Focus City on Map", "Filter Category"
- 500ms simulated thinking delay + typing indicator for UX realism
- Markdown rendering: bold (**text**), bullets, emoji headers

### 📍 Hyperlocal Weather Engine (`HyperlocalWeatherBar.tsx`)
- **Near Me tab** — 1-tap GPS → Nominatim reverse geocode → Open-Meteo live fetch
- **PIN Code tab** — 6-digit PIN → Zippopotam → Open-Meteo Geocoding → Nominatim (3-API fallback chain)
- **Locality Search tab** — autocomplete via Open-Meteo Geocoding API, India-prioritized
- Privacy-first: instant toggle to disable GPS + clear all cached coordinates

### 🏙️ City Glance Ribbon (`CityGlanceBar.tsx`)
- Horizontal scroll ribbon of India's top metros with live weather category badges
- Clicking any city focuses Leaflet map, selects matched event, shifts atmospheric mood

### 📊 Analytics & KPI Dashboard
- KPI cards: total events, verified, unverified, flagged, duplicates
- Severity breakdown chart (low/moderate/severe/extreme) — Chart.js Doughnut
- Category distribution (7 types) — Chart.js Bar
- 24-hour timeline activity — Chart.js Line
- Source distribution (API/Twitter/Citizen)

### 🛡️ Admin Governance Console (`AdminPanel.tsx`)
- PIN-protected access gate (`admin123`)
- Full event moderation table with pagination (40 rows/page)
- Sort by: timestamp, confidence score, severity
- Filter by: source type, verification status, text search
- Actions per event: Verify, Flag, Delete, Deep Inspect
- CSV + JSON full dataset export

### 📱 Responsive Layout
- Auto-detects mobile: `window.innerWidth < 768` collapses sidebar to bottom nav
- Touch-optimized modals and card interactions
- Grid switches from `lg:grid-cols-12` to single column on small screens

### 🚨 Emergency Helplines Modal
- Instant one-tap access: NDRF (1078), IMD (1800-180-1717), Police (100), Fire (101), Ambulance (108)
- Accessible from sidebar and from within event detail inspector

---

## 🛠️ Technology Stack

| Layer | Technology | Role |
|:---|:---|:---|
| **UI Framework** | React 18.3 | Component tree, hooks, reactive rendering |
| **Language** | TypeScript 5.7 | Full type safety across all 27 source files |
| **Bundler** | Vite 5.4 | Sub-second HMR in dev, optimized production bundle |
| **Styling** | Tailwind CSS 3.4 | Utility-first design, glassmorphism, custom keyframes |
| **Mapping** | Leaflet 1.9 | Interactive map, SVG markers, Doppler overlay |
| **Charts** | Chart.js 4.4 + react-chartjs-2 | Bar, Doughnut, Line analytics views |
| **Icons** | Lucide React 1.16 | Consistent SVG icon system |
| **Animations** | canvas-confetti | Citizen submission positive feedback loop |
| **Weather API** | Open-Meteo (free, no key) | Live telemetry for 40+ cities + geocoding |
| **Geocoding** | Nominatim / OpenStreetMap | Reverse geocoding (coordinate → locality name) |
| **PIN Lookup** | Zippopotam API | Indian 6-digit PIN code → coordinates |
| **State** | React useState + Custom Event Bus | Component state + reactive cross-component sync |
| **Persistence** | localStorage + In-Memory Cache | Top 1000 events, user reports, admin auth |
| **Deployment** | Vercel | SPA routing rewrite, edge CDN |

---

## 🔬 Service Layer Deep-Dive

### `weatherApi.ts` — External API Client (462 lines)
| Function | Purpose |
|:---|:---|
| `fetchLiveCityWeather(city)` | Single city fetch → Open-Meteo → WeatherEvent |
| `fetchAllIndianCitiesLiveWeather()` | `Promise.allSettled()` across all 40+ cities |
| `fetchLiveCoordinatesWeather(lat, lng, name)` | Arbitrary coordinate microclimate fetch |
| `generateSimulatedTweet()` | Random-city citizen-style tweet for pipeline testing |
| `searchSmallAreas(query)` | Locality autocomplete via Open-Meteo Geocoding |
| `searchByPinCode(pin)` | 3-API fallback: Zippopotam → Open-Meteo → Nominatim |
| `reverseGeocodeCoords(lat, lng)` | Coordinate → suburb/village name via Nominatim |
| `mapWmoToCategory(code, temp, wind, precip)` | WMO code + telemetry → IMD category (private) |

### `processingEngine.ts` — AI/Rule Engine (222 lines)
| Function | Purpose |
|:---|:---|
| `calculateDistanceKm(lat1, lon1, lat2, lon2)` | Haversine formula — exact geodesic distance |
| `classifyEventCategory(text)` | Keyword NLP → EventCategory + confidence |
| `evaluateEventRules(event, existing)` | Full 5-stage verification pipeline |

### `storage.ts` — State Manager (303 lines)
| Function | Purpose |
|:---|:---|
| `getStoredEvents()` | Memory cache → localStorage fallback |
| `saveEvents(events)` | Cache + persist + SpatialHashGrid + event bus dispatch |
| `addEventWithProcessing(rawEvent)` | Full pipeline entry point, returns `{ event, isDuplicate, isFlagged }` |
| `batchAddEvents(newEvents)` | Prepend merge — used for 45s API sync |
| `updateEventStatus(id, status)` | Admin override with confidence recalculation |
| `deleteEvent(id)` | Admin remove from all stores |
| `exportEventsAsCsv()` / `exportEventsAsJson()` | Data-URL programmatic download |
| `getUserReports()` / `saveUserReport()` | Personal report history (separate localStorage key) |
| `clearAllEvents()` | Full reset — triggers live re-sync on next load |

### `spatialIndex.ts` — In-Memory Geospatial DB (137 lines)
| Function | Purpose |
|:---|:---|
| `insert(event)` / `insertBatch(events)` | Grid cell population |
| `queryRadius(lat, lng, radiusKm)` | Circle proximity search (used by deduplication) |
| `queryBoundingBox(box, maxLimit)` | Viewport culling for Leaflet marker render |
| `globalSpatialGrid` | Singleton shared across all services |

### `streamQueue.ts` — Simulation & Stress Test Engine (184 lines)
| Function | Purpose |
|:---|:---|
| `generateBigDataBatch(count)` | Synthetic event factory: realistic templates, jitter coords, spam/dup injection |
| `executeBigDataIngestion(count, onProgress)` | Async chunked batch processor (50 events/chunk, 5ms yield for 60fps UI) |

### `aiWeatherAssistant.ts` — Conversational AI (200 lines)
| Function | Purpose |
|:---|:---|
| `generateAIWeatherResponse(query, events)` | Pattern-match → live-data-injected markdown response |
| Returns `ChatMessage` | With optional `suggestedAction` for UI integration (focus city / filter category) |

---

## 🗺️ Component Map

| Component | Purpose | Key Dependencies |
|:---|:---|:---|
| `App.tsx` | Root state hub, layout, 45s polling | All services |
| `Sidebar.tsx` | Navigation tabs, mood switcher, action triggers | `activeTab`, `activeMood` |
| `Navbar.tsx` | Top bar, platform status indicator | — |
| `LiveTicker.tsx` | Breaking alerts horizontal scroll ticker | `events[]` |
| `CityGlanceBar.tsx` | Metro telemetry ribbon | `events[]` |
| `WeatherMoodBar.tsx` | Mood preset selector + filter trigger | `activeMood` |
| `HyperlocalWeatherBar.tsx` | GPS / PIN / Locality search engine | `weatherApi.ts` |
| `StatsOverview.tsx` | KPI metric cards | `events[]` |
| `SimulationControls.tsx` | Synthetic event injector + Big Data bench | `streamQueue.ts`, `weatherApi.ts` |
| `FilterBar.tsx` | Multi-axis filter UI (7 axes) | `FilterState` |
| `MapView.tsx` | Leaflet map + Doppler radar overlay | Leaflet, `events[]` |
| `LiveFeedList.tsx` | Real-time event card stream | `events[]` |
| `AnalyticsCharts.tsx` | Chart.js bar / doughnut / line views | Chart.js, `events[]` |
| `AdminPanel.tsx` | Moderation console + export | `storage.ts` |
| `MultiSourceFeedsView.tsx` | Source-split feed (IMD / Citizen / Twitter) | `events[]` |
| `MyReports.tsx` | Personal submission history | `storage.ts` getUserReports |
| `CitizenReportModal.tsx` | GPS report form + AI feedback | `storage.ts`, GPS API |
| `AdminLoginModal.tsx` | PIN auth gate | `storage.ts` |
| `EventDetailModal.tsx` | Full event inspector drawer | `WeatherEvent` |
| `EmergencyHelplineModal.tsx` | Disaster helplines modal | — |
| `WeatherAIChatbot.tsx` | Floating AI chat window | `aiWeatherAssistant.ts` |
| `WeatherAtmosphere.tsx` | Canvas particle weather FX engine | `activeMood` Canvas API |

---

## 📁 Directory Structure

```
cloud-net/
├── index.html                    # HTML root + Google Fonts + Leaflet CSS
├── package.json                  # 10 runtime + 8 dev dependencies
├── vite.config.ts                # Vite + React plugin
├── tailwind.config.js            # Custom keyframes: shimmer, float, lightning
├── tsconfig.json                 # Strict TypeScript config
├── vercel.json                   # SPA rewrite rules
├── postcss.config.js             # Tailwind + Autoprefixer
└── src/
    ├── main.tsx                  # React DOM createRoot
    ├── App.tsx                   # Root component (560 lines) — state orchestrator
    ├── index.css                 # glass-card / glass-input utilities + animations
    ├── types/
    │   └── weather.ts            # WeatherEvent, FilterState, CategoryMeta, all types
    ├── config/
    │   └── india.ts              # 40+ cities (lat/lng), 36 states, district nodes
    ├── data/
    │   └── initialEvents.ts      # CATEGORY_CONFIG, MOOD_THEMES, type guards
    ├── services/
    │   ├── weatherApi.ts         # Open-Meteo + Nominatim + Geocoding API clients
    │   ├── processingEngine.ts   # NLP classifier + verification rules + Haversine
    │   ├── storage.ts            # In-memory cache + localStorage + event bus
    │   ├── spatialIndex.ts       # SpatialHashGrid 2D geospatial index
    │   ├── streamQueue.ts        # Synthetic batch generator + async ingestion
    │   └── aiWeatherAssistant.ts # Rule-based chatbot response generator
    └── components/               # 21 UI components + icons/ subfolder
        └── icons/
            └── TwitterIcon.tsx
```

---

## 🚧 Gaps & Improvement Roadmap

Full-stack analysis of what exists, what's missing, and how to improve.

### 🔴 Critical Gaps

| Gap | Impact | Fix |
|:---|:---|:---|
| **Admin PIN hardcoded as `admin123`** in UI | Anyone who reads source code has admin access | Move to env variable; use hashed comparison |
| **No real Twitter/X API** | Social feed is 100% simulated | Integrate Twitter API v2 Filtered Stream for live `#IMD` feed |
| **localStorage as sole persistence** | Data resets in incognito/private browsing; no cross-device sync | Add Supabase or Firebase Realtime DB as optional backend |
| **No user authentication** | Anonymous citizen reports enable spam at scale | Add Google OAuth or phone OTP sign-in |
| **WMO code coverage is incomplete** | Codes 71–77 (snow/blizzard), 56–57 (freezing drizzle), all fall through to `rainfall` | Expand `mapWmoToCategory()` to handle all 100 WMO codes |
| **`cityFilter` field is never applied** | `FilterState.cityFilter` exists in type but is never used in `App.tsx` `filteredEvents` logic | Wire cityFilter into the filter computation |

---

### 🟡 AI Utilization Gaps (Highest ROI Improvements)

| Current AI Layer | Limitation | Recommended Upgrade |
|:---|:---|:---|
| Rule-based chatbot (keyword `includes()`) | Cannot handle compound queries, follow-ups, or Hindi text | Replace `generateAIWeatherResponse()` with **Gemini API** call |
| Keyword NLP classifier | Fails on typos, obfuscation, mixed-language text | Upgrade to TF-IDF scoring or lightweight ONNX model |
| Spam detection (13 hardcoded patterns) | Easily bypassed with slight keyword variation | Use Gemini zero-shot classification for spam scoring |
| No anomaly detection | Accepts 47°C in Shimla in January | Add statistical outlier detection using rolling historical baselines |
| No predictive alerts | Purely reactive — no future warnings | Fetch Open-Meteo hourly forecast to generate 6h predictive warnings |
| No image verification | Photos are accepted but never analyzed | Pass citizen photos through **Gemini Vision API** for content validation |

**Single highest-impact AI upgrade — Gemini API integration:**
```typescript
// In aiWeatherAssistant.ts — swap this function:

export async function generateAIWeatherResponse(
  userQuery: string,
  events: WeatherEvent[]
): Promise<ChatMessage> {
  const eventsContext = JSON.stringify(events.slice(0, 30), null, 2);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: CLOUDNET_SYSTEM_PROMPT }]
        },
        contents: [{
          parts: [
            { text: `Live events:\n${eventsContext}\n\nUser: ${userQuery}` }
          ]
        }]
      })
    }
  );

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  return { id: `msg-${Date.now()}`, sender: 'bot', text, timestamp: now };
}
```
The entire chat UI, action chip system, and data interfaces are already built — only the response generator changes. **Gemini 2.0 Flash is free on the free tier.**

---

### 🟢 Enhancement Opportunities

| Area | Current State | Recommended Improvement |
|:---|:---|:---|
| **Forecasting** | No forecast data fetched | Add Open-Meteo hourly/daily forecast; show 24h prediction cards |
| **Push Notifications** | No out-of-browser alerts | Implement Web Push API for severe weather alerts |
| **Offline Support** | Fails completely without internet | Add Service Worker + IndexedDB for offline-first fallback |
| **Map Clustering** | All pins render individually | Add `Leaflet.markercluster` for Mumbai/Delhi high-density areas |
| **Rate Limiting** | 40+ Open-Meteo requests fire in parallel | Stagger into groups of 10 with 100ms delays between batches |
| **Big Data Bench bug** | `executeBigDataIngestion()` only inserts into spatial grid — bypasses `storage.ts` entirely | Route through `addEventWithProcessing()` for full pipeline |
| **Error Boundaries** | No React error boundaries | Wrap `MapView`, `AnalyticsCharts`, `AdminPanel` in `ErrorBoundary` |
| **Accessibility** | Missing ARIA labels on interactive elements | Add `aria-label`, `role="button"`, keyboard navigation |
| **Unit Tests** | Zero test coverage | Add Vitest for `processingEngine.ts` and `spatialIndex.ts` |
| **Deprecated import** | `AdminPanel.tsx` imports `resetToSeedData()` which is `@deprecated` | Replace with `clearAllEvents()` |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0+` (tested with v20 and v24)
- **npm**: `v9.0.0+`

### Installation

```bash
git clone https://github.com/khushi2006y/cloud-net.git
cd cloud-net
npm install
```

### Local Development

```bash
npm run dev
```

Navigate to `http://localhost:5173`. On first load, CloudNet fetches live data from Open-Meteo for 40+ Indian cities. The loading skeleton dismisses once data is ready (~2–4 seconds).

### Production Build

```bash
npm run build    # TypeScript compile + Vite bundle → ./dist
npm run preview  # Preview production bundle locally
```

---

## ⚙️ Configuration & Integration

### Open-Meteo API
No API key required. Endpoints used:
- `https://api.open-meteo.com/v1/forecast` — live current weather telemetry
- `https://geocoding-api.open-meteo.com/v1/search` — locality name autocomplete

### Nominatim / OpenStreetMap
No API key required. Used for:
- `https://nominatim.openstreetmap.org/reverse` — coordinate → suburb/locality name
- `https://nominatim.openstreetmap.org/search` — PIN code fallback geocoding

> **Note:** Nominatim enforces 1 req/sec for non-registered users. Fine for single-user dev; add request queuing for production scale.

### Adding New Indian Cities / Weather Stations
Edit [`src/config/india.ts`](src/config/india.ts):

```typescript
export const MAJOR_INDIAN_CITIES: CityNode[] = [
  { name: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Srinagar', state: 'Jammu and Kashmir', lat: 34.0837, lng: 74.7973 },
  // New city auto-syncs on next 45s polling interval
];
```

### Admin Credentials
Default PIN: **`admin123`** (set in `AdminLoginModal.tsx` comparison logic).
Auth state stored in localStorage key `cloudnet_admin_auth_v1`.

> **Security note:** Move to an environment variable and use a hashed comparison before any public deployment.

---

## 📤 Deployment Guide

### Deploy to Vercel (Recommended)

The repo includes [`vercel.json`](vercel.json) with SPA rewrite rules pre-configured.

```bash
# Push to GitHub first
git add .
git commit -m "feat: cloudnet update"
git push origin main
```

Then on [vercel.com](https://vercel.com):
1. Import your GitHub repository
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Click **Deploy** — live in ~60 seconds

### First-Time Git Setup

```bash
git init
git branch -M main
git add .
git commit -m "feat: initial release of CloudNet IMD weather platform"
git remote add origin https://github.com/khushi2006y/cloud-net.git
git push -u origin main
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/gemini-chatbot`
3. Commit: `git commit -m "feat: replace rule-based chatbot with Gemini API"`
4. Push: `git push origin feature/gemini-chatbot`
5. Open a Pull Request

**Suggested starter contributions:**
- [ ] Integrate Gemini API into `aiWeatherAssistant.ts`
- [ ] Fix `cityFilter` not applied in `App.tsx` filteredEvents
- [ ] Add Vitest unit tests for `processingEngine.ts`
- [ ] Expand WMO code coverage in `mapWmoToCategory()`
- [ ] Fix `executeBigDataIngestion()` to route through `addEventWithProcessing()`
- [ ] Add `Leaflet.markercluster` for high-density city markers

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for more details.

---

<div align="center">
  <sub>Built with ❤️ for Indian Meteorological Awareness & Disaster Preparedness</sub>
  <br/>
  <sub>Live data by <a href="https://open-meteo.com">Open-Meteo</a> · Maps by <a href="https://leafletjs.com">Leaflet</a> · Geocoding by <a href="https://nominatim.openstreetmap.org">Nominatim / OSM</a></sub>
</div>
