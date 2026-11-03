import { AtRiskPopup } from "@/features/attention-card/exposure-level-popup.tsx";
import { hasInactiveSensor } from "@/features/attention-card/inactive-sensors.ts";
import { PieChartCard } from "@/features/attention-card/pie-chart-card.tsx";
import type { UserWithStatusDto } from "@/lib/api/generated/models/index.ts";
import { type Exposure, exposures } from "@/lib/exposures.ts";
import type { ThresholdSummary } from "@/lib/threshold-summary.ts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

type ExposurePieGridProps = {
	thresholdSummary: ThresholdSummary;
	subordinates: Array<UserWithStatusDto>;
};

/** The team's danger levels as a pie chart per exposure, the chart alternative to the status cards */
export function ExposurePieGrid({ thresholdSummary, subordinates }: ExposurePieGridProps) {
	const { t } = useTranslation();
	const [inactiveExposure, setInactiveExposure] = useState<Exposure | null>(null);
	const [searchParams] = useSearchParams();

	// Keeps the selected date, view and summary display
	const toExposure = (exposure: Exposure) => {
		const search = new URLSearchParams(searchParams);
		search.set("exposure", exposure);
		return `?${search}`;
	};

	return (
		<>
			<div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
				{exposures.map((exposureType) => (
					<PieChartCard
						key={exposureType}
						data={{
							safe: thresholdSummary[exposureType].safe,
							warning: thresholdSummary[exposureType].warning,
							danger: thresholdSummary[exposureType].danger,
						}}
						label={t(($) => $.exposures[exposureType])}
						to={toExposure(exposureType)}
						exposureType={exposureType}
						inactive={subordinates.filter((sub) => hasInactiveSensor(sub, exposureType)).length}
						onInactiveClick={() => setInactiveExposure(exposureType)}
					/>
				))}
			</div>

			{inactiveExposure && (
				<AtRiskPopup
					open={true}
					onClose={() => setInactiveExposure(null)}
					title="Workers"
					status="inactive"
					inactiveExposure={inactiveExposure}
					subordinates={subordinates}
				/>
			)}
		</>
	);
}
