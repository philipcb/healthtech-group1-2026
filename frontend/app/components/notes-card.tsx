import { useDate } from "@/features/date-picker/use-date.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { useView } from "@/features/views/use-view.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { cn } from "@/lib/utils.ts";
import { NotebookPenIcon } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { Card, CardContent, CardLabelHeader } from "./ui/card.tsx";
import { Skeleton } from "./ui/skeleton.tsx";
import { Textarea } from "./ui/textarea.tsx";
import { useNoteEditor } from "./use-note-editor.ts";

function NotesShell({ title, children }: PropsWithChildren<{ title: string }>) {
	return (
		<Card muted={true} variant="labeled" className="max-h-96 w-full overflow-y-auto">
			<CardLabelHeader>
				<NotebookPenIcon className="size-4 text-muted-foreground" />
				<h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">{title}</h2>
			</CardLabelHeader>
			{children}
		</Card>
	);
}

interface NotesCardProps {
	forceInteractiveMode?: boolean;
}

export const NotesCard = ({ forceInteractiveMode = false }: NotesCardProps) => {
	const { t, i18n } = useTranslation();
	const { view } = useView();
	const { date } = useDate();
	const { pathname, search } = useLocation();
	const { user } = useUser();
	const formatDate = useFormatDate();

	const canLinkToDayView = pathname !== "/operator/live";

	const { data, isLoading, isError, noteValue, setNoteValue, handleBlur } = useNoteEditor(view, date, user.id);

	const isInteractiveMode = forceInteractiveMode || view === "day";
	const title = t(($) => $.notes[isInteractiveMode ? "interactive" : "list"].title);

	if (isLoading) {
		return (
			<NotesShell title={title}>
				<CardContent>
					<Skeleton className="h-4 w-[90%]" />
					<Skeleton className="h-4 w-1/2" />
				</CardContent>
			</NotesShell>
		);
	}

	if (isError) {
		return (
			<NotesShell title={title}>
				<CardContent>
					<p>{t(($) => $.common.error)}</p>
				</CardContent>
			</NotesShell>
		);
	}

	if (isInteractiveMode) {
		return (
			<NotesShell title={title}>
				<CardContent>
					<Textarea
						placeholder={t(($) => $.notes.interactive.placeholder)}
						value={noteValue}
						className="-mx-2 -my-1 min-h-17 w-[calc(100%+var(--spacing)*4)] rounded-t-none border-none bg-transparent px-2 py-1 text-foreground text-sm dark:bg-transparent"
						onChange={(e) => setNoteValue(e.target.value)}
						onBlur={handleBlur}
					/>
				</CardContent>
			</NotesShell>
		);
	}

	if (!data || data.length === 0) {
		return (
			<NotesShell title={title}>
				<CardContent>
					<p className="text-xs">
						{t(($) => $.notes.list.noNotes, {
							view: t(($$) => $$.views[view]).toLowerCase(),
						})}
					</p>
				</CardContent>
			</NotesShell>
		);
	}

	return (
		<NotesShell title={title}>
			<CardContent className="grid grid-cols-[max-content_1fr] gap-y-1">
				{data.map((note) => {
					const rowContent = (
						<>
							<p
								className={cn(
									"col-start-1 w-fit shrink-0",
									"rounded-md bg-secondary p-px px-0.5",
									"truncate font-semibold text-[0.675rem] tabular-nums",
								)}
							>
								{formatDate(note.time, i18n.language === "en" ? "MMM d" : "d. MMM")}
							</p>
							<p className="col-start-2 min-w-0 truncate text-xs">{note.note}</p>
						</>
					);

					const rowClassName = cn(
						"col-span-2 grid min-w-0 grid-cols-subgrid gap-x-1.5",
						"-mx-1 items-baseline rounded-lg p-1 transition-colors",
					);

					if (!canLinkToDayView) {
						return (
							<div key={note.time.getTime()} title={note.note} className={rowClassName}>
								{rowContent}
							</div>
						);
					}

					const params = new URLSearchParams(search);
					params.set("view", "day");
					params.set("date", formatDate(note.time, "yyyy-MM-dd"));

					return (
						<Link
							key={note.time.getTime()}
							title={note.note}
							to={{
								pathname,
								search: `?${params.toString()}`,
							}}
							prefetch="intent"
							className={cn("hover:bg-card-highlight", rowClassName)}
						>
							{rowContent}
						</Link>
					);
				})}
			</CardContent>
		</NotesShell>
	);
};
