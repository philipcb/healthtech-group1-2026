import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { SeriesKey } from "@/features/aggregated-exposure/components/series-key.tsx";
import {
	type ComparableGroup,
	type ComparedEntry,
	getComparableGroupContext,
	getComparableGroupName,
	getComparableGroupSection,
} from "@/features/aggregated-exposure/model/compare.ts";
import { Plus, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type CompareGroupPickerProps = {
	options: Array<ComparableGroup>;
	entries: Array<ComparedEntry>;
	onAdd: (groupIds: Array<string>) => void;
	onRemove: (groupId: string) => void;
	onClear: () => void;
	notice?: { message: string; onUndo?: () => void };
	isLoading: boolean;
	labelledBy: string;
};

export function CompareGroupPicker({
	options,
	entries,
	onAdd,
	onRemove,
	onClear,
	notice,
	isLoading,
	labelledBy,
}: CompareGroupPickerProps) {
	const { t } = useTranslation();
	const searchId = useId();
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const removeButtons = useRef(new Map<string, HTMLButtonElement>());
	const addButton = useRef<HTMLButtonElement>(null);
	const searchInput = useRef<HTMLInputElement>(null);
	const pendingFocus = useRef<{ removedIndex: number } | null>(null);

	const normalizedQuery = query.trim().toLocaleLowerCase();
	const available = options
		.filter((group) => !entries.some((entry) => entry.group.groupId === group.groupId))
		.map((group) => ({
			group,
			name: getComparableGroupName(group, t),
			context: getComparableGroupContext(group, t),
			section: getComparableGroupSection(group, t),
		}))
		.filter(({ name, context }) => `${name} ${context}`.toLocaleLowerCase().includes(normalizedQuery))
		.toSorted((a, b) => a.section.localeCompare(b.section) || a.name.localeCompare(b.name));
	const sections = [...new Set(available.map(({ section }) => section))];
	const hint =
		entries.length === 0
			? t(($) => $.aggregatedExposure.compare.picker.addAtLeastTwo)
			: entries.length === 1
				? t(($) => $.aggregatedExposure.compare.picker.addOneMore)
				: undefined;

	useEffect(() => {
		const target = pendingFocus.current;
		if (target === null) {
			return;
		}

		pendingFocus.current = null;
		const next = entries[target.removedIndex] ?? entries[target.removedIndex - 1];
		(next ? removeButtons.current.get(next.group.groupId) : addButton.current)?.focus();
	}, [entries]);

	const add = (groupIds: Array<string>) => {
		onAdd(groupIds);
		searchInput.current?.focus();
	};

	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<div className="flex items-start gap-3">
				<Popover
					open={isOpen}
					onOpenChange={(open) => {
						setIsOpen(open);
						if (!open) setQuery("");
					}}
				>
					<PopoverTrigger asChild={true}>
						<Button
							ref={addButton}
							variant={entries.length < 2 ? "default" : "outline"}
							size="sm"
							className="rounded-full"
						>
							<Plus aria-hidden="true" />
							{t(($) => $.aggregatedExposure.compare.picker.add)}
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="flex w-80 flex-col gap-2 p-2">
						<label htmlFor={searchId} className="sr-only">
							{t(($) => $.aggregatedExposure.compare.picker.search)}
						</label>
						<div className="relative">
							<Search
								aria-hidden="true"
								className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								ref={searchInput}
								id={searchId}
								type="search"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder={t(($) => $.aggregatedExposure.compare.picker.search)}
								className="pl-8"
								autoComplete="off"
							/>
						</div>
						<div className="max-h-80 overflow-y-auto">
							{available.length === 0 ? (
								<p className="px-2 py-1.5 text-muted-foreground text-sm">
									{isLoading
										? t(($) => $.aggregatedExposure.compare.picker.loading)
										: normalizedQuery
											? t(($) => $.aggregatedExposure.compare.picker.noMatches, {
													query: query.trim(),
												})
											: t(($) => $.aggregatedExposure.compare.picker.noneLeft)}
								</p>
							) : (
								sections.map((section) => {
									const sectionOptions = available.filter((option) => option.section === section);
									const canAddAll = sectionOptions.length > 1;

									return (
										<section key={section} aria-label={section} className="flex flex-col py-1">
											<div className="flex items-center justify-between gap-2 px-2 py-1">
												<h3 className="font-medium text-muted-foreground text-xs">{section}</h3>
												{canAddAll && (
													<Button
														variant="ghost"
														size="xs"
														className="text-xs"
														onClick={() =>
															add(sectionOptions.map(({ group }) => group.groupId))
														}
													>
														{t(($) => $.aggregatedExposure.compare.picker.addAll, {
															count: sectionOptions.length,
														})}
													</Button>
												)}
											</div>
											<ul className="flex flex-col">
												{sectionOptions.map(({ group, name, context }) => (
													<li key={group.groupId}>
														<button
															type="button"
															className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
															onClick={() => add([group.groupId])}
														>
															<span className="truncate">{name}</span>
															<span className="shrink-0 text-muted-foreground text-xs">
																{context}
															</span>
														</button>
													</li>
												))}
											</ul>
										</section>
									);
								})
							)}
						</div>
					</PopoverContent>
				</Popover>
				<ul aria-labelledby={labelledBy} className="flex min-w-0 grow flex-wrap items-center gap-2">
					{entries.map(({ group, slot }, index) => {
						const name = getComparableGroupName(group, t);

						return (
							<li
								key={group.groupId}
								className="flex h-8 min-w-0 max-w-full items-center gap-2 rounded-full border bg-background pr-0.5 pl-3"
							>
								<SeriesKey slot={slot} width={16} />
								<p className="min-w-0 grow truncate text-sm">
									<span className="font-medium">{name}</span>
									<span className="text-muted-foreground text-xs">{` · ${getComparableGroupContext(group, t)}`}</span>
								</p>
								<Button
									ref={(element) => {
										if (element) removeButtons.current.set(group.groupId, element);
										else removeButtons.current.delete(group.groupId);
									}}
									variant="ghost"
									size="icon-sm"
									className="size-7 shrink-0 rounded-full text-muted-foreground"
									aria-label={t(($) => $.aggregatedExposure.compare.picker.remove, { group: name })}
									onClick={() => {
										pendingFocus.current = { removedIndex: index };
										onRemove(group.groupId);
									}}
								>
									<X aria-hidden="true" />
								</Button>
							</li>
						);
					})}
				</ul>
				<div className="flex shrink-0 items-center gap-2">
					<span aria-live="polite" className="text-muted-foreground text-xs tabular-nums">
						{t(($) => $.aggregatedExposure.compare.picker.count, { count: entries.length })}
					</span>
					<Button
						variant="outline"
						size="sm"
						className="rounded-full border-destructive/50 text-destructive-text hover:bg-destructive/10 hover:text-destructive-text focus-visible:border-destructive focus-visible:ring-destructive/20 dark:border-destructive/50 dark:hover:bg-destructive/15"
						disabled={entries.length === 0}
						onClick={() => {
							pendingFocus.current = { removedIndex: 0 };
							onClear();
						}}
					>
						<X aria-hidden="true" />
						{t(($) => $.aggregatedExposure.compare.picker.clear)}
					</Button>
				</div>
			</div>
			<div aria-live="polite" className="flex flex-wrap items-center gap-x-2 text-muted-foreground text-xs">
				{notice ? (
					<>
						<span>{notice.message}</span>
						{notice.onUndo && (
							<Button variant="link" size="xs" className="h-auto px-0 text-xs" onClick={notice.onUndo}>
								{t(($) => $.aggregatedExposure.compare.picker.undo)}
							</Button>
						)}
					</>
				) : (
					hint
				)}
			</div>
		</div>
	);
}
