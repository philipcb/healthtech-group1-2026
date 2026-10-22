using Backend.DTOs;
using Backend.Models;

namespace Backend.Tests.UnitTests.AggregateDatabaseHandler;

/// <summary>
/// Unit tests for the key figures of noise and dust, which classify the group's hourly values, never the workers.
/// </summary>
public class GroupHourlyClassificationTests
{
	private static readonly DateTime Day = new(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);

	private static TimedData Value(DateTime time, double value) => new() { Time = time, AvgValue = value };

	private static AveragePer8HourShift ClassifyDay(
		ExposureType exposureType,
		Field? field,
		IEnumerable<TimedData> groupHourlyValues
	) =>
		DataFiller.ToShiftAverage(
			Guid.Empty,
			exposureType,
			Assert.Single(DataFetchHandler.ClassifyGroupHourlyValues(exposureType, field, groupHourlyValues))
		);

	/// <summary>
	/// Verifies that the hour counts by the group's average. Two of six workers at 90 dB and four at 78 dB average 82 dB,
	/// so the hour is above the action value, while classifying each worker would have given a third.
	/// </summary>
	[Fact]
	public void ClassifyGroupHourlyValues_UsesTheGroupsAverage_NotTheWorkers()
	{
		var hour = Day.AddHours(8);
		var groupHourlyValues = DataFetchHandler.AverageOverWorkers(
			[
				Value(hour, 90),
				Value(hour, 90),
				Value(hour, 78),
				Value(hour, 78),
				Value(hour, 78),
				Value(hour, 78),
			]
		);

		var shiftAverage = ClassifyDay(ExposureType.Noise, null, groupHourlyValues);

		Assert.Equal(82, Assert.Single(groupHourlyValues).AvgValue);
		Assert.Equal(1, shiftAverage.AverageTimeOverAction);
		Assert.Equal(0, shiftAverage.AverageTimeOverLimit);
	}

	/// <summary>
	/// Verifies the opposite case. One of five workers at 95 dB and four at 60 dB average 67 dB, so the hour is below the
	/// action value, while classifying each worker would have given a fifth above the limit value.
	/// </summary>
	[Fact]
	public void ClassifyGroupHourlyValues_IgnoresOneWorkerAboveTheLimit_WhenTheGroupIsBelow()
	{
		var hour = Day.AddHours(8);
		var groupHourlyValues = DataFetchHandler.AverageOverWorkers(
			[Value(hour, 95), Value(hour, 60), Value(hour, 60), Value(hour, 60), Value(hour, 60)]
		);

		var shiftAverage = ClassifyDay(ExposureType.Noise, null, groupHourlyValues);

		Assert.Equal(67, Assert.Single(groupHourlyValues).AvgValue);
		Assert.Equal(0, shiftAverage.AverageTimeOverAction);
		Assert.Equal(0, shiftAverage.AverageTimeOverLimit);
	}

	/// <summary>
	/// Verifies that the day's figure is the share of the group's hours at each level.
	/// </summary>
	[Fact]
	public void ClassifyGroupHourlyValues_GivesTheShareOfTheGroupsHours()
	{
		var shiftAverage = ClassifyDay(
			ExposureType.Noise,
			null,
			[
				Value(Day.AddHours(8), 70),
				Value(Day.AddHours(9), 82),
				Value(Day.AddHours(10), 90),
				Value(Day.AddHours(11), 60),
			]
		);

		Assert.Equal(0.5, shiftAverage.AverageTimeOverAction);
		Assert.Equal(0.25, shiftAverage.AverageTimeOverLimit);
		Assert.Equal(0.5, shiftAverage.AverageTimeInSafeLimits);
	}

	/// <summary>
	/// Verifies that each day gets its own share.
	/// </summary>
	[Fact]
	public void ClassifyGroupHourlyValues_GivesOneShareEachDay()
	{
		var rates = DataFetchHandler.ClassifyGroupHourlyValues(
			ExposureType.Noise,
			null,
			[Value(Day.AddHours(8), 90), Value(Day.AddDays(1).AddHours(8), 70)]
		);

		Assert.Equal(2, rates.Count);
		Assert.Equal(Day, rates[0].Time);
		Assert.Equal(1, rates[0].DangerRate);
		Assert.Equal(Day.AddDays(1), rates[1].Time);
		Assert.Equal(0, rates[1].WarningRate + rates[1].DangerRate);
	}

	/// <summary>
	/// Verifies the thresholds: noise 80 and 85 dB, and PM1 TWA 7.5 and 15, from the threshold value and up. PM1 TWA
	/// 10 is above its action value, which wouldn't be the case with PM10's thresholds.
	/// </summary>
	[Theory]
	[InlineData(ExposureType.Noise, null, 79.9, 0, 0)]
	[InlineData(ExposureType.Noise, null, 80, 1, 0)]
	[InlineData(ExposureType.Noise, null, 84.9, 1, 0)]
	[InlineData(ExposureType.Noise, null, 85, 1, 1)]
	[InlineData(ExposureType.Dust, Field.Pm1_twa, 7.4, 0, 0)]
	[InlineData(ExposureType.Dust, Field.Pm1_twa, 7.5, 1, 0)]
	[InlineData(ExposureType.Dust, Field.Pm1_twa, 10, 1, 0)]
	[InlineData(ExposureType.Dust, Field.Pm1_twa, 14.9, 1, 0)]
	[InlineData(ExposureType.Dust, Field.Pm1_twa, 15, 1, 1)]
	public void ClassifyGroupHourlyValues_ClassifiesFromTheThreshold(
		ExposureType exposureType,
		Field? field,
		double groupHourlyValue,
		double expectedOverAction,
		double expectedOverLimit
	)
	{
		var shiftAverage = ClassifyDay(exposureType, field, [Value(Day.AddHours(8), groupHourlyValue)]);

		Assert.Equal(expectedOverAction, shiftAverage.AverageTimeOverAction);
		Assert.Equal(expectedOverLimit, shiftAverage.AverageTimeOverLimit);
	}
}
