import { v4 as uuidv4 } from 'uuid'
import type { DbBinding } from './interface.js'
import type {
	Note,
	NoteRow,
	CreateNoteRequest,
	UpdateNoteRequest,
} from '@/types/note.schema.js'

export class Db {
	constructor(private binding: DbBinding) {}

	public transaction<T>(fn: () => T | Promise<T>): Promise<T> {
		return this.binding.transaction(fn)
	}

	public async initSchema() {
		await this.binding.exec(`
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

	public async getNotes(
		options: {
			archived?: boolean
			limit?: number
			offset?: number
			sortBy?: string
			sortOrder?: 'asc' | 'desc'
		} = {},
	): Promise<{ data: Note[]; total: number }> {
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
		const rows = (await this.binding.all(
			`SELECT * FROM notes WHERE archived = ? ORDER BY ${dbSortBy} ${sortOrder} LIMIT ? OFFSET ?`,
			archivedVal,
			limit,
			offset,
		)) as NoteRow[]

		const totalResult = (await this.binding.get(
			'SELECT COUNT(*) as count FROM notes WHERE archived = ?',
			archivedVal,
		)) as { count: number } | undefined

		return {
			data: rows.map(row => this.mapRowToNote(row)),
			total: totalResult?.count ?? 0,
		}
	}

	public async getNoteById(id: string): Promise<Note | null> {
		const row = (await this.binding.get(
			'SELECT * FROM notes WHERE id = ?',
			id,
		)) as NoteRow | undefined
		return row ? this.mapRowToNote(row) : null
	}

	public async createNote(data: CreateNoteRequest): Promise<Note> {
		const now = Date.now()
		const note: NoteRow = {
			id: uuidv4(),
			title: data.title,
			content: data.content,
			created_at: now,
			updated_at: now,
			archived: 0,
		}

		await this.binding.run(
			'INSERT INTO notes (id, title, content, created_at, updated_at, archived) VALUES (?, ?, ?, ?, ?, ?)',
			note.id,
			note.title,
			note.content,
			note.created_at,
			note.updated_at,
			note.archived,
		)

		return this.mapRowToNote(note)
	}

	public async updateNote(
		id: string,
		data: UpdateNoteRequest,
	): Promise<Note | null> {
		const existing = await this.getNoteById(id)
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

		await this.binding.run(
			`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`,
			...params,
		)

		return this.getNoteById(id)
	}

	public async deleteNote(id: string): Promise<boolean> {
		const result = await this.binding.run(
			'DELETE FROM notes WHERE id = ?',
			id,
		)
		return result.changes > 0
	}

	public async searchNotes(
		query: string,
		limit: number = 50,
		offset: number = 0,
	): Promise<{ data: Note[]; total: number }> {
		const rows = (await this.binding.all(
			`
    SELECT n.* FROM notes n
    JOIN notes_fts f ON n.rowid = f.rowid
    WHERE notes_fts MATCH ? AND n.archived = 0
    ORDER BY rank
    LIMIT ? OFFSET ?
  `,
			query,
			limit,
			offset,
		)) as NoteRow[]

		const totalResult = (await this.binding.get(
			`
    SELECT COUNT(*) as count FROM notes n
    JOIN notes_fts f ON n.rowid = f.rowid
    WHERE notes_fts MATCH ? AND n.archived = 0
  `,
			query,
		)) as { count: number } | undefined

		return {
			data: rows.map(row => this.mapRowToNote(row)),
			total: totalResult?.count ?? 0,
		}
	}
}
