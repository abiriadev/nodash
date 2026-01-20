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

export interface SearchResponse {
	data: Note[]
	total: number
	limit: number
	offset: number
	query: string
}

export interface ApiError {
	error: string
	message: string
	statusCode: number
}
