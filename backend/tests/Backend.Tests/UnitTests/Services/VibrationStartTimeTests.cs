using Backend.Services;

namespace Backend.Tests.UnitTests.Services;

/// <summary>
/// Unit tests for where vibration starts in a period, which is the period's first midnight UTC, since the aggregate job
/// keeps each worker's total until then.
/// </summary>
public class VibrationStartTimeTests
{
	/// <summary>
	/// Verifies that a Norwegian period, starting at 22:00 or 23:00 UTC the day before, starts at the next midnight UTC.
	/// </summary>
	[Theory]
	[InlineData(22)]
	[InlineData(23)]
	public void GetVibrationStartTime_StartsAtTheNextMidnightUtc(int hour)
	{
		var startTime = new DateTime(2026, 8, 31, hour, 0, 0, DateTimeKind.Utc);

		var vibrationStartTime = AggregateExposureDataService.GetVibrationStartTime(startTime);

		Assert.Equal(new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc), vibrationStartTime);
		Assert.Equal(DateTimeKind.Utc, vibrationStartTime.Kind);
	}

	/// <summary>
	/// Verifies that a period starting at midnight UTC keeps its start.
	/// </summary>
	[Fact]
	public void GetVibrationStartTime_KeepsMidnightUtc()
	{
		var startTime = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc);

		Assert.Equal(startTime, AggregateExposureDataService.GetVibrationStartTime(startTime));
	}
}
