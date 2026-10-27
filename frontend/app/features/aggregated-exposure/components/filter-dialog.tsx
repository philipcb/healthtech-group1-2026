import { Button } from "@/components/ui/button.tsx";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { PeriodPicker } from "@/features/aggregated-exposure/components/period-picker.tsx";
import { getPeriodLabel, type PeriodSelection } from "@/features/aggregated-exposure/model/period.ts";
import { cn } from "@/lib/utils.ts";
import { CalendarDays, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type FilterDialogProps = {
	periodSelection: PeriodSelection;
	showsPeriod?: boolean;
	onReset?: () => void;
	children: ReactNode;
	className?: string;
};

export function FilterDialog({
	periodSelection,
	showsPeriod = false,
	onReset,
	children,
	className,
}: FilterDialogProps) {
	const { t } = useTranslation();

	return (
		<div className={cn("flex items-center gap-3", className)}>
			<Dialog>
				<DialogTrigger asChild={true}>
					<Button variant="outline" className="bg-background">
						<SlidersHorizontal aria-hidden="true" />
						{t(($) => $.aggregatedExposure.filters.title)}
					</Button>
				</DialogTrigger>

				<DialogContent className="max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
					<DialogHeader>
						<DialogTitle>{t(($) => $.aggregatedExposure.filters.title)}</DialogTitle>
						<DialogDescription>{t(($) => $.aggregatedExposure.filters.description)}</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-1.5">
						<p aria-hidden="true" className="font-medium text-sm">
							{t(($) => $.aggregatedExposure.period.label)}
						</p>
						<PeriodPicker selection={periodSelection} />
					</div>
					{children}

					<DialogFooter>
						<DialogClose asChild={true}>
							<Button variant="outline" onClick={onReset}>
								{t(($) => $.aggregatedExposure.filters.close)}
							</Button>
						</DialogClose>
						<DialogClose asChild={true}>
							<Button>{t(($) => $.aggregatedExposure.filters.save)}</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{showsPeriod && (
				<p className="flex min-w-0 items-center gap-2 text-muted-foreground text-sm">
					<CalendarDays aria-hidden="true" className="size-4 shrink-0" />
					<span>{getPeriodLabel(periodSelection, t)}</span>
				</p>
			)}
		</div>
	);
}
