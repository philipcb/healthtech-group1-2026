import { OccupationalHealthServiceSiteMap } from "@/features/occupational-health-service/site-map.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function OccupationalHealthServiceMapPage() {
	const { t } = useTranslation();
	const { user } = useUser();

	return (
		<div className="flex w-full flex-col gap-5">
			<header className="space-y-2 border-b pb-5">
				<p className="flex items-center gap-2 text-muted-foreground text-sm">
					<MapPin aria-hidden="true" className="size-4" />
					{user.location.site}
				</p>
				<h1 className="font-medium text-2xl">{t(($) => $.occupationalHealthServiceDashboard.map.title)}</h1>
				<p className="max-w-prose text-muted-foreground text-sm">
					{t(($) => $.occupationalHealthServiceDashboard.map.description)}
				</p>
			</header>
			<OccupationalHealthServiceSiteMap />
		</div>
	);
}
