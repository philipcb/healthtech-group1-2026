using Backend.DTOs;
using Backend.Models;
using Backend.Utils;

namespace Backend.Tests.UnitTests.AggregateDatabaseHandler;

/// <summary>
/// Unit tests for vibration's time over the thresholds, which only counts the hours a worker has measurements, while
/// the group's hourly values keep each worker's daily total until midnight.
/// </summary>
public class VibrationTimeOverTests
{
	// Midnight on 1 October in Oslo (summer time), as UTC, like the aggregate job's days
	private static readonly DateTime Day = new(2026, 9, 30, 22, 0, 0, DateTimeKind.Utc);

	// One worker's hours with measurements, as the hour and the hour's points. The value and danger level are the
	// running total of the day, like `fetchUserAggregatedDataAsync` returns them.
	private static List<ExposureDataDto> Worker(
		DateTime day,
		params (int hour, double points)[] hours
	)
	{
		double total = 0;
		return hours
			.Select(h =>
			{
				total += h.points;
				return new ExposureDataDto
				{
					Time = day.AddHours(h.hour),
					Value = total,
					DangerLevel = ThresholdUtils
						.CalculateDangerLevel(ExposureType.Vibration, total, null)
						.dangerLevel,
				};
			})
			.ToList();
	}

	// Measured from 07:00 to 15:00, over the action value from 08:00 and over the limit from 11:00
	private static List<ExposureDataDto> OverLimitFromElevenUntilThree() =>
		Worker(Day, (7, 60), (8, 60), (9, 100), (10, 100), (11, 100), (12, 20), (13, 20), (14, 20));

	private static (
		List<ExposureDataDto> hourlyValues,
		List<AboveThresholdRate> dailyRates
	) Process(List<ExposureDataDto> userData, int days = 1) =>
		DataFetchHandler.GetWorkerHourlyValuesAndDailyRates(
			ExposureType.Vibration,
			userData,
			Day,
			Day.AddDays(days)
		);

	/// <summary>
	/// Verifies that a worker over the limit from 11:00 who stops at 15:00 is over the limit 4 of their 8 hours, not 13
	/// of 17 as with the hours until midnight, while their total still holds until midnight in the hourly values.
	/// </summary>
	[Fact]
	public void TimeOver_CountsOnlyHoursWithMeasurements()
	{
		var (hourlyValues, dailyRates) = Process(OverLimitFromElevenUntilThree());

		var rate = Assert.Single(dailyRates);
		Assert.Equal(0.5, rate.DangerRate);
		Assert.Equal(0.875, rate.WarningRate + rate.DangerRate);
		Assert.Equal(8, rate.UnitCount);

		Assert.Equal(17, hourlyValues.Count);
		Assert.Equal(480, hourlyValues.Single(d => d.Time == Day.AddHours(23)).Value);
	}

	/// <summary>
	/// Verifies that a worker who never reaches the action value has no time over the thresholds.
	/// </summary>
	[Fact]
	public void TimeOver_IsZero_BelowTheActionValue()
	{
		var (_, dailyRates) = Process(
			Worker(Day, (7, 5), (8, 5), (9, 5), (10, 5), (11, 5), (12, 5), (13, 5), (14, 5))
		);

		var rate = Assert.Single(dailyRates);
		Assert.Equal(0, rate.WarningRate);
		Assert.Equal(0, rate.DangerRate);
	}

	/// <summary>
	/// Verifies that an hour without measurements between two with is left out of the time over the thresholds, while
	/// the hourly values keep the worker's total through it.
	/// </summary>
	[Fact]
	public void TimeOver_LeavesOutHoursWithoutMeasurements_InAGap()
	{
		var (hourlyValues, dailyRates) = Process(
			Worker(Day, (7, 200), (8, 100), (9, 150), (11, 10), (12, 10))
		);

		var rate = Assert.Single(dailyRates);
		Assert.Equal(0.6, rate.DangerRate, 10);
		Assert.Equal(1, rate.WarningRate + rate.DangerRate);

		Assert.Equal(450, hourlyValues.Single(d => d.Time == Day.AddHours(10)).Value);
	}

	/// <summary>
	/// Verifies that each worker counts the same in the group's time over the thresholds, however many hours they have.
	/// Over the limit 4 of 8 hours and 2 of 2 average to 0.75, not the 6 of 10 hours put together.
	/// </summary>
	[Fact]
	public void TimeOver_AveragesTheWorkers_EachCountingTheSame()
	{
		var (_, longDay) = Process(OverLimitFromElevenUntilThree());
		var (_, shortDay) = Process(Worker(Day, (10, 450), (11, 10)));

		var rate = Assert.Single(DataFetchHandler.GetDailyTimeOverRates(longDay.Concat(shortDay)));

		Assert.Equal(0.75, rate.DangerRate);
	}

	/// <summary>
	/// Verifies that a worker without measurements on the second day has neither a time over the thresholds nor hourly
	/// values that day.
	/// </summary>
	[Fact]
	public void TimeOver_LeavesOutWorker_WithoutDataThatDay()
	{
		var (hourlyValues, dailyRates) = Process(OverLimitFromElevenUntilThree(), days: 2);

		Assert.Equal(Day, Assert.Single(dailyRates).Time);
		Assert.All(hourlyValues, d => Assert.Equal(Day, TimeWindowUtils.StartOfOsloDay(d.Time)));
	}

	/// <summary>
	/// Verifies that the shares of workers over the thresholds are the same as when the hours until midnight counted,
	/// since those hours copy the level of an hour with measurements.
	/// </summary>
	[Fact]
	public void WorkersOver_AreTheSameAsWithTheFilledHours()
	{
		List<List<ExposureDataDto>> workers =
		[
			OverLimitFromElevenUntilThree(),
			Worker(Day, (7, 150), (8, 10)),
			Worker(Day, (7, 5), (8, 5)),
		];

		var rates = DataFetchHandler.GetDailyWorkerRates(
			workers.SelectMany(worker => Process(worker).dailyRates)
		);
		var ratesFromFilledHours = DataFetchHandler.GetDailyWorkerRates(
			workers.SelectMany(worker =>
				DataFetchHandler.GetWorkerDailyRates(
					DataFetchHandler.FillVibrationHours(worker, Day, Day.AddDays(1))
				)
			)
		);

		var rate = Assert.Single(rates);
		var rateFromFilledHours = Assert.Single(ratesFromFilledHours);
		Assert.Equal(2.0 / 3, rate.OverActionRate, 10);
		Assert.Equal(1.0 / 3, rate.OverLimitRate, 10);
		Assert.Equal(rateFromFilledHours.OverActionRate, rate.OverActionRate);
		Assert.Equal(rateFromFilledHours.OverLimitRate, rate.OverLimitRate);
	}
}
