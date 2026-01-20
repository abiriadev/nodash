import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import type { Note } from '@/lib/types'
import {
	Archive,
	Trash2,
	ArrowLeft,
	RefreshCw,
	ArchiveRestore,
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface NoteEditorProps {
	note: Note | null
	onUpdate: (id: string, field: 'title' | 'content', value: string) => void
	onDelete: (id: string) => void
	onArchive: (id: string, archived: boolean) => void
	isSaving?: boolean
}

export function NoteEditor({
	note,
	onUpdate,
	onDelete,
	onArchive,
	isSaving,
}: NoteEditorProps) {
	const [title, setTitle] = useState(note?.title || '')
	const [content, setContent] = useState(note?.content || '')

	// Update local state when note prop changes (e.g. switching notes)
	useEffect(() => {
		if (note) {
			setTitle(note.title)
			setContent(note.content)
		} else {
			setTitle('')
			setContent('')
		}
	}, [note?.id, note?.title, note?.content])

	if (!note) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center p-4 text-muted-foreground border-l h-full bg-background/50">
				<div className="mb-4 rounded-full bg-muted p-6">
					<span className="text-4xl">📝</span>
				</div>
				<p className="text-lg font-medium">No note selected</p>
				<p className="text-sm">
					Select a note from the sidebar or remove filters.
				</p>
			</div>
		)
	}

	const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newVal = e.target.value
		setTitle(newVal)
		onUpdate(note.id, 'title', newVal)
	}

	const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newVal = e.target.value
		setContent(newVal)
		onUpdate(note.id, 'content', newVal)
	}

	return (
		<div className="flex flex-col h-full flex-1 min-w-0 bg-background">
			<div className="flex items-center justify-between border-b px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="flex items-center gap-2 lg:hidden">
					<Link href="/">
						<Button variant="ghost" size="icon" className="-ml-2">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
				</div>
				<div className="flex items-center gap-2 ml-auto">
					<span
						className={cn(
							'text-xs text-muted-foreground mr-2 transition-opacity',
							isSaving ? 'opacity-100' : 'opacity-0',
						)}
					>
						Saving...
					</span>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => onArchive(note.id, !note.archived)}
						title={note.archived ? 'Unarchive' : 'Archive'}
					>
						{note.archived ? (
							<ArchiveRestore className="h-4 w-4" />
						) : (
							<Archive className="h-4 w-4" />
						)}
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={() => {
							if (
								confirm(
									'Are you sure you want to delete this note?',
								)
							) {
								onDelete(note.id)
							}
						}}
						title="Delete"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>
			<div className="flex flex-1 flex-col overflow-hidden max-w-3xl mx-auto w-full px-6 py-8">
				<Input
					value={title}
					onChange={handleTitleChange}
					placeholder="Note Title"
					className="border-none text-3xl font-bold shadow-none focus-visible:ring-0 px-0 py-6 h-auto placeholder:text-muted-foreground/50"
				/>
				<Textarea
					value={content}
					onChange={handleContentChange}
					placeholder="Start typing..."
					className="flex-1 resize-none border-none shadow-none focus-visible:ring-0 p-0 text-lg leading-relaxed placeholder:text-muted-foreground/50"
				/>
			</div>
		</div>
	)
}
