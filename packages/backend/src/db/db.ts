import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import type {
	Note,
	NoteRow,
	CreateNoteRequest,
	UpdateNoteRequest,
} from '../types/note.schema.js'

export class NoteDatabase {
	private db: Database.Database

	constructor(dbPath: string = 'notes.db') {
		this.db = new Database(dbPath)
		this.db.pragma('journal_mode = WAL')
		this.initSchema()
	}

	private initSchema() {
		this.db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
    CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(archived);
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);

    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      title,
      content,
      content=notes,
      content_rowid=rowid
    );

    CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes BEGIN
      UPDATE notes_fts SET title = new.title, content = new.content WHERE rowid = new.rowid;
    END;

    CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
      DELETE FROM notes_fts WHERE rowid = old.rowid;
    END;
  `)
	}

	private mapRowToNote(row: NoteRow): Note {
		return {
			id: row.id,
			title: row.title,
			content: row.content,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
			archived: row.archived === 1,
		}
	}

	public getNotes(
		options: {
			archived?: boolean
			limit?: number
			offset?: number
			sortBy?: string
			sortOrder?: 'asc' | 'desc'
		} = {},
	): { data: Note[]; total: number } {
		const {
			archived = false,
			limit = 100,
			offset = 0,
			sortBy = 'updated_at',
			sortOrder = 'desc',
		} = options

		// Convert camelCase sortBy to snake_case for DB
		const dbSortBy = sortBy.replace(
			/[A-Z]/g,
			letter => `_${letter.toLowerCase()}`,
		)

		const archivedVal = archived ? 1 : 0
		const rows = this.db
			.prepare(
				`SELECT * FROM notes WHERE archived = ? ORDER BY ${dbSortBy} ${sortOrder} LIMIT ? OFFSET ?`,
			)
			.all(archivedVal, limit, offset) as NoteRow[]

		const total = (
			this.db
				.prepare(
					'SELECT COUNT(*) as count FROM notes WHERE archived = ?',
				)
				.get(archivedVal) as { count: number }
		).count

		return {
			data: rows.map(row => this.mapRowToNote(row)),
			total,
		}
	}

	public getNoteById(id: string): Note | null {
		const row = this.db
			.prepare('SELECT * FROM notes WHERE id = ?')
			.get(id) as NoteRow | undefined
		return row ? this.mapRowToNote(row) : null
	}

	public createNote(data: CreateNoteRequest): Note {
		const now = Date.now()
		const note: NoteRow = {
			id: uuidv4(),
			title: data.title,
			content: data.content,
			created_at: now,
			updated_at: now,
			archived: 0,
		}

		this.db
			.prepare(
				'INSERT INTO notes (id, title, content, created_at, updated_at, archived) VALUES (?, ?, ?, ?, ?, ?)',
			)
			.run(
				note.id,
				note.title,
				note.content,
				note.created_at,
				note.updated_at,
				note.archived,
			)

		return this.mapRowToNote(note)
	}

	public updateNote(id: string, data: UpdateNoteRequest): Note | null {
		const existing = this.getNoteById(id)
		if (!existing) return null

		const now = Date.now()
		const updates: string[] = []
		const params: any[] = []

		if (data.title !== undefined) {
			updates.push('title = ?')
			params.push(data.title)
		}
		if (data.content !== undefined) {
			updates.push('content = ?')
			params.push(data.content)
		}
		if (data.archived !== undefined) {
			updates.push('archived = ?')
			params.push(data.archived ? 1 : 0)
		}

		updates.push('updated_at = ?')
		params.push(now)

		params.push(id)

		this.db
			.prepare(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`)
			.run(...params)

		return this.getNoteById(id)
	}

	public deleteNote(id: string): boolean {
		const result = this.db.prepare('DELETE FROM notes WHERE id = ?').run(id)
		return result.changes > 0
	}

	public searchNotes(
		query: string,
		limit: number = 50,
		offset: number = 0,
	): { data: Note[]; total: number } {
		const rows = this.db
			.prepare(
				`
    SELECT n.* FROM notes n
    JOIN notes_fts f ON n.rowid = f.rowid
    WHERE notes_fts MATCH ? AND n.archived = 0
    ORDER BY rank
    LIMIT ? OFFSET ?
  `,
			)
			.all(query, limit, offset) as NoteRow[]

		const total = (
			this.db
				.prepare(
					`
    SELECT COUNT(*) as count FROM notes n
    JOIN notes_fts f ON n.rowid = f.rowid
    WHERE notes_fts MATCH ? AND n.archived = 0
  `,
				)
				.get(query) as { count: number }
		).count

		return {
			data: rows.map(row => this.mapRowToNote(row)),
			total,
		}
	}
}
