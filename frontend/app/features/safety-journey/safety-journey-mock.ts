// TODO: replace with real data. Points must come from logged actions (with caps per day/week), never from exposure values.

export const SHOW_SAFETY_JOURNEY = true;

export const LEVELS = [
	{ key: "aware", minPoints: 0 },
	{ key: "observer", minPoints: 100 },
	{ key: "preventer", minPoints: 300 },
	{ key: "improver", minPoints: 500 },
	{ key: "safetyChampion", minPoints: 800 },
] as const;

export const safetyJourneyMock = {
	points: 420,
	levelIndex: 2,
	streakDays: 6,
	badges: [
		{ key: "sharpEye", unlocked: true },
		{ key: "noiseDetective", unlocked: true },
		{ key: "preventer", unlocked: true },
		{ key: "improvementMaker", unlocked: true },
		{ key: "consistentLogger", unlocked: false, progress: 3, target: 5 },
		{ key: "quickResponder", unlocked: false, progress: 2, target: 5 },
	],
	recentEvents: [
		{ key: "loggedVibrationAction", type: "alert", day: "today", time: "10:42", points: 5 },
		{ key: "observationNote", type: "note", day: "today", time: "08:15", points: 5 },
		{ key: "improvementSuggestion", type: "suggestion", day: "yesterday", time: "14:03", points: 10 },
	],
	earnRules: [
		{ key: "respondedToAlert", points: 5, maxPerDay: 3 },
		{ key: "observationNote", points: 5, maxPerDay: 2 },
		{ key: "improvementSuggestion", points: 10, maxPerDay: 1 },
		{ key: "learningChallenge", points: 10, maxPerDay: 1 },
	],
} as const;
