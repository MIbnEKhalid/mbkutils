# mbkutils

Shared utilities, standardized HTTP response envelopes, error & 404 handlers, URL validation, Handlebars view helpers, and reusable UI components across the **MBK Tech** ecosystem.

## Features

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

### Express Middleware & Handlers

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

### Handlebars Helpers

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
