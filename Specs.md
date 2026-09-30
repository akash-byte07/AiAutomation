executions/:id/resume – Resume a paused run.
POST /api/executions/:id/cancel – Cancel a running execution.
Integrations & Notifications
GET /api/integrations – List all user integration connections.
GET /api/integrations/status – Provider health and token validity checks.
GET /api/integrations/oauth/:provider/start – Initiate OAuth flow.
GET /api/integrations/oauth/:provider/callback – Handle OAuth callback.
GET /api/integrations/oauth/error – OAuth error response endpoint.
POST /api/integrations – Manual integration credential setup.
GET /api/notifications – List user notifications.
Folder Structure & Development Phases
Frontend Structure
client/
└── src/
    ├── components/
    │   ├── AppShell/
    │   ├── MetricGrid/
    │   ├── NodePalette/
    │   ├── NodeConfigPanel/
    │   ├── WorkflowCanvas/
    │   └── ProtectedRoute/
    ├── pages/
    │   ├── _app.js
    │   ├── index.js
    │   ├── login.js
    │   ├── register.js
    │   ├── dashboard.js
    │   ├── integrations.js
    │   ├── settings.js
    │   ├── executions/
    │   │   ├── index.js
    │   │   └── [id].js
    │   └── workflows/
    │       ├── index.js
    │       ├── builder.js
    │       └── [id].js
    ├── store/
    │   ├── authStore.js
    │   └── workflowStore.js
    └── services/
        ├── api.js
        └── socket.js


Backend Structure
server/
└── src/
    ├── config/
    │   ├── env.js
    │   ├── db.js
    │   └── socket.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── workflowRoutes.js
    │   ├── executionRoutes.js
    │   ├── integrationRoutes.js
    │   └── notificationRoutes.js
    ├── controllers/
    │   ├── authController.js
    │   ├── workflowController.js
    │   ├── executionController.js
    │   └── integrationController.js
    ├── services/
    │   ├── authService.js
    │   ├── workflowService.js
    │   ├── executionService.js
    │   ├── aiService.js
    │   └── integrationService.js
    ├── agents/
    │   ├── orchestrator.js
    │   ├── plannerAgent.js
    │   ├── executionAgent.js
    │   ├── validationAgent.js
    │   ├── recoveryAgent.js
    │   └── monitoringAgent.js
    ├── integrations/
    │   ├── baseIntegration.js
    │   ├── gmailIntegration.js
    │   ├── slackIntegration.js
    │   ├── discordIntegration.js
    │   └── googleSheetsIntegration.js
    ├── models/
    │   ├── User.js
    │   ├── Workflow.js
    │   ├── Execution.js
    │   ├── ExecutionLog.js
    │   ├── Integration.js
    │   └── Notification.js
    └── queues/
        └── executionQueue.js


Development Phases
Phase 1: Project setup (Next.js, Express, MongoDB with in-memory fallback, JWT authentication, Zustand auth store, AppShell layout).
Phase 2: Workflow CRUD, canvas integration with React Flow, node palette, configuration panel, and metadata persistence.
Phase 3: AI prompt-to-workflow generation (OpenRouter primary, Gemini fallback, deterministic rule engine fallback).
Phase 4: Multi-agent orchestration engine (planner, executor, validator, recovery, monitoring) and execution control lifecycle (pause, resume, cancel).
Phase 5: Third-party OAuth integrations (Gmail, Slack, Discord, Google Sheets) with credential encryption.
Phase 6: BullMQ background queues, Socket.IO real-time event streaming, live execution timeline updates, and notification drawer.
UI, Security, Outcome, and Codex Instructions
UI and UX Requirements
The UI must use a clean operator-console aesthetic with Tailwind, be fully responsive, include loading states and skeleton loaders, render the workflow graph with React Flow including animated edges, support drag-from-palette node creation, surface a right-hand configuration panel for any selected node, render live execution events in a timeline with color-coded agent badges (planner / execution / validation / recovery / monitoring), and provide a notifications drawer accessible from the AppShell.
Security Requirements
The application must hash passwords with bcrypt at cost 12, sign and verify JWTs with JWT_SECRET, encrypt OAuth access and refresh tokens at rest with CREDENTIAL_ENCRYPTION_KEY, set HTTP security headers via helmet, apply CORS limited to CLIENT_URL, rate-limit auth endpoints via express-rate-limit, validate every request body with express-validator, never log decrypted tokens, and treat any missing or expired credential as an explicit INTEGRATION_NOT_CONNECTED / AUTH_EXPIRED error rather than a generic 500.
Final Expected Outcome
The completed platform must let an operator describe an automation in plain English, watch it materialize as a graph on the canvas, save it, execute it through the agent chain, see each agent event stream in real time, recover or escalate failures automatically, and receive notifications—all backed by real OAuth integrations and a full audit trail in MongoDB. The final application should feel like a modern operations console—close in spirit to n8n or Zapier, but with an explicit agentic execution layer on top.
Codex & AI Agent Implementation Instructions
The AI coding agent must build the application phase by phase, follow the folder structure strictly, keep controllers thin and push logic into services, keep agents pure (no HTTP knowledge), wrap every integration behind the baseIntegration interface, never call Mongo from a controller, never call an integration from an agent without going through the integration service, treat every secret as process.env, use the in-memory store fallback when Mongo or Redis is unavailable so local dev still works, emit a Socket.IO event for every agent step, write one ExecutionLog per agent event, and report the list of files created or changed at the end of every phase.
