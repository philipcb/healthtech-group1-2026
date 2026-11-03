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
import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type FilterDialogProps = {
	onReset?: () => void;
	children: ReactNode;
	className?: string;
};

/** The filters that don't fit on phones, behind a button. The period picker's own button shows the period. */
export function FilterDialog({ onReset, children, className }: FilterDialogProps) {
	const { t } = useTranslation();

	return (
		<div className={className}>
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
		</div>
	);
}
