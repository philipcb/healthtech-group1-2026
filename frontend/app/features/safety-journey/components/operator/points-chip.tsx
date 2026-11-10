import { COLORS } from "@/features/safety-journey/model/colors.ts";
import { operatorMock } from "@/features/safety-journey/model/mock-data.ts";
import { useSafetyJourney } from "@/features/safety-journey/state/use-safety-journey.ts";
import { Flame, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

/** The header button with lifetime points and streak that opens the Safety Journey dialog */
export function PointsChip({ onClick }: { onClick: () => void }) {
	const { t } = useTranslation();
	const { lifetimePoints } = useSafetyJourney();
	const { streakDays } = operatorMock;

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={t(($) => $.safetyJourney.chip.operatorLabel, { points: lifetimePoints, days: streakDays })}
			className="flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<span className="flex items-center gap-1 tabular-nums">
				<Star className="size-4" style={{ color: COLORS.gold }} aria-hidden={true} />
				{lifetimePoints}
			</span>
			<span className="flex items-center gap-1 tabular-nums">
				<Flame className="size-4" style={{ color: COLORS.plum }} aria-hidden={true} />
				{streakDays}
			</span>
		</button>
	);
}
