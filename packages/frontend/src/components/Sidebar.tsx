import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Note } from '@/lib/types'

// Fallback date formatter if date-fns not available or for simplicity
const formatDate = (dateString: string) => {
	try {
		const date = new Date(dateString)
		return date.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
		})
	} catch {
		return ''
	}
}

interface SidebarProps {
	notes: Note[]
	selectedId: string | null
	className?: string
	isArchivedView?: boolean
}

export function Sidebar({
	notes,
	selectedId,
	className,
	isArchivedView,
}: SidebarProps) {
	return (
		<div
			className={cn(
				'flex flex-col border-r bg-muted/10 h-full',
				className,
			)}
		>
			<div className="p-4 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
				<h2 className="text-lg font-semibold tracking-tight">
					{isArchivedView ? 'Archived Notes' : 'All Notes'}
				</h2>
				<p className="text-xs text-muted-foreground">
					{notes.length} {notes.length === 1 ? 'note' : 'notes'}
				</p>
			</div>

			<div className="flex-1 overflow-auto">
				{notes.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-40 text-center p-4">
						<p className="text-sm text-muted-foreground">
							No notes found.
						</p>
					</div>
				) : (
					<div className="flex flex-col gap-2 p-4">
						{notes.map(note => (
							<Link
								key={note.id}
								href={`/?noteId=${note.id}${isArchivedView ? '&view=archived' : ''}`}
								className={cn(
									'flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent',
									selectedId === note.id
										? 'bg-accent text-accent-foreground ring-1 ring-border'
										: 'bg-card text-card-foreground', //"bg-transparent",
									isArchivedView && 'opacity-75 grayscale',
								)}
							>
								<div className="flex w-full flex-col gap-1">
									<div className="flex items-center justify-between">
										<div className="font-semibold line-clamp-1">
											{note.title || 'Untitled Note'}
										</div>
										<div className="hidden text-xs text-muted-foreground sm:inline-block">
											{formatDate(note.updatedAt)}
										</div>
									</div>
									<div className="line-clamp-2 text-xs text-muted-foreground">
										{note.content?.substring(0, 300) ||
											'No content'}
									</div>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
