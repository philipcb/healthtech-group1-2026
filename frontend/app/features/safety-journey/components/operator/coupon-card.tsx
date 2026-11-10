import { COLORS } from "@/features/safety-journey/model/colors.ts";
import { useTranslation } from "react-i18next";

/** The code shown after redeeming a reward */
export function CouponCard({ rewardName, code }: { rewardName: string; code: string }) {
	const { t } = useTranslation();

	return (
		<section
			className="flex items-center gap-4 rounded-lg border-2 border-dashed p-4"
			style={{ borderColor: COLORS.indigo }}
		>
			<div className="min-w-0 flex-1">
				<p className="font-semibold">{t(($) => $.safetyJourney.rewards.coupon, { reward: rewardName })}</p>
				<p className="text-muted-foreground text-sm">{t(($) => $.safetyJourney.rewards.couponInfo)}</p>
			</div>
			<p className="shrink-0 rounded-md bg-muted px-3 py-2 font-bold font-mono text-lg tracking-widest">{code}</p>
		</section>
	);
}
