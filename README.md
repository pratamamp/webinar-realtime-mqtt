# Live Polling Demo for ArcGIS Velocity

A real-time, client-side web application designed to demonstrate live data ingestion into **ArcGIS Velocity** via MQTT, while persisting data in **Supabase**.

The application is structured as a single-page React app (built with Vite and Bun) optimized for direct serverless deployment on Netlify.

---

## 🏗️ Architecture

Instead of running an intermediate backend server to bridge databases and streaming services, this project publishes events directly from the client's browser using WebSockets.

```
                  ┌───────────────┐
                  │  Web Browser  │
                  └──────┬────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
┌──────────────┐                  ┌──────────────┐
│   Supabase   │                  │ MQTT Broker  │
│  (Database)  │                  │ (WebSockets) │
└──────────────┘                  └──────┬───────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │   ArcGIS     │
                                  │  Velocity    │
                                  └──────────────┘
```

1. **Supabase Database**: Stores historical votes and provides a Realtime Postgres subscription for dynamic visualizations.
2. **MQTT Broker via WebSockets**: Publishes each new vote immediately as a JSON payload over secure WebSockets (`wss://`), allowing ArcGIS Velocity to ingest and map the live stream.
3. **Map Dashboard**: Subscribes directly to Supabase updates and utilizes `@arcgis/core` to display a real-time updating map that dynamically pans and zooms to keep all votes in view.

---

## 🚀 Key Features

*   **🗳️ Live Polling Form (`/poll`)**: Multi-step flow allowing users to submit their location (captured or selected) and industry. Employs `localStorage` to ensure a user votes only once.
*   **🗺️ Interactive Dashboard (`/dashboard`)**: Rendered using ArcGIS Maps SDK for JavaScript. Computes and centers around the geographic extent of active participants, adapting dynamically as new votes stream in.
*   **📊 Real-time Stats (`/stats`)**: Key metrics and interactive charts (powered by `recharts`) showing participant distributions by industry, updating instantly via Supabase Realtime subscriptions.
*   **⚡ Client-side Telemetry**: Zero-dependency on custom backend servers. Leverages standard MQTT over WebSockets.

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON=your-anon-public-key

# MQTT Broker (Must support WebSockets)
VITE_MQTT_BROKER_URL=wss://test.mosquitto.org:8081/mqtt
VITE_MQTT_TOPIC=realtime-polling/votes
```

---

## 💻 Development & Deployment

### Dependencies
This project uses [Bun](https://bun.sh) as the package manager and runner.

```bash
# Install dependencies
bun install

# Start local dev server
bun run dev

# Build for production
bun run build

# Preview production build locally
bun run preview
```

### Hosting on Netlify
The project includes a [netlify.toml](file:///Users/mpratama/Coded/realtime-polling-webinar-v2/netlify.toml) file that automatically handles:
- Redirecting all routes to `index.html` to support React Router single-page navigation.
- Running the `bun run build` compile command and targeting the `dist` directory for publishing.
