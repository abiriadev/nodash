import { v4 as uuidv4 } from 'uuid'
import type { DbBinding } from './interface.js'
import type {
	Note,
	NoteRow,
	CreateNoteRequest,
	UpdateNoteRequest,
} from '@/types/note.schema.js'
import { sql } from '@/utils.js'

export class Db {
	constructor(private binding: DbBinding) {}

	public transaction<T>(fn: () => T | Promise<T>): Promise<T> {
		return this.binding.transaction(fn)
	}

	public async close(): Promise<void> {
		await this.binding.close()
	}

	public async initSchema() {
		await this.binding.exec(sql`
		create table if not exists "notes" (
			"id" text primary key,
			"title" text not null,
			"content" text not null,
			"created_at" text not null default current_datetime,
			"updated_at" text not null default current_datetime,
			"archived" integer not null default 0
		);

		create index if not exists "idx_notes_title" on "notes"("title");
		create index if not exists "idx_notes_archived" on "notes"("archived");
		create index if not exists "idx_notes_updated_at" on "notes"("updated_at" desc);

		create virtual table if not exists "notes_fts" using fts5(
			"title",
			"content",
			content="notes",
			content_rowid="rowid"
		);

		create trigger if not exists "notes_fts_insert"
		after insert on "notes" begin
			insert into "notes_fts"("rowid", "title", "content")
			values ("new"."rowid", "new"."title", "new"."content");
		end;

		create trigger if not exists "notes_fts_update"
		after update on "notes" begin
			update "notes_fts"
			set "title" = "new"."title", "content" = "new"."content"
			where "rowid" = "new"."rowid";
		end;

		create trigger if not exists "notes_fts_delete"
		after delete on "notes" begin
			delete from "notes_fts"
			where "rowid" = "old"."rowid";
		end;
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
			sql`
			select * from "notes"
			where "archived" = ?
			order by "${dbSortBy}" ${sortOrder}
			limit ? offset ?
			`,
			archivedVal,
			limit,
			offset,
		)) as NoteRow[]

		const totalResult = (await this.binding.get(
			sql`
			select count(*) as "count"
			from "notes"
			where "archived" = ?
			`,
			archivedVal,
		)) as { count: number } | undefined

		return {
			data: rows.map(row => this.mapRowToNote(row)),
			total: totalResult?.count ?? 0,
		}
	}

	public async getNoteById(id: string): Promise<Note | null> {
		const row = (await this.binding.get(
			sql`
			select *
			from "notes"
			where "id" = ?
			`,
			id,
		)) as NoteRow | undefined

		return row ? this.mapRowToNote(row) : null
	}

	public async createNote(data: CreateNoteRequest): Promise<Note> {
		const id = uuidv4()

		const newNote = (await this.binding.get(
			sql`
			insert into "notes" ("id", "title", "content")
			values (?, ?, ?)
			returning *
			`,
			id,
			data.title,
			data.content,
		)) as NoteRow

		return this.mapRowToNote(newNote)
	}

	public async updateNote(
		id: string,
		data: UpdateNoteRequest,
	): Promise<Note | null> {
		const existing = await this.getNoteById(id)
		if (!existing) return null

		const updates: string[] = []
		const params: unknown[] = []

		if (data.title !== undefined) {
			updates.push(`"title" = ?`)
			params.push(data.title)
		}
		if (data.content !== undefined) {
			updates.push(`"content" = ?`)
			params.push(data.content)
		}
		if (data.archived !== undefined) {
			updates.push(`"archived" = ?`)
			params.push(data.archived ? 1 : 0)
		}

		updates.push(`"updated_at" = current_timestamp`)

		params.push(id)

		const updatedNoteResult = (await this.binding.get(
			sql`
			update "notes"
			set ${updates.join(', ')}
			where "id" = ?
			returning *
			`,
			...params,
		)) as NoteRow | undefined

		return updatedNoteResult ? this.mapRowToNote(updatedNoteResult) : null
	}

	// Delete note by id.
	// If note is deleted, return deleted note.
	// If note is not found, return null.
	public async deleteNote(id: string): Promise<Note | null> {
		const noteResult = (await this.binding.get(
			sql`
			delete from "notes"
			where "id" = ?
			returning *
			`,
			id,
		)) as NoteRow | undefined

		return noteResult ? this.mapRowToNote(noteResult) : null
	}

	public async searchNotes(
		query: string,
		limit: number = 50,
		offset: number = 0,
	): Promise<{ data: Note[]; total: number }> {
		const rows = (await this.binding.all(
			sql`
			select "n".*
			from "notes" "n"
			join "notes_fts" "f"
			on "n"."rowid" = "f"."rowid"
			where "notes_fts" match ? and "n"."archived" = 0
			order by "rank"
			limit ? offset ?
		`,
			query,
			limit,
			offset,
		)) as NoteRow[]

		const totalResult = (await this.binding.get(
			sql`
			select count(*) as "count" from "notes" "n"
			join "notes_fts" "f" on "n"."rowid" = "f"."rowid"
			where "notes_fts" match ? and "n"."archived" = 0
		`,
			query,
		)) as { count: number } | undefined

		return {
			data: rows.map(row => this.mapRowToNote(row)),
			total: totalResult?.count ?? 0,
		}
	}
}
