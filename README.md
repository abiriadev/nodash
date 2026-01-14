# Nodash

A monorepo project with frontend and backend packages managed by pnpm workspaces.

## Structure

```
nodash/
├── packages/
│   ├── backend/     # Backend application
│   └── frontend/    # Frontend application
├── pnpm-workspace.yaml
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (see `.node-version`)
- pnpm

### Installation

```bash
pnpm install
```

### Development

Run backend:

```bash
pnpm dev:backend
```

### Build

Build all packages:

```bash
pnpm build
```

Build specific package:

```bash
pnpm build:backend
pnpm build:frontend
```

## Packages

- **@nodash/backend**: Backend application with TypeScript, SWC, and tsx
- **@nodash/frontend**: Frontend application with TypeScript
