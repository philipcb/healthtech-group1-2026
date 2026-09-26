import { DatePicker } from "@/components/date-picker.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { PdfChartRenderer, type PdfPageSpec, type PdfView } from "@/features/pdf-export/pdf-chart-renderer.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { DayViewIcon, MonthViewIcon, WeekViewIcon } from "@/features/views/views.ts";
import type { PdfLabels } from "@/hooks/pdf-red-day-table.ts";
import type { PdfCalendarLabels } from "@/hooks/pdf-calendar.ts";
import { useExportPDF } from "@/hooks/use-export-pdf.ts";
import { getLocale, TIMEZONE } from "@/i18n/locale.ts";
import { today } from "@/lib/date.ts";
import { formatMinutesAsDuration, formatMinutesAsHoursAndMinutes } from "@/lib/duration.ts";
import type { Exposure, ExposureUnit } from "@/lib/exposures.ts";
import { getSecurityRegulations } from "@/lib/security-regulations.ts";
import { formatExposureValue, userRoleToString } from "@/lib/utils.ts";
import { TZDate } from "@date-fns/tz";
import {
	addMonths,
	addWeeks,
	addYears,
	getYear,
	isToday,
	startOfMonth,
	startOfWeek,
	startOfYear,
	subMilliseconds,
	eachDayOfInterval,
	addDays,
} from "date-fns";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * PDF Export Dialog Component
 *
 * This file provides a dialog UI for selecting a date range before exporting exposure data to PDF.
 * It is a popup that appears when the user clicks the "Export PDF" button in the left sidebar.
 *
 * Used by: exposure-layout.tsx (the layout wrapper for all exposure pages)
 */

/**
 * Chart unit per exposure type, matching the live cards.
 * Note SingleDayChartRenderer still uses `exposure === "dust" ? "ug" : "db"`, which
 * labels vibration as dB — don't copy that here.
 */
const EXPOSURE_UNIT: Record<Exposure, ExposureUnit> = {
	dust: "ug",
	noise: "db",
	vibration: "points",
};

/**
 * How long handleExport waits for PdfChartRenderer to report every page
 * before giving up with "Timeout waiting for chart IDs".
 */
const EXPORT_TIMEOUT_MS = 120_000;

/**
 * Props for the PDF Export Dialog
 * @param open - Controls whether the dialog is visible
 * @param onOpenChange - Callback to close the dialog
 * @param exposureType - Which exposure data to export:
 *   - "dust" | "noise" | "vibration": Export only one type of exposure
 *   - "all": Export all three exposure types (when on Overview page)
 */
interface PdfExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	exposureType: "dust" | "noise" | "vibration" | "all";
}

export function PdfExportDialog({ open, onOpenChange, exposureType }: PdfExportDialogProps) {
	// Hooks: Get translation, user info, and PDF export functionality
	const { t, i18n } = useTranslation(); // For translating UI text (Norwegian/English)
	const { user } = useUser(); // Current logged-in user (used in PDF filename)
	const { exportPagesToPDF } = useExportPDF(); // Function to build the PDF from page specs

	// STATE: Local date/view selection for the dialog
	// NOTE: These are independent from the global date/view state that controls the main page.
	// The dialog has its own date picker so users can export a different date than what's
	// currently shown on screen.
	const [localView, setLocalView] = useState<PdfView>("day"); // "day" | "week" | "month" | "year"
	const [localDate, setLocalDate] = useState<TZDate>(today()); // The selected date in dialog
	const [isExporting, setIsExporting] = useState(false); // Loading state during PDF generation
	const [shouldRenderCharts, setShouldRenderCharts] = useState(false); // Only render charts when exporting
	const [exportError, setExportError] = useState<string | null>(null);

	// Helper function: Calculate date range from selected view/date
	/**
	 * Calculates the start/end timestamp from the selected view + date.
	 * Used to build readable titles and filenames in the PDF.
	 */
	const getRangeFromSelection = () => {
		if (localView === "day") {
			return {
				start: localDate,
				end: localDate,
			};
		}

		if (localView === "week") {
			// Week starts on Monday (weekStartsOn: 1)
			const start = startOfWeek(localDate, { weekStartsOn: 1, in: TIMEZONE });
			// End is the last millisecond before next week starts
			const end = subMilliseconds(addWeeks(start, 1, { in: TIMEZONE }), 1);
			return { start, end };
		}

		// month
		const start = startOfMonth(localDate, { in: TIMEZONE });
		// End is the last millisecond of the month
		const end = subMilliseconds(addMonths(start, 1, { in: TIMEZONE }), 1);
		return { start, end };
	};

	// Helper function: Calculate previous/next dates for navigation buttons
	// Calculates the previous/next date, used by the calendar's navigation buttons.
	const getNavigationValues = () => {
		if (localView === "day") {
			const previous = new TZDate(localDate.getTime() - 24 * 60 * 60 * 1000, "Europe/Oslo");
			const next = new TZDate(localDate.getTime() + 24 * 60 * 60 * 1000, "Europe/Oslo");
			return { previous, next };
		}

		if (localView === "week") {
			const start = startOfWeek(localDate, { weekStartsOn: 1, in: TIMEZONE });
			const previous = subMilliseconds(start, 1); // Last millisecond of previous week
			const next = addWeeks(start, 1, { in: TIMEZONE }); // First day of next week
			return { previous, next };
		}

		if (localView === "year") {
			const start = startOfYear(localDate, { in: TIMEZONE });
			const previous = subMilliseconds(start, 1);
			const next = addYears(start, 1, { in: TIMEZONE });
			return { previous, next };
		}

		// month
		const start = startOfMonth(localDate, { in: TIMEZONE });
		const previous = subMilliseconds(start, 1); // Last day of previous month
		const next = addMonths(start, 1, { in: TIMEZONE }); // First day of next month
		return { previous, next };
	};

	// Ref to store promise resolver for the page specs
	const pagesResolverRef = useRef<((pages: Array<PdfPageSpec>) => void) | null>(null);

	// Callback: Receive page specs from PdfRenderer
	/**
	 * Called by PdfRenderer once every page has loaded. Each spec says how the page
	 * should be drawn: an off-screen element to rasterize, or a red-day table.
	 */
	const handlePagesReady = useCallback((pages: Array<PdfPageSpec>) => {
		// Resolve the promise if we're waiting for the pages
		if (pagesResolverRef.current) {
			pagesResolverRef.current(pages);
			pagesResolverRef.current = null;
		}
	}, []);

	// Handler: Export button clicked
	/**
	 * Main export function that:
	 * 1. Waits for charts to finish rendering
	 * 2. Generates titles for each page
	 * 3. Calls exportPagesToPDF to build the document
	 * 4. Closes the dialog
	 */
	const handleExport = async () => {
		setIsExporting(true);
		setExportError(null);
		setShouldRenderCharts(true); // Start rendering charts

		// Wait for charts to render and report their pages
		// Create a promise that resolves when handlePagesReady is called
		const pagesPromise = new Promise<Array<PdfPageSpec>>((resolve) => {
			pagesResolverRef.current = resolve;
		});

		// Wait for the pages with timeout
		const timeoutPromise = new Promise<Array<PdfPageSpec>>((_, reject) => {
			setTimeout(() => reject(new Error("Timeout waiting for chart IDs")), EXPORT_TIMEOUT_MS);
		});

		let pages: Array<PdfPageSpec>;
		try {
			pages = await Promise.race([pagesPromise, timeoutPromise]);
		} catch (error) {
			console.error("PDF export failed:", error);
			setIsExporting(false);
			setShouldRenderCharts(false);
			setExportError("Could not generate PDF. Try again.");
			return;
		}

		// Safety check: make sure we have elements to export
		if (!pages || pages.length === 0) {
			console.error("No chart elements ready for export");
			setIsExporting(false);
			setShouldRenderCharts(false);
			setExportError("Could not generate PDF. No charts found.");
			return;
		}

		// Generate a title for each chart page in the PDF
		// Calculate exposure types
		const exposuresToRender = exposureType === "all" ? ["dust", "noise", "vibration"] : [exposureType];

		// Get date range for titles and filename
		const { start, end } = getRangeFromSelection();

		// Titles follow the page order reported by PdfChartRenderer.
		const titles: Array<string> = [];

		for (const exposure of exposuresToRender) {
			const exposureName = t(($) => $.exposures[exposure as "dust" | "noise" | "vibration"]);

			// For day view: use single date
			// For week/month view: use date range
			if (localView === "day") {
				const dateText = localDate.toLocaleDateString(i18n.language, {
					day: "numeric",
					month: "long",
					year: "numeric",
				});
				const title = `${exposureName} - ${user.name} - ${dateText}`;
				titles.push(title, title);
			} else if (localView === "year") {
				const yearStart = startOfYear(localDate, { in: TIMEZONE });
				for (let i = 0; i < 12; i++) {
					const monthDate = addMonths(yearStart, i);
					const monthText = monthDate.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });
					const heading = `${exposureName} - ${user.name} - ${monthText}`;
					// Each month contributes two pages: the calendar, then its red-day table.
					titles.push(heading, `${heading} - ${t(($) => $.pdf.redDays)}`);
				}
			} else {
				const dateText = `${start.toLocaleDateString(i18n.language, { day: "numeric", month: "short" })} - ${end.toLocaleDateString(i18n.language, { day: "numeric", month: "short", year: "numeric" })}`;
				const title = `${exposureName} - ${user.name} - ${dateText}`;
				titles.push(title);
			}
		}

		// Generate filename with date range
		const fileNameDate =
			localView === "day"
				? localDate.toLocaleDateString(i18n.language, {
						day: "numeric",
						month: "long",
						year: "numeric",
					})
				: localView === "year"
					? `${getYear(localDate)}`
					: `${start.toLocaleDateString(i18n.language, { day: "numeric", month: "short" })}-${end.toLocaleDateString(i18n.language, { day: "numeric", month: "short", year: "numeric" })}`;

		const fileName = `${fileNameDate}-${user.name}-${exposureType === "all" ? "Exposure-Overview" : t(($) => $.exposures[exposureType])}`;
		const coverPageData = {
			name: user.name,
			locationLabel: t(($) => $.profile.location),
			location: user.location.site,
			jobTitleLabel: t(($) => $.profile.jobTitle),
			jobTitle: userRoleToString(user.role, t),
			securityRegulationsHeading: t(($) => $.profile.currentSecurityRegulations),
			securityRegulations: getSecurityRegulations(t).map(({ label }) => label),
			jobDescriptionHeading: t(($) => $.profile.jobDescription),
			jobDescription: user.jobDescription ?? "-",
			locale: i18n.language,
		};

		// Everything the red-day tables need from i18n, resolved once here so the
		// PDF assembler stays free of React.
		const dateFnsLocale = getLocale(i18n.language);
		const weekdayLabels = eachDayOfInterval({
			start: startOfWeek(new Date(), { weekStartsOn: 1 }),
			end: addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6),
		}).map((day) => day.toLocaleDateString(i18n.language, { weekday: "short" }));
		const labels: PdfLabels & PdfCalendarLabels = {
			date: t(($) => $.pdf.date),
			average: t(($) => $.measurement.average),
			safe: t(($) => $.exposureSummary.aggregated.safe),
			warning: t(($) => $.exposureSummary.aggregated.warning),
			danger: t(($) => $.exposureSummary.aggregated.danger),
			note: t(($) => $.pdf.note),
			noRedDays: t(($) => $.pdf.noRedDays),
			formatDay: (date) => date.toLocaleDateString(i18n.language, { day: "numeric", month: "short" }),
			formatValue: (exposure, value) =>
				`${formatExposureValue(value, EXPOSURE_UNIT[exposure], 2, { mg: 3 })} ${t(($) => $.exposures.units[EXPOSURE_UNIT[exposure]])}`,
			formatDuration: (minutes) => formatMinutesAsDuration(minutes, dateFnsLocale),
			formatHoursAndMinutes: (minutes) => formatMinutesAsHoursAndMinutes(minutes, dateFnsLocale),
			formatHour: (hour) =>
				new Date(2000, 0, 1, hour).toLocaleTimeString(i18n.language, {
					hour: "2-digit",
					minute: "2-digit",
					hourCycle: "h23",
				}),
			exposureName: (exposure) => t(($) => $.exposures[exposure]),
			weekdays: weekdayLabels,
		};

		// Call the PDF export hook to build the document
		await exportPagesToPDF(pages, fileName, titles, coverPageData, labels);

		setIsExporting(false);
		setShouldRenderCharts(false); // Clean up charts
		onOpenChange(false); // Close the dialog
	};

	// Calculate values for UI
	const { previous, next } = getNavigationValues();
	const isTodayDate = isToday(localDate, { in: TIMEZONE }); // Disable "Today" button if already on today

	// RENDER: Dialog UI
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t(($) => $.layout.exportPdf)}</DialogTitle>
					<DialogDescription>{t(($) => $.layout.exportPdfDescription)}</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					{/* View selector (Day/Week/Month tabs) */}
					<div className="flex justify-center">
						<ToggleGroup
							type="single"
							value={localView}
							variant="outline"
							className="inline-grid w-full auto-cols-fr grid-flow-col"
							onValueChange={(value: PdfView) => {
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

							<ToggleGroupItem value="year" aria-label={t(($) => $.views.year)}>
								<div className="flex items-center gap-2">
									<CalendarIcon className="size-4" />
									<p className="text-sm">{t(($) => $.views.year)}</p>
								</div>
							</ToggleGroupItem>
						</ToggleGroup>
					</div>

					{/* Navigation buttons (Previous / Today / Next) */}
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

					{/* Calendar (reuses DatePicker from right sidebar) */}
					<div className="flex justify-center">
						{localView === "year" ? (
							<div className="flex flex-col items-center gap-1 py-8">
								<span className="font-semibold text-4xl tabular-nums">{getYear(localDate)}</span>
								<p className="text-muted-foreground text-sm">
									{t(($) => $.layout.selectedYear, { year: getYear(localDate) })}
								</p>
							</div>
						) : (
							<DatePicker
								mode={localView}
								date={localDate}
								onDateChange={setLocalDate}
								withFooter={true}
								showWeekNumber={true}
							/>
						)}
					</div>
				</div>

				{exportError && <p className="text-destructive text-sm">{exportError}</p>}

				{/* Footer buttons (Cancel / Export) */}
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
						{t(($) => $.common.cancel)}
					</Button>
					<Button onClick={handleExport} disabled={isExporting}>
						{isExporting ? "Exporting..." : t(($) => $.common.export)}
					</Button>
				</DialogFooter>
			</DialogContent>

			{/* Off-screen chart renderer (only renders when user clicks Export) */}
			{/* This prevents lag when switching between day/week/month views */}
			{shouldRenderCharts && (
				<PdfChartRenderer
					key={`${exposureType}-${localView}-${localDate.getTime()}`}
					exposureType={exposureType}
					view={localView}
					date={localDate}
					userId={user.id}
					onPagesReady={handlePagesReady}
				/>
			)}
		</Dialog>
	);
}
