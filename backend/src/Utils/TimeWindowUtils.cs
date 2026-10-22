namespace Backend.Utils
{
	public static class TimeWindowUtils
	{
		public static DateTime ClampRequestEndDateToCurrentDateTime(DateTime end)
		{
			DateTime now = DateTime.UtcNow;

			return end > now ? now : end;
		}

		public static (DateTime startTime, DateTime endTime) GetPeriodLimit(
			string periodType,
			int year,
			int? month
		)
		{
			DateTime startTime;
			DateTime endTime;
			if (periodType.Equals("year"))
			{
				startTime = new DateTime(year, 1, 1).ToUniversalTime();
				endTime = startTime.AddYears(1);
				return (startTime, endTime);
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
				startTime = new DateTime(year, month.Value + 1, 1).ToUniversalTime();
				endTime = startTime.AddMonths(1);
				return (startTime, endTime);
			}
			else
			{
				throw new ArgumentException("The period should only be month or year");
			}
		}
	}
}
