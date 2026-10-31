import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CompareIntro } from "@/features/aggregated-exposure/components/compare-intro.tsx";
import { CompareSetup } from "@/features/aggregated-exposure/components/compare-setup.tsx";
import { ComparisonCard } from "@/features/aggregated-exposure/components/comparison-card.tsx";
import { EmptyState } from "@/features/aggregated-exposure/components/empty-state.tsx";
import { PeriodPicker } from "@/features/aggregated-exposure/components/period-picker.tsx";
import { useAggregatedExposureSearchParams } from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
import { useComparison } from "@/features/aggregated-exposure/hooks/use-comparison.ts";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import { getPeriodLabel, getPeriodState, toPeriodFilenamePart, toPeriodParams } from "@/features/aggregated-exposure/model/period.ts";
import { MapPin, RotateCw } from "lucide-react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";

export function ComparePage() {
	const { t } = useTranslation();
	const scope = useDashboardScope();
	const { exposure, setExposure, dustField, setDustField, periodSelection } = useAggregatedExposureSearchParams();
	const comparison = useComparison();
	const periodState = getPeriodState(periodSelection);
	const comparedYards = [...new Set(comparison.entries.map(({ group }) => group.site))];

	return (
		<div className="flex w-full min-w-0 flex-col gap-4">
			<header className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<h1 className="font-medium text-2xl">{t(($) => $.aggregatedExposure.compare.title)}</h1>
					<p className="flex items-center gap-1.5 text-muted-foreground text-sm">
						<MapPin aria-hidden="true" className="size-4" />
						{comparedYards.length > 0
							? comparedYards.join(", ")
							: (comparison.selectedYard ??
								scope.site ??
								t(($) => $.aggregatedExposure.filters.allYards))}
					</p>
				</div>
				<div className="hidden sm:block">
					<PeriodPicker selection={periodSelection} />
				</div>
			</header>

			<CompareSetup
				exposure={exposure}
				onExposureChange={setExposure}
				dustField={dustField}
				onDustFieldChange={setDustField}
				level={comparison.level}
				onLevelChange={comparison.changeLevel}
				yards={comparison.yards}
				selectedYard={comparison.selectedYard}
				onYardChange={comparison.setYard}
				entries={comparison.entries}
				options={comparison.options}
				isLoading={comparison.status === "pending"}
				onAdd={comparison.addGroups}
				onRemove={comparison.removeGroup}
				onClear={comparison.clearGroups}
				lastChange={comparison.lastChange}
				hiddenFromLink={comparison.hiddenFromLink}
				periodSelection={periodSelection}
			/>

			<ComparisonResults
				status={comparison.status}
				onRetry={comparison.retry}
				isPeriodNotStarted={periodState === "notStarted"}
				card={
					comparison.units && {
						exposure,
						dustField,
						unit: comparison.units[exposure],
						entries: comparison.entries,
						periodParams: toPeriodParams(periodSelection),
						periodLabel: getPeriodLabel(periodSelection, t),
						periodFilenamePart: toPeriodFilenamePart(periodSelection)
					}
				}
			/>
		</div>
	);
}

function ComparisonResults({
	status,
	onRetry,
	isPeriodNotStarted,
	card,
}: {
	status: "pending" | "error" | "ok";
	onRetry: () => void;
	isPeriodNotStarted: boolean;
	card: ComponentProps<typeof ComparisonCard> | undefined;
}) {
	const { t } = useTranslation();

	if (status === "pending") {
		return <Skeleton className="h-96 w-full" />;
	}

	if (status === "error" || card === undefined) {
		return (
			<EmptyState
				title={t(($) => $.aggregatedExposure.overview.error)}
				action={
					<Button variant="outline" size="sm" onClick={onRetry}>
						<RotateCw aria-hidden="true" />
						{t(($) => $.aggregatedExposure.compare.retry)}
					</Button>
				}
			/>
		);
	}

	if (card.entries.length === 0) {
		return <CompareIntro />;
	}

	if (isPeriodNotStarted) {
		return (
			<EmptyState title={t(($) => $.aggregatedExposure.compare.periodNotStarted, { period: card.periodLabel })} />
		);
	}

	return <ComparisonCard {...card} />;
}
