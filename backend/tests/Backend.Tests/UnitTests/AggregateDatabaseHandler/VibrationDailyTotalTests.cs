using Backend.DTOs;
using Backend.Models;
using Backend.Records;

namespace Backend.Tests.UnitTests.AggregateDatabaseHandler;

/// <summary>
/// Unit tests for the group's daily vibration points the aggregate job stores.
/// </summary>
public class VibrationDailyTotalTests
{
	private static readonly DateTime Day = new(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);

	// One worker's hourly points, as `sum_vibration` in the hourly view
	private static List<RawExposureData> Hours(params (DateTime time, double points)[] hours)
	{
		var userId = Guid.NewGuid();
		return hours
			.Select(h => new RawExposureData(
				h.time,
				h.points,
				h.points,
				h.points,
				h.points,
				userId
			))
			.ToList();
	}

	private static List<TimedData> DailyTotals(List<RawExposureData> hours) =>
		DataFetchHandler
			.ToDailyTotals(
				DataFetchHandler.CalculateUserExposureData(ExposureType.Vibration, hours)
			)
			.ToList();

	/// <summary>
	/// Verifies that vibration uses the hour's sum of points, and the other exposures the hour's average.
	/// </summary>
	[Fact]
	public void GetValueFunction_UsesSumForVibrationOnly()
	{
		Assert.Equal(
			AggregationFunction.Sum,
			DataFetchHandler.GetValueFunction(ExposureType.Vibration)
		);
		Assert.Equal(
			AggregationFunction.Avg,
			DataFetchHandler.GetValueFunction(ExposureType.Noise)
		);
		Assert.Equal(AggregationFunction.Avg, DataFetchHandler.GetValueFunction(ExposureType.Dust));
	}

	/// <summary>
	/// Verifies that each worker's daily total is summed first and then averaged, also when the workers have data in
	/// different hours. Averaging per hour and taking the last hour would give 40.
	/// </summary>
	[Fact]
	public void DailyTotals_AreAveragedOverWorkers_WithDataInDifferentHours()
	{
		var workerA = Hours((Day.AddHours(8), 50), (Day.AddHours(9), 50));
		var workerB = Hours((Day.AddHours(10), 40), (Day.AddHours(11), 40), (Day.AddHours(12), 40));

		var workerATotal = Assert.Single(DailyTotals(workerA));
		var workerBTotal = Assert.Single(DailyTotals(workerB));
		var average = DataFetchHandler.AverageOverWorkers([workerATotal, workerBTotal]);

		Assert.Equal(100, workerATotal.AvgValue);
		Assert.Equal(120, workerBTotal.AvgValue);
		var point = Assert.Single(average);
		Assert.Equal(Day, point.Time);
		Assert.Equal(110, point.AvgValue);
	}

	/// <summary>
	/// Verifies that vibration classifies the group's daily value only, the average of the workers' daily totals, and
	/// not each worker. One worker above the limit value and one below the action value don't count on their own.
	/// </summary>
	[Fact]
	public void ClassifyGroupDailyValues_UsesTheGroupsDailyValue_ForVibration()
	{
		var workerA = Hours((Day.AddHours(8), 50), (Day.AddHours(9), 60)); // 110
		var workerB = Hours((Day.AddHours(10), 200), (Day.AddHours(11), 250)); // 450
		var workerC = Hours((Day.AddHours(12), 40)); // 40

		var groupDailyValues = DataFetchHandler.AverageOverWorkers(
			new[] { workerA, workerB, workerC }.SelectMany(DailyTotals)
		);
		var rate = Assert.Single(
			DataFetchHandler.ClassifyGroupDailyValues(ExposureType.Vibration, groupDailyValues)
		);
		var shiftAverage = DataFiller.ToShiftAverage(Guid.Empty, ExposureType.Vibration, rate);

		Assert.Equal(200, Assert.Single(groupDailyValues).AvgValue);
		Assert.Equal(Day, rate.Time);
		Assert.Equal(1, shiftAverage.AverageTimeOverAction);
		Assert.Equal(0, shiftAverage.AverageTimeOverLimit);
	}

	/// <summary>
	/// Verifies that each day of the group is either fully above a threshold or not at all, from the action value and the
	/// limit value and up.
	/// </summary>
	[Theory]
	[InlineData(99, 0, 0)]
	[InlineData(100, 1, 0)]
	[InlineData(399, 1, 0)]
	[InlineData(400, 1, 1)]
	public void ClassifyGroupDailyValues_GivesWholeDays(
		double groupDailyValue,
		double expectedOverAction,
		double expectedOverLimit
	)
	{
		var rate = Assert.Single(
			DataFetchHandler.ClassifyGroupDailyValues(
				ExposureType.Vibration,
				[new TimedData { Time = Day, AvgValue = groupDailyValue }]
			)
		);
		var shiftAverage = DataFiller.ToShiftAverage(Guid.Empty, ExposureType.Vibration, rate);

		Assert.Equal(expectedOverAction, shiftAverage.AverageTimeOverAction);
		Assert.Equal(expectedOverLimit, shiftAverage.AverageTimeOverLimit);
	}

	/// <summary>
	/// Verifies that the points start over each day.
	/// </summary>
	[Fact]
	public void DailyTotals_StartOverEachDay()
	{
		var worker = Hours(
			(Day.AddHours(8), 50),
			(Day.AddHours(9), 20),
			(Day.AddDays(1).AddHours(8), 30)
		);

		var totals = DailyTotals(worker);

		Assert.Equal(2, totals.Count);
		Assert.Equal(70, totals[0].AvgValue);
		Assert.Equal(Day, totals[0].Time);
		Assert.Equal(30, totals[1].AvgValue);
		Assert.Equal(Day.AddDays(1), totals[1].Time);
	}
}
