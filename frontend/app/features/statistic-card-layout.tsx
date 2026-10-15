import { Card } from "@/components/ui/card.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible.tsx";
import { ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";

type StatisticCardLayoutProps = {
	label: string;
	/** The large figure */
	value: ReactNode;
	/** A color shown next to the value, like a danger level's */
	indicatorColor?: string;
	/** Shown below the value */
	caption?: ReactNode;
	/**
	 * Makes phones show a row with the label and `summary`, which expands to the value and the expanded `caption`.
	 * Without it, phones show the label and value in one row, with the caption below, so nothing is hidden.
	 */
	collapsible?: { summary: ReactNode; caption?: ReactNode };
};

/**
 * The look of one statistic: an uppercase label, a large value and a caption, the same on every page. Only layout, so
 * what the value means, like a share of a limit value and its danger level, is left to the caller.
 */
export function StatisticCardLayout({ label, value, indicatorColor, caption, collapsible }: StatisticCardLayoutProps) {
	const indicator = (className: string) =>
		indicatorColor !== undefined && <div className={className} style={{ backgroundColor: indicatorColor }} />;

	return (
		<>
			{collapsible ? (
				// Mobile: expandable, whole row is the trigger (same pattern as HallOperatorList).
				<Card variant="labeled" className="md:hidden">
					<Collapsible>
						<CollapsibleTrigger asChild={true}>
							<button
								type="button"
								className="group flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-accent/50"
							>
								<span className="min-w-0 truncate text-muted-foreground text-xs uppercase tracking-widest">
									{label}
								</span>

								<span className="flex shrink-0 items-center gap-1.5">
									{collapsible.summary}
									<ChevronDownIcon className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
								</span>
							</button>
						</CollapsibleTrigger>

						<CollapsibleContent className="flex flex-col gap-3 border-card-border border-t px-3 py-2">
							<div className="flex items-center gap-2">
								{indicator("size-4 shrink-0 rounded-md")}
								<p className="font-semibold text-2xl">{value}</p>
							</div>

							{collapsible.caption !== undefined && (
								<p className="text-muted-foreground text-xs">{collapsible.caption}</p>
							)}
						</CollapsibleContent>
					</Collapsible>
				</Card>
			) : (
				// Mobile: one compact card, the value wrapping below the label when it doesn't fit beside it
				<Card className="gap-1 px-3 py-2 md:hidden">
					<div className="flex flex-wrap items-baseline justify-between gap-x-2">
						<p className="text-muted-foreground text-xs uppercase tracking-widest">{label}</p>
						<div className="ml-auto flex items-center gap-1.5">
							{indicator("size-3.5 shrink-0 rounded-md")}
							<p className="font-medium text-sm tabular-nums">{value}</p>
						</div>
					</div>
					{caption !== undefined && <div className="text-muted-foreground text-xs">{caption}</div>}
				</Card>
			)}

			{/* Desktop: static card matching main, no button/Collapsible. */}
			<Card className="hidden min-h-26.25 gap-1 md:flex">
				<p className="text-muted-foreground text-xs uppercase tracking-widest">{label}</p>

				<div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-2">
					{indicator("size-4 rounded-md")}
					<p className="font-semibold text-2xl">{value}</p>
				</div>

				{caption !== undefined && (
					<div className="flex flex-wrap items-center gap-x-2 text-muted-foreground text-xs">{caption}</div>
				)}
			</Card>
		</>
	);
}
