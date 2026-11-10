using Backend.DTOs;
using Backend.Models;
using Backend.Utils;

namespace Backend.Tests.UnitTests.AggregateDatabaseHandler;

/// <summary>
/// Unit tests for the share of the group's workers over the action value and over the limit, which the aggregate job
/// stores per group and day.
/// </summary>
public class DailyWorkerRateTests
{
	// Midnight on 1 October in Oslo (summer time), as UTC, like the aggregate job's days
	private static readonly DateTime Day = new(2026, 9, 30, 22, 0, 0, DateTimeKind.Utc);

	// One worker's hours, from 08:00 on the given day
	private static List<ExposureDataDto> Worker(DateTime day, params DangerLevel[] hours) =>
		hours
			.Select(
				(level, index) =>
					new ExposureDataDto { Time = day.AddHours(8 + index), DangerLevel = level }
			)
			.ToList();

	private static List<DailyWorkerRate> DailyRates(params List<ExposureDataDto>[] workers) =>
		DataFetchHandler.GetDailyWorkerRates(
			workers.SelectMany(DataFetchHandler.GetWorkerDailyRates)
		);

	/// <summary>
	/// Verifies that a worker with only warning hours is over the action value but not over the limit.
	/// </summary>
	[Fact]
	public void GetDailyWorkerRates_CountsWarningHours_OverActionOnly()
	{
		var rate = Assert.Single(
			DailyRates(
				Worker(Day, DangerLevel.Safe, DangerLevel.Warning),
				Worker(Day, DangerLevel.Safe, DangerLevel.Safe),
				Worker(Day, DangerLevel.Safe, DangerLevel.Safe),
				Worker(Day, DangerLevel.Safe, DangerLevel.Safe)
			)
		);

		Assert.Equal(Day, rate.Time);
		Assert.Equal(0.25, rate.OverActionRate);
		Assert.Equal(0, rate.OverLimitRate);
	}

	/// <summary>
	/// Verifies that a worker with only danger hours is over the limit and also over the action value, since the limit
	/// is above the action value.
	/// </summary>
	[Fact]
	public void GetDailyWorkerRates_CountsDangerHours_OverActionAndLimit()
	{
		var rate = Assert.Single(
			DailyRates(
				Worker(Day, DangerLevel.Safe, DangerLevel.Danger),
				Worker(Day, DangerLevel.Safe, DangerLevel.Safe),
				Worker(Day, DangerLevel.Safe, DangerLevel.Safe),
				Worker(Day, DangerLevel.Safe, DangerLevel.Safe)
			)
		);

		Assert.Equal(0.25, rate.OverActionRate);
		Assert.Equal(0.25, rate.OverLimitRate);
	}

	/// <summary>
	/// Verifies that a worker with both warning and danger hours counts once over the action value, so the shares
	/// overlap instead of being added up.
	/// </summary>
	[Fact]
	public void GetDailyWorkerRates_CountsWorkerWithBothOnce()
	{
		var rate = Assert.Single(
			DailyRates(
				Worker(Day, DangerLevel.Warning, DangerLevel.Danger),
				Worker(Day, DangerLevel.Safe, DangerLevel.Danger),
				Worker(Day, DangerLevel.Warning, DangerLevel.Safe),
				Worker(Day, DangerLevel.Safe, DangerLevel.Safe)
			)
		);

		Assert.Equal(0.75, rate.OverActionRate);
		Assert.Equal(0.5, rate.OverLimitRate);
	}

	/// <summary>
	/// Verifies that both shares are 0 when no worker is over a threshold.
	/// </summary>
	[Fact]
	public void GetDailyWorkerRates_IsZero_WithoutExceedances()
	{
		var rate = Assert.Single(
			DailyRates(
				Worker(Day, DangerLevel.Safe, DangerLevel.Safe),
				Worker(Day, DangerLevel.Safe, DangerLevel.Safe)
			)
		);

		Assert.Equal(0, rate.OverActionRate);
		Assert.Equal(0, rate.OverLimitRate);
	}

	/// <summary>
	/// Verifies that the worker days of a day are the workers with data that day.
	/// </summary>
	[Fact]
	public void GetDailyWorkerRates_CountsTheWorkersThatDay()
	{
		var rate = Assert.Single(
			DailyRates(
				Worker(Day, DangerLevel.Safe),
				Worker(Day, DangerLevel.Safe, DangerLevel.Safe),
				Worker(Day, DangerLevel.Danger, DangerLevel.Safe, DangerLevel.Safe)
			)
		);

		Assert.Equal(3, rate.UnitCount);
	}

	/// <summary>
	/// Verifies that the hours of a day are the measured hours of all its workers added up.
	/// </summary>
	[Fact]
	public void GetDailyTimeOverRates_AddsUpTheWorkersHours()
	{
		var rate = Assert.Single(
			DataFetchHandler.GetDailyTimeOverRates(
				new[]
				{
					Worker(Day, DangerLevel.Safe),
					Worker(Day, DangerLevel.Safe, DangerLevel.Safe),
					Worker(Day, DangerLevel.Danger, DangerLevel.Safe, DangerLevel.Safe),
				}.SelectMany(DataFetchHandler.GetWorkerDailyRates)
			)
		);

		Assert.Equal(6, rate.UnitCount);
	}

	/// <summary>
	/// Verifies that each day counts the workers over a threshold that day, so workers over on different days don't add
	/// up across days.
	/// </summary>
	[Fact]
	public void GetDailyWorkerRates_CountsEachDaySeparately()
	{
		var nextDay = Day.AddDays(1);
		var firstWorker = Worker(Day, DangerLevel.Danger, DangerLevel.Safe)
			.Concat(Worker(nextDay, DangerLevel.Safe, DangerLevel.Safe))
			.ToList();
		var secondWorker = Worker(Day, DangerLevel.Safe, DangerLevel.Safe)
			.Concat(Worker(nextDay, DangerLevel.Safe, DangerLevel.Warning))
			.ToList();

		var rates = DailyRates(firstWorker, secondWorker).OrderBy(r => r.Time).ToList();

		Assert.Equal(2, rates.Count);
		Assert.Equal(Day, rates[0].Time);
		Assert.Equal(0.5, rates[0].OverActionRate);
		Assert.Equal(0.5, rates[0].OverLimitRate);
		Assert.Equal(nextDay, rates[1].Time);
		Assert.Equal(0.5, rates[1].OverActionRate);
		Assert.Equal(0, rates[1].OverLimitRate);
	}

	/// <summary>
	/// Verifies that a vibration value isn't filled past midnight, so a worker over the limit on the first day without
	/// data on the second is left out of the second day, from both the workers over and the workers counted.
	/// </summary>
	[Fact]
	public void FillVibrationHours_LeavesOutWorkerWithoutDataThatDay()
	{
		var nextDay = Day.AddDays(1);
		var endTime = Day.AddDays(2);
		var overOnlyFirstDay = DataFetchHandler.FillVibrationHours(
			Worker(Day, DangerLevel.Danger),
			Day,
			endTime
		);
		var overOnSecondDay = DataFetchHandler.FillVibrationHours(
			Worker(Day, DangerLevel.Safe).Concat(Worker(nextDay, DangerLevel.Warning)).ToList(),
			Day,
			endTime
		);

		Assert.All(
			overOnlyFirstDay,
			d => Assert.Equal(Day, TimeWindowUtils.StartOfOsloDay(d.Time))
		);
		Assert.Equal(16, overOnlyFirstDay.Count);

		var secondDay = Assert.Single(
			DailyRates(overOnlyFirstDay, overOnSecondDay),
			r => r.Time == nextDay
		);
		Assert.Equal(1, secondDay.OverActionRate);
		Assert.Equal(0, secondDay.OverLimitRate);
	}

	/// <summary>
	/// Verifies that a vibration value is filled until midnight in Oslo, so the days daylight saving time starts and ends
	/// have 23 and 25 hours.
	/// </summary>
	[Theory]
	// Midnight in Oslo on 29 March is 23:00 UTC on 28 March
	[InlineData(3, 28, 23, 23)]
	// Midnight in Oslo on 25 October is 22:00 UTC on 24 October
	[InlineData(10, 24, 22, 25)]
	public void FillVibrationHours_FillsUntilMidnightInOslo(
		int month,
		int utcDay,
		int utcHour,
		int expectedHours
	)
	{
		var midnight = new DateTime(2026, month, utcDay, utcHour, 0, 0, DateTimeKind.Utc);

		var filled = DataFetchHandler.FillVibrationHours(
			[new ExposureDataDto { Time = midnight, DangerLevel = DangerLevel.Safe }],
			midnight,
			midnight.AddDays(2)
		);

		Assert.Equal(expectedHours, filled.Count);
		Assert.All(filled, d => Assert.Equal(midnight, TimeWindowUtils.StartOfOsloDay(d.Time)));
	}

	/// <summary>
	/// Verifies that a night measurement from 22:00 to 02:00 in Oslo is split at midnight in Oslo, so its hours over the
	/// action value before midnight count on the first day and its safe hours after midnight on the next.
	/// </summary>
	[Fact]
	public void GetWorkerDailyRates_SplitsANightMeasurementAtMidnightInOslo()
	{
		var nextDay = Day.AddDays(1);
		List<ExposureDataDto> night =
		[
			new() { Time = nextDay.AddHours(-2), DangerLevel = DangerLevel.Warning },
			new() { Time = nextDay.AddHours(-1), DangerLevel = DangerLevel.Warning },
			new() { Time = nextDay, DangerLevel = DangerLevel.Safe },
			new() { Time = nextDay.AddHours(1), DangerLevel = DangerLevel.Safe },
		];

		var rates = DataFetchHandler.GetWorkerDailyRates(night).OrderBy(r => r.Time).ToList();

		Assert.Equal(2, rates.Count);
		Assert.Equal(Day, rates[0].Time);
		Assert.Equal(1, rates[0].WarningRate);
		Assert.Equal(2, rates[0].UnitCount);
		Assert.Equal(nextDay, rates[1].Time);
		Assert.Equal(0, rates[1].WarningRate);
		Assert.Equal(2, rates[1].UnitCount);
	}

	/// <summary>
	/// Verifies that measurements at 23:30 and 00:30 in Oslo are on different days, though they're on the same UTC date.
	/// </summary>
	[Fact]
	public void GetWorkerDailyRates_PutsHalfPastElevenAndHalfPastMidnightOnDifferentDays()
	{
		var nextDay = Day.AddDays(1);
		List<ExposureDataDto> hours =
		[
			new() { Time = nextDay.AddMinutes(-30), DangerLevel = DangerLevel.Safe },
			new() { Time = nextDay.AddMinutes(30), DangerLevel = DangerLevel.Safe },
		];

		var days = DataFetchHandler.GetWorkerDailyRates(hours).Select(r => r.Time).Order();

		Assert.Equal([Day, nextDay], days);
	}

	/// <summary>
	/// Verifies that the stored shares of workers are the shares over each threshold, unchanged, for every exposure, and
	/// that the hours and worker days they are taken over are stored with them.
	/// </summary>
	[Theory]
	[InlineData(ExposureType.Noise, null)]
	[InlineData(ExposureType.Vibration, null)]
	[InlineData(ExposureType.Dust, "Pm1_twa")]
	[InlineData(ExposureType.Dust, "Pm10_stel")]
	public void ToShiftAverage_StoresTheWorkersSharesOverEachThreshold(
		ExposureType exposureType,
		string? field
	)
	{
		var rate = new AboveThresholdRate
		{
			Time = Day,
			WarningRate = 0.375,
			DangerRate = 0.125,
			UnitCount = 32,
		};
		var dailyRate = new DailyWorkerRate
		{
			Time = Day,
			OverActionRate = 0.75,
			OverLimitRate = 0.5,
			UnitCount = 4,
		};

		var average = DataFiller.ToShiftAverage(Guid.Empty, exposureType, field, rate, dailyRate);

		Assert.Equal(0.75, average.DailyRateOfWorkerOverAction);
		Assert.Equal(0.5, average.DailyRateOfWorkerOverLimit);
		Assert.Equal(0.5, average.AverageTimeOverAction);
		Assert.Equal(0.125, average.AverageTimeOverLimit);
		Assert.Equal(32, average.HourCount);
		Assert.Equal(4, average.DayCount);
	}
}
