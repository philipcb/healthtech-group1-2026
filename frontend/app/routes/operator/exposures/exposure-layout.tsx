import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { NotesCard } from "@/components/notes-card.tsx";
import { DateAndViewPicker } from "@/features/date-picker/date-and-view-picker.tsx";
import { MyTrendsCard } from "@/features/my-trends-card.tsx";
import { LimitExplanation } from "@/features/sidebar/limit-explanation.tsx";
import { PdfExport } from "@/features/sidebar/pdf-export.tsx";
import { ExposureSummary } from "@/features/summary-card.tsx";
import { toExposure } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router";

export default function ExposureLayout() {
	const { pathname } = useLocation();
	const { t } = useTranslation();

	// pathname is "/operator" or "/operator/<exposure>"
	const exposure = toExposure(pathname.split("/").at(-1) ?? "");

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
			<div className="flex flex-row flex-wrap items-center gap-3 lg:col-span-3 lg:row-start-1">
				<ExposureIcon type={exposure ?? "all"} size="lg" className="ml-1" />
				<h1 className="font-medium text-2xl md:text-3xl">
					{exposure
						? t(($) => $.operatorHeader.title.yourExposureExposure, {
								exposure: t(($) => $.exposures[exposure]).toLowerCase(),
							})
						: t(($) => $.operatorHeader.title.yourExposure)}
				</h1>
				<div className="ml-auto">
					<PdfExport exposureType={exposure ?? "all"} />
				</div>
			</div>

			<aside className="flex flex-col gap-4 lg:col-start-3 lg:row-start-2">
				<DateAndViewPicker />
			</aside>

			<article className="flex flex-col gap-4 lg:col-start-2 lg:row-start-2">
				<ExposureSummary exposureType={exposure ?? "all"} />
				<MyTrendsCard className="lg:hidden" />
				<Outlet />
			</article>

			<aside className="flex flex-col gap-4 lg:col-start-1 lg:row-start-2">
				<NotesCard />
				<div className="hidden lg:block">
					<LimitExplanation />
				</div>
				<MyTrendsCard className="hidden lg:flex" />
			</aside>
		</div>
	);
}
