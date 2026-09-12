import { Button } from "@/components/ui/button.tsx";
import { DatePicker } from "@/components/date-picker.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { DayViewIcon, MonthViewIcon, WeekViewIcon } from "@/features/views/views.ts";
import { useExportPDF } from "@/hooks/use-export-pdf.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { TIMEZONE } from "@/i18n/locale.ts";
import { today } from "@/lib/date.ts";
import { TZDate } from "@date-fns/tz";
import { addMonths, addWeeks, startOfMonth, startOfWeek, subMilliseconds, isToday } from "date-fns";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from "lucide-react";
import type { View } from "@/features/views/views.ts";

interface PdfExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	exposureType: "dust" | "noise" | "vibration" | "all";
}

export function PdfExportDialog({ open, onOpenChange, exposureType }: PdfExportDialogProps) {
	const { t } = useTranslation();
	const { user } = useUser();
	const { exportMultipleToPDF } = useExportPDF();

	const [localView, setLocalView] = useState<View>("day");
	const [localDate, setLocalDate] = useState<TZDate>(today());

	const getRangeFromSelection = () => {
		if (localView === "day") {
			return {
				start: localDate,
				end: localDate,
			};
		}

		if (localView === "week") {
			const start = startOfWeek(localDate, { weekStartsOn: 1, in: TIMEZONE });
			const end = subMilliseconds(addWeeks(start, 1, { in: TIMEZONE }), 1);
			return { start, end };
		}

		// month
		const start = startOfMonth(localDate, { in: TIMEZONE });
		const end = subMilliseconds(addMonths(start, 1, { in: TIMEZONE }), 1);
		return { start, end };
	};

	const getNavigationValues = () => {
		if (localView === "day") {
			const previous = new TZDate(localDate.getTime() - 24 * 60 * 60 * 1000, "Europe/Oslo");
			const next = new TZDate(localDate.getTime() + 24 * 60 * 60 * 1000, "Europe/Oslo");
			return { previous, next };
		}

		if (localView === "week") {
			const start = startOfWeek(localDate, { weekStartsOn: 1, in: TIMEZONE });
			const previous = subMilliseconds(start, 1);
			const next = addWeeks(start, 1, { in: TIMEZONE });
			return { previous, next };
		}

		// month
		const start = startOfMonth(localDate, { in: TIMEZONE });
		const previous = subMilliseconds(start, 1);
		const next = addMonths(start, 1, { in: TIMEZONE });
		return { previous, next };
	};

	const handleExport = () => {
		const { start, end } = getRangeFromSelection();

		// TODO: Call the PDF generation function with the date range and exposure type
		// exposureType tells us which graphs to export:
		// - "all" -> export all exposure graphs (from overview page)
		// - "dust" -> export only dust graphs
		// - "noise" -> export only noise graphs
		// - "vibration" -> export only vibration graphs

		console.log(`Exporting PDF for ${exposureType} from ${start} to ${end}`);

		onOpenChange(false);
	};

	const { previous, next } = getNavigationValues();
	const isTodayDate = isToday(localDate, { in: TIMEZONE });

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t(($) => $.layout.exportPdf)}</DialogTitle>
					<DialogDescription>{t(($) => $.layout.exportPdfDescription)}</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					{/* View selector (Day/Week/Month) */}
					<div className="flex justify-center">
						<ToggleGroup
							type="single"
							value={localView}
							variant="outline"
							className="inline-grid w-full auto-cols-fr grid-flow-col"
							onValueChange={(value: View) => {
								if (value) {
									setLocalView(value);
								}
							}}
						>
							<ToggleGroupItem value="day" aria-label={t(($) => $.views.day)}>
								<div className="flex items-center gap-2">
									<DayViewIcon className="size-4" />
									<p className="text-sm">{t(($) => $.views.day)}</p>
								</div>
							</ToggleGroupItem>

							<ToggleGroupItem value="week" aria-label={t(($) => $.views.week)}>
								<div className="flex items-center gap-2">
									<WeekViewIcon className="size-4" />
									<p className="text-sm">{t(($) => $.views.week)}</p>
								</div>
							</ToggleGroupItem>

							<ToggleGroupItem value="month" aria-label={t(($) => $.views.month)}>
								<div className="flex items-center gap-2">
									<MonthViewIcon className="size-4" />
									<p className="text-sm">{t(($) => $.views.month)}</p>
								</div>
							</ToggleGroupItem>
						</ToggleGroup>
					</div>

					{/* Navigation buttons */}
					<div className="grid grid-cols-3 items-center gap-2">
						<Button
							title={t(($) => $.viewPicker.previous)}
							size="xs"
							variant="ghost"
							className="px-1!"
							onClick={() => setLocalDate(previous)}
						>
							<ChevronLeftIcon className="size-3.5 shrink-0" />
							<p className="truncate text-xs">{t(($) => $.viewPicker.previous)}</p>
						</Button>

						<Button
							title={t(($) => $.viewPicker.today)}
							size="xs"
							variant="ghost"
							className="px-1!"
							onClick={() => setLocalDate(today())}
							disabled={isTodayDate}
						>
							<CalendarIcon className="size-3.5 shrink-0" />
							<p className="truncate text-xs">{t(($) => $.viewPicker.today)}</p>
						</Button>

						<Button
							title={t(($) => $.viewPicker.next)}
							size="xs"
							variant="ghost"
							className="px-1!"
							onClick={() => setLocalDate(next)}
						>
							<p className="truncate text-xs">{t(($) => $.viewPicker.next)}</p>
							<ChevronRightIcon className="size-3.5 shrink-0" />
						</Button>
					</div>

					{/* Calendar */}
					<div className="flex justify-center">
						<DatePicker
							mode={localView}
							date={localDate}
							onDateChange={setLocalDate}
							withFooter={true}
							showWeekNumber={true}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t(($) => $.common.cancel)}
					</Button>
					<Button onClick={handleExport}>{t(($) => $.common.export)}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
