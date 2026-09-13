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
import { PdfChartRenderer } from "@/features/pdf-export/pdf-chart-renderer.tsx";
import { DayViewIcon, MonthViewIcon, WeekViewIcon } from "@/features/views/views.ts";
import { useExportPDF } from "@/hooks/use-export-pdf.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { TIMEZONE } from "@/i18n/locale.ts";
import { today } from "@/lib/date.ts";
import { TZDate } from "@date-fns/tz";
import { addMonths, addWeeks, startOfMonth, startOfWeek, subMilliseconds, isToday, eachDayOfInterval, endOfWeek, endOfMonth } from "date-fns";
import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from "lucide-react";
import type { View } from "@/features/views/views.ts";

/**
 * PDF Export Dialog Component
 *
 * This file provides a dialog UI for selecting a date range before exporting exposure data to PDF.
 * It's a popup that appears when the user clicks the "Eksport PDF" button in the left sidebar.
 *
 * Used by: exposure-layout.tsx (the layout wrapper for all exposure pages)
 */

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
	const { exportMultipleToPDF } = useExportPDF(); // Function to convert HTML to PDF

	// STATE: Local date/view selection for the dialog
	// NOTE: These are independent from the global date/view state that controls the main page.
	// The dialog has its own date picker so users can export a different date than what's
	// currently shown on screen.
	const [localView, setLocalView] = useState<View>("day"); // "day" | "week" | "month"
	const [localDate, setLocalDate] = useState<TZDate>(today()); // The selected date in dialog
	const [elementIds, setElementIds] = useState<string[]>([]); // HTML element IDs to capture as PDF
	const [isExporting, setIsExporting] = useState(false); // Loading state during PDF generation
	const [shouldRenderCharts, setShouldRenderCharts] = useState(false); // Only render charts when exporting

	// Helper function: Calculate date range from selected view/date
	/**
	 * Converts the selected view and date into a start/end range.
	 * This is used to determine what data to show in the exported PDF.
	 *
	 * Examples:
	 * - Day view: start=end=selected date
	 * - Week view: start=Monday of selected week, end=Sunday 23:59:59
	 * - Month view: start=1st of month, end=last millisecond of month
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
	/**
	 * Returns the previous and next date values for the navigation buttons.
	 * Used by the "Previous" and "Next" buttons to navigate through dates.
	 */
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

		// month
		const start = startOfMonth(localDate, { in: TIMEZONE });
		const previous = subMilliseconds(start, 1); // Last day of previous month
		const next = addMonths(start, 1, { in: TIMEZONE }); // First day of next month
		return { previous, next };
	};

	// Ref to store promise resolver for IDs
	const idsResolverRef = useRef<((ids: string[]) => void) | null>(null);

	// Callback: Receive element IDs from PdfRenderer
	/**
	 * Called by PdfRenderer when it has rendered the charts and knows their HTML element IDs.
	 * These IDs are needed by useExportPDF to find the elements to capture as PDF.
	 */
	const handleIdsReady = useCallback((ids: string[]) => {
		setElementIds(ids);
		// Resolve the promise if we're waiting for IDs
		if (idsResolverRef.current) {
			idsResolverRef.current(ids);
			idsResolverRef.current = null;
		}
	}, []);

	// Handler: Export button clicked
	/**
	 * Main export function that:
	 * 1. Waits for charts to finish rendering (500ms delay)
	 * 2. Generates titles for each chart page
	 * 3. Calls exportMultipleToPDF to capture elements and create PDF
	 * 4. Logs timing information to console
	 * 5. Closes the dialog
	 */
	const handleExport = async () => {
		setIsExporting(true);
		setElementIds([]); // Reset element IDs before rendering new charts
		setShouldRenderCharts(true); // Start rendering charts
		const startTime = performance.now();

		// Wait for charts to render and report their IDs
		// Create a promise that resolves when handleIdsReady is called
		const idsPromise = new Promise<string[]>((resolve) => {
			idsResolverRef.current = resolve;
		});

		// Wait for IDs with timeout
		const timeoutPromise = new Promise<string[]>((_, reject) => {
			setTimeout(() => reject(new Error("Timeout waiting for chart IDs")), 5000);
		});

		let ids: string[];
		try {
			ids = await Promise.race([idsPromise, timeoutPromise]);
		} catch (error) {
			console.error("PDF export failed:", error);
			setIsExporting(false);
			setShouldRenderCharts(false);
			alert("Kunne ikke generere PDF. Prøv igjen.");
			return;
		}

		// Safety check: make sure we have elements to export
		if (!ids || ids.length === 0) {
			console.error("No chart elements ready for export");
			setIsExporting(false);
			setShouldRenderCharts(false);
			alert("Kunne ikke generere PDF. Ingen grafer funnet.");
			return;
		}

		// Generate a title for each chart page in the PDF
		// Calculate exposure types
		const exposuresToRender = exposureType === "all" ? ["dust", "noise", "vibration"] : [exposureType];

		// Get date range for titles and filename
		const { start, end } = getRangeFromSelection();

		// Generate titles: one for each exposure type
		// (Week/Month views render ONE aggregated chart per exposure type, not per-day)
		const titles: string[] = [];

		for (const exposure of exposuresToRender) {
			const exposureName = t(($) => $.exposures[exposure as "dust" | "noise" | "vibration"]);

			// For day view: use single date
			// For week/month view: use date range
			const dateText = localView === "day"
				? localDate.toLocaleDateString(i18n.language, {
						day: "numeric",
						month: "long",
						year: "numeric",
					})
				: `${start.toLocaleDateString(i18n.language, { day: "numeric", month: "short" })} - ${end.toLocaleDateString(i18n.language, { day: "numeric", month: "short", year: "numeric" })}`;

			titles.push(`${exposureName} - ${user.name} - ${dateText}`);
		}

		// Generate filename with date range
		const fileNameDate =
			localView === "day"
				? localDate.toLocaleDateString(i18n.language, {
						day: "numeric",
						month: "long",
						year: "numeric",
					})
				: `${start.toLocaleDateString(i18n.language, { day: "numeric", month: "short" })}-${end.toLocaleDateString(i18n.language, { day: "numeric", month: "short", year: "numeric" })}`;

		const fileName = `${fileNameDate}-${user.name}-${exposureType === "all" ? "Exposure-Overview" : t(($) => $.exposures[exposureType])}`;

		// Call the PDF export hook to convert HTML elements to PDF
		await exportMultipleToPDF(ids, fileName, titles);

		// Log timing to console for performance monitoring (NFR-1: target <5s)
		const endTime = performance.now();
		console.log(`PDF generation took ${((endTime - startTime) / 1000).toFixed(2)}s`);

		setIsExporting(false);
		setShouldRenderCharts(false); // Clean up charts
		setElementIds([]); // Reset for next export
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
						<DatePicker
							mode={localView}
							date={localDate}
							onDateChange={setLocalDate}
							withFooter={true}
							showWeekNumber={true}
						/>
					</div>
				</div>

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
					exposureType={exposureType}
					view={localView}
					date={localDate}
					userId={user.id}
					onIdsReady={handleIdsReady}
				/>
			)}
		</Dialog>
	);
}
