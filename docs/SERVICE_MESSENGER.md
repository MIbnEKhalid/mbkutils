# Universal Service Messenger & Block Kit Client (`mbkutils`)

> **Package:** `mbkutils`  
> **Module:** `import { ServiceMessenger, BlockKit, serviceMessenger } from "mbkutils";`  
> **Version:** `1.2.2`  
> **Author & Developer:** **Maaz Waheed** ([GitHub: @42Wor](https://github.com/42Wor)) [1]  
> **Target:** Microservices, automated agents, background daemons, CI/CD pipelines, and internal/external systems dispatching real-time notifications, interactive Block Kit cards, and prioritized alerts to **Beyvion Messenger (`mbkchat`)** via **MBK Core (`mbkcore`)**.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Installation & Setup](#2-installation--setup)
3. [Environment Configuration](#3-environment-configuration)
4. [Authentication Modes (Bearer vs. HMAC-SHA256)](#4-authentication-modes-bearer-vs-hmac-sha256)
5. [Default Service Channels & RBAC](#5-default-service-channels--rbac)
6. [Block Kit Component Specification (`BlockKit.*`)](#6-block-kit-component-specification-blockkit)
7. [Fluent Conditions & Dynamic Audience Targeting](#7-fluent-conditions--dynamic-audience-targeting)
8. [High-Level Dispatch Methods](#8-high-level-dispatch-methods)
9. [Idempotency & In-Place Card Mutation](#9-idempotency--in-place-card-mutation)
10. [Multi-Language HTTP Wire Specification](#10-multi-language-http-wire-specification)
    - [Python](#101-python)
    - [Go (Golang)](#102-go-golang)
    - [Rust](#103-rust)
    - [cURL](#104-curl)
11. [Complete End-to-End Node.js Implementation Example](#11-complete-end-to-end-nodejs-implementation-example)

---

## 1. Architecture Overview

`ServiceMessenger` is an enterprise M2M (Machine-to-Machine) communication client built into `mbkutils`. It transforms automated backend events, metrics, and alerts into **standardized, interactive visual cards** directly inside corporate chat feeds.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      ORIGINATING SIBLING SYSTEM                        │
│     (CI/CD Runner, Cron Daemon, Microservice, Cloud Monitoring)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼  (mbkutils)
           [ BlockKit Builder ] ──▶ [ ServiceMessenger.dispatch() ]
                                    │
                                    │  Signed HTTP POST
                                    │  Headers: X-MBK-Signature / Bearer mbk_svc_*
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        MBK CORE (mbkcore) GATEWAY                      │
│                                                                        │
│   1. service-auth.middleware.js (Validates token/HMAC via mbkauthe)    │
│   2. Scope Enforcer (Verifies machine permissions for target channel)  │
│   3. Dynamic Audience Resolver (Applies role/user/exclusion filters)   │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
       ┌────────────────────────┐      ┌───────────────────────────────┐
       │ PostgreSQL (Neon)      │      │ Cloud Firestore & FCM Network │
       │ mbkcore_chat_messages  │      │ Live reactive stream sockets  │
       │ Compliance audit log   │      │ + High-priority mobile pushes │
       └────────────────────────┘      └───────────────┬───────────────┘
                                                       │
                                                       ▼
                                       ┌───────────────────────────────┐
                                       │   Beyvion Messenger (mbkchat) │
                                       │   Android • Windows • Web SPA │
                                       └───────────────────────────────┘
```

---

## 2. Installation & Setup

Ensure `mbkutils` is installed in your project:

```bash
npm install mbkutils
```

Import `ServiceMessenger`, `BlockKit`, or the pre-instantiated singleton `serviceMessenger`:

```javascript
import { ServiceMessenger, BlockKit, serviceMessenger } from "mbkutils";
```

---

## 3. Environment Configuration

`ServiceMessenger` automatically reads configuration from environment variables if not passed directly via constructor parameters:

| Environment Variable | Description | Default Value | Example |
| :--- | :--- | :--- | :--- |
| `MBKCORE_URL` / `MBK_CORE_URL` | Base URL of the `mbkcore` server | `http://localhost:5001` | `https://core.mbktech.org` |
| `MBK_SERVICE_ID` | Unique identity slug of the calling machine | `mbkutils` | `srv_payment_processor` |
| `MBK_SERVICE_SECRET` | Shared HMAC secret **or** `mbk_svc_*` bearer token | `null` | `mbk_svc_4f92...` |
| `MBK_SERVICE_TOKEN` / `MBK_API_KEY` | Explicit Bearer token string | `null` | `mbk_svc_98ab...` |

### Manual Initialization
```javascript
import { ServiceMessenger } from "mbkutils";

const messenger = new ServiceMessenger({
  baseUrl: process.env.MBKCORE_URL || "https://core.mbktech.org",
  serviceId: "srv_payment_processor",
  secret: process.env.MBK_SERVICE_SECRET,
  defaultChannel: "system_status",
  timeout: 10000, // 10-second request timeout
});
```

---

## 4. Authentication Modes (Bearer vs. HMAC-SHA256)

`ServiceMessenger` supports two distinct cryptographic authorization models, both natively evaluated by `mbkcore` via `mbkauthe`:

### Mode A: Bearer Service Token (`mbk_svc_*`)
Recommended for internal services and microservices running in secure networks:
* When the configured secret begins with `mbk_svc_` or `mbk_pat_`, standard Bearer authorization is sent:
  ```http
  Authorization: Bearer mbk_svc_7a8f3b20...
  X-MBK-Service-ID: srv_payment_processor
  ```

### Mode B: HMAC-SHA256 Cryptographic Signature
Recommended for external webhooks, edge nodes, or environments subject to replay attack risks:
* For shared symmetric secrets, `ServiceMessenger` signs the serialized body alongside a Unix epoch timestamp:
  $$\text{Signature} = \text{HMAC-SHA256}(\text{Secret}, \text{Timestamp} + "." + \text{RawBody})$$
* Transmitted headers:
  ```http
  X-MBK-Service-ID: srv_payment_processor
  X-MBK-Timestamp: 1730365200
  X-MBK-Signature: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  ```
* **Replay Protection:** `mbkcore` automatically rejects any request where $|\text{CurrentTime} - \text{Timestamp}| > 300\text{ seconds}$ (5-minute window).

---

## 5. Default Service Channels & RBAC

Channels segment alerts by operational domain. Each channel maintains an explicit audience rule enforced by `mbkcore`:

| Channel Key | Category | Default Access Tier | Description |
| :--- | :--- | :--- | :--- |
| `system_status` | `system` | **All Active Users** | Infrastructure health, database migrations, platform status. |
| `build_deploys` | `devops` | **Superadmin, Admin** | CI/CD build pipelines, releases, server deployments. |
| `security_alerts` | `security` | **Superadmin, Admin** | Anomalous logins, passkey events, security violations. |
| `governance_alerts` | `governance` | **Executive, Director, Legal** | Board resolutions, statutory ballots, corporate meetings. |
| `support_tickets` | `operations` | **Support Staff, Admin** | Customer helpdesk escalations and ticket submissions. |
| `announcements` | `company` | **All Active Users** | Official company-wide broadcasts and leadership updates. |

---

## 6. Block Kit Component Specification (`BlockKit.*`)

The `BlockKit` helper provides composable factory functions to construct structured visual cards.

### 6.1 `BlockKit.header(text, priority = null)`
Renders a bold, prominent card title at the top of the message bubble.
```javascript
BlockKit.header("🚀 High-Traffic Scale Event Triggered", "high")
// => { type: "header", text: "🚀 High-Traffic Scale Event Triggered", priority: "high" }
```

### 6.2 `BlockKit.section(text, fields = null)`
Renders standard descriptive Markdown text.
```javascript
BlockKit.section("Autoscaling policy expanded worker group to accommodate elevated load.")
// => { type: "section", text: "Autoscaling policy expanded worker group to accommodate elevated load." }
```

### 6.3 `BlockKit.fields(fieldsArray)`
Renders a structured 2-column key-value attribute grid. Values and labels are string-coerced automatically.
```javascript
BlockKit.fields([
  { label: "Environment", value: "Production (US-East)" },
  { label: "CPU Utilization", value: "88.4%" },
  { label: "Active Nodes", value: "16 (was 8)" },
  { label: "Throughput", value: "14,200 req/sec" }
])
// => { type: "fields", fields: [{ label: "Environment", value: "Production (US-East)" }, ...] }
```

### 6.4 `BlockKit.divider()`
Draws a subtle horizontal divider line separating visual segments.
```javascript
BlockKit.divider()
// => { type: "divider" }
```

### 6.5 `BlockKit.context(elements)`
Displays small, muted metadata, timestamps, or system identifiers at the bottom of the card.
```javascript
BlockKit.context(["Auto-Scaler Service", "Region: us-east-1", "Cluster #04"])
// => { type: "context", elements: [{ type: "text", text: "Auto-Scaler Service" }, ...] }
```

### 6.6 `BlockKit.actions(buttonsArray)`
Renders interactive action buttons. Supported visual styles:
* `primary` (Brand blue)
* `success` (Emerald green)
* `danger` (Crimson red)
* `warning` (Amber yellow)
* `outline` (Bordered transparent)
* `default` (Subtle neutral slate)
* `secondary` (Muted dark slate)

```javascript
BlockKit.actions([
  {
    text: "Open Grafana Dashboard",
    url: "https://metrics.mbktech.org/dashboard",
    style: "primary"
  },
  {
    text: "Adjust Pool Size",
    action_id: "scale_cluster_override",
    style: "default"
  }
])
```

---

## 7. Fluent Conditions & Dynamic Audience Targeting

While the Service Channel establishes the **maximum audience ceiling**, the `conditions` object allows callers to dynamically narrow who receives push alerts for a specific message.

### 7.1 Fluent Chaining Methods
`ServiceMessenger` provides chainable methods that merge conditions automatically into the next dispatch:

```javascript
await serviceMessenger
  .toRoles(["admin", "superadmin"])           // Target specific roles
  .toDesignations(["DevOps Lead", "SRE"])     // Target corporate badges
  .toUsers(["usr_ops_lead_01"])               // Target explicit user IDs
  .excludingUsers(["usr_system_daemon"])      // Suppress alert for triggering actor
  .sendAlert({
    channel: "system_status",
    title: "Cluster Node Recycled",
    message: "Node worker-04 rebooted following scheduled kernel patch.",
    type: "info"
  });
```

### 7.2 Targeting Rules & Precedence
1. **The Safety Ceiling:** If a machine requests `toRoles(["guest"])` in `security_alerts`, `mbkcore` computes the mathematical intersection. If guests are not authorized for security alerts, **0 recipients receive alerts**.
2. **Actor Exclusion Precedence:** `excludeUsers` strips matching user IDs before FCM push tokens are resolved. This ensures an engineer who triggered an action never receives an unwanted push notification on their own device for their own command.

---

## 8. High-Level Dispatch Methods

### 8.1 General-Purpose Card (`sendCard`)
```javascript
import { serviceMessenger, BlockKit } from "mbkutils";

await serviceMessenger.sendCard({
  channel: "system_status",
  title: "Worker Cluster Rebalanced",
  content: "Traffic distribution has normalized across all regions.",
  priority: "normal",
  idempotencyKey: "rebalance_event_20261031_01",
  senderName: "Traffic Manager",
  blocks: [
    BlockKit.header("Traffic Optimization Event"),
    BlockKit.section("Load balancing mesh adjusted traffic weights across nodes."),
    BlockKit.fields([
      { label: "Trigger", value: "Latency Threshold" },
      { label: "Target Region", value: "ap-southeast-1" },
      { label: "Average RTT", value: "24 ms (was 112 ms)" },
      { label: "Status", value: "Optimal" }
    ]),
    BlockKit.divider(),
    BlockKit.actions([
      { text: "View Edge Metrics", url: "https://metrics.mbktech.org/edge", style: "primary" }
    ]),
    BlockKit.context(["Traffic Controller", "Autonomous Event"])
  ]
});
```

### 8.2 Standardized Alert (`sendAlert`)
```javascript
await serviceMessenger.sendAlert({
  channel: "system_status",
  title: "Database Backup Completed",
  message: "Daily snapshot successfully verified and archived to S3 storage.",
  type: "success", // 'info' | 'warning' | 'error' | 'success'
  fields: [
    { label: "Database", value: "mbkcore_prod" },
    { label: "Archive Size", value: "14.2 GB" },
    { label: "Verification", value: "SHA-256 Validated" }
  ]
});
```

### 8.3 Deployment Notice (`sendDeploymentNotice`)
```javascript
await serviceMessenger.sendDeploymentNotice({
  app: "api-gateway",
  version: "2.4.1",
  environment: "production",
  commit: "8f2a1b9",
  status: "succeeded", // 'succeeded' | 'failed' | 'in_progress'
  url: "https://core.mbktech.org/dashboard/admin/deploys",
  idempotencyKey: "deploy_api_gateway_2_4_1"
});
```

### 8.4 Security Alert (`sendSecurityAlert`)
```javascript
await serviceMessenger.sendSecurityAlert({
  title: "Multiple Failed API Key Signatures",
  details: "Rate threshold exceeded for unauthenticated client signature verification.",
  severity: "high", // 'low' | 'medium' | 'high' | 'critical'
  ip: "203.0.113.195",
  user: "unknown",
  idempotencyKey: "sec_sig_fail_203_0_113_195"
});
```

---

## 9. Idempotency & In-Place Card Mutation

To prevent duplicate alert cards from flooding chat feeds during automated retries, provide an `idempotencyKey`:

1. **Deduplication:** Repeated dispatches sharing the same key return the stored transaction receipt without creating new database rows or firing duplicate phone buzzes.
2. **In-Place Card Updates:** You can update an existing card across pipeline steps by sending subsequent calls with the **same `idempotencyKey`**:

```javascript
// Step 1: Long-running task begins
await serviceMessenger.sendDeploymentNotice({
  app: "data-indexer",
  version: "1.0.8",
  status: "in_progress",
  idempotencyKey: "task_reindex_catalog_20261031"
});

// ... Heavy migration executes ...

// Step 2: Final state mutates the original card in-place
await serviceMessenger.sendDeploymentNotice({
  app: "data-indexer",
  version: "1.0.8",
  status: "succeeded",
  url: "https://metrics.mbktech.org/jobs",
  idempotencyKey: "task_reindex_catalog_20261031"
});
```

---

## 10. Multi-Language HTTP Wire Specification

If dispatching from non-JavaScript languages, construct requests matching the MBK Core HTTP contract:

* **Endpoint:** `POST https://core.mbktech.org/api/chat/channels/:channelKey/dispatch`
* **Headers:**
  * `Authorization: Bearer <TOKEN>` *(or HMAC signature headers)*
  * `Content-Type: application/json`
  * `X-Idempotency-Key: <OPTIONAL_IDEMPOTENCY_KEY>`

---

### 10.1 Python
```python
import os
import requests

API_URL = os.getenv("MBKCORE_URL", "https://core.mbktech.org")
TOKEN = os.getenv("MBK_SERVICE_TOKEN", "mbk_svc_your_token_here")

url = f"{API_URL}/api/chat/channels/system_status/dispatch"
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "X-Idempotency-Key": "py_cache_purge_20261031"
}

payload = {
    "title": "Edge Cache Purged",
    "content": "Global CDN cache invalidated following schema release.",
    "priority": "normal",
    "blocks": [
        {"type": "header", "text": "Global CDN Invalidation Finished"},
        {"type": "section", "text": "Edge nodes successfully purged stale object records."},
        {
            "type": "fields",
            "fields": [
                {"label": "Purged Paths", "value": "/api/v2/*, /static/*"},
                {"label": "Edge Nodes", "value": "184 Worldwide"},
                {"label": "Execution Time", "value": "3.12 seconds"},
                {"label": "Triggered By", "value": "PurgeDaemon v1.4"}
            ]
        },
        {"type": "divider"},
        {
            "type": "actions",
            "elements": [
                {"type": "button", "text": "Inspect CDN Health", "url": "https://metrics.mbktech.org/cdn", "style": "primary"}
            ]
        },
        {"type": "context", "elements": [{"type": "text", "text": "CDN Sync Engine • mbkcore"}]}
    ]
}

response = requests.post(url, headers=headers, json=payload, timeout=10)
print(response.status_code, response.json())
```

---

### 10.2 Go (Golang)
```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type Block struct {
	Type     string      `json:"type"`
	Text     string      `json:"text,omitempty"`
	Priority string      `json:"priority,omitempty"`
	Fields   interface{} `json:"fields,omitempty"`
	Elements interface{} `json:"elements,omitempty"`
}

type FieldItem struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type ActionButton struct {
	Type  string `json:"type"`
	Text  string `json:"text"`
	URL   string `json:"url,omitempty"`
	Style string `json:"style,omitempty"`
}

type ContextItem struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type DispatchPayload struct {
	Title          string  `json:"title"`
	Content        string  `json:"content"`
	Priority       string  `json:"priority"`
	IdempotencyKey string  `json:"idempotencyKey,omitempty"`
	Blocks         []Block `json:"blocks"`
}

func main() {
	baseURL := os.Getenv("MBKCORE_URL")
	if baseURL == "" {
		baseURL = "https://core.mbktech.org"
	}
	token := os.Getenv("MBK_SERVICE_TOKEN")

	url := fmt.Sprintf("%s/api/chat/channels/system_status/dispatch", baseURL)

	payload := DispatchPayload{
		Title:          "Memory Spike Warning",
		Content:        "Worker instance reported memory usage exceeding threshold.",
		Priority:       "high",
		IdempotencyKey: "go_mem_spike_pod_4",
		Blocks: []Block{
			{Type: "header", Text: "System Memory Alert: Worker-4", Priority: "high"},
			{Type: "section", Text: "Heap allocation surpassed 85% allocated limit."},
			{
				Type: "fields",
				Fields: []FieldItem{
					{Label: "Service", Value: "ingestion-daemon"},
					{Label: "Instance ID", Value: "pod-batch-981f"},
					{Label: "RAM Utilized", Value: "7.1 GB / 8.0 GB"},
					{Label: "Status", Value: "Throttling"},
				},
			},
			{Type: "divider"},
			{
				Type: "actions",
				Elements: []ActionButton{
					{Type: "button", Text: "Restart Pod", URL: "https://k8s.mbktech.org/restart/pod-batch-981f", Style: "danger"},
					{Type: "button", Text: "Heap Dump", URL: "https://k8s.mbktech.org/dumps", Style: "default"},
				},
			},
			{
				Type: "context",
				Elements: []ContextItem{
					{Type: "text", Text: "K8s Watcher Daemon • us-east-1"},
				},
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		panic(err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		panic(err)
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Idempotency-Key", "go_mem_spike_pod_4")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	fmt.Printf("Dispatch completed with status code: %d\n", resp.StatusCode)
}
```

---

### 10.3 Rust
```rust
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::Serialize;
use std::env;
use std::error::Error;

#[derive(Serialize)]
struct FieldItem {
    label: String,
    value: String,
}

#[derive(Serialize)]
struct ActionItem {
    #[serde(rename = "type")]
    item_type: String,
    text: String,
    url: String,
    style: String,
}

#[derive(Serialize)]
struct ContextItem {
    #[serde(rename = "type")]
    item_type: String,
    text: String,
}

#[derive(Serialize)]
#[serde(tag = "type")]
enum Block {
    #[serde(rename = "header")]
    Header { text: String },
    #[serde(rename = "section")]
    Section { text: String },
    #[serde(rename = "fields")]
    Fields { fields: Vec<FieldItem> },
    #[serde(rename = "divider")]
    Divider,
    #[serde(rename = "actions")]
    Actions { elements: Vec<ActionItem> },
    #[serde(rename = "context")]
    Context { elements: Vec<ContextItem> },
}

#[derive(Serialize)]
struct DispatchPayload {
    title: String,
    content: String,
    priority: String,
    #[serde(rename = "idempotencyKey")]
    idempotency_key: String,
    blocks: Vec<Block>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let base_url = env::var("MBKCORE_URL").unwrap_or_else(|_| "https://core.mbktech.org".to_string());
    let token = env::var("MBK_SERVICE_TOKEN").unwrap_or_else(|_| "mbk_svc_your_token_here".to_string());

    let endpoint = format!("{}/api/chat/channels/system_status/dispatch", base_url);

    let payload = DispatchPayload {
        title: "Dead Letter Queue Purged".to_string(),
        content: "Asynchronous job worker processed poison-pill messages.".to_string(),
        priority: "normal".to_string(),
        idempotency_key: "rust_dlq_purge_8192".to_string(),
        blocks: vec![
            Block::Header {
                text: "Queue Maintenance Finished".to_string(),
            },
            Block::Section {
                text: "The dead letter worker successfully replayed verified payloads.".to_string(),
            },
            Block::Fields {
                fields: vec![
                    FieldItem { label: "Queue".to_string(), value: "ingest-tasks-dlq".to_string() },
                    FieldItem { label: "Processed".to_string(), value: "1,240 items".to_string() },
                    FieldItem { label: "Discarded".to_string(), value: "0 items".to_string() },
                    FieldItem { label: "Runtime".to_string(), value: "8.4 seconds".to_string() },
                ],
            },
            Block::Divider,
            Block::Actions {
                elements: vec![
                    ActionItem {
                        item_type: "button".to_string(),
                        text: "View Queue Monitor".to_string(),
                        url: "https://metrics.mbktech.org/queues".to_string(),
                        style: "primary".to_string(),
                    },
                ],
            },
            Block::Context {
                elements: vec![
                    ContextItem {
                        item_type: "text".to_string(),
                        text: "Async Worker Service • Rust 1.80".to_string(),
                    },
                ],
            },
        ],
    };

    let mut headers = HeaderMap::new();
    headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", token))?);
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert("X-Idempotency-Key", HeaderValue::from_static("rust_dlq_purge_8192"));

    let client = reqwest::Client::new();
    let res = client
        .post(&endpoint)
        .headers(headers)
        .json(&payload)
        .send()
        .await?;

    println!("Response status: {}", res.status());
    Ok(())
}
```

---

### 10.4 cURL
```bash
curl -X POST "https://core.mbktech.org/api/chat/channels/system_status/dispatch" \
  -H "Authorization: Bearer mbk_svc_your_token_here" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: manual_curl_check_001" \
  -d '{
    "title": "System Audit Event",
    "content": "Routine health check executed from terminal.",
    "priority": "normal",
    "blocks": [
      { "type": "header", "text": "Platform Health Check" },
      { "type": "section", "text": "Diagnostic ping verified all upstream services are operational." },
      {
        "type": "fields",
        "fields": [
          { "label": "Origin", "value": "Ops CLI Workstation" },
          { "label": "Latency", "value": "12 ms" },
          { "label": "Status", "value": "All Systems Nominal" }
        ]
      },
      { "type": "divider" },
      {
        "type": "actions",
        "elements": [
          { "type": "button", "text": "System Status Page", "url": "https://status.mbktech.org", "style": "primary" }
        ]
      },
      {
        "type": "context",
        "elements": [
          { "type": "text", "text": "Diagnostic CLI v1.2 • Operations" }
        ]
      }
    ]
  }'
```

---

## 11. Complete End-to-End Node.js Implementation Example

```javascript
import { ServiceMessenger, BlockKit } from "mbkutils";

// 1. Initialize client using Bearer token or HMAC credentials
const messenger = new ServiceMessenger({
  baseUrl: process.env.MBKCORE_URL || "https://core.mbktech.org",
  serviceId: "srv_metrics_collector",
  secret: process.env.MBK_SERVICE_SECRET, // e.g. "mbk_svc_xxxxxxxx"
  defaultChannel: "system_status"
});

async function main() {
  try {
    console.log("[Service] Dispatching card to system_status channel...");

    // 2. Dispatch Block Kit card targeting specific staff roles
    const receipt = await messenger
      .toRoles(["superadmin", "admin"])
      .excludingUsers(["usr_system_daemon"])
      .sendCard({
        channel: "system_status",
        title: "Automated Maintenance Window Complete",
        content: "Index defragmentation and vacuum completed across database shards.",
        priority: "normal",
        idempotencyKey: `maint_window_run_${Date.now()}`,
        senderName: "Maintenance Agent",
        blocks: [
          BlockKit.header("Database Maintenance Finished", "normal"),
          BlockKit.section("Automated nightly indexing completed across all live partitions."),
          BlockKit.fields([
            { label: "Target Shard", value: "db-cluster-primary" },
            { label: "Tables Analyzed", value: "142 tables" },
            { label: "Reclaimed Storage", value: "4.8 GB" },
            { label: "Elapsed Time", value: "42 seconds" }
          ]),
          BlockKit.divider(),
          BlockKit.actions([
            {
              text: "Database Metrics",
              url: "https://metrics.mbktech.org/postgres",
              style: "primary"
            },
            {
              text: "Acknowledge",
              action_id: "ack_maint_complete",
              style: "default"
            }
          ]),
          BlockKit.context(["Scheduled Maintenance", "Host: db-ops-runner-01"])
        ]
      });

    console.log("[Service] Dispatched successfully!");
    console.log("  • Message ID:", receipt.messageId);
    console.log("  • Channel Room:", receipt.roomId);
    console.log("  • Recipients Notified:", receipt.recipientCount);

  } catch (err) {
    console.error("[Service] Dispatch failed:", err.message);
  }
}

main();
```

---

*Universal Service Messenger Documentation • `mbkutils` v1.2.2 • Developed by [Maaz Waheed](https://github.com/42Wor)* [1]