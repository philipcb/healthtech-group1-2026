import { LearningChallengeCard } from "@/features/safety-journey/components/operator/learning-challenge-card.tsx";
import { LevelProgress } from "@/features/safety-journey/components/operator/level-progress.tsx";
import { PendingPromptCard } from "@/features/safety-journey/components/operator/pending-prompt-card.tsx";
import { PointsSummary } from "@/features/safety-journey/components/operator/points-summary.tsx";
import { TodayCard } from "@/features/safety-journey/components/operator/today-card.tsx";
import { WeeklyChallengeCard } from "@/features/safety-journey/components/operator/weekly-challenge-card.tsx";

export function OverviewTab() {
	return (
		<div className="flex flex-col gap-4">
			<LevelProgress />
			<PointsSummary />
			<PendingPromptCard />
			<LearningChallengeCard />
			<TodayCard />
			<WeeklyChallengeCard />
		</div>
	);
}
