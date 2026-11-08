import { Button } from "@/components/ui/button.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { REWARD_ICONS } from "@/features/safety-journey/components/shared/reward-icons.ts";
import { useRewardName } from "@/features/safety-journey/hooks/use-reward-name.ts";
import { COLORS, tint } from "@/features/safety-journey/model/colors.ts";
import type { Reward } from "@/features/safety-journey/model/types.ts";
import { useTranslation } from "react-i18next";

type RewardItemProps = { reward: Reward; balance: number; onRedeem: () => void };

/** One reward: a Redeem button when the balance is enough, otherwise how far there is to go */
export function RewardItem({ reward, balance, onRedeem }: RewardItemProps) {
	const { t } = useTranslation();
	const rewardName = useRewardName();
	const { icon: Icon, color } = REWARD_ICONS[reward.icon];
	const affordable = balance >= reward.cost;

	return (
		<li className="flex items-center gap-3 rounded-lg border p-3">
			<span
				className="flex size-10 shrink-0 items-center justify-center rounded-lg"
				style={{ backgroundColor: tint(color), color }}
			>
				<Icon className="size-5" aria-hidden={true} />
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<p className="font-medium text-sm">{rewardName(reward)}</p>
				{affordable ? (
					<p className="text-muted-foreground text-xs">
						{t(($) => $.safetyJourney.rewards.cost, { cost: reward.cost })}
					</p>
				) : (
					<>
						<Progress
							value={(balance / reward.cost) * 100}
							className="h-1 bg-muted [&>*]:bg-(--bar-color)"
							style={{ "--bar-color": COLORS.teal } as React.CSSProperties}
						/>
						<p className="text-muted-foreground text-xs">
							{t(($) => $.safetyJourney.rewards.moreToGo, {
								cost: reward.cost,
								count: reward.cost - balance,
							})}
						</p>
					</>
				)}
			</div>
			{affordable && (
				<Button
					type="button"
					size="sm"
					onClick={onRedeem}
					className="cursor-pointer text-white"
					style={{ backgroundColor: COLORS.indigo }}
				>
					{t(($) => $.safetyJourney.rewards.redeem)}
				</Button>
			)}
		</li>
	);
}
