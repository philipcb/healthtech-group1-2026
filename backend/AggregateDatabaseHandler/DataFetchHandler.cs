using Backend;
using Backend.DTOs;
using Backend.Models;
using Backend.Records;
using Backend.Utils;
using Microsoft.AspNetCore.Authentication.OAuth.Claims;
using Microsoft.EntityFrameworkCore;

public class DataFetchHandler(AppDbContext _context)
{
	public async Task<List<Location>> getAllLocations()
	{
		return await _context.Location.ToListAsync<Location>();
	}

	public async Task<List<String?>> getAllJobs()
	{
		return await _context.User.Select(u => u.JobDescription).ToListAsync();
	}

	// Vibration points add up over the day, so their value is the hour's sum. Other exposures use the hour's average.
	public static AggregationFunction GetValueFunction(ExposureType exposureType) =>
		exposureType == ExposureType.Vibration ? AggregationFunction.Sum : AggregationFunction.Avg;

	public async Task<List<User>?> getUserBySiteAndQualifiers(
		String site,
		Guid? locationQualifier,
		String? jobQualifier
	)
	{
		List<User> users = await _context
			.User.Where(u =>
				u.Role == UserRole.Operator && u.Location != null && u.Location.Site.Equals(site)
			)
			.ToListAsync();

		if (locationQualifier != null) //If location isn't null, we simply filter with it
		{
			users = users.Where(u => u.Location!.Id == locationQualifier).ToList();
		}

		if (jobQualifier != null)
		{
			users = users
				.Where(u => u.JobDescription != null && u.JobDescription.Equals(jobQualifier))
				.ToList();
		}

		//When location is null, we have to be careful to not include in the selection of users those who come from subset of size < 5
		if (locationQualifier == null)
		{
			List<string?> allJobs = await getAllJobs();

			int sumOfUserUnderThreshold = 0;
			List<string> jobUnderThreshold = new();

			foreach (string? Job in allJobs)
			{
				var userCount = users!.Count(u =>
					u.JobDescription != null && u.JobDescription.Equals(Job)
				);
				if (userCount < 5)
				{
					sumOfUserUnderThreshold += userCount;
					jobUnderThreshold.Add(Job!);
				}
			}
			if (sumOfUserUnderThreshold < 5)
			{
				users = users.Where(u => !jobUnderThreshold.Contains(u.JobDescription!)).ToList();
			}
		}

		//Same as location, if no jobqualifier is specified, then we take all users from the location, but exclude
		//user from the building and whom job has less than 5 people if the sum of them is < 5
		if (jobQualifier == null)
		{
			List<Location> allLocation = await getAllLocations();

			int sumOfUserUnderThreshold = 0;
			List<Guid> locationIdUnderThreshold = new();

			foreach (Location? loc in allLocation)
			{
				var userCount = users!.Count(u =>
					u.Location != null && u.LocationId.Equals(loc.Id)
				);
				if (userCount < 5)
				{
					sumOfUserUnderThreshold += userCount;
					locationIdUnderThreshold.Add(loc.Id);
				}
			}
			if (sumOfUserUnderThreshold < 5)
			{
				users = users
					.Where(u => !locationIdUnderThreshold.Contains(u.Location!.Id))
					.ToList();
			}
		}

		//At the end, if there is less than 5 peoples in the group, then it is not returned
		if (users.Count < 5)
		{
			return null;
		}
		return users;
	}

	public async Task<List<User>?> getUsersBySample(Sample sample)
	{
		return await getUserBySiteAndQualifiers(
			sample.Site,
			sample.LocationQualifier,
			sample.JobQualifier
		);
	}

	public async Task<(
		List<TimedData> dataList,
		List<AboveThresholdRate> hoursAboveThresholdDataList,
		List<DailyWorkerRate> daysAboveThresholdDataList
	)> fetchAggregatedDataOverSampleUsers(
		List<User> users,
		DateTime startTime,
		DateTime endTime,
		ExposureType exposureType,
		Field? field
	)
	{
		var rawDataList = new List<TimedData>();
		var rateList = new List<AboveThresholdRate>();

		foreach (var user in users)
		{
			List<ExposureDataDto> userData = (
				await fetchUserAggregatedDataAsync(user.Id, startTime, endTime, exposureType, field)
			).ToList();

			var (hourlyValues, dailyRates) = GetWorkerHourlyValuesAndDailyRates(
				exposureType,
				userData,
				startTime,
				endTime
			);

			var dataFlat = hourlyValues.Select(d => new TimedData
			{
				Time = d.Time,
				AvgValue = d.Value,
				PeakValue = d.PeakValue,
			});

			rawDataList.AddRange(dataFlat);

			rateList.AddRange(dailyRates);
		}

		var averageDataList = rawDataList
			.GroupBy(d => d.Time)
			.Select(g => new TimedData
			{
				Time = g.Key,
				AvgValue = g.Average(d => d.AvgValue),
				PeakValue = g.Average(d => d.PeakValue ?? null),
			});

		return (
			dataList: averageDataList.ToList(),
			hoursAboveThresholdDataList: GetDailyTimeOverRates(rateList),
			GetDailyWorkerRates(rateList)
		);
	}

	// One worker's hourly values, and their share of hours at each danger level per day. Vibration's value holds until
	// midnight, so the group's hourly values include the workers who stopped earlier that day. Only the hours with
	// measurements count for the time over the thresholds, so the hours after a worker stopped don't count as over.
	public static (
		List<ExposureDataDto> hourlyValues,
		List<AboveThresholdRate> dailyRates
	) GetWorkerHourlyValuesAndDailyRates(
		ExposureType exposureType,
		List<ExposureDataDto> userData,
		DateTime startTime,
		DateTime endTime
	) =>
		(
			exposureType == ExposureType.Vibration
				? FillVibrationHours(userData, startTime, endTime)
				: userData,
			GetWorkerDailyRates(userData).ToList()
		);

	// Per day, the average of the workers' shares of hours at each danger level, so each worker counts the same however
	// many hours they have
	public static List<AboveThresholdRate> GetDailyTimeOverRates(
		IEnumerable<AboveThresholdRate> workerDailyRates
	) =>
		workerDailyRates
			.GroupBy(d => d.Time)
			.Select(g => new AboveThresholdRate
			{
				Time = g.Key,
				WarningRate = g.Average(d => d.WarningRate),
				DangerRate = g.Average(d => d.DangerRate),
			})
			.ToList();

	// Vibration points add up over the day, so a worker's value holds until their next hour with data. Each day starts
	// without a value, so a worker without data on a day has no hours that day instead of the day before's total.
	public static List<ExposureDataDto> FillVibrationHours(
		List<ExposureDataDto> userData,
		DateTime startTime,
		DateTime endTime
	)
	{
		var filledData = new List<ExposureDataDto>(userData);
		var dataByTime = userData.ToDictionary(d => d.Time);

		ExposureDataDto? previous = null;

		for (var time = startTime; time < endTime; time = time.AddHours(1))
		{
			if (dataByTime.TryGetValue(time, out var current))
			{
				previous = current;
			}
			else if (previous != null && previous.Time.Date == time.Date)
			{
				filledData.Add(
					new ExposureDataDto
					{
						Time = time,
						Value = previous.Value,
						PeakValue = previous.PeakValue,
						DangerLevel = previous.DangerLevel,
						PeakDangerLevel = previous.PeakDangerLevel,
					}
				);
			}
		}

		return filledData;
	}

	// One worker's share of hours at each danger level, per day
	public static IEnumerable<AboveThresholdRate> GetWorkerDailyRates(
		IEnumerable<ExposureDataDto> userData
	) =>
		userData
			.GroupBy(d => d.Time.Date)
			.Select(g => new AboveThresholdRate
			{
				Time = g.Key,
				WarningRate =
					(double)g.Count(d => d.DangerLevel == DangerLevel.Warning) / g.Count(),
				DangerRate = (double)g.Count(d => d.DangerLevel == DangerLevel.Danger) / g.Count(),
			});

	public static List<DailyWorkerRate> GetDailyWorkerRates(
		IEnumerable<AboveThresholdRate> workerDailyRates
	) =>
		workerDailyRates
			.GroupBy(d => d.Time)
			.Select(g => new DailyWorkerRate
			{
				Time = g.Key,
				OverActionRate =
					(double)g.Count(d => d.WarningRate > 0 || d.DangerRate > 0) / g.Count(),
				OverLimitRate = (double)g.Count(d => d.DangerRate > 0) / g.Count(),
			})
			.ToList();

	// One row per UTC hour. The times from the database are already UTC, so the hour is kept as UTC whatever the
	// process's time zone, instead of being converted from local time.
	public static IEnumerable<RawExposureData> GroupByHour(
		IEnumerable<RawExposureData> data,
		Guid userId
	) =>
		data.GroupBy(d => new { Date = d.Time.Date, Hour = d.Time.Hour })
			.Select(g => new RawExposureData(
				new DateTime(
					g.Key.Date.Year,
					g.Key.Date.Month,
					g.Key.Date.Day,
					g.Key.Hour,
					0,
					0,
					DateTimeKind.Utc
				),
				g.Average(x => x.Value),
				g.Average(x => x.AvgValue),
				g.Average(x => x.MaxValue),
				g.Average(x => x.SumValue),
				userId
			));

	public async Task<IEnumerable<ExposureDataDto>> fetchUserAggregatedDataAsync(
		Guid userId,
		DateTime startTime,
		DateTime endTime,
		ExposureType exposureType,
		Field? field
	)
	{
		string materializedViewName = ExposureUtils.GetMaterializedViewName(
			exposureType,
			TimeGranularity.Hour
		);

		string valueColumnName = ExposureUtils.GetAggregateColumnName(
			GetValueFunction(exposureType),
			exposureType,
			field
		);

		string avgColumnName = ExposureUtils.GetAggregateColumnName(
			AggregationFunction.Avg,
			exposureType,
			field
		);

		string maxColumnName = ExposureUtils.GetAggregateColumnName(
			AggregationFunction.Max,
			exposureType,
			field
		);

		string sumColumnName = ExposureUtils.GetAggregateColumnName(
			AggregationFunction.Sum,
			exposureType,
			field
		);

		var sql =
			$@"
            SELECT 
                bucket as ""Time"",
                {valueColumnName} as ""Value"",
				{avgColumnName} as ""AvgValue"",
				{maxColumnName} as ""MaxValue"",
				{sumColumnName} as ""SumValue"",
				user_id as ""UserId""
            FROM {materializedViewName}";

		var rawExposureData = await _context
			.Database.SqlQueryRaw<RawExposureData>(sql)
			.AsQueryable()
			.Where(data => data.Time >= startTime && data.Time <= endTime && data.UserId == userId)
			.ToListAsync();

		var dataWithCumulatedExposureSumValues = ExposureUtils.CumulateVibrationSumValues(
			exposureType,
			GetValueFunction(exposureType),
			rawExposureData
		);

		var dataHourly = GroupByHour(dataWithCumulatedExposureSumValues, userId);

		var dataWithDangerLevels = ThresholdUtils.CalculateDangerLevels(
			exposureType,
			dataHourly,
			field
		);

		var result = dataWithDangerLevels.Select(item => new ExposureDataDto
		{
			Time = item.data.Time,
			Value = item.data.Value,
			PeakValue = exposureType == ExposureType.Noise ? item.data.MaxValue : null,
			//Unfortunate naming
			DangerLevel = item.dangerLevels.dangerLevel,
			PeakDangerLevel = item.dangerLevels.peakDangerLevel,
		});

		return result;
	}
}

public class TimedData
{
	public DateTime Time { get; set; }
	public double AvgValue { get; set; }

	/// <summary>
	/// Only used for noise
	/// </summary>
	public double? PeakValue { get; set; }
}

public class AboveThresholdRate
{
	public DateTime Time { get; set; }
	public double WarningRate { get; set; }
	public double DangerRate { get; set; }
}

public class DailyWorkerRate
{
	public DateTime Time { get; set; }

	public double OverActionRate { get; set; }
	public double OverLimitRate { get; set; }
}
