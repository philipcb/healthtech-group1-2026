import { DatePicker } from "@/components/date-picker.tsx";
import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { NotesCard } from "@/components/notes-card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { useDate } from "@/features/date-picker/use-date.ts";
import { LimitExplanation } from "@/features/sidebar/limit-explanation.tsx";
import { PdfExport } from "@/features/sidebar/pdf-export.tsx";
import { ExposureSummary } from "@/features/summary-card.tsx";
import { useView } from "@/features/views/use-view.ts";
import { ViewPicker } from "@/features/views/view-picker.tsx";
import { getViewIcon } from "@/features/views/views.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import type { TranslateFn } from "@/i18n/config.ts";
import { toExposure } from "@/lib/exposures.ts";
import type { View } from "@/lib/views.ts";
import { Card } from "@/ui/card.tsx";
import type { TZDate } from "@date-fns/tz";
import { getISOWeek } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router";

export default function ExposureLayout() {
	const { date, selection, setDate } = useDate();
	const { pathname } = useLocation();
	const { view } = useView();
	const { t, i18n } = useTranslation();
	const formatDate = useFormatDate();
	const isMobile = useIsMobile();

	// pathname is "/operator" or "/operator/<exposure>"
	const exposure = toExposure(pathname.split("/").at(-1) ?? "");

	const ViewIcon = getViewIcon(view);

	const viewPicker = <ViewPicker withNavigationButtons={true} />;
	const datePicker = <DatePicker mode={view} showWeekNumber={true} date={date} onDateChange={setDate} />;

	return (
		<div
			className="flex w-full flex-col gap-6 lg:grid"
			style={{
				// 73 comes from w-65 on DatePicker's Calendar + p-4 on its outer div (so 8 spacings for both sides)
				gridTemplateColumns: "minmax(calc(var(--spacing) * 50), 1fr) minmax(0, 3fr) calc(var(--spacing) * 73)",
				gridTemplateRows: "auto 1fr",
			}}
		>
			{/* Mobile: single-column stack in reading order (title, view/date, summary, chart, legend, notes).
			    Desktop (lg+): the grid placements below reconstruct the original 3-column layout, independent
			    of this DOM order. */}
			<div className="flex flex-col gap-0.5 lg:col-span-3 lg:row-start-1">
				<div className="flex flex-row items-center gap-3">
					<ExposureIcon type={exposure ?? "all"} size="lg" className="ml-1" />
					<h1 className="font-medium text-3xl">
						{exposure
							? t(($) => $.operatorHeader.title.yourExposureExposure, {
									exposure: t(($) => $.exposures[exposure]).toLowerCase(),
								})
							: t(($) => $.operatorHeader.title.yourExposure)}
					</h1>
				</div>

				<div className="flex items-center gap-2 text-muted-foreground">
					<Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-sm">
						<ViewIcon className="size-3.5" />
						{getViewLabel(t, view, selection)}
					</Badge>

					<Badge variant="secondary" className="gap-1.5 px-2.5 py-1 font-normal text-sm">
						{getDateLabel(t, view, selection, formatDate, i18n.language)}
					</Badge>

					<Badge variant="secondary" className="gap-1.5 px-1 py-1 pr-2.5 font-normal text-sm">
						<ExposureIcon type={exposure ?? "all"} iconClassName="p-0.75 size-5" />
						{exposure ? (
							<p>{t(($) => $.exposures[exposure])}</p>
						) : (
							<p>{t(($) => $.operatorHeader.subtitle.allExposureTypes)}</p>
						)}
					</Badge>
				</div>
			</div>

			<aside className="flex flex-col gap-4 lg:col-start-3 lg:row-start-2">
				{isMobile ? (
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
				) : (
					<>
						<Card muted={true}>{viewPicker}</Card>

						{/* overflow-x-auto: the Calendar's day grid has an intrinsic (non-shrinking) width, same
						    safety net WeekWidget uses for its day columns, so a very narrow viewport scrolls just
						    this card instead of the whole page. */}
						<Card muted={true} className="overflow-x-auto">
							{datePicker}
						</Card>
					</>
				)}
			</aside>

			<article className="flex flex-col gap-4 lg:col-start-2 lg:row-start-2">
				<ExposureSummary exposureType={exposure ?? "all"} />
				<Outlet />
			</article>

			<aside className="flex flex-col gap-4 lg:col-start-1 lg:row-start-2">
				<NotesCard />
				<div className="hidden lg:block">
					<LimitExplanation />
				</div>
				<PdfExport exposureType={exposure ?? "all"} />
			</aside>
		</div>
	);
}

function getViewLabel(t: TranslateFn, view: View, selection: { start: TZDate; end: TZDate }) {
	if (view === "week") {
		return t(($) => $.operatorHeader.subtitle.viewWeek, {
			week: getISOWeek(selection.start),
		});
	}

	if (view === "month") {
		return t(($) => $.operatorHeader.subtitle.viewMonth);
	}

	return t(($) => $.operatorHeader.subtitle.viewDay);
}

function getDateLabel(
	t: TranslateFn,
	view: View,
	selection: { start: TZDate; end: TZDate },
	formatDate: ReturnType<typeof useFormatDate>,
	locale: string,
) {
	const isEn = locale === "en";

	if (view === "day") {
		const date = formatDate(selection.start, isEn ? "MMM d, yyyy" : "d. MMM yyyy");

		return t(($) => $.operatorHeader.subtitle.dateDay, { date });
	}

	const startDate = formatDate(selection.start, isEn ? "MMM d" : "d. MMM");
	const endDate = formatDate(selection.end, isEn ? "MMM d, yyyy" : "d. MMM yyyy");

	return t(($) => $.operatorHeader.subtitle.dateRange, { startDate, endDate });
}
