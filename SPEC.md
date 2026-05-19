# AI Autonomous Business Automation Platform - Specification

## Project Overview

**Project Name:** AutoFlow AI
**Type:** Enterprise SaaS Platform (Workflow Automation & AI Orchestration)
**Core Functionality:** A production-grade AI-powered workflow automation system enabling businesses to create, execute, and monitor intelligent business automations with AI agents, real-time execution, and integrations.
**Target Users:** Business operators, developers, and teams needing to automate workflows with AI capabilities.

---

## Architecture Overview

### Monorepo Structure

```
apps/
├── web/          # Next.js 15 frontend
├── api/          # NestJS backend
└── worker/      # BullMQ job processor

packages/
├── ui/          # Shared UI components
├── types/       # TypeScript definitions
├── utils/       # Shared utilities
└── configs/     # Shared configurations
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, TailwindCSS, shadcn/ui, Zustand, TanStack Query, React Flow |
| Backend | NestJS, PostgreSQL, Prisma ORM, Redis, BullMQ, Socket.IO |
| AI | OpenAI API (GPT-4), LangChain |
| Infrastructure | Docker, GitHub Actions |

---

## Database Schema

### Core Entities

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  avatar        String?
  password      String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  memberships   Membership[]
  workflows     Workflow[]
  executions    Execution[]
  agents        Agent[]
}

model Organization {
  id            String    @id @default(cuid())
  name          String
  slug          String    @unique
  logo          String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  memberships   Membership[]
  workflows     Workflow[]
  integrations  Integration[]
  executions    Execution[]
}

model Membership {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  role           MembershipRole @default(MEMBER)
  createdAt      DateTime     @default(now())
  user           User         @relation(fields: [userId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])

  @@unique([userId, organizationId])
}

model Workflow {
  id             String    @id @default(cuid())
  name           String
  description    String?
  active         Boolean   @default(false)
  triggerConfig  Json?
  definition     Json
  organizationId String
  createdById    String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdBy      User      @relation(fields: [createdById], references: [id])
  executions     Execution[]
  nodes          WorkflowNode[]
  edges          WorkflowEdge[]
}

model WorkflowNode {
  id          String   @id @default(cuid())
  workflowId  String
  type        String
  positionX   Float
  positionY   Float
  data        Json
  workflow    Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
}

model WorkflowEdge {
  id          String   @id @default(cuid())
  workflowId  String
  sourceId    String
  targetId    String
  sourceHandle String?
  targetHandle String?
  data        Json?
  workflow    Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
}

model Execution {
  id          String        @id @default(cuid())
  workflowId  String
  organizationId String
  triggerData Json
  status      ExecutionStatus
  startedAt   DateTime      @default(now())
  completedAt DateTime?
  error       String?
  createdAt   DateTime      @default(now())
  workflow    Workflow      @relation(fields: [workflowId], references: [id])
  organization Organization @relation(fields: [organizationId], references: [id])
  createdBy   User          @relation(fields: [createdById], references: [id])
  createdById String
  logs        ExecutionLog[]
}

model ExecutionLog {
  id           String    @id @default(cuid())
  executionId String
  nodeId       String?
  level        LogLevel
  message      String
  data         Json?
  timestamp    DateTime  @default(now())
  execution    Execution @relation(fields: [executionId], references: [id], onDelete: Cascade)
}

model Agent {
  id            String    @id @default(cuid())
  name          String
  description   String?
  model         String    @default("gpt-4")
  instructions  String
  tools         Json      @default("[]")
  organizationId String
  createdById    String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdBy     User      @relation(fields: [createdById], references: [id])
}

model Integration {
  id            String    @id @default(cuid())
  name          String
  type          IntegrationType
  config        Json
  active        Boolean   @default(true)
  organizationId String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id])
}

model ApiKey {
  id            String    @id @default(cuid())
  name          String
  key           String    @unique
  organizationId String
  lastUsedAt    DateTime?
  expiresAt     DateTime?
  createdAt     DateTime  @default(now())
  organization   Organization @relation(fields: [organizationId], references: [id])
}

enum MembershipRole {
  OWNER
  ADMIN
  MEMBER
}

enum ExecutionStatus {
  PENDING
  RUNNING
  SUCCESS
  FAILED
  CANCELLED
}

enum LogLevel {
  INFO
  WARN
  ERROR
  DEBUG
}

enum IntegrationType {
  GMAIL
  SLACK
  TELEGRAM
  DISCORD
  NOTION
  GOOGLE_SHEETS
  HTTP_API
  WEBHOOK
}
```

---

## UI/UX Specification

### Design System

#### Color Palette (Dark Mode First)

```css
--background: #0a0a0b;
--background-elevated: #111113;
--background-subtle: #18181b;
--foreground: #fafafa;
--foreground-muted: #a1a1aa;
--foreground-subtle: #71717a;
--border: #27272a;
--border-subtle: #1f1f23;
--primary: #10b981;
--primary-hover: #059669;
--primary-muted: #064e3b;
--accent: #8b5cf6;
--accent-hover: #7c3aed;
--danger: #ef4444;
--danger-muted: #7f1d1d;
--warning: #f59e0b;
--success: #10b981;
--info: #3b82f6;
```

#### Typography

- **Font Family:** Inter (headings), Geist Mono (code)
- **Headings:**
  - H1: 32px/700
  - H2: 24px/600
  - H3: 20px/600
  - H4: 16px/600
- **Body:** 14px/400
- **Small:** 12px/400
- **Code:** 13px Geist Mono

#### Spacing System

- Base unit: 4px
- Common spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

#### Border Radius

- Small: 4px
- Medium: 8px
- Large: 12px
- XL: 16px

### Layout Structure

#### Main Layout
- Sidebar: 280px fixed (collapsible to 64px)
- Header: 56px fixed
- Content: Fluid with max-width 1400px
- Right panel: 320px (contextual panels)

#### Responsive Breakpoints
- Mobile: < 640px (sidebar hidden)
- Tablet: 640px - 1024px (collapsed sidebar)
- Desktop: > 1024px (full layout)

### Core Pages

#### 1. Dashboard (`/dashboard`)
- Stats cards (workflows, executions, success rate, AI credits)
- Recent executions table
- Quick actions (create workflow, view logs)
- Activity feed

#### 2. Workflows (`/workflows`)
- Grid/list toggle view
- Search and filters
- Workflow cards with status badges
- Create new button

#### 3. Workflow Builder (`/workflows/[id]/edit`)
- React Flow canvas
- Left sidebar: Node palette
- Right sidebar: Node configuration
- Top bar: Save, test, publish controls
- Minimap navigation

#### 4. Executions (`/executions`)
- Execution history with status filters
- Execution detail modal
- Real-time log streaming
- Retry/pause controls

#### 5. AI Agents (`/agents`)
- Agent list with status
- Agent configuration
- Test agent panel
- Tool assignment

#### 6. Integrations (`/integrations`)
- Integration cards
- Connection status
- OAuth flows
- API key management

### Component Library

- Button (primary, secondary, ghost, danger)
- Input (text, textarea, select, multi-select)
- Card (elevated, outlined)
- Modal (centered, side panel)
- Table (sortable, paginated)
- Badge (status, count)
- Toast (success, error, warning, info)
- Avatar (with status indicator)
- Skeleton (loading states)
- Tooltip (with arrow)
- Dropdown (select, context menu)

### Animation Guidelines

- Page transitions: 200ms ease-out
- Hover states: 150ms ease
- Modal open: 250ms cubic-bezier(0.16, 1, 0.3, 1)
- Sidebar collapse: 200ms ease
- Toast auto-dismiss: 300ms

---

## Functionality Specification

### 1. Authentication & Authorization

- Email/password authentication
- Organization-based multi-tenancy
- Role-based access (Owner, Admin, Member)
- API key generation for external integrations

### 2. Workflow System

#### Workflow Builder
- Drag-and-drop node creation
- Node types:
  - **Triggers:** Webhook, Schedule, Manual
  - **AI:** AI Agent, AI Classification, AI Email Generator
  - **Logic:** Condition, Switch, Merge
  - **Actions:** HTTP Request, Send Email, Slack Message, Telegram Message, Discord Embed
  - **Data:** JSON Transform, Variable Extract
- Connection validation
- Cycle detection
- Node error highlighting

#### Workflow Execution
- Async processing via BullMQ
- Node-by-node execution
- Data passing between nodes
- Retry logic with exponential backoff
- Execution timeout (5 min default)
- Cancellation support

#### Triggers
- **Webhook:** Receive HTTP POST/GET, parse body
- **Schedule:** Cron expression, interval
- **Manual:** Button click trigger

### 3. AI Orchestration

#### AI Agents
- Configurable system prompt
- Model selection (GPT-4, GPT-3.5-Turbo)
- Tool definition (functions)
- Memory context management

#### AI Nodes
- **AI Agent:** Execute agent with input
- **Classification:** Categorize input
- **Email Generator:** Generate personalized email
- **Summarization:** Summarize text

### 4. Integrations

#### Built-in Integrations
- Gmail (send email)
- Slack (send message, channel post)
- Telegram (send message)
- Discord (send embed, webhook)
- Notion (create page, update database)
- Google Sheets (append row, read)
- HTTP (GET, POST, PUT, DELETE)

#### Custom HTTP
- Custom headers
- Authentication (Bearer, Basic, API Key)
- JSON/XML/Form body
- Response mapping

### 5. Realtime Features

#### Socket.IO Events
- `execution:start` - Workflow execution started
- `execution:progress` - Node completed
- `execution:complete` - Execution finished
- `execution:error` - Execution failed
- `log:stream` - Real-time log streaming

#### UI Updates
- Live execution status
- Log streaming
- Notification toasts

### 6. Analytics & Monitoring

- Execution counts by status
- Success/failure rates
- Average execution time
- Node performance metrics
- AI usage tracking (tokens, cost)
- Error categorization

---

## API Specification

### REST Endpoints

```
Authentication:
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

Organizations:
GET    /api/organizations
POST   /api/organizations
GET    /api/organizations/:id
PATCH  /api/organizations/:id

Workflows:
GET    /api/workflows
POST   /api/workflows
GET    /api/workflows/:id
PATCH  /api/workflows/:id
DELETE /api/workflows/:id
POST   /api/workflows/:id/activate
POST   /api/workflows/:id/deactivate
POST   /api/workflows/:id/test

Executions:
GET    /api/executions
GET    /api/executions/:id
GET    /api/executions/:id/logs
POST   /api/executions/:id/cancel
POST   /api/executions/:id/retry

Agents:
GET    /api/agents
POST   /api/agents
GET    /api/agents/:id
PATCH  /api/agents/:id
DELETE /api/agents/:id
POST   /api/agents/:id/test

Integrations:
GET    /api/integrations
POST   /api/integrations
GET    /api/integrations/:id
PATCH  /api/integrations/:id
DELETE /api/integrations/:id

Webhooks:
POST   /api/webhooks/:workflowId

Analytics:
GET    /api/analytics/overview
GET    /api/analytics/executions
GET    /api/analytics/usage
```

### WebSocket Events

```typescript
// Client -> Server
'execution:subscribe'    // Subscribe to execution
'execution:unsubscribe' // Unsubscribe
'agent:test'           // Test agent

// Server -> Client
'execution:status'     // Execution status update
'execution:log'        // Log entry
'execution:complete'   // Execution completed
'notification:new'     // New notification
```

---

## Initial MVP Flow

Build this FIRST as proof of concept:

1. **User submits lead form** (external webhook or test trigger)
2. **Webhook receives data** (parse lead name, email, company)
3. **Workflow execution starts** (async via queue)
4. **AI analyzes lead** (classify lead quality, priority)
5. **AI generates personalized email** (contextual response)
6. **Email is sent** (via Gmail integration or mock)
7. **Slack notification is triggered** (notify sales team)
8. **Execution logs are stored** (for debugging)
9. **Dashboard updates in realtime** (via Socket.IO)

---

## Acceptance Criteria

### Must Have (MVP)

- [ ] User can register and login
- [ ] User can create organization
- [ ] User can create workflow with nodes
- [ ] User can connect nodes in flow
- [ ] User can activate/deactivate workflow
- [ ] Webhook trigger receives data
- [ ] Workflow executes node-by-node
- [ ] AI agent processes data
- [ ] Execution logs are stored
- [ ] Dashboard shows stats
- [ ] Real-time execution updates

### Should Have

- [ ] Schedule trigger
- [ ] Multiple AI node types
- [ ] HTTP request node
- [ ] Integration management
- [ ] API keys for external access

### Nice to Have

- [ ] Advanced conditions
- [ ] Loop nodes
- [ ] Webhook response customization
- [ ] Team collaboration
- [ ] Advanced analytics

---

## Development Phases

### Phase 1: Foundation
- Project setup (monorepo, Docker)
- Database schema + Prisma
- Authentication system
- Basic API structure

### Phase 2: Core Workflows
- Workflow CRUD
- Node system
- Execution engine
- BullMQ integration

### Phase 3: AI Integration
- OpenAI integration
- Agent system
- AI nodes

### Phase 4: Realtime & UI
- Socket.IO setup
- Dashboard
- Workflow builder (React Flow)
- Execution monitoring

### Phase 5: Integrations
- HTTP node
- Email, Slack, Telegram
- Notion, Google Sheets

---

## Security Considerations

- Password hashing (bcrypt)
- JWT with short expiry
- Rate limiting on API
- Input validation (Zod)
- SQL injection prevention (Prisma)
- XSS prevention (React)
- CORS configuration
- API key encryption at rest