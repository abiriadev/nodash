---
trigger: model_decision
description: follow this detailed full requirement specification as much as possible.
---

# nodash - Requirements Document

**Version**: 1.3
**Last Updated**: 2026-01-19
**Status**: MVP Specification (Backend Core Complete)

---

## 1. Project Overview

**nodash** is a minimalist, high-performance note-taking application designed for speed and simplicity. It provides a distraction-free environment for capturing and organizing notes with instant search capabilities.

- **Primary Goal**: Extreme simplicity and fast user interaction.
- **Approach**: Monorepo architecture with a clean separation of concerns.

---

## 2. Core Features (MVP)

### Note Management

- **CRUD Operations**: Complete management for note title and content.
- **Archiving**: Support for "soft-delete" via archiving, allowing users to hide notes from the main list.
- **Full-Text Search (FTS5)**: Ultra-fast search across titles and content.

### Application Logic

- **Monorepo**: Shared workspace management using `pnpm`.
- **Environment Agnostic**: Backend logic runs seamlessly on Node.js and Cloudflare Workers.
- **Clean API**: Standardized JSON responses and error handling.

---

## 3. Frontend Detailed Requirements

### Layout & UI Structure

The application follows a classic two-pane layout with a global header:

**A. Top Navigation Bar (Global Header)**

- **Search Bar**: Centered or left-aligned input for full-text filtering of the currently visible note list.
- **Action Group**:
    - **Create Note Button**: Prominent "+" button to immediately spawn a new note and focus the editor.
    - **Archive Toggle**: A switch or button to toggle between viewing "Active" notes and "Archived" notes.
    - **Responsive Menu**: Hamburger menu for sidebar on mobile devices.

**B. Sidebar (Note List)**

- **List View**: A vertically scrollable list of note "cards" or "items".
- **Item Content**: Shows the title (truncated) and a single-line preview of the content.
- **Selection State**: Clear visual highlight for the note currently being edited.
- **Sorting**: Reflects the `sortBy` and `sortOrder` chosen by the user (defaulting to latest update).

**C. Main Area (Content Editor)**

- **Header**: Focusable title input with large font size.
- **Body**: Distraction-free text area for note content.
- **Status Indicator**: Subtle visual feedback for "Saving..." and "Saved" states.
- **Contextual Menu**: A "three-dot" (ellipsis) menu providing note-specific actions:
    - **Archive/Unarchive**: Move note between states.
    - **Delete**: Permanent removal with a confirmation dialog.

### Functional Requirements & UX

- **Create Note Flow**: Clicking "+" sends a `POST` request, receives the new UUID, and navigates the user to that note's URL.
- **Auto-save**: Content and Title changes trigger `PUT` requests with debounce to prevent excessive API calls.
- **Optimistic UI**: Sidebar title/preview updates immediately as the user types in the editor.
- **Archiving Logic**:
    - Archived notes are hidden from the default view.
    - In "Archived View", note items should have a visual differentiator (e.g., grayscale).
- **Responsive Behavior**: Sidebar collapses into a drawer on narrow screens; the editor takes priority for screen real estate.

---

## 4. API Specification

All endpoints are prefixed with `/api`.

| Method   | Endpoint        | Description       | Status Codes        | Key Parameters                                              |
| :------- | :-------------- | :---------------- | :------------------ | :---------------------------------------------------------- |
| `GET`    | `/notes`        | List all notes    | `200`               | `archived` (bool), `limit`, `offset`, `sortBy`, `sortOrder` |
| `GET`    | `/notes/:id`    | Get single note   | `200`, `404`        | `id` (UUID)                                                 |
| `POST`   | `/notes`        | Create a new note | `201`, `400`        | `title` (string), `content` (string)                        |
| `PUT`    | `/notes/:id`    | Update note       | `200`, `400`, `404` | `title`, `content`, `archived`                              |
| `DELETE` | `/notes/:id`    | Permanent delete  | `204`, `404`        | `id` (UUID)                                                 |
| `GET`    | `/notes/search` | Full-text search  | `200`, `400`        | `q` (query string), `limit`, `offset`                       |

### Error Response Format

Errors follow a consistent JSON structure:

```json
{
	"error": "NotFound",
	"message": "Note with id '...' not found",
	"statusCode": 404
}
```

### Data Model (Logical)

- **Note**: `id`, `title`, `content`, `createdAt` (Date), `updatedAt` (Date), `archived` (bool).
- **Format**: All responses return standardized JSON. Dates are ISO strings.

### API Examples

**POST `/notes`** (Create)

```json
// Request
{ "title": "Buy groceries", "content": "Milk, eggs, bread" }

// Response (201)
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Buy groceries",
  "content": "Milk, eggs, bread",
  "createdAt": "2026-01-19T12:00:00.000Z",
  "updatedAt": "2026-01-19T12:00:00.000Z",
  "archived": false
}
```

**GET `/notes/search?q=milk`** (Search)

```json
// Response (200)
{
  "data": [{ "id": "...", "title": "Buy groceries", ... }],
  "total": 1,
  "limit": 50,
  "offset": 0,
  "query": "milk"
}
```

---

## 5. Technology Stack

### Backend (`@nodash/backend`)

- **Framework**: [Hono](https://hono.dev/) (Edge-ready)
- **Runtime**: Node.js (Local) / Cloudflare Workers (Production)
- **Database**: SQLite (Local `better-sqlite3` / Production Cloudflare D1)
- **Data Access**: Custom `Db` class abstraction supporting cross-platform bindings.
- **Validation**: [Zod](https://zod.dev/)
- **Documentation**: OpenAPI (Swagger) via `@hono/swagger`
- **Testing**: Vitest (E2E Integration Tests)

### Frontend (`@nodash/frontend`)

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Styling**: Tailwind CSS
- **Fetch**: TanStack Query / Fetch API

---

## 6. Project Structure

The project is structured as a **pnpm workspace** monorepo:

```text
nodash/
├── packages/
│   ├── backend/         # Hono API, DB logic, and E2E tests
│   │   └── src/db/      # Database abstraction layer
│   └── frontend/        # Next.js web application (In progress)
├── .agent/
│   └── rules/
│       └── requirements.md  # This document (Project source of truth)
├── pnpm-workspace.yaml  # Workspace member definitions
└── package.json         # Root scripts for multi-package tasks
```

---

## 7. Development Workflow

### Setup & Dev

```bash
# Install dependencies
pnpm install

# Install new dependencies
pnpm -F @nodash/backend add <package-name>
pnpm -F @nodash/frontend add <package-name>

# Run in dev mode
pnpm -F @nodash/backend dev
pnpm -F @nodash/frontend dev

# Build for production
pnpm -F @nodash/backend build
pnpm -F @nodash/frontend build

# Run tests
pnpm -F @nodash/backend test
pnpm -F @nodash/frontend test
```

### Deployment

- **Backend**: Deployed as a Cloudflare Worker using Wrangler.
- **Database**: Initialized using D1 SQL migrations.

---

## 8. Project Status

| Component                | Status      | Progress |
| :----------------------- | :---------- | :------- |
| **Monorepo Setup**       | Completed   | 100%     |
| **Backend API**          | Completed   | 100%     |
| **Database Abstraction** | Completed   | 100%     |
| **E2E Tests**            | Completed   | 100%     |
| **Frontend Skeleton**    | Initialized | 10%      |
| **Frontend UI/UX**       | Pending     | 0%       |

---

## 9. Future Roadmap (Backlog)

- [ ] **Rich Editor**: Markdown or WYSIWYG support.
- [ ] **Dark Mode**: System-aware theme switching.
- [ ] **Keyboard Shortcuts**: Power-user navigation.
- [ ] **Tagging System**: Multi-tag organization.
- [ ] **Offline Support**: PWA with local synchronization.
- [ ] **Data Portability**: Export and import notes (JSON/Markdown).
- [ ] **Multi-user Support**: Authentication and user management.
- [ ] **Real-time Collaboration**: Simultaneous editing.
- [ ] **File Attachments**: Support for images and documents.
- [ ] **Note Sharing**: Public links and publishing.
- [ ] **Encryption**: Security for sensitive notes.
