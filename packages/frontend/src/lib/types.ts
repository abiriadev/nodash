export interface Note {
	id: string
	title: string
	content: string
	createdAt: string
	updatedAt: string
	archived: boolean
}

export interface CreateNoteDto {
	title: string
	content: string
}

export interface UpdateNoteDto {
	title?: string
	content?: string
	archived?: boolean
}

export interface PaginatedResponse<T> {
	data: T[]
	total: number
	limit: number
	offset: number
}

export interface SearchResponse extends PaginatedResponse<Note> {
	query: string
}

export interface ApiError {
	error: string
	message: string
	statusCode: number
}
