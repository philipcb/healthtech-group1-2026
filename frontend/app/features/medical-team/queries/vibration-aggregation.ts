/*
 * How vibration is planned to be aggregated to a group:
 * 1. Each person's sessions are summed per day.
 * 2. Each person's daily points are averaged over the days they have registrations for.
 * 3. The group's value is the average of the person averages, so every person weighs the same.
 *
 * A day without sessions is missing data and left out, while sessions worth 0 points are an explicit 0. Points are
 * never converted to m/s² or A(8), since how the equipment calculates them isn't documented.
 */

export type VibrationSession = {
	/** Only used to group sessions, never shown */
	personId: string;
	/** Local date, as `yyyy-MM-dd` */
	date: string;
	points: number;
};

export type PersonDay = Pick<VibrationSession, "personId" | "date" | "points">;

export type VibrationTrendPoint = {
	/** First date of the bucket, as `yyyy-MM-dd` */
	time: string;
	/** `null` when too few people contributed to the bucket */
	value: number | null;
};

export function sumSessionsPerPersonDay(sessions: Array<VibrationSession>): Array<PersonDay> {
	const pointsByPersonDay = new Map<string, PersonDay>();

	for (const session of sessions) {
		const key = `${session.personId}|${session.date}`;
		const personDay = pointsByPersonDay.get(key);

		if (personDay) {
			personDay.points += session.points;
		} else {
			pointsByPersonDay.set(key, { ...session });
		}
	}

	return Array.from(pointsByPersonDay.values());
}

/** Over the days each person has registrations for */
export function averageDailyPointsPerPerson(personDays: Array<PersonDay>): Map<string, number> {
	const daysByPerson = new Map<string, Array<number>>();

	for (const { personId, points } of personDays) {
		const days = daysByPerson.get(personId);

		if (days) {
			days.push(points);
		} else {
			daysByPerson.set(personId, [points]);
		}
	}

	return new Map(Array.from(daysByPerson, ([personId, days]) => [personId, average(days)]));
}

/** `null` with fewer than `minPeople` people, since the value would come too close to a single person's */
export function getGroupAverageDailyPoints(sessions: Array<VibrationSession>, minPeople: number): number | null {
	const personAverages = Array.from(averageDailyPointsPerPerson(sumSessionsPerPersonDay(sessions)).values());

	if (personAverages.length === 0 || personAverages.length < minPeople) {
		return null;
	}

	return average(personAverages);
}

/** One point per day or month, with the same rules as the period's value. Buckets without sessions are left out. */
export function getGroupAverageDailyPointsTrend(
	sessions: Array<VibrationSession>,
	granularity: "day" | "month",
	minPeople: number,
): Array<VibrationTrendPoint> {
	const sessionsByBucket = new Map<string, Array<VibrationSession>>();

	for (const session of sessions) {
		const bucket = granularity === "day" ? session.date : `${session.date.slice(0, 7)}-01`;
		const bucketSessions = sessionsByBucket.get(bucket);

		if (bucketSessions) {
			bucketSessions.push(session);
		} else {
			sessionsByBucket.set(bucket, [session]);
		}
	}

	return Array.from(sessionsByBucket, ([time, bucketSessions]) => ({
		time,
		value: getGroupAverageDailyPoints(bucketSessions, minPeople),
	})).sort((a, b) => a.time.localeCompare(b.time));
}

function average(values: Array<number>) {
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}
