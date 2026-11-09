import type { LearningChallenge } from "@/features/safety-journey/model/types.ts";

/** Today's question; the texts are in the translations under safetyJourney.learning.questions */
export const TODAY_LEARNING_CHALLENGE = {
	id: "vibrationGrip",
	options: ["gripHarder", "lowVibrationTool", "workFaster"],
	correct: "lowVibrationTool",
} as const satisfies LearningChallenge;
