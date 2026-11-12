import { DustFieldTabs } from "@/components/dust-field-tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { EmptyState } from "@/features/aggregated-exposure/components/empty-state.tsx";
import { ExposureToggle } from "@/features/aggregated-exposure/components/exposure-toggle.tsx";
import { FilterDialog } from "@/features/aggregated-exposure/components/filter-dialog.tsx";
import { PeriodPickerLayout } from "@/features/aggregated-exposure/components/period-picker.tsx";
import { SiteMap } from "@/features/aggregated-exposure/components/site-map.tsx";
import { useAggregatedExposureSearchParams } from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import type { GroupSummary } from "@/features/aggregated-exposure/model/groups.ts";
import { toPeriodParams } from "@/features/aggregated-exposure/model/period.ts";
import { getYards } from "@/features/aggregated-exposure/model/scope.ts";
import { toSiteMapSummaries } from "@/features/aggregated-exposure/model/site-maps.ts";
import { hasSiteMap, siteMaps } from "@/features/location-map/site-map-config.ts";
import { useGetAggregateGroups } from "@/lib/api/generated/aggregate-exposure-data.ts";
import { exposures } from "@/lib/exposures.ts";
import { Info, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

export function MapPage() {
	const { t } = useTranslation();
	const { site: scopeSite, YardFilter } = useDashboardScope();
	const { exposure, setExposure, dustField, setDustField, yard, setYard, periodSelection } =
		useAggregatedExposureSearchParams();
	const { data, isPending, isError } = useGetAggregateGroups(
		{ ...toPeriodParams(periodSelection), dustField },
		{ query: { select: toSiteMapSummaries } },
	);
	const yardsWithData = getYards(data?.groups);
	// Only yards with a site map can be chosen, also before they have any data, so their buildings can be seen. Yards
	// without one, such as Sandsli, are still on the other pages.
	const yards = getYards(Object.keys(siteMaps).map((site) => ({ site })));
	// The map shows one yard at a time. Management starts on a yard with both data and a site map.
	const mapYard =
		scopeSite ??
		(YardFilter && yard !== null && yards.includes(yard) ? yard : (yardsWithData.find(hasSiteMap) ?? yards[0]));

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
				<FilterDialog className="sm:hidden">{exposurePickers}</FilterDialog>
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
					<>
						{periodSelection.period === "day" && !hasMeasurements(data.groups, mapYard) && (
							// The map is still shown, with its buildings greyed out, so a yard's buildings can always be seen
							<p className="flex items-center gap-2 text-muted-foreground text-sm">
								<Info aria-hidden="true" className="size-4 shrink-0" />
								{t(($) => $.aggregatedExposure.map.noDayData)}
							</p>
						)}
						<SiteMap
							key={mapYard}
							site={mapYard}
							summaries={data}
							exposure={exposure}
							dustField={dustField}
						/>
					</>
				)}
			</PeriodPickerLayout>
		</div>
	);
}

// A day without any measurements for the yard's groups is said above the map
function hasMeasurements(groups: Array<GroupSummary>, site: string) {
	return groups.some(
		(group) => group.site === site && exposures.some((exposure) => group.averages[exposure] !== null),
	);
}
