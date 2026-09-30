# Relay Agent Automation Console

Relay is a local-first workflow automation console. Describe a process in plain English, review the generated graph, configure integration nodes, run it through the agent chain, and inspect the event-by-event execution trail.

`Specs.md` is the project requirements source. This repository implements the Next.js Pages Router client and Express API as separate npm workspaces. MongoDB and Redis are optional in local development; the application falls back to in-memory persistence and an in-memory execution queue when they are not configured or unavailable.

## Requirements

- Node.js 20.9 or newer (Node 24 is supported)
- npm 10 or newer
- Optional: MongoDB for persistent data between restarts
- Optional: Redis for BullMQ-backed execution queueing

## Run Locally on Windows

Run these commands from the project root (`AiAutomation`):

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Open `.env` and replace `JWT_SECRET` with a long random secret and `CREDENTIAL_ENCRYPTION_KEY` with a unique random value. The example key is only for local evaluation; do not use it outside local development. Keep `.env` private and do not commit it.

   You can generate suitable values with Node:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Use the first output for `JWT_SECRET` and the second for `CREDENTIAL_ENCRYPTION_KEY`.

4. Start the API and frontend together:

   ```powershell
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000), choose **Create an account**, and register the first workspace user.

The frontend is at `http://localhost:3000`; the API and Socket.IO server are at `http://localhost:4000`. On startup, the API logs whether MongoDB/Redis are active or their in-memory fallbacks are being used. In-memory data is cleared when the API process restarts.

## Optional Services

### MongoDB

Start MongoDB locally, then set this in the root `.env` file:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/agent-automation
```

If MongoDB cannot be reached, the API logs the connection issue and continues with its in-memory store.

### Redis

Start Redis locally, then set:

```dotenv
REDIS_URL=redis://127.0.0.1:6379
```

When Redis responds, runs are queued with BullMQ. If it is not configured or cannot connect during startup, runs use the in-memory queue.

## AI Workflow Generation

Generation works without an API key using the deterministic rule-based fallback. To enable hosted generation, add one or both optional keys to the root `.env`:

```dotenv
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=openai/gpt-4o-mini
GEMINI_API_KEY=your-gemini-key
```

Provider order is OpenRouter, then Gemini, then the deterministic fallback. Keys are only read by the API server.

## Integration Setup

The integration page supports OAuth and manual encrypted credential setup. OAuth client IDs, secrets, and callback URLs are server environment variables; add the values from the relevant provider console to `.env` before starting the API.

| Provider | OAuth variables | Local callback |
| --- | --- | --- |
| Google (Gmail and Sheets) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | `http://localhost:4000/api/integrations/oauth/google/callback` |
| Slack | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI` | `http://localhost:4000/api/integrations/oauth/slack/callback` |
| Discord | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` | `http://localhost:4000/api/integrations/oauth/discord/callback` |

Register the exact callback URL with the provider application. Google OAuth requests Gmail-send and Google Sheets scopes. Slack workflows need a channel ID; Gmail nodes need a recipient; Discord nodes need a channel ID; Google Sheets nodes need a spreadsheet ID and range. Configure those values on the action node in the workflow editor. Provider actions report `INTEGRATION_NOT_CONNECTED`, `AUTH_EXPIRED`, or a specific node-configuration error instead of claiming success.

Manual credentials are submitted as JSON, encrypted with AES-256-GCM before storage, and never returned by the API. Do not paste production credentials into a shared or untrusted development environment.

## Useful Commands

```powershell
npm run dev       # Run API and web client with file watching
npm run build     # Production-build the client and syntax-check the API entrypoint
npm run lint      # Lint the client
npm test          # Run API service tests
npm run start     # Start both workspaces in production mode
```

## Main Screens

- **Overview**: workflow and execution metrics, recent runs, and workflow shortcuts.
- **Workflows**: list, inspect, generate, edit, and run automations.
- **Workflow builder**: prompt-to-graph generation, drag-and-drop node palette, animated React Flow edges, and node configuration.
- **Executions**: run history, pause/resume/cancel controls, and live planner/execution/validation/recovery/monitoring events.
- **Integrations**: connection health, OAuth entry points, and manual encrypted setup.
- **Notifications**: drawer in the app shell for execution outcomes.

## API Overview

The API is rooted at `/api` and uses a session cookie for browser requests, with bearer-token support for API clients. Authenticated resources are scoped to the signed-in user.

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET/POST /workflows`, `POST /workflows/generate`, `GET/PATCH/DELETE /workflows/:id`, `POST /workflows/:id/run`
- `GET /executions`, `GET /executions/:id`, `POST /executions/:id/:action` (`pause`, `resume`, or `cancel`)
- `GET /integrations`, `GET /integrations/status`, OAuth start/callback routes, `POST /integrations`
- `GET /notifications`, `GET /health`

All secrets are supplied through environment variables. The API applies Helmet security headers, `CLIENT_URL`-limited CORS, auth rate limiting, request-body validation, bcrypt password hashing at cost 12, JWT verification, and encrypted integration credentials.