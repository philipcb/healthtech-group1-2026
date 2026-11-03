import { DangerLevelDots } from "@/components/danger-level-dots.tsx";
import { Card, CardContent, CardHeader } from "@/components/ui/card.tsx";
import { type DangerLevel, dangerlevelStyles } from "@/lib/danger-levels.ts";
import { cn } from "@/lib/utils.ts";
import { ArrowDownIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export type StatCardProps = {
	className?: string;
	value: number;
	label: string;
	/** Omit for a neutral, grey card */
	dangerLevel?: DangerLevel;
	/** The team list is narrowed to the operators this card counts */
	selected: boolean;
	onClick: () => void;
};

export const StatCard = ({ className, value, label, dangerLevel, selected, onClick }: StatCardProps) => {
	const { t } = useTranslation();

	const visualDangerLevel = value === 0 || dangerLevel === undefined ? "none" : dangerLevel;
	const { bgSubtle, border, text } = dangerlevelStyles[visualDangerLevel];

	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={selected}
			className="group w-full rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			<Card
				className={cn(
					"h-full cursor-pointer justify-between gap-4 transition-all hover:brightness-95 dark:hover:brightness-85",
					bgSubtle,
					border,
					text,
					selected && "ring-2 ring-current ring-offset-2 ring-offset-background",
					className,
				)}
			>
				<CardHeader className="flex justify-between gap-3 p-0">
					<h3 className={cn("font-medium text-sm", text)}>{label}</h3>
					{dangerLevel && (
						<div className="flex size-2.5 items-center pt-2.5">
							<DangerLevelDots dangerLevel={dangerLevel} horizontal={true} size="sm" />
						</div>
					)}
				</CardHeader>
				<CardContent className="flex flex-row items-end justify-between gap-2">
					<p className={cn("font-medium text-4xl tabular-nums leading-none", text)}>{value}</p>

					<div className="flex items-center gap-1 text-xs">
						<p>
							{selected
								? t(($) => $.foremanDashboard.overview.statCards.clearFilter)
								: t(($) => $.foremanDashboard.overview.statCards.showInList)}
						</p>
						{selected ? (
							<XIcon className="size-4" aria-hidden="true" />
						) : (
							<ArrowDownIcon
								className="size-4 transition-transform group-hover:translate-y-0.5"
								aria-hidden="true"
							/>
						)}
					</div>
				</CardContent>
			</Card>
		</button>
	);
};
