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
				users = users.Where(u => !jobUnderThreshold.Contains(u.JobDescription)).ToList();
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
					.Where(u => !locationIdUnderThreshold.Contains(u.Location.Id))
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
		List<AboveThresholdRate> aboveThresholdDataList
	)> fetchAggregatedDataOverSampleUsers(
		List<User> users,
		DateTime startTime,
		DateTime endTime,
		ExposureType exposureType,
		Field? field
	)
	{
		var rawDataList = new List<TimedData>();
		foreach (var user in users)
		{
			var userData = await fetchUserAggregatedDataAsync(
				user.Id,
				startTime,
				endTime,
				exposureType,
				field
			);
			// Vibration points add up over the day, so each worker gets one value per day, their total. Averaging the
			// workers per hour and taking the day's last hour would leave out workers without a session in that hour.
			var dataFlat =
				exposureType == ExposureType.Vibration ? ToDailyTotals(userData) : userData;

			rawDataList.AddRange(dataFlat);
		}

		var averageDataList = AverageOverWorkers(rawDataList);

		// The key figures classify the group's values, the same as the chart shows, so they never say how many workers were
		// above a threshold. Vibration has one value per day, noise and dust one per hour.
		var aboveThresholdDataList =
			exposureType == ExposureType.Vibration
				? ClassifyGroupDailyValues(exposureType, averageDataList)
				: ClassifyGroupHourlyValues(exposureType, field, averageDataList);

		return (dataList: averageDataList, aboveThresholdDataList);
	}

	// Each of the group's hourly values against the thresholds, and per day the share of the group's hours at each level
	public static List<AboveThresholdRate> ClassifyGroupHourlyValues(
		ExposureType exposureType,
		Field? field,
		IEnumerable<TimedData> groupHourlyValues
	) =>
		groupHourlyValues
			.GroupBy(d => d.Time.Date)
			.Select(g =>
				AboveThresholdRate.FromDangerLevels(
					g.Key,
					g.Select(d =>
							ThresholdUtils
								.CalculateDangerLevel(exposureType, d.AvgValue, null, field)
								.dangerLevel
						)
						.ToList()
				)
			)
			.ToList();

	// Each of the group's daily values against the thresholds, so a day is either fully above a threshold or not at all
	public static List<AboveThresholdRate> ClassifyGroupDailyValues(
		ExposureType exposureType,
		IEnumerable<TimedData> groupDailyValues
	) =>
		groupDailyValues
			.Select(d =>
				AboveThresholdRate.FromDangerLevels(
					d.Time,
					[
						ThresholdUtils
							.CalculateDangerLevel(exposureType, d.AvgValue, null)
							.dangerLevel,
					]
				)
			)
			.ToList();

	// The average over the workers that have data at each time
	public static List<TimedData> AverageOverWorkers(IEnumerable<TimedData> data) =>
		data.GroupBy(d => d.Time)
			.Select(g => new TimedData
			{
				Time = g.Key,
				AvgValue = g.Average(d => d.AvgValue),
				PeakValue = g.Average(d => d.PeakValue ?? null),
			})
			.ToList();

	// One worker's vibration points per day: the day's last cumulated value, which is the day's total
	public static IEnumerable<TimedData> ToDailyTotals(IEnumerable<TimedData> cumulatedData) =>
		cumulatedData
			.GroupBy(d => d.Time.Date)
			.Select(g => new TimedData { Time = g.Key, AvgValue = g.MaxBy(d => d.Time)!.AvgValue });

	public async Task<IEnumerable<TimedData>> fetchUserAggregatedDataAsync(
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

		//Don't need to clamp value i guess ?

		// startTime = AuthorizationUtils.ClampRequestStartDateForRole(
		// 	startTime.UtcDateTime,
		// 	_signedInUserContext?.User?.Role
		// );
		// endTime = TimeWindowUtils.ClampRequestEndDateToCurrentDateTime(endTime.UtcDateTime);

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

		return CalculateUserExposureData(exposureType, rawExposureData);
	}

	// Vibration points add up over the day, so their value is the hour's sum. Other exposures use the hour's average.
	public static AggregationFunction GetValueFunction(ExposureType exposureType) =>
		exposureType == ExposureType.Vibration ? AggregationFunction.Sum : AggregationFunction.Avg;

	// One worker's hourly values, without danger levels, since only the group's values are classified. Vibration is
	// cumulated through the day. Only pass one worker's data, since the cumulation doesn't tell workers apart.
	public static IEnumerable<TimedData> CalculateUserExposureData(
		ExposureType exposureType,
		List<RawExposureData> rawExposureData
	) =>
		ExposureUtils
			.CumulateVibrationSumValues(
				exposureType,
				GetValueFunction(exposureType),
				rawExposureData
			)
			.Select(data => new TimedData
			{
				Time = data.Time,
				AvgValue = data.Value,
				PeakValue = exposureType == ExposureType.Noise ? data.MaxValue : null,
			});
};

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

	// The share of the data points at each danger level. Each point has exactly one level and both shares have the same
	// denominator, so they never overlap. Cast before dividing so integer division doesn't truncate the share to 0.
	public static AboveThresholdRate FromDangerLevels(
		DateTime time,
		IReadOnlyCollection<DangerLevel> dangerLevels
	) =>
		new()
		{
			Time = time,
			WarningRate =
				(double)dangerLevels.Count(level => level == DangerLevel.Warning)
				/ dangerLevels.Count,
			DangerRate =
				(double)dangerLevels.Count(level => level == DangerLevel.Danger)
				/ dangerLevels.Count,
		};
}
