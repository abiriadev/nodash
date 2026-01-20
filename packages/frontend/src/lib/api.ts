import type {
	CreateNoteDto,
	Note,
	SearchResponse,
	UpdateNoteDto,
} from './types'
import queryString from 'query-string'

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

async function fetcher<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const url = `${API_BASE_URL}${endpoint}`
	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
	})

	if (!response.ok) {
		let errorMessage = 'An error occurred'
		try {
			const errorData = await response.json()
			errorMessage = errorData.message || errorMessage
		} catch {
			// Ignore JSON parse error
		}
		throw new Error(errorMessage)
	}

	// Handle 204 No Content
	if (response.status === 204) {
		return {} as T
	}

	return response.json()
}

export const api = {
	getNotes: async (
		params: {
			archived?: boolean
			limit?: number
			offset?: number
			sortBy?: string
			sortOrder?: string
		} = {},
	) => {
		const query = queryString.stringify(params)
		return fetcher<Note[]>(`/notes?${query}`)
	},

	getNote: async (id: string) => {
		return fetcher<Note>(`/notes/${id}`)
	},

	createNote: async (data: CreateNoteDto) => {
		return fetcher<Note>('/notes', {
			method: 'POST',
			body: JSON.stringify(data),
		})
	},

	updateNote: async (id: string, data: UpdateNoteDto) => {
		return fetcher<Note>(`/notes/${id}`, {
			method: 'PUT',
			body: JSON.stringify(data),
		})
	},

	deleteNote: async (id: string) => {
		return fetcher<void>(`/notes/${id}`, {
			method: 'DELETE',
		})
	},

	searchNotes: async (q: string) => {
		const query = queryString.stringify({ q })
		return fetcher<SearchResponse>(`/notes/search?${query}`)
	},
}
