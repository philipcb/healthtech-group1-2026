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
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type FilterDialogProps = {
	/** Shown as a button in the dialog when the filters aren't the defaults */
	onReset?: () => void;
	/** How many of the dialog's filters aren't the defaults, shown on the button that opens it */
	activeCount?: number;
	children: ReactNode;
	className?: string;
};

/** The filters that don't fit on phones, behind a button. The period picker's own button shows the period. */
export function FilterDialog({ onReset, activeCount = 0, children, className }: FilterDialogProps) {
	const { t } = useTranslation();

	return (
		<div className={className}>
			<Dialog>
				<DialogTrigger asChild={true}>
					{/* Only the icon, as it sits beside the exposure toggle. The count sits on its corner. */}
					<Button variant="outline" size="icon" className="relative bg-background">
						<SlidersHorizontal aria-hidden="true" />
						{/* In the content rather than aria-label, so the count below is read too */}
						<span className="sr-only">{t(($) => $.aggregatedExposure.filters.title)}</span>
						{activeCount > 0 && (
							<span className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-primary px-1 text-center text-primary-foreground text-xs tabular-nums leading-5">
								<span aria-hidden="true">{activeCount}</span>
								<span className="sr-only">
									{t(($) => $.aggregatedExposure.filters.activeCount, { count: activeCount })}
								</span>
							</span>
						)}
					</Button>
				</DialogTrigger>

				<DialogContent className="max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
					<DialogHeader>
						<DialogTitle>{t(($) => $.aggregatedExposure.filters.title)}</DialogTitle>
						<DialogDescription>{t(($) => $.aggregatedExposure.filters.description)}</DialogDescription>
					</DialogHeader>

					{children}

					{/* The filters apply right away, so closing keeps them. Only the reset button undoes them */}
					<DialogFooter>
						{onReset && activeCount > 0 && (
							<Button variant="ghost" onClick={onReset}>
								<RotateCcw aria-hidden="true" />
								{t(($) => $.aggregatedExposure.filters.reset)}
							</Button>
						)}
						<DialogClose asChild={true}>
							<Button>{t(($) => $.aggregatedExposure.filters.close)}</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
