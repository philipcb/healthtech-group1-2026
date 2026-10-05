import { Badge } from "@/components/ui/badge.tsx";
import { getYardForUser } from "@/features/medical-team/medical-team-yards.ts";
import { YardFilters } from "@/features/medical-team/yard-filters.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { MapPinIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function MedicalTeamOverview() {
	const { t } = useTranslation();
	const { user } = useUser();

	const yard = getYardForUser(user.id);

	if (yard === null) {
		return <div className="p-4">{t(($) => $.medicalTeamDashboard.yardOverview.noYardAssigned)}</div>;
	}

	return (
		<div className="flex w-full flex-col gap-8">
			<header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
				<div className="flex flex-col gap-2">
					<h1 className="font-medium text-2xl md:text-3xl">
						{t(($) => $.medicalTeamDashboard.yardOverview.title)}
					</h1>
					<Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-sm">
						<MapPinIcon className="size-3.5" />
						{yard.name}
					</Badge>
				</div>

				<YardFilters halls={yard.halls} />
			</header>
		</div>
	);
}
