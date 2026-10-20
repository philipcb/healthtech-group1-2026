import { Skeleton } from "@/components/ui/skeleton.tsx";
import { hallWorkforceQueryOptions } from "@/features/aggregated-exposure/api/queries.ts";
import { SiteMap } from "@/features/aggregated-exposure/components/site-map.tsx";
import { useAggregatedExposureSearchParams } from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import { getYards } from "@/features/aggregated-exposure/model/scope.ts";
import { hasSiteMap } from "@/features/aggregated-exposure/model/site-maps.ts";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

export function MapPage() {
	const { t } = useTranslation();
	const { site: scopeSite, YardFilter } = useDashboardScope();
	const { yard, setYard } = useAggregatedExposureSearchParams();
	const { data } = useQuery(hallWorkforceQueryOptions(scopeSite));
	const yards = getYards(data?.halls);
	const mapYard =
		scopeSite ??
		(YardFilter && yard !== null && yards.includes(yard) ? yard : (yards.find(hasSiteMap) ?? yards[0]));

	return (
		<div className="flex w-full flex-col gap-5">
			<header className="space-y-2 border-b pb-5">
				<p className="flex items-center gap-2 text-muted-foreground text-sm">
					<MapPin aria-hidden="true" className="size-4" />
					{mapYard}
				</p>
				<h1 className="font-medium text-2xl">{t(($) => $.aggregatedExposure.map.title)}</h1>
				<p className="max-w-prose text-muted-foreground text-sm">
					{t(($) => $.aggregatedExposure.map.description)}
				</p>
			</header>
			{YardFilter && mapYard !== undefined && (
				<YardFilter yards={yards} value={mapYard} onValueChange={setYard} allowsAll={false} />
			)}
			{mapYard === undefined ? (
				<Skeleton className="w-full rounded-lg" style={{ aspectRatio: "16 / 9" }} />
			) : (
				<SiteMap key={mapYard} site={mapYard} />
			)}
		</div>
	);
}
