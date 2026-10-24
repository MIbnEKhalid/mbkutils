# Universal Service Messenger & Block Kit Client (`mbkutils`)

> **Package:** `mbkutils`  
> **Module:** `import { ServiceMessenger, BlockKit, serviceMessenger } from "mbkutils";`  
> **Target:** Microservices, automated agents, CI/CD runners, internal tools, and external services dispatching real-time notifications, interactive cards, and alerts to **Beyvion Messenger (`mbkchat`)** via **MBK Core (`mbkcore`)**.

---

## Table of Contents
1. [Overview](#1-overview)
2. [Configuration & Initialization](#2-configuration--initialization)
3. [Default Service Channels](#3-default-service-channels)
4. [Block Kit Component Builders (`BlockKit.*`)](#4-block-kit-component-builders-blockkit)
5. [Convenience Dispatch Methods](#5-convenience-dispatch-methods)
6. [Audience Targeting & Exclusions](#6-audience-targeting--exclusions)
7. [Idempotency & Card In-Place Updates](#7-idempotency--card-in-place-updates)
8. [Multi-Language HTTP Contract (Python, Go, Rust, PHP, cURL)](#8-multi-language-http-contract)

---

## 1. Overview

`ServiceMessenger` provides a typed, standardized client for dispatching rich interactive cards and system notices directly into Beyvion Messenger service channels (`svc_*`). Rather than sending unformatted text or disparate push notifications, messages are rendered using **MBK Block Kit**: structured visual blocks including bold headers, two-column attribute grids, divider lines, context footers, and interactive action buttons.

```
[ Your Service / Agent / CI/CD ]
              │
              ▼  (HTTP POST / JSON)
     [ mbkutils: ServiceMessenger ]
              │
              ▼  (Bearer Token Auth)
  [ mbkcore Gateway: /api/chat/channels/:key/dispatch ]
              │
      ┌───────┴────────────────────────┐
      ▼                                ▼
[ PostgreSQL Compliance ]    [ Cloud Firestore & FCM ]
                                       │
                                       ▼
                       [ Beyvion Messenger (mbkchat) ]
                         • Android • Windows
                         • Linux   • Web SPA
```

---

## 2. Configuration & Initialization

### Environment Variables
`ServiceMessenger` automatically picks up standard environment variables if not passed explicitly:

| Environment Variable | Description | Default |
|:---|:---|:---|
| `MBKCORE_URL` or `MBK_CORE_URL` | Base URL of the `mbkcore` server | `http://localhost:5001` (production: `https://core.mbktech.org`) |
| `MBK_SERVICE_TOKEN` or `MBK_API_KEY` | Bearer token with `chat_admin.dispatch` permission | `null` |

### Constructor Options
```javascript
import { ServiceMessenger } from "mbkutils";

const messenger = new ServiceMessenger({
  baseUrl: process.env.MBKCORE_URL || "https://core.mbktech.org",
  apiKey: process.env.MBK_SERVICE_TOKEN,
  defaultChannel: "system_status",
  timeout: 10000, // Request timeout in ms (default: 10000)
});
```

### Pre-Configured Singleton
For standard usage with environment variables:
```javascript
import { serviceMessenger } from "mbkutils";

// Uses process.env.MBKCORE_URL and process.env.MBK_SERVICE_TOKEN
await serviceMessenger.sendAlert({
  title: "Service Booted",
  message: "Worker service instance online.",
  type: "info",
});
```

---

## 3. Default Service Channels

MBK Core seeds six core service channels on startup. Each channel has a designated category, icon, accent color, and default audience:

| Channel Key | Channel Display Name | Category | Default Audience | Allow Mute |
|:---|:---|:---|:---|:---:|
| `system_status` | System Status & Alerts | `system` | All Active Users | ❌ No |
| `governance_alerts` | Board & Governance | `governance` | Directors, Executives, Superadmins | ✅ Yes |
| `security_alerts` | Security & Access | `security` | Admins & Superadmins | ❌ No |
| `build_deploys` | Build & Deployments | `devops` | Admins & Superadmins | ✅ Yes |
| `support_tickets` | Support & Inquiries | `operations` | Support Staff & Admins | ✅ Yes |
| `announcements` | Company Announcements | `company` | All Active Users | ✅ Yes |

### Registering Custom Service Channels (e.g., `mbk-api`)
Services can register unique custom channels directly via the `mbkcore` REST API:
```http
POST /api/chat/channels
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "channelKey": "mbk_api",
  "displayName": "MBK API Engine",
  "description": "High-throughput inference, token quotas, and rate limit telemetry",
  "category": "api",
  "icon": "api",
  "accentColor": "#0284C7",
  "audience": { "roles": ["admin", "superadmin", "developer"] },
  "allowMute": true
}
```

---

## 4. Block Kit Component Builders (`BlockKit.*`)

The `BlockKit` helper provides composable functions to assemble clean JSON card payloads:

### 1. `BlockKit.header(text)`
Displays a bold card title at the top of the message bubble.
```javascript
BlockKit.header("🚀 Production Deployment Successful")
// Output: { type: "header", text: "🚀 Production Deployment Successful" }
```

### 2. `BlockKit.section(text, fields = null)`
Standard markdown paragraph body. Optionally accepts an array of embedded key-value fields.
```javascript
BlockKit.section("Version 3.17.0 has cleared continuous integration and promoted to production.")
// Output: { type: "section", text: "Version 3.17.0 has cleared..." }
```

### 3. `BlockKit.fields(fieldsArray)`
Renders a structured 2-column key-value grid for metadata, metrics, or attributes.
```javascript
BlockKit.fields([
  { label: "Environment", value: "Production (US-East)" },
  { label: "Commit SHA", value: "0713b0f" },
  { label: "Test Suite", value: "249 / 249 Passed" },
  { label: "Duration", value: "81.9s" }
])
```

### 4. `BlockKit.divider()`
Draws a subtle horizontal divider line between card sections.
```javascript
BlockKit.divider()
// Output: { type: "divider" }
```

### 5. `BlockKit.context(elements)`
Displays smaller muted caption text or metadata at the bottom of the card.
```javascript
BlockKit.context(["MBK DevOps Pipeline", "Run #4829"])
// Output: { type: "context", elements: [{ type: "text", text: "MBK DevOps Pipeline" }, ...] }
```

### 6. `BlockKit.actions(buttons)`
Renders interactive call-to-action buttons. Supported button styles: `'primary'` (Teal), `'danger'` (Red), and `'default'` (Neutral).
```javascript
BlockKit.actions([
  {
    text: "View Release Notes",
    url: "https://portal.mbktech.org/dashboard/admin/app-store",
    style: "primary"
  },
  {
    text: "Rollback Build",
    url: "https://portal.mbktech.org/dashboard/admin/deploys/rollback",
    style: "danger"
  }
])
```

---

## 5. Convenience Dispatch Methods

### 1. Custom Card Dispatch (`messenger.dispatch` or `messenger.sendCard`)
```javascript
import { serviceMessenger, BlockKit } from "mbkutils";

await serviceMessenger.sendCard({
  channel: "governance_alerts",
  title: "🏛️ Q4 Statutory Board Meeting",
  content: "The quarterly Board of Directors meeting has been convened.",
  priority: "high", // 'low' | 'normal' | 'high' | 'urgent'
  idempotencyKey: "gov_meeting_2026_q4",
  senderName: "Corporate Secretariat",
  blocks: [
    BlockKit.header("🏛️ Statutory Board Meeting Convened"),
    BlockKit.section("Attendance is mandatory for all active voting directors. Please review the attached docket."),
    BlockKit.fields([
      { label: "Date & Time", value: "Nov 15, 2026 • 10:00 AM UTC" },
      { label: "Quorum", value: "75% Confirmed" },
      { label: "Agenda Items", value: "4 Resolutions" },
      { label: "Location", value: "Virtual Executive Boardroom" }
    ]),
    BlockKit.divider(),
    BlockKit.actions([
      { text: "Confirm Attendance", url: "https://portal.mbktech.org/governance/rsvp", style: "primary" },
      { text: "Download Docket", url: "https://portal.mbktech.org/governance/docket.pdf", style: "default" }
    ]),
    BlockKit.context(["Ref: SEC-DIR-2026-Q4", "Corporate Secretarial Office"])
  ]
});
```

### 2. High-Level System Alert (`messenger.sendAlert`)
```javascript
await serviceMessenger.sendAlert({
  channel: "system_status",
  title: "Database Backup Completed",
  message: "Daily snapshot successfully archived to S3 mbkbucket.",
  type: "success", // 'info' | 'warning' | 'error' | 'success'
  fields: [
    { label: "Snapshot Size", value: "4.82 GB" },
    { label: "Duration", value: "42 seconds" }
  ]
});
```

### 3. Deployment Notice (`messenger.sendDeploymentNotice`)
```javascript
await serviceMessenger.sendDeploymentNotice({
  app: "mbkcore",
  version: "3.17.0",
  environment: "production",
  commit: "038ede5",
  status: "succeeded", // 'succeeded' | 'failed' | 'in_progress'
  url: "https://core.mbktech.org/dashboard/admin/app-store",
  idempotencyKey: "deploy_mbkcore_3_17_0"
});
```

### 4. Security Alert (`messenger.sendSecurityAlert`)
```javascript
await serviceMessenger.sendSecurityAlert({
  title: "Anomalous Login Blocked",
  details: "Multiple invalid API token signatures detected from unverified IP address.",
  severity: "critical", // 'low' | 'medium' | 'high' | 'critical'
  ip: "198.51.100.44",
  user: "u_service_agent",
  idempotencyKey: "sec_alert_198_51_100_44_20261024"
});
```

---

## 6. Audience Targeting & Exclusions

Each channel defines a default audience, but individual dispatches can override or refine targeting:

### Targeting Structure
```json
{
  "audience": {
    "all": false,
    "roles": ["superadmin", "director", "legal"],
    "designations": ["Board", "Executive"],
    "userIds": ["u_chairman", "u_ceo"]
  },
  "exclusions": {
    "roles": ["guest"],
    "userIds": ["u_suspended_user"]
  }
}
```

- **`all: true`**: Broadcasts to every active member with chat permissions.
- **`roles`**: Delivers only to users holding the specified system roles (`superadmin`, `admin`, `member`, `director`).
- **`designations`**: Evaluates corporate badge titles (`Board`, `Executive`, `CEO`, `CTO`).
- **`userIds`**: Direct delivery to explicit user identifiers.
- **`exclusions`**: Explicit blacklist preventing specific users or roles from receiving the alert or push notification.

---

## 7. Idempotency & Card In-Place Updates

Network retries or multi-stage pipelines often dispatch duplicate notices. By supplying an `idempotencyKey`:

1. **Deduplication:** If an alert with the same `idempotencyKey` is sent within the deduplication window, `mbkcore` recognizes the key.
2. **In-Place Updates:** Instead of polluting the chat timeline with 10 separate progress messages, long-running processes (e.g., CI/CD builds or database migrations) can use the same `idempotencyKey` across stages (`in_progress` ➔ `succeeded`):
   - The existing Block Kit card in PostgreSQL and Cloud Firestore is updated in-place.
   - Connected `mbkchat` clients immediately re-render the card with the new status and button actions.

```javascript
// Step 1: Initial deployment start
await serviceMessenger.sendDeploymentNotice({
  app: "mbkcore",
  version: "3.17.0",
  status: "in_progress",
  idempotencyKey: "deploy_pipeline_run_9918"
});

// ... build & test steps run ...

// Step 2: Final deployment success (updates the existing card)
await serviceMessenger.sendDeploymentNotice({
  app: "mbkcore",
  version: "3.17.0",
  status: "succeeded",
  url: "https://portal.mbktech.org",
  idempotencyKey: "deploy_pipeline_run_9918"
});
```

---

## 8. Multi-Language HTTP Contract

For non-Node.js microservices (Python, Go, Rust, PHP, Bash), communicate directly with the MBK Core HTTP endpoint:

### Endpoint Specification
- **Method:** `POST`
- **URL:** `https://core.mbktech.org/api/chat/channels/:channelKey/dispatch`
- **Headers:**
  - `Authorization: Bearer <API_TOKEN>`
  - `Content-Type: application/json`
  - `X-Idempotency-Key: <OPTIONAL_UNIQUE_KEY>`

---

### Python Example
```python
import requests

url = "https://core.mbktech.org/api/chat/channels/build_deploys/dispatch"
headers = {
    "Authorization": "Bearer mbk_pat_your_service_token_here",
    "Content-Type": "application/json",
    "X-Idempotency-Key": "py_deploy_mbk_api_104"
}

payload = {
    "title": "🚀 Python API Service Deployed",
    "content": "Inference server updated to v2.4.0.",
    "priority": "normal",
    "blocks": [
        {"type": "header", "text": "🚀 Python API Service Deployed"},
        {"type": "section", "text": "Inference microservice updated with new model weights."},
        {
            "type": "fields",
            "fields": [
                {"label": "Model", "value": "Gemini 2.5 Flash"},
                {"label": "Throughput", "value": "1,450 req/sec"},
                {"label": "Cluster", "value": "k8s-us-central1"}
            ]
        },
        {
            "type": "actions",
            "elements": [
                {"type": "button", "text": "Grafana Dashboard", "url": "https://metrics.mbktech.org", "style": "primary"}
            ]
        }
    ]
}

response = requests.post(url, headers=headers, json=payload, timeout=10)
print(response.json())
```

---

### Go Example
```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Block struct {
	Type   string      `json:"type"`
	Text   string      `json:"text,omitempty"`
	Fields interface{} `json:"fields,omitempty"`
}

type FieldItem struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type DispatchPayload struct {
	Title    string  `json:"title"`
	Content  string  `json:"content"`
	Priority string  `json:"priority"`
	Blocks   []Block `json:"blocks"`
}

func main() {
	payload := DispatchPayload{
		Title:    "🚨 High Memory Warning",
		Content:  "Worker pod reached 92% memory utilization.",
		Priority: "high",
		Blocks: []Block{
			{Type: "header", Text: "🚨 High Memory Warning"},
			{Type: "fields", Fields: []FieldItem{
				{Label: "Pod", Value: "worker-batch-7f99b"},
				{Label: "RAM Usage", Value: "7.36 GB / 8.00 GB"},
			}},
		},
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "https://core.mbktech.org/api/chat/channels/system_status/dispatch", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer mbk_pat_your_service_token_here")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	fmt.Printf("Alert dispatched with status: %d\n", resp.StatusCode)
}
```

---

### cURL Example
```bash
curl -X POST "https://core.mbktech.org/api/chat/channels/system_status/dispatch" \
  -H "Authorization: Bearer mbk_pat_your_service_token_here" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: backup_daily_20261024" \
  -d '{
    "title": "✅ Snapshot Backup Succeeded",
    "content": "PostgreSQL daily backup verified and replicated.",
    "priority": "normal",
    "blocks": [
      { "type": "header", "text": "✅ Snapshot Backup Succeeded" },
      { "type": "section", "text": "Neon PostgreSQL backup snapshot committed to S3 cold storage." },
      {
        "type": "fields",
        "fields": [
          { "label": "Database", "value": "mbkcore_prod" },
          { "label": "Archive Size", "value": "12.4 GB" },
          { "label": "Verification", "value": "SHA-256 Passed" }
        ]
      }
    ]
  }'
```

---

*Universal Service Messenger Documentation • mbkutils v1.2.0 • MBK Technologies Inc.*
