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
import {
	getPeriodLabel,
	type PeriodSelection,
} from "@/features/occupational-health-service/occupational-health-service-period.ts";
import { OccupationalHealthServicePeriodPicker } from "@/features/occupational-health-service/occupational-health-service-period-picker.tsx";
import { cn } from "@/lib/utils.ts";
import { CalendarDays, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type OccupationalHealthServiceFilterDialogProps = {
	periodSelection: PeriodSelection;
	/** Shows the period next to the button, for pages that don't show it anywhere else on phones */
	showsPeriod?: boolean;
	/** Sets the page's filters back to their defaults, when the dialog is closed with its close button */
	onReset: () => void;
	/** The page's own filters, shown below the period */
	children: ReactNode;
	className?: string;
};

/**
 * A page's filters behind one button, so the results come first on small screens. The filters are the same URL state
 * as the page's inline ones, and every change applies right away, so there's nothing to confirm.
 */
export function OccupationalHealthServiceFilterDialog({
	periodSelection,
	showsPeriod = false,
	onReset,
	children,
	className,
}: OccupationalHealthServiceFilterDialogProps) {
	const { t } = useTranslation();

	return (
		<div className={cn("flex items-center gap-3", className)}>
			<Dialog>
				<DialogTrigger asChild={true}>
					<Button variant="outline" className="bg-background">
						<SlidersHorizontal aria-hidden="true" />
						{t(($) => $.occupationalHealthServiceDashboard.filters.title)}
					</Button>
				</DialogTrigger>

				{/* Less padding than the default, so the toggles fit on the narrowest phones */}
				<DialogContent className="max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
					<DialogHeader>
						<DialogTitle>{t(($) => $.occupationalHealthServiceDashboard.filters.title)}</DialogTitle>
						<DialogDescription>
							{t(($) => $.occupationalHealthServiceDashboard.filters.description)}
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-1.5">
						{/* Only shown, since the period toggle already has this as its label for screen readers */}
						<p aria-hidden="true" className="font-medium text-sm">
							{t(($) => $.occupationalHealthServiceDashboard.period.label)}
						</p>
						<OccupationalHealthServicePeriodPicker selection={periodSelection} />
					</div>
					{children}

					<DialogFooter>
						{/* Resets the filters and closes, unlike the X in the corner, which keeps them */}
						<DialogClose asChild={true}>
							<Button variant="outline" onClick={onReset}>
								{t(($) => $.occupationalHealthServiceDashboard.filters.close)}
							</Button>
						</DialogClose>
						{/* Only closes, since every change is already applied */}
						<DialogClose asChild={true}>
							<Button>{t(($) => $.occupationalHealthServiceDashboard.filters.save)}</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{showsPeriod && (
				// Styled like the details' period line
				<p className="flex min-w-0 items-center gap-2 text-muted-foreground text-sm">
					<CalendarDays aria-hidden="true" className="size-4 shrink-0" />
					<span>{getPeriodLabel(periodSelection, t)}</span>
				</p>
			)}
		</div>
	);
}
