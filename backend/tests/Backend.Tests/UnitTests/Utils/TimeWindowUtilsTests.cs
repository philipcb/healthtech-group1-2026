using Backend.Utils;

namespace Backend.Tests.UnitTests.Utils;

/// <summary>
/// Unit tests for the aggregated pages' periods, which are Norwegian calendar periods in UTC, whatever the process's
/// time zone. Run the tests with different `TZ` values to check that.
/// </summary>
public class TimeWindowUtilsTests
{
	private static DateTime Utc(int year, int month, int day, int hour) =>
		new(year, month, day, hour, 0, 0, DateTimeKind.Utc);

	private static void AssertPeriod(
		(DateTime startTime, DateTime endTime) period,
		DateTime expectedStart,
		DateTime expectedEnd,
		int expectedHours
	)
	{
		Assert.Equal(expectedStart, period.startTime);
		Assert.Equal(expectedEnd, period.endTime);
		Assert.Equal(DateTimeKind.Utc, period.startTime.Kind);
		Assert.Equal(DateTimeKind.Utc, period.endTime.Kind);
		Assert.Equal(expectedHours, (period.endTime - period.startTime).TotalHours);
	}

	/// <summary>
	/// Verifies that a winter day starts at midnight in Oslo, 23:00 UTC the day before, and lasts 24 hours.
	/// </summary>
	[Fact]
	public void GetPeriodLimit_Day_InWinter()
	{
		AssertPeriod(
			TimeWindowUtils.GetPeriodLimit("day", 2026, 0, 15),
			Utc(2026, 1, 14, 23),
			Utc(2026, 1, 15, 23),
			24
		);
	}

	/// <summary>
	/// Verifies that a summer day starts at midnight in Oslo, 22:00 UTC the day before, and lasts 24 hours.
	/// </summary>
	[Fact]
	public void GetPeriodLimit_Day_InSummer()
	{
		AssertPeriod(
			TimeWindowUtils.GetPeriodLimit("day", 2026, 6, 15),
			Utc(2026, 7, 14, 22),
			Utc(2026, 7, 15, 22),
			24
		);
	}

	/// <summary>
	/// Verifies that the day daylight saving time starts, 29 March 2026, is 23 hours long.
	/// </summary>
	[Fact]
	public void GetPeriodLimit_Day_WhenDaylightSavingTimeStarts()
	{
		AssertPeriod(
			TimeWindowUtils.GetPeriodLimit("day", 2026, 2, 29),
			Utc(2026, 3, 28, 23),
			Utc(2026, 3, 29, 22),
			23
		);
	}

	/// <summary>
	/// Verifies that the day daylight saving time ends, 25 October 2026, is 25 hours long.
	/// </summary>
	[Fact]
	public void GetPeriodLimit_Day_WhenDaylightSavingTimeEnds()
	{
		AssertPeriod(
			TimeWindowUtils.GetPeriodLimit("day", 2026, 9, 25),
			Utc(2026, 10, 24, 22),
			Utc(2026, 10, 25, 23),
			25
		);
	}

	/// <summary>
	/// Verifies that March 2026 runs from midnight in Oslo on 1 March, in winter time, to midnight on 1 April, in summer
	/// time, so it's an hour shorter than 31 days.
	/// </summary>
	[Fact]
	public void GetPeriodLimit_Month_AcrossDaylightSavingTime()
	{
		AssertPeriod(
			TimeWindowUtils.GetPeriodLimit("month", 2026, 2, null),
			Utc(2026, 2, 28, 23),
			Utc(2026, 3, 31, 22),
			31 * 24 - 1
		);
	}

	/// <summary>
	/// Verifies that 2026 runs from midnight in Oslo on 1 January to midnight on 1 January 2027, both in winter time.
	/// </summary>
	[Fact]
	public void GetPeriodLimit_Year()
	{
		AssertPeriod(
			TimeWindowUtils.GetPeriodLimit("year", 2026, null, null),
			Utc(2025, 12, 31, 23),
			Utc(2026, 12, 31, 23),
			365 * 24
		);
	}

	/// <summary>
	/// Verifies that 00:30 in Oslo on 16 July, 22:30 UTC on 15 July, is on 16 July, which starts at 22:00 UTC on 15 July,
	/// while 23:30 in Oslo on 15 July is on 15 July.
	/// </summary>
	[Fact]
	public void StartOfOsloDay_PutsTheHoursAfterMidnightOnTheNorwegianDay()
	{
		var afterMidnight = TimeWindowUtils.StartOfOsloDay(
			new DateTime(2026, 7, 15, 22, 30, 0, DateTimeKind.Utc)
		);
		var beforeMidnight = TimeWindowUtils.StartOfOsloDay(
			new DateTime(2026, 7, 15, 21, 30, 0, DateTimeKind.Utc)
		);

		Assert.Equal(Utc(2026, 7, 15, 22), afterMidnight);
		Assert.Equal(DateTimeKind.Utc, afterMidnight.Kind);
		Assert.Equal(Utc(2026, 7, 14, 22), beforeMidnight);
	}

	/// <summary>
	/// Verifies that a time without a time zone is read as UTC, like the times from the database.
	/// </summary>
	[Fact]
	public void StartOfOsloDay_ReadsATimeWithoutTimeZoneAsUtc()
	{
		Assert.Equal(
			Utc(2026, 7, 15, 22),
			TimeWindowUtils.StartOfOsloDay(new DateTime(2026, 7, 15, 22, 30, 0))
		);
	}

	/// <summary>
	/// Verifies that the days daylight saving time starts and ends, 29 March and 25 October 2026, are 23 and 25 hours
	/// long, from midnight to midnight in Oslo.
	/// </summary>
	[Theory]
	[InlineData(3, 29, 23)]
	[InlineData(10, 25, 25)]
	public void StartOfOsloDay_DaylightSavingTimeDays(int month, int day, int expectedHours)
	{
		var start = TimeWindowUtils.StartOfOsloDay(Utc(2026, month, day, 12));
		var nextStart = TimeWindowUtils.StartOfOsloDay(Utc(2026, month, day, 12).AddDays(1));

		Assert.Equal(expectedHours, (nextStart - start).TotalHours);
	}

	/// <summary>
	/// Verifies that a day that doesn't exist in the month is rejected.
	/// </summary>
	[Fact]
	public void GetPeriodLimit_Day_RejectsDayOutsideTheMonth()
	{
		Assert.Throws<ArgumentException>(() => TimeWindowUtils.GetPeriodLimit("day", 2026, 1, 29));
	}
}
