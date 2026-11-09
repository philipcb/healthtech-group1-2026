import { Switch } from "@/components/ui/switch.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { REWARD_ICONS } from "@/features/safety-journey/components/shared/reward-icons.ts";
import { useRewardName } from "@/features/safety-journey/hooks/use-reward-name.ts";
import { tint } from "@/features/safety-journey/model/colors.ts";
import { getCleanWeekPoints, getRule } from "@/features/safety-journey/model/rules.ts";
import type { Reward } from "@/features/safety-journey/model/types.ts";
import { useTranslation } from "react-i18next";

type RewardsTableProps = { rewards: ReadonlyArray<Reward>; onToggle: (rewardId: string) => void };

export function RewardsTable({ rewards, onToggle }: RewardsTableProps) {
	const { t } = useTranslation();
	const rewardName = useRewardName();

	return (
		<section className="flex flex-col overflow-hidden rounded-lg border bg-card">
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="pl-4">
								{t(($) => $.safetyJourney.rewardsSettings.table.reward)}
							</TableHead>
							<TableHead>{t(($) => $.safetyJourney.rewardsSettings.table.cost)}</TableHead>
							<TableHead>{t(($) => $.safetyJourney.rewardsSettings.table.value)}</TableHead>
							<TableHead>{t(($) => $.safetyJourney.rewardsSettings.table.perPerson)}</TableHead>
							<TableHead>{t(($) => $.safetyJourney.rewardsSettings.table.redeemed)}</TableHead>
							<TableHead className="pr-4">
								{t(($) => $.safetyJourney.rewardsSettings.table.active)}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rewards.map((reward) => {
							const { icon: Icon, color } = REWARD_ICONS[reward.icon];
							const name = rewardName(reward);

							return (
								<TableRow key={reward.id}>
									<TableCell className="pl-4">
										<span className="flex items-center gap-2.5 font-medium">
											<span
												className="flex size-8 shrink-0 items-center justify-center rounded-md"
												style={{ backgroundColor: tint(color), color }}
											>
												<Icon className="size-4" aria-hidden={true} />
											</span>
											{name}
										</span>
									</TableCell>
									<TableCell className="tabular-nums">
										{t(($) => $.safetyJourney.common.pointsShort, { points: reward.cost })}
									</TableCell>
									<TableCell className="tabular-nums">
										{t(($) => $.safetyJourney.common.kr, { amount: reward.valueKr })}
									</TableCell>
									<TableCell className="tabular-nums">
										{t(($) => $.safetyJourney.rewardsSettings.table.perMonth, {
											count: reward.maxPerPersonPerMonth,
										})}
									</TableCell>
									<TableCell className="tabular-nums">{reward.redeemedThisMonth}</TableCell>
									<TableCell className="pr-4">
										<Switch
											checked={reward.active}
											onCheckedChange={() => onToggle(reward.id)}
											aria-label={t(($) => $.safetyJourney.rewardsSettings.table.toggleLabel, {
												reward: name,
											})}
											className="cursor-pointer"
										/>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
			<p className="mt-auto bg-muted px-4 py-3 text-muted-foreground text-sm">
				{t(($) => $.safetyJourney.rewardsSettings.earnHint, {
					points: getCleanWeekPoints(),
					perShift: getRule("cleanShift").points,
					bonus: getRule("weeklyChallenge").points,
				})}
			</p>
		</section>
	);
}
