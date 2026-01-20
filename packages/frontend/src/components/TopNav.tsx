import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Archive, ArchiveX, Plus, Search } from 'lucide-react'
import type { KeyboardEvent } from 'react'

interface TopNavProps {
	searchQuery: string
	onSearchChange: (value: string) => void
	onCreateNote: () => void
	showArchived: boolean
	onToggleArchived: () => void
}

export function TopNav({
	searchQuery,
	onSearchChange,
	onCreateNote,
	showArchived,
	onToggleArchived,
}: TopNavProps) {
	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			// Optional: explicit search trigger
		}
	}

	return (
		<header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px]">
			<div className="w-full flex-1">
				<div className="relative">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Search notes..."
						className="w-full bg-background pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
						value={searchQuery}
						onChange={e => onSearchChange(e.target.value)}
						onKeyDown={handleKeyDown}
					/>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					onClick={onToggleArchived}
					title={
						showArchived
							? 'Show Active Notes'
							: 'Show Archived Notes'
					}
				>
					{showArchived ? (
						<ArchiveX className="h-5 w-5" />
					) : (
						<Archive className="h-5 w-5" />
					)}
					<span className="sr-only">Toggle Archive</span>
				</Button>
				<Button
					onClick={onCreateNote}
					size="sm"
					className="hidden sm:flex"
				>
					<Plus className="mr-2 h-4 w-4" /> New Note
				</Button>
				<Button
					onClick={onCreateNote}
					size="icon"
					className="sm:hidden"
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>
		</header>
	)
}
