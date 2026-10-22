using Backend.Models;

namespace Backend.Tests.UnitTests.AggregateDatabaseHandler;

/// <summary>
/// Unit tests for the time over the thresholds the aggregate job stores per group and day.
/// </summary>
public class AboveThresholdRateTests
{
	private static readonly DateTime Day = new(2026, 9, 15, 0, 0, 0, DateTimeKind.Utc);

	/// <summary>
	/// Verifies that the shares keep their decimals instead of being truncated to 0 by integer division.
	/// </summary>
	[Fact]
	public void FromDangerLevels_KeepsDecimals()
	{
		List<DangerLevel> levels =
		[
			DangerLevel.Warning,
			DangerLevel.Warning,
			DangerLevel.Warning,
			DangerLevel.Danger,
			DangerLevel.Safe,
			DangerLevel.Safe,
			DangerLevel.Safe,
			DangerLevel.Safe,
		];

		var rate = AboveThresholdRate.FromDangerLevels(Day, levels);

		Assert.Equal(Day, rate.Time);
		Assert.Equal(0.375, rate.WarningRate);
		Assert.Equal(0.125, rate.DangerRate);
	}

	/// <summary>
	/// Verifies that the time over the limit is the danger share only.
	/// </summary>
	[Fact]
	public void ToShiftAverage_MapsDangerToTimeOverLimit()
	{
		var rate = new AboveThresholdRate
		{
			Time = Day,
			WarningRate = 0.375,
			DangerRate = 0.125,
		};

		var average = DataFiller.ToShiftAverage(Guid.Empty, ExposureType.Noise, rate);

		Assert.Equal(0.125, average.AverageTimeOverLimit);
	}

	/// <summary>
	/// Verifies that the time over the action value includes both the warning and danger shares, and the rest is safe.
	/// </summary>
	[Fact]
	public void ToShiftAverage_CombinesWarningAndDangerForTimeOverAction()
	{
		var sampleId = Guid.NewGuid();
		var rate = new AboveThresholdRate
		{
			Time = Day,
			WarningRate = 0.375,
			DangerRate = 0.125,
		};

		var average = DataFiller.ToShiftAverage(sampleId, ExposureType.Dust, rate);

		Assert.Equal(0.5, average.AverageTimeOverAction);
		Assert.Equal(0.5, average.AverageTimeInSafeLimits);
		Assert.Equal(sampleId, average.SampleId);
		Assert.Equal(ExposureType.Dust, average.ExposureType);
		Assert.Equal(Day, average.Time);
	}

	/// <summary>
	/// Verifies the whole path from danger levels to the stored shares.
	/// </summary>
	[Fact]
	public void FromDangerLevels_ThenToShiftAverage_StoresDecimalShares()
	{
		List<DangerLevel> levels =
		[
			DangerLevel.Safe,
			DangerLevel.Safe,
			DangerLevel.Safe,
			DangerLevel.Safe,
			DangerLevel.Safe,
			DangerLevel.Warning,
			DangerLevel.Warning,
			DangerLevel.Danger,
		];

		var average = DataFiller.ToShiftAverage(
			Guid.Empty,
			ExposureType.Vibration,
			AboveThresholdRate.FromDangerLevels(Day, levels)
		);

		Assert.Equal(0.375, average.AverageTimeOverAction);
		Assert.Equal(0.125, average.AverageTimeOverLimit);
		Assert.Equal(0.625, average.AverageTimeInSafeLimits);
	}
}
