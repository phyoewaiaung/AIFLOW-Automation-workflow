# AutoFlow AI - Agent Documentation

## Project Overview

AutoFlow AI is a production-grade AI-powered workflow automation platform similar to n8n, Zapier, or LangFlow. It enables businesses to create intelligent workflows with AI agents, real-time execution monitoring, and powerful integrations.

## Architecture

### Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- TypeScript
- TailwindCSS
- shadcn/ui components
- Zustand (state management)
- TanStack Query (data fetching)
- React Flow (workflow builder)

**Backend:**
- NestJS (API server)
- PostgreSQL (database)
- Prisma ORM
- Redis + BullMQ (job queue)
- Socket.IO (real-time)
- OpenAI API (AI)

### Project Structure

```
apps/
├── api/           # NestJS backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # Authentication
│   │   │   ├── users/         # User management
│   │   │   ├── organizations/ # Multi-tenancy
│   │   │   ├── workflows/     # Workflow CRUD
│   │   │   ├── executions/    # Execution management
│   │   │   ├── agents/        # AI agents
│   │   │   ├── integrations/  # External integrations
│   │   │   ├── analytics/     # Stats & metrics
│   │   │   └── websocket/      # Real-time events
│   │   ├── prisma.service.ts
│   │   └── main.ts
│   └── prisma/
│       └── schema.prisma

├── web/           # Next.js frontend
│   ├── src/
│   │   ├── app/              # Pages (App Router)
│   │   │   ├── login/        # Authentication
│   │   │   ├── dashboard/    # Main dashboard
│   │   │   ├── workflows/    # Workflow list & editor
│   │   │   ├── executions/   # Execution history
│   │   │   ├── agents/       # AI agent management
│   │   │   ├── integrations/ # Integration hub
│   │   │   └── settings/     # User settings
│   │   ├── components/
│   │   │   ├── ui/          # shadcn components
│   │   │   ├── layout/       # Sidebar, Header
│   │   │   └── workflow/     # React Flow components
│   │   ├── lib/             # API client
│   │   └── store/           # Zustand stores

└── worker/        # BullMQ processor
    └── src/
        └── main.ts          # Workflow execution engine

packages/
├── types/         # Shared TypeScript types
├── utils/        # Utility functions
├── configs/      # Environment config
└── ui/           # Shared UI components
```

## Core Features

### 1. Authentication & Authorization
- Email/password registration and login
- JWT-based authentication
- Organization-based multi-tenancy
- Role-based access (Owner, Admin, Member)

### 2. Workflow Engine
- Visual workflow builder with React Flow
- Node types: Triggers, AI, Logic, Actions, Data
- Graph-based execution with topological sorting
- Async processing via BullMQ
- Retry logic with exponential backoff

### 3. AI Orchestration
- Configurable AI agents
- Model selection (GPT-4, GPT-3.5-Turbo)
- System prompt customization
- AI nodes: Agent, Classification, Email Generator

### 4. Integrations
- Gmail, Slack, Telegram, Discord
- Notion, Google Sheets
- Custom HTTP requests
- Webhook triggers

### 5. Real-time Features
- Socket.IO for live updates
- Execution status streaming
- Log aggregation
- Notifications

### 6. Analytics
- Execution counts by status
- Success/failure rates
- Workflow performance metrics

## Database Schema

Key entities:
- **User** - Authentication and profile
- **Organization** - Multi-tenant container
- **Membership** - User-Organization relationship
- **Workflow** - Workflow definition
- **WorkflowNode** - Individual nodes in workflow
- **WorkflowEdge** - Connections between nodes
- **Execution** - Workflow run instance
- **ExecutionLog** - Execution logs
- **Agent** - AI agent configuration
- **Integration** - External service connections
- **ApiKey** - API access keys

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Start infrastructure: `docker-compose up -d`
4. Install dependencies: `npm install`
5. Generate Prisma client: `npm run db:generate`
6. Push database: `npm run db:push`

### Running the Application

```bash
# Development
npm run dev:all        # Start all services
npm run dev:api        # Backend only
npm run dev:web        # Frontend only
npm run dev:worker     # Worker only

# Production
docker-compose up --build
```

### Ports
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Swagger: http://localhost:3001/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Key API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET/POST       /api/workflows
GET/PATCH/DEL  /api/workflows/:id

GET/POST       /api/executions
GET            /api/executions/:id/logs
POST           /api/executions/trigger/:workflowId

GET/POST       /api/agents
POST           /api/agents/:id/test

GET            /api/analytics/overview
```

## Workflow Execution

1. Workflow is triggered (webhook, schedule, manual)
2. Execution record is created
3. BullMQ job is queued
4. Worker processes nodes in topological order
5. Each node type has custom execution logic
6. Execution logs are stored in real-time
7. Status updates via Socket.IO

## Development Guidelines

- Follow clean architecture (separate domain logic)
- Use TypeScript strict mode
- Implement proper error handling
- Write async/await code with proper typing
- Use composition over duplication
- Add proper validation with class-validator/Zod
- Implement proper logging

## Security Considerations

- Password hashing with bcrypt
- JWT tokens with short expiry
- Rate limiting on API
- Input validation
- SQL injection prevention (Prisma)
- CORS configuration
- API key encryption

## License

MIT License - See LICENSE file for details