# mbkutils

Shared utilities, standardized HTTP response envelopes, error & 404 handlers, URL validation, Handlebars view helpers, Universal Service Messenger with Block Kit engine, and reusable UI components across the **MBK Tech** ecosystem.

## Features

- **Universal Service Messenger & Block Kit**: Direct delivery of rich, interactive cards, system alerts, deployment notices, and security alerts to Beyvion Messenger (`mbkchat`) service channels (`svc_*`). [Read Full Guide ➔](docs/SERVICE_MESSENGER.md)
- **HTTP Response Envelopes**: Consistent API response structures with `sendSuccess` and `sendError`.
- **Content Negotiation**: `isJsonRequest` for determining API vs. HTML browser requests.
- **Error Handlers & 404 Pages**: Redacted trace diagnostic views and graceful error handling.
- **Handlebars Helpers**: 40+ view helpers for comparisons, date/time formatting, number humanization, byte sizing, and slug generation.
- **URL & Redirect Safety**: Server-side SSRF prevention (`isSafeFetchUrl`) and open redirect mitigation (`isSafeRelativeRedirect`).
- **Shared UI Views**: Ambient background elements, message overlays, version badges, and universal error layouts.

## Installation

```bash
npm install mbkutils
```

## Quick Start

### 1. ServiceMessenger & Block Kit (Beyvion Messenger Channels)

Dispatch rich cards, alerts, and operational telemetry directly to `mbkchat` service channels:

```javascript
import { serviceMessenger, BlockKit } from "mbkutils";

// High-level formatted alert
await serviceMessenger.sendAlert({
  channel: "system_status",
  title: "Service Online",
  message: "Worker service instance online and healthy.",
  type: "success",
  fields: [
    { label: "Environment", value: "Production" },
    { label: "Latency", value: "14ms" }
  ]
});

// Composable Block Kit Card with action buttons
await serviceMessenger.sendCard({
  channel: "governance_alerts",
  title: "🏛️ Statutory Board Meeting",
  priority: "high",
  blocks: [
    BlockKit.header("🏛️ Statutory Board Meeting Convened"),
    BlockKit.section("Attendance is mandatory for all executive directors."),
    BlockKit.fields([
      { label: "Date", value: "Nov 15, 2026" },
      { label: "Quorum", value: "75% Confirmed" }
    ]),
    BlockKit.actions([
      { text: "View Agenda", url: "https://portal.mbktech.org", style: "primary" }
    ])
  ]
});
```

*For comprehensive documentation, constructor options, audience targeting, idempotency keys, and multi-language HTTP contracts (Python, Go, Rust, cURL), see the [Universal Service Messenger Guide](docs/SERVICE_MESSENGER.md).*

---

### 2. Express Middleware & Response Handlers

```javascript
import express from "express";
import { createErrorHandler, createNotFoundHandler, sendSuccess, isJsonRequest } from "mbkutils";

const app = express();

app.get("/api/ping", (req, res) => {
  return sendSuccess(res, { status: "pong" });
});

app.use(createNotFoundHandler({ defaultPage: "/home", defaultPageName: "Home" }));
app.use(createErrorHandler({ appName: "my-app" }));
```

---

### 3. Handlebars Helpers

```javascript
import { commonHandlebarsHelpers } from "mbkutils";
import hbs from "express-handlebars";

const engine = hbs.create({
  helpers: commonHandlebarsHelpers,
  partialsDir: ["views/partials", "node_modules/mbkutils/views"]
});
```

## License

MIT © Muhammad Bin Khalid, MBKTech.org
