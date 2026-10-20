import { PieChartCard } from "@/features/attention-card/pie-chart-card.tsx";
import { type Exposure, exposures } from "@/lib/exposures.ts";
import type { ThresholdSummary } from "@/lib/threshold-summary.ts";
import { useTranslation } from "react-i18next";

type ExposureSummaryGridProps = {
	thresholdSummary: ThresholdSummary | undefined;
	/** The exposures to show a pie chart for, all of them by default */
	shownExposures?: ReadonlyArray<Exposure>;
};

export function ExposureSummaryGrid({ thresholdSummary, shownExposures = exposures }: ExposureSummaryGridProps) {
	const { t } = useTranslation();

	if (thresholdSummary === undefined) {
		return null;
	}

	return (
		<div className="flex flex-col gap-4">
			<h2 className="font-medium text-lg">{t(($) => $.foremanDashboard.overview.exposure)}</h2>
			<div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
				{shownExposures.map((exposureType) => (
					<PieChartCard
						data={{
							safe: thresholdSummary[exposureType].safe,
							warning: thresholdSummary[exposureType].warning,
							danger: thresholdSummary[exposureType].danger,
						}}
						label={t(($) => $.exposures[exposureType])}
						to={`?exposure=${exposureType}`}
						key={exposureType}
						exposureType={exposureType}
					/>
				))}
			</div>
		</div>
	);
}
