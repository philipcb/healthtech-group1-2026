import { EmptyState } from "@/features/aggregated-exposure/components/empty-state.tsx";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

/** The aggregate API has no people or occupation groups per building yet, so there's nothing to show on the map */
export function MapPage() {
	const { t } = useTranslation();
	const { site } = useDashboardScope();

	return (
		<div className="flex w-full flex-col gap-5">
			<header className="space-y-2 border-b pb-5">
				{site !== null && (
					<p className="flex items-center gap-2 text-muted-foreground text-sm">
						<MapPin aria-hidden="true" className="size-4" />
						{site}
					</p>
				)}
				<h1 className="font-medium text-2xl">{t(($) => $.aggregatedExposure.map.title)}</h1>
				<p className="max-w-prose text-muted-foreground text-sm">
					{t(($) => $.aggregatedExposure.map.description)}
				</p>
			</header>
			<EmptyState
				title={t(($) => $.aggregatedExposure.map.unavailable.title)}
				description={t(($) => $.aggregatedExposure.map.unavailable.description)}
			/>
		</div>
	);
}
