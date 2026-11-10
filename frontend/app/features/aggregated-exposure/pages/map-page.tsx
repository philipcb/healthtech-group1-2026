import { DustFieldTabs } from "@/components/dust-field-tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { EmptyState } from "@/features/aggregated-exposure/components/empty-state.tsx";
import { ExposureToggle } from "@/features/aggregated-exposure/components/exposure-toggle.tsx";
import { FilterDialog } from "@/features/aggregated-exposure/components/filter-dialog.tsx";
import { PeriodPickerLayout } from "@/features/aggregated-exposure/components/period-picker.tsx";
import { SiteMap } from "@/features/aggregated-exposure/components/site-map.tsx";
import { useAggregatedExposureSearchParams } from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import { toPeriodParams } from "@/features/aggregated-exposure/model/period.ts";
import { getYards } from "@/features/aggregated-exposure/model/scope.ts";
import { hasSiteMap, toSiteMapSummaries } from "@/features/aggregated-exposure/model/site-maps.ts";
import { useGetAggregateGroups } from "@/lib/api/generated/aggregate-exposure-data.ts";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

export function MapPage() {
	const { t } = useTranslation();
	const { site: scopeSite, YardFilter } = useDashboardScope();
	const { exposure, setExposure, dustField, setDustField, yard, setYard, resetGroupFilters, periodSelection } =
		useAggregatedExposureSearchParams();
	const { data, isPending, isError } = useGetAggregateGroups(
		{ ...toPeriodParams(periodSelection), dustField },
		{ query: { select: toSiteMapSummaries } },
	);
	const yards = getYards(data?.groups);
	// The map shows one yard at a time. Management starts on a yard with a site map.
	const mapYard =
		scopeSite ??
		(YardFilter && yard !== null && yards.includes(yard) ? yard : (yards.find(hasSiteMap) ?? yards[0]));

	const exposurePickers = (
		<>
			<ExposureToggle
				label={t(($) => $.aggregatedExposure.exposureLabel)}
				value={exposure}
				onValueChange={setExposure}
			/>
			{exposure === "dust" && (
				<DustFieldTabs
					value={dustField}
					onValueChange={setDustField}
					ariaLabel={t(($) => $.aggregatedExposure.group.dustFieldLabel)}
				/>
			)}
		</>
	);

	return (
		<div className="flex w-full flex-col gap-5">
			<header className="space-y-2 border-b pb-5">
				{mapYard !== undefined && (
					<p className="flex items-center gap-2 text-muted-foreground text-sm">
						<MapPin aria-hidden="true" className="size-4" />
						{mapYard}
					</p>
				)}
				<h1 className="font-medium text-2xl">{t(($) => $.aggregatedExposure.map.title)}</h1>
				<p className="max-w-prose text-muted-foreground text-sm">
					{t(($) => $.aggregatedExposure.map.description)}
				</p>
			</header>
			<PeriodPickerLayout selection={periodSelection}>
				<FilterDialog onReset={resetGroupFilters} className="sm:hidden">
					{exposurePickers}
				</FilterDialog>
				<div className="hidden flex-col gap-3 sm:flex">{exposurePickers}</div>
				{YardFilter && mapYard !== undefined && (
					<YardFilter yards={yards} value={mapYard} onValueChange={setYard} allowsAll={false} />
				)}
				{isPending ? (
					<Skeleton className="w-full rounded-lg" style={{ aspectRatio: "16 / 9" }} />
				) : isError ? (
					<EmptyState title={t(($) => $.aggregatedExposure.map.error)} />
				) : mapYard === undefined ? (
					<EmptyState title={t(($) => $.aggregatedExposure.map.noBuildings)} />
				) : (
					<SiteMap key={mapYard} site={mapYard} summaries={data} exposure={exposure} dustField={dustField} />
				)}
			</PeriodPickerLayout>
		</div>
	);
}
