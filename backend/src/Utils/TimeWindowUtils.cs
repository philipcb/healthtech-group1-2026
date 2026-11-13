namespace Backend.Utils
{
	public static class TimeWindowUtils
	{
		// The aggregated pages' periods are Norwegian calendar periods, whatever the process's time zone
		private static readonly TimeZoneInfo Oslo = TimeZoneInfo.FindSystemTimeZoneById(
			"Europe/Oslo"
		);

		// The start of the Norwegian day a time is in, as UTC, like 2026-07-15 22:00 UTC for a time on 16 July. It's the
		// key for a day everywhere the aggregated figures are split into days, so a day is 23 or 25 hours long when
		// daylight saving time starts or ends. The time is read as UTC, whatever the process's time zone.
		public static DateTime StartOfOsloDay(DateTime utcTime)
		{
			var osloTime = TimeZoneInfo.ConvertTimeFromUtc(
				DateTime.SpecifyKind(utcTime, DateTimeKind.Utc),
				Oslo
			);
			return TimeZoneInfo.ConvertTimeToUtc(osloTime.Date, Oslo);
		}

		public static DateTime ClampRequestEndDateToCurrentDateTime(DateTime end)
		{
			DateTime now = DateTime.UtcNow;

			return end > now ? now : end;
		}

		// A period from one midnight in Oslo to another, in UTC. The start and the end are converted separately, so a day
		// is 23 or 25 hours long when daylight saving time starts or ends. Midnight is never skipped or repeated in Oslo.
		private static (DateTime startTime, DateTime endTime) FromOslo(
			DateTime start,
			DateTime end
		) => (TimeZoneInfo.ConvertTimeToUtc(start, Oslo), TimeZoneInfo.ConvertTimeToUtc(end, Oslo));

		/// <summary>
		/// Method that determines the correct time period (startTime and endTime) for different type of periods ("years", "month", "day")
		/// and the corresponding dates
		/// </summary>
		public static (DateTime startTime, DateTime endTime) GetPeriodLimit(
			string periodType,
			int year,
			int? month,
			int? day
		)
		{
			if (periodType.Equals("year"))
			{
				var start = new DateTime(year, 1, 1);
				return FromOslo(start, start.AddYears(1));
			}
			else if (periodType.Equals("month"))
			{
				if (month is null || month > 11 || month < 0)
				{
					throw new ArgumentException(
						"Month given is invalid and the period is of type month.",
						nameof(month)
					);
				}
				var start = new DateTime(year, month.Value + 1, 1);
				return FromOslo(start, start.AddMonths(1));
			}
			else if (periodType.Equals("day"))
			{
				if (month is null || month > 11 || month < 0)
				{
					throw new ArgumentException(
						"Month given is invalid and the period is of type month.",
						nameof(month)
					);
				}
				if (day is null || day < 1 || day > DateTime.DaysInMonth(year, month.Value + 1))
				{
					throw new ArgumentException(
						"Day given is invalid and the period is of type day.",
						nameof(day)
					);
				}
				var start = new DateTime(year, month.Value + 1, day.Value);
				return FromOslo(start, start.AddDays(1));
			}
			else
			{
				throw new ArgumentException("The period should only be month or year");
			}
		}
	}
}
