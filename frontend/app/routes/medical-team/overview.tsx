import { Badge } from "@/components/ui/badge.tsx";
import { ActiveSensorsCard } from "@/features/medical-team/active-sensors-card.tsx";
import { getYardForUser } from "@/features/medical-team/medical-team-yards.ts";
import { ShiftExceedanceSection } from "@/features/medical-team/shift-exceedance-section.tsx";
import { getPeriodRange, yardFilterParsers } from "@/features/medical-team/yard-filter-parsers.ts";
import { YardFilters } from "@/features/medical-team/yard-filters.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { CalendarIcon, MapPinIcon } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useTranslation } from "react-i18next";

export default function MedicalTeamOverview() {
	const { t } = useTranslation();
	const { user } = useUser();
	const formatDate = useFormatDate();
	const [{ period }] = useQueryStates(yardFilterParsers);

	const yard = getYardForUser(user.id);
	const { start } = getPeriodRange(period);

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
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-sm">
							<MapPinIcon className="size-3.5" />
							{yard.name}
						</Badge>
						<Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-sm">
							<CalendarIcon className="size-3.5" />
							{formatDate(start, period === "month" ? "LLLL yyyy" : "yyyy")}
						</Badge>
					</div>
				</div>

				<YardFilters halls={yard.halls} />
			</header>

			<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<ActiveSensorsCard yard={yard} />
			</section>

			<ShiftExceedanceSection yard={yard} />
		</div>
	);
}
