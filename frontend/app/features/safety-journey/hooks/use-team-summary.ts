import { operatorMock, teamMock } from "@/features/safety-journey/model/mock-data.ts";
import type { ActionCount, TeamSummary } from "@/features/safety-journey/model/types.ts";
import { useSafetyJourney } from "@/features/safety-journey/state/use-safety-journey.ts";

/**
 * The team's numbers for the foreman: the hardcoded rest of the team plus what the demo operator does
 * in this session, so answering "what helped?" as an operator shows up when switching to foreman.
 */
export function useTeamSummary(): TeamSummary {
	const { prompts, lifetimePoints } = useSafetyJourney();
	const answers = prompts.flatMap(
		(prompt): Array<ActionCount> =>
			prompt.status === "done" && prompt.answer
				? [{ exposure: prompt.exposure, option: prompt.answer, count: 1 }]
				: [],
	);

	return {
		...teamMock,
		teamPoints: teamMock.teamPoints + (lifetimePoints - operatorMock.lifetimePoints),
		alertsAnswered: teamMock.alertsAnswered + answers.length,
		alertsTotal: teamMock.alertsTotal + prompts.length,
		answers: [...teamMock.answers, ...answers],
	};
}
