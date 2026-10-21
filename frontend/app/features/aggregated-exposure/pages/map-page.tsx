import { Skeleton } from "@/components/ui/skeleton.tsx";
import { EmptyState } from "@/features/aggregated-exposure/components/empty-state.tsx";
import { SiteMap } from "@/features/aggregated-exposure/components/site-map.tsx";
import { useAggregatedExposureSearchParams } from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import { toGroupSummaries } from "@/features/aggregated-exposure/model/groups.ts";
import { toPeriodParams } from "@/features/aggregated-exposure/model/period.ts";
import { getYards } from "@/features/aggregated-exposure/model/scope.ts";
import { hasSiteMap } from "@/features/aggregated-exposure/model/site-maps.ts";
import { useGetAggregateGroups } from "@/lib/api/generated/aggregate-exposure-data.ts";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

export function MapPage() {
	const { t } = useTranslation();
	const { site: scopeSite, YardFilter } = useDashboardScope();
	const { yard, setYard, periodSelection } = useAggregatedExposureSearchParams();
	const { data, isPending, isError } = useGetAggregateGroups(toPeriodParams(periodSelection), {
		query: { select: toGroupSummaries },
	});
	const yards = getYards(data?.groups);
	// The map shows one yard at a time. Management starts on a yard with a site map.
	const mapYard =
		scopeSite ??
		(YardFilter && yard !== null && yards.includes(yard) ? yard : (yards.find(hasSiteMap) ?? yards[0]));

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
				<SiteMap key={mapYard} site={mapYard} groups={data.groups} />
			)}
		</div>
	);
}
