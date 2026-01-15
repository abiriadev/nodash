# nodash - Requirements Document

**Version**: 1.2
**Last Updated**: 2026-01-14
**Status**: MVP Specification

---

## Project Overview

**nodash** is an extremely simple, full-stack note-taking web application. The application emphasizes simplicity, speed, and a clean user experience for capturing and organizing notes.

**Approach**: Iterative development with minimal viable features first.

## Technology Stack

### Backend

- **Runtime**: Node.js (ES2024)
- **Framework**: Hono (ultrafast, edge-ready)
- **Language**: TypeScript 5.9+
- **Build Tool**: SWC
- **Database**: SQLite with better-sqlite3
- **Deployment**: Cloudflare Workers

### Frontend

- **Framework**: Next.js (App Router)
- **UI Library**: React 18+
- **Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Build**: Next.js with Turbopack

### Key Dependencies

**Backend (@nodash/backend)**:

- `hono` - Web framework
- `better-sqlite3` - SQLite database
- `zod` - Schema validation
- `@hono/zod-validator` - Request validation
- `@hono/swagger` - OpenAPI documentation

**Frontend (@nodash/frontend)**:

- `next` - React framework
- `react` & `react-dom` - UI library
- `tailwindcss` - Utility-first CSS
- `shadcn/ui` - Component library
- `@tanstack/react-query` - Data fetching (optional)

## Core Features (MVP)

### 1. Note Management

- **Create Notes**: Quick note creation with title and content
- **Edit Notes**: In-place editing of existing notes
- **Delete Notes**: Remove notes with confirmation
- **View Notes**: Display notes in a clean, readable format
- **Search Notes**: Full-text search across all notes

### 2. User Interface

- **Note List Sidebar**: Display all notes in a sidebar (collapsible on narrow screens)
- **Note Detail View**: Main area for reading/editing notes
- **Quick Add**: Fast note creation
- **Responsive Design**: Works on desktop and mobile

### 3. Data Persistence

- **SQLite Storage**: Reliable local data storage
- **Auto-save**: Automatic saving of note changes

## Technical Requirements

### Backend API (Hono)

- RESTful API endpoints for CRUD operations
- JSON request/response format
- Hono middleware for logging, CORS, and error handling
- Zod for request/response validation
- Error handling with appropriate HTTP status codes
- **OpenAPI documentation** (using @hono/swagger)
- **Cloudflare Workers compatible**

### Database Schema

#### SQLite Tables

**notes** table:

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,           -- UUID v4
  title TEXT NOT NULL,           -- Note title (max 255 chars)
  content TEXT NOT NULL,         -- Note content (plain text)
  created_at INTEGER NOT NULL,   -- Unix timestamp (milliseconds)
  updated_at INTEGER NOT NULL,   -- Unix timestamp (milliseconds)
  archived INTEGER NOT NULL DEFAULT 0  -- 0 = active, 1 = archived
);

-- Index for search performance
CREATE INDEX idx_notes_title ON notes(title);
CREATE INDEX idx_notes_archived ON notes(archived);
CREATE INDEX idx_notes_updated_at ON notes(updated_at DESC);

-- Full-text search (FTS5)
CREATE VIRTUAL TABLE notes_fts USING fts5(
  title,
  content,
  content=notes,
  content_rowid=rowid
);

-- Triggers to keep FTS in sync
CREATE TRIGGER notes_fts_insert AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;

CREATE TRIGGER notes_fts_update AFTER UPDATE ON notes BEGIN
  UPDATE notes_fts SET title = new.title, content = new.content WHERE rowid = new.rowid;
END;

CREATE TRIGGER notes_fts_delete AFTER DELETE ON notes BEGIN
  DELETE FROM notes_fts WHERE rowid = old.rowid;
END;
```

### Type Definitions

#### Shared Types

```typescript
// Domain types (application layer)
interface Note {
	id: string
	title: string
	content: string
	createdAt: Date
	updatedAt: Date
	archived: boolean
}

// Database types (raw SQLite)
interface NoteRow {
	id: string
	title: string
	content: string
	created_at: number
	updated_at: number
	archived: number // SQLite stores boolean as 0/1
}

// API request/response types
interface CreateNoteRequest {
	title: string
	content: string
}

interface UpdateNoteRequest {
	title?: string
	content?: string
}

interface NoteResponse {
	id: string
	title: string
	content: string
	createdAt: Date
	updatedAt: Date
	archived: boolean
}

// Common pagination response structure
interface PaginatedResponse<T> {
	data: T[]
	total: number
	limit: number
	offset: number
}

// Specific response types
interface NotesListResponse extends PaginatedResponse<NoteResponse> {
	data: NoteResponse[] // Renamed from 'notes' for consistency
}

interface SearchNotesResponse extends PaginatedResponse<NoteResponse> {
	data: NoteResponse[]
	query: string
}

interface ErrorResponse {
	error: string
	message: string
	statusCode: number
}
```

#### Zod Validation Schemas

```typescript
import { z } from 'zod'

// Request validation schemas
const createNoteSchema = z.object({
	title: z.string().min(1).max(255),
	content: z.string(),
})

const updateNoteSchema = z
	.object({
		title: z.string().min(1).max(255).optional(),
		content: z.string().optional(),
	})
	.refine(data => data.title !== undefined || data.content !== undefined, {
		message: 'At least one field (title or content) must be provided',
	})

const noteIdSchema = z.object({
	id: z.string().uuid(),
})

const searchQuerySchema = z.object({
	q: z.string().min(1),
	limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
})

// Common query schemas
const paginationQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(1000).default(100).optional(),
	offset: z.coerce.number().int().min(0).default(0).optional(),
})

const sortQuerySchema = z.object({
	sortBy: z
		.enum(['createdAt', 'updatedAt', 'title'])
		.default('updatedAt')
		.optional(),
	sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
})

const listNotesQuerySchema = paginationQuerySchema
	.merge(sortQuerySchema)
	.extend({
		archived: z.coerce.boolean().default(false).optional(),
	})

// Response validation schemas
const noteResponseSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	content: z.string(),
	createdAt: z.date(),
	updatedAt: z.date(),
	archived: z.boolean(),
})

const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
	z.object({
		data: z.array(itemSchema),
		total: z.number(),
		limit: z.number(),
		offset: z.number(),
	})

const notesListResponseSchema = paginatedResponseSchema(noteResponseSchema)
```

### API Endpoints (Detailed)

#### 1. List All Notes

```
GET /api/notes
```

**Query Parameters:**

- `archived` (optional): `true` | `false` - Filter by archived status (default: `false`)
- `limit` (optional): number - Max results (default: 100, max: 1000)
- `offset` (optional): number - Pagination offset (default: 0)
- `sortBy` (optional): `createdAt` | `updatedAt` | `title` - Sort field (default: `updatedAt`)
- `sortOrder` (optional): `asc` | `desc` - Sort direction (default: `desc`)

**Response:** `200 OK`

```json
{
	"data": [
		{
			"id": "550e8400-e29b-41d4-a716-446655440000",
			"title": "My First Note",
			"content": "This is the content of my note.",
			"createdAt": "2024-01-14T12:00:00.000Z",
			"updatedAt": "2024-01-14T12:00:00.000Z",
			"archived": false
		}
	],
	"total": 1,
	"limit": 100,
	"offset": 0
}
```

**Error Responses:**

- `500 Internal Server Error` - Database error

---

#### 2. Get Single Note

```
GET /api/notes/:id
```

**Path Parameters:**

- `id`: UUID of the note

**Response:** `200 OK`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"title": "My First Note",
	"content": "This is the content of my note.",
	"createdAt": "2024-01-14T12:00:00.000Z",
	"updatedAt": "2024-01-14T12:00:00.000Z",
	"archived": false
}
```

**Error Responses:**

- `404 Not Found` - Note not found
- `400 Bad Request` - Invalid UUID format
- `500 Internal Server Error` - Database error

---

#### 3. Create Note

```
POST /api/notes
```

**Request Body:**

```json
{
	"title": "My New Note",
	"content": "This is the content."
}
```

**Validation:**

- `title`: Required, 1-255 characters
- `content`: Required, any length

**Response:** `201 Created`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"title": "My New Note",
	"content": "This is the content.",
	"createdAt": "2024-01-14T12:00:00.000Z",
	"updatedAt": "2024-01-14T12:00:00.000Z",
	"archived": false
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `500 Internal Server Error` - Database error

---

#### 4. Update Note

```
PUT /api/notes/:id
```

**Path Parameters:**

- `id`: UUID of the note

**Request Body:**

```json
{
	"title": "Updated Title",
	"content": "Updated content."
}
```

**Validation:**

- `title`: Optional, 1-255 characters
- `content`: Optional, any length
- At least one field must be provided

**Response:** `200 OK`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"title": "Updated Title",
	"content": "Updated content.",
	"createdAt": "2024-01-14T12:00:00.000Z",
	"updatedAt": "2024-01-14T12:00:00.000Z",
	"archived": false
}
```

**Error Responses:**

- `404 Not Found` - Note not found
- `400 Bad Request` - Validation error or invalid UUID
- `500 Internal Server Error` - Database error

---

#### 5. Delete Note (Soft Delete)

```
DELETE /api/notes/:id
```

**Path Parameters:**

- `id`: UUID of the note

**Response:** `204 No Content`

**Error Responses:**

- `404 Not Found` - Note not found
- `400 Bad Request` - Invalid UUID format
- `500 Internal Server Error` - Database error

---

#### 6. Search Notes

```
GET /api/notes/search?q=query
```

**Query Parameters:**

- `q`: Search query (required, min 1 character)
- `limit` (optional): Max results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `200 OK`

```json
{
	"data": [
		{
			"id": "550e8400-e29b-41d4-a716-446655440000",
			"title": "My First Note",
			"content": "This is the content of my note.",
			"createdAt": "2024-01-14T12:00:00.000Z",
			"updatedAt": "2024-01-14T12:00:00.000Z",
			"archived": false
		}
	],
	"total": 1,
	"limit": 50,
	"offset": 0,
	"query": "first"
}
```

**Search Behavior:**

- Full-text search across title and content
- Case-insensitive
- Excludes archived notes
- Results ordered by relevance

**Error Responses:**

- `400 Bad Request` - Missing or invalid query parameter
- `500 Internal Server Error` - Database error

---

### Error Response Format

All error responses follow this structure:

```json
{
	"error": "NotFound",
	"message": "Note with id '550e8400-e29b-41d4-a716-446655440000' not found",
	"statusCode": 404
}
```

**Common Error Types:**

- `ValidationError` (400)
- `NotFound` (404)
- `InternalServerError` (500)

### Frontend Requirements

#### 1. Core Architecture

- **Framework**: Next.js App Router (React Server Components for data fetching, Client Components for editor/interactions).
- **Styling**: Tailwind CSS for responsive, utility-first layout.
- **Components**: shadcn/ui for high-quality, accessible interactive elements.
- **State Management**: URL-driven for selected notes (e.g., `/notes/[id]`), React state or TanStack Query for UI/search states.

#### 2. Layout & UI Structure

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
- **Body**: distraction-free text area for note content.
- **Status Indicator**: Subtle visual feedback for "Saving..." and "Saved" states.
- **Contextual Menu**: A "three-dot" (ellipsis) menu providing note-specific actions:
    - **Archive/Unarchive**: Move note between states.
    - **Delete**: Permanent removal with a confirmation dialog.
    - **Export**: (Backlog) Download as text.

#### 3. Functional Requirements & UX

- **Create Note Flow**: Clicking "+" sends a `POST` request, receives the new UUID, and navigates the user to that note's URL.
- **Auto-save**: Content and Title changes trigger `PUT` requests with debounce to prevent excessive API calls.
- **Optimistic UI**: Sidebar title/preview updates immediately as the user types in the editor.
- **Archiving Logic**:
    - Archived notes are hidden from the default view.
    - In "Archived View", the note items should have a visual differentiator (e.g., grayscale or a badge).
    - Deleting an archived note is a permanent action.
- **Responsive Behavior**: Sidebar collapses into a drawer on narrow screens; the editor takes priority for the screen real estate.

## Project Structure

```
nodash/
├── packages/
│   ├── backend/          # Backend API server (Hono)
│   │   ├── src/
│   │   │   ├── index.ts  # Main entry point
│   │   │   ├── db/       # Database layer (SQLite)
│   │   │   ├── routes/   # API routes
│   │   │   └── types/    # Shared types
│   │   ├── .swcrc
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/         # Frontend application (Next.js)
│       ├── src/
│       │   ├── app/      # Next.js app directory
│       │   ├── components/ # React components
│       │   └── lib/      # Utilities and helpers
│       ├── public/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.js
│       └── next.config.js
├── .agent/
│   ├── requirements.md   # This document
│   └── workflows/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── tsconfig.json
```

## Development Workflow

### Setup

```bash
# Install all dependencies
pnpm install

# Development mode (run both backend and frontend)
pnpm -r dev

# Backend only
pnpm -F @nodash/backend dev

# Frontend only
pnpm -F @nodash/frontend dev

# Build all packages
pnpm -r build

# Production mode
pnpm -r start
```

### Development Servers

- **Backend (Hono)**: `http://localhost:8080`
- **Frontend (Next.js)**: `http://localhost:3000`
- **Hot Reload**: Both backend (tsx) and frontend (Next.js) support hot reloading

### Database Migrations

- Simple SQL files for schema changes
- Version-controlled migration scripts
- Automatic migration on startup

## Constraints

- Single-user application (no authentication required, as of now)
- Local-first (no cloud dependencies)
- Browser support: Modern evergreen browsers (Chrome, Firefox, Safari, Edge)

## Deliverables

1. Working full-stack application
2. Database schema and migrations
3. RESTful API with OpenAPI documentation
4. Responsive web interface
5. README with setup instructions

---

## Feature Backlog (Future Iterations)

### Planned Features

- **Tags/Categories**: Organization system for notes
- **Dark Mode**: Light/dark theme support
- **Keyboard Shortcuts**: Quick actions (Ctrl+N for new note, etc.)
- **Markdown Support**: Rich text formatting
- **Data Export**: Export notes to JSON or markdown
- **Data Import**: Import notes from common formats
- **Offline Support**: PWA capabilities

### Long-term Vision

- Multi-user support with authentication
- Real-time collaboration
- Cloud sync
- Mobile native apps
- Rich text editor (WYSIWYG)
- File attachments
- Note sharing/publishing
- Encryption for sensitive notes
- Browser extension for quick capture
