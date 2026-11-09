import { CouponCard } from "@/features/safety-journey/components/operator/coupon-card.tsx";
import { RewardItem } from "@/features/safety-journey/components/operator/reward-item.tsx";
import { useRewardName } from "@/features/safety-journey/hooks/use-reward-name.ts";
import { COLORS, tint } from "@/features/safety-journey/model/colors.ts";
import { operatorMock } from "@/features/safety-journey/model/mock-data.ts";
import { useSafetyJourney } from "@/features/safety-journey/state/use-safety-journey.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { parseISO } from "date-fns";
import { useTranslation } from "react-i18next";

export function RewardsTab() {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const rewardName = useRewardName();
	const { balance, rewards, coupons, redeem } = useSafetyJourney();
	const activeRewards = rewards.filter((r) => r.active);
	const nameOf = (rewardId: string) => {
		const reward = rewards.find((r) => r.id === rewardId);

		return reward ? rewardName(reward) : "";
	};

	return (
		<div className="flex flex-col gap-4">
			<section className="flex flex-col gap-1 rounded-lg p-4" style={{ backgroundColor: tint(COLORS.indigo) }}>
				<p className="font-medium text-sm" style={{ color: COLORS.indigo }}>
					{t(($) => $.safetyJourney.rewards.balance)}
				</p>
				<p className="font-bold text-3xl tabular-nums">
					{t(($) => $.safetyJourney.common.points, { points: balance })}
				</p>
				<p className="text-muted-foreground text-sm">{t(($) => $.safetyJourney.rewards.neverLowersLevel)}</p>
			</section>

			{coupons.map((coupon) => (
				<CouponCard key={coupon.code} rewardName={nameOf(coupon.rewardId)} code={coupon.code} />
			))}

			<section className="flex flex-col gap-2">
				<h3 className="font-semibold text-sm">{t(($) => $.safetyJourney.rewards.title)}</h3>
				{activeRewards.length ? (
					<ul className="flex flex-col gap-2">
						{activeRewards.map((reward) => (
							<RewardItem
								key={reward.id}
								reward={reward}
								balance={balance}
								onRedeem={() => redeem(reward.id)}
							/>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground text-sm">{t(($) => $.safetyJourney.rewards.none)}</p>
				)}
				<p className="text-muted-foreground text-xs">{t(($) => $.safetyJourney.rewards.chosenByEmployer)}</p>
			</section>

			<section className="flex flex-col gap-1.5">
				<h3 className="font-semibold text-sm">{t(($) => $.safetyJourney.rewards.history)}</h3>
				<ul className="flex flex-col gap-1.5 text-sm">
					{operatorMock.redeemedEarlier.map((item) => (
						<li key={`${item.rewardId}-${item.date}`} className="flex justify-between">
							<span>{nameOf(item.rewardId)}</span>
							<span className="text-muted-foreground">{formatDate(parseISO(item.date), "d MMM")}</span>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
