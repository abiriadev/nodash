'use client'
import { Suspense, useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Note } from '@/lib/types'
import { api } from '@/lib/api'
import { Sidebar } from '@/components/Sidebar'
import { NoteEditor } from '@/components/NoteEditor'
import { TopNav } from '@/components/TopNav'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'

function HomeContent() {
	const router = useRouter()
	const searchParams = useSearchParams()

	// URL state
	const noteId = searchParams.get('noteId')
	const view = searchParams.get('view')
	const isArchivedView = view === 'archived'

	// App state
	const [notes, setNotes] = useState<Note[]>([])
	const [searchQuery, setSearchQuery] = useState('')
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)

	// Debounced search for API calls
	const debouncedSearch = useDebounce(searchQuery, 300)

	// Derived state
	const selectedNote = useMemo(
		() => notes.find(n => n.id === noteId) || null,
		[notes, noteId],
	)

	// Fetch notes
	const fetchNotes = useCallback(async () => {
		setIsLoading(true)
		try {
			let result
			if (debouncedSearch) {
				const response = await api.searchNotes(debouncedSearch)
				result = response.data
			} else {
				const response = await api.getNotes({
					archived: isArchivedView,
					sortBy: 'updatedAt',
					sortOrder: 'desc',
				})
				result = response.data
			}

			if (debouncedSearch) {
				result = result.filter(n => !!n.archived === isArchivedView)
			}

			setNotes(result)
		} catch (error) {
			console.error('Failed to fetch notes:', error)
		} finally {
			setIsLoading(false)
		}
	}, [debouncedSearch, isArchivedView])

	useEffect(() => {
		fetchNotes()
	}, [fetchNotes])

	// Create Note
	const handleCreateNote = async () => {
		try {
			const newNote = await api.createNote({
				title: 'Untitled',
				content: '',
			})
			await fetchNotes()
			router.push(
				`/?noteId=${newNote.id}${isArchivedView ? '&view=archived' : ''}`,
			)
			if (isArchivedView) {
				router.push(`/?noteId=${newNote.id}`)
			}
		} catch (error) {
			console.error('Failed to create note:', error)
		}
	}

	// Update Note
	const updateNoteApi = useCallback(
		async (id: string, data: Partial<Note>) => {
			setIsSaving(true)
			try {
				await api.updateNote(id, data)
			} catch (e) {
				console.error(e)
			} finally {
				setIsSaving(false)
			}
		},
		[],
	)

	const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
		null,
	)

	const handleNoteChange = (
		id: string,
		field: 'title' | 'content',
		value: string,
	) => {
		// Optimistic Update
		setNotes(prevNotes =>
			prevNotes.map(n =>
				n.id === id
					? {
							...n,
							[field]: value,
							updatedAt: new Date().toISOString(),
						}
					: n,
			),
		)

		if (typingTimeout) clearTimeout(typingTimeout)

		const timeout = setTimeout(() => {
			updateNoteApi(id, { [field]: value })
		}, 1000)

		setTypingTimeout(timeout)
	}

	const handleDeleteNote = async (id: string) => {
		try {
			await api.deleteNote(id)
			setNotes(prev => prev.filter(n => n.id !== id))
			if (noteId === id) {
				router.push(isArchivedView ? '/?view=archived' : '/')
			}
		} catch (error) {
			console.error('Failed to delete note:', error)
		}
	}

	const handleArchiveNote = async (id: string, archived: boolean) => {
		try {
			await api.updateNote(id, { archived })
			setNotes(prev => prev.filter(n => n.id !== id))
			if (noteId === id) {
				router.push(isArchivedView ? '/?view=archived' : '/')
			}
		} catch (error) {
			console.error('Toggle archive failed', error)
		}
	}

	const toggleArchivedView = () => {
		if (isArchivedView) {
			router.push('/')
		} else {
			router.push('/?view=archived')
		}
	}

	return (
		<div className="flex h-screen w-full flex-col bg-background">
			<TopNav
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				onCreateNote={handleCreateNote}
				showArchived={isArchivedView}
				onToggleArchived={toggleArchivedView}
			/>
			<div className="flex flex-1 overflow-hidden">
				<div
					className={cn(
						'hidden w-1/3 min-w-[250px] max-w-[350px] lg:block',
					)}
				>
					<Sidebar
						notes={notes}
						selectedId={noteId}
						isArchivedView={isArchivedView}
					/>
				</div>
				<div className={cn('flex-1 flex flex-col h-full')}>
					<div
						className={cn(
							'flex-1 lg:hidden',
							noteId ? 'hidden' : 'block',
						)}
					>
						<Sidebar
							notes={notes}
							selectedId={noteId}
							isArchivedView={isArchivedView}
							className="border-r-0"
						/>
					</div>
					<div
						className={cn(
							'flex-1 h-full',
							!noteId && 'hidden lg:block',
						)}
					>
						<NoteEditor
							note={selectedNote}
							onUpdate={handleNoteChange}
							onDelete={handleDeleteNote}
							onArchive={handleArchiveNote}
							isSaving={isSaving}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function Home() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center h-screen">
					Loading...
				</div>
			}
		>
			<HomeContent />
		</Suspense>
	)
}
