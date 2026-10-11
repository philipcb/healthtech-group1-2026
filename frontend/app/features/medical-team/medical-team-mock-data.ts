import type { MedicalGroupAggregate } from "@/features/medical-team/medical-team-groups.ts";
import { MEDICAL_TEAM_DEMO_SITE } from "@/features/user/user-utils.ts";

export const medicalGroupAggregates: Array<MedicalGroupAggregate> = [
	{
		id: "hall-1-welder",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "M-hallen",
		occupation: "Welder",
		periods: {
			month: {
				peopleCount: 12,
				averageTimeAboveActionPercent: 10,
				averageValues: {
					dust: { average: 142, unit: "ug/m3", percentOfActionValue: 57 },
					noise: { average: 82, unit: "dB", percentOfActionValue: 96 },
					vibration: { average: 2.1, unit: "points", percentOfActionValue: 84 },
				},
			},
			year: {
				peopleCount: 14,
				averageTimeAboveActionPercent: 8,
				averageValues: {
					dust: { average: 128, unit: "ug/m3", percentOfActionValue: 51 },
					noise: { average: 80, unit: "dB", percentOfActionValue: 94 },
					vibration: { average: 1.9, unit: "points", percentOfActionValue: 76 },
				},
			},
		},
	},
	{
		id: "hall-1-technician",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "M-hallen",
		occupation: "Technician",
		periods: {
			month: {
				peopleCount: 8,
				averageTimeAboveActionPercent: 4,
				averageValues: {
					dust: { average: 96, unit: "ug/m3", percentOfActionValue: 38 },
					noise: { average: 76, unit: "dB", percentOfActionValue: 89 },
					vibration: { average: 1.3, unit: "points", percentOfActionValue: 52 },
				},
			},
			year: {
				peopleCount: 9,
				averageTimeAboveActionPercent: 5,
				averageValues: {
					dust: { average: 103, unit: "ug/m3", percentOfActionValue: 41 },
					noise: { average: 77, unit: "dB", percentOfActionValue: 91 },
					vibration: { average: 1.4, unit: "points", percentOfActionValue: 56 },
				},
			},
		},
	},
	{
		id: "hall-1-electrician",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "M-hallen",
		occupation: "Electrician",
		periods: {
			month: {
				peopleCount: 6,
				averageTimeAboveActionPercent: 3,
				averageValues: {
					dust: { average: 74, unit: "ug/m3", percentOfActionValue: 30 },
					noise: { average: 73, unit: "dB", percentOfActionValue: 86 },
					vibration: { average: 1.1, unit: "points", percentOfActionValue: 44 },
				},
			},
			year: {
				peopleCount: 7,
				averageTimeAboveActionPercent: 4,
				averageValues: {
					dust: { average: 82, unit: "ug/m3", percentOfActionValue: 33 },
					noise: { average: 74, unit: "dB", percentOfActionValue: 87 },
					vibration: { average: 1.2, unit: "points", percentOfActionValue: 48 },
				},
			},
		},
	},
	{
		id: "hall-2-welder",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Welder",
		periods: {
			month: {
				peopleCount: 10,
				averageTimeAboveActionPercent: 13,
				averageValues: {
					dust: { average: 171, unit: "ug/m3", percentOfActionValue: 68 },
					noise: { average: 84, unit: "dB", percentOfActionValue: 99 },
					vibration: { average: 2.3, unit: "points", percentOfActionValue: 92 },
				},
			},
			year: {
				peopleCount: 11,
				averageTimeAboveActionPercent: 11,
				averageValues: {
					dust: { average: 158, unit: "ug/m3", percentOfActionValue: 63 },
					noise: { average: 83, unit: "dB", percentOfActionValue: 98 },
					vibration: { average: 2.2, unit: "points", percentOfActionValue: 88 },
				},
			},
		},
	},
	{
		id: "hall-2-technician",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Technician",
		periods: {
			month: {
				peopleCount: 9,
				averageTimeAboveActionPercent: 6,
				averageValues: {
					dust: { average: 117, unit: "ug/m3", percentOfActionValue: 47 },
					noise: { average: 78, unit: "dB", percentOfActionValue: 92 },
					vibration: { average: 1.6, unit: "points", percentOfActionValue: 64 },
				},
			},
			year: {
				peopleCount: 10,
				averageTimeAboveActionPercent: 6,
				averageValues: {
					dust: { average: 111, unit: "ug/m3", percentOfActionValue: 44 },
					noise: { average: 79, unit: "dB", percentOfActionValue: 93 },
					vibration: { average: 1.5, unit: "points", percentOfActionValue: 60 },
				},
			},
		},
	},
	{
		id: "hall-2-fitter",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Fitter",
		periods: {
			month: {
				peopleCount: 7,
				averageTimeAboveActionPercent: 9,
				averageValues: {
					dust: { average: 133, unit: "ug/m3", percentOfActionValue: 53 },
					noise: { average: 81, unit: "dB", percentOfActionValue: 95 },
					vibration: { average: 1.8, unit: "points", percentOfActionValue: 72 },
				},
			},
			year: {
				peopleCount: 8,
				averageTimeAboveActionPercent: 8,
				averageValues: {
					dust: { average: 127, unit: "ug/m3", percentOfActionValue: 51 },
					noise: { average: 80, unit: "dB", percentOfActionValue: 94 },
					vibration: { average: 1.7, unit: "points", percentOfActionValue: 68 },
				},
			},
		},
	},
];
