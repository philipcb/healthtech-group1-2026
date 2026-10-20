import { DatePicker } from "@/components/date-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { useDate } from "@/features/date-picker/use-date.ts";
import { useView } from "@/features/views/use-view.ts";
import { ViewPicker } from "@/features/views/view-picker.tsx";
import type { View } from "@/lib/views.ts";
import type { TZDate } from "@date-fns/tz";
import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";
import { useTranslation } from "react-i18next";

// Keeps the calendar on the selected date's month, for when the selectable range is too short to need month
// navigation.
const lockedNavigationProps = {
	pagedNavigation: false,
	hideNavigation: true,
	disableNavigation: true,
	captionLayout: "label",
} as const;

interface DateAndViewPickerProps {
	allowedViews?: Array<View>;
	minDate?: TZDate;
	maxDate?: TZDate;
	lockNavigation?: boolean;
}

export function DateAndViewPicker({ allowedViews, minDate, maxDate, lockNavigation = false }: DateAndViewPickerProps) {
	const { date, setDate } = useDate();
	const { view } = useView();
	const { t } = useTranslation();

	const disabledDates: Array<Matcher> = [];

	if (minDate) {
		disabledDates.push({ before: minDate });
	}

	if (maxDate) {
		disabledDates.push({ after: maxDate });
	}

	const viewPicker = (
		<ViewPicker withNavigationButtons={true} allowedViews={allowedViews} minDate={minDate} maxDate={maxDate} />
	);
	const datePicker = (
		<DatePicker
			mode={view}
			showWeekNumber={true}
			date={date}
			onDateChange={setDate}
			disabled={disabledDates.length > 0 ? disabledDates : undefined}
			{...(lockNavigation ? lockedNavigationProps : {})}
		/>
	);

	return (
		<>
			<div className="lg:hidden">
				<Dialog>
					<DialogTrigger asChild={true}>
						<Button variant="outline" className="w-full" aria-label={t(($) => $.datePicker.openLabel)}>
							<CalendarIcon className="size-4" />
							{t(($) => $.datePicker.openLabel)}
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t(($) => $.datePicker.dialogTitle)}</DialogTitle>
						</DialogHeader>
						<div className="flex flex-col gap-4">
							{viewPicker}
							<div className="flex justify-center overflow-x-auto">{datePicker}</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			<div className="hidden lg:flex lg:flex-col lg:gap-4">
				<Card muted={true}>{viewPicker}</Card>
				<Card muted={true} className="overflow-x-auto">
					{datePicker}
				</Card>
			</div>
		</>
	);
}
