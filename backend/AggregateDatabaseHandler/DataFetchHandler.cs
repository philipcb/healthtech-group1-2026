using Backend;
using Backend.DTOs;
using Backend.Models;
using Backend.Utils;
using Backend.Records;
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
		String? locationQualifier,
		String? jobQualifier
	)
	{
		List<User> users = await _context.User.Where(u => u.Role == UserRole.Operator && u.Location != null && u.Location.Site.Equals(site)).ToListAsync();
		
		if (locationQualifier != null) //If location isn't null, we simply filter with it 
		{
			users = users.Where(u => u.Location!.Id == Guid.Parse(locationQualifier)).ToList();
		}

		if (jobQualifier != null)
		{	
			users = users.Where(u => u.JobDescription != null && u.JobDescription.Equals(jobQualifier)).ToList();
		}

		//When location is null, we have to be careful to not include in the selection of users those who come from subset of size < 5
		if (locationQualifier == null)
			{
				List<string?> allJobs = await getAllJobs();
						
				int sumOfUserUnderThreshold = 0;
				List<string> jobUnderThreshold = new();

				foreach (string? Job in allJobs)
				{
					var userCount = users!.Count(u => u.JobDescription != null && u.JobDescription.Equals(Job));
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
				var userCount = users!.Count(u => u.Location != null && u.LocationId.Equals(loc.Id));
				if (userCount < 5)
				{
					sumOfUserUnderThreshold += userCount;
					locationIdUnderThreshold.Add(loc.Id);
				}
			}
			if (sumOfUserUnderThreshold < 5)
			{
				users = users.Where(u => !locationIdUnderThreshold.Contains(u.Location.Id)).ToList();
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

	public async Task<(List<TimedData> dataList, List<AboveThresholdRate> aboveThresholdData)> fetchAggregatedDataOverSampleUsers(List<User> users, DateTime startTime, DateTime endTime, ExposureType exposureType, Field? field)
	{
		var rawDataList = new List<TimedData>();
		var rateList = new List<AboveThresholdRate>();
		foreach(var user in users)
		{
		
			var userData = await fetchUserAggregatedDataAsync(user.Id, startTime, endTime, exposureType, field);
			var dataFlat = userData.Select(d => new TimedData
			{
				Time = d.Time,
				AvgValue = d.Value,
				PeakValue = d.PeakValue
			});
			
			rawDataList.AddRange(dataFlat);

			var aboveThresholdData = userData.GroupBy(d => d.Time.Day).Select(g => new AboveThresholdRate
			{
				Time = new DateTime(g.Key).ToUniversalTime(),
				WarningRate = 1.0 / g.Count(d => d.DangerLevel == DangerLevel.Warning) / g.Count(),
				DangerRate = 1.0 / g.Count(d => d.DangerLevel == DangerLevel.Danger) / g.Count()
			});

			rateList.AddRange(aboveThresholdData);
		}



		return (dataList : rawDataList.ToList(), aboveThresholdData: rateList.ToList());				
	}

	public async Task<IEnumerable<ExposureDataDto>> fetchUserAggregatedDataAsync(Guid userId, DateTime startTime, DateTime endTime, ExposureType exposureType, Field? field)
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
                {avgColumnName} as ""Value"",
				{avgColumnName} as ""AvgValue"",
				{maxColumnName} as ""MaxValue"",
				{sumColumnName} as ""SumValue"",
				user_id as ""UserId""
            FROM {materializedViewName}";


		var rawExposureData = await _context
			.Database.SqlQueryRaw<RawExposureData>(sql)
			.AsQueryable()
			.Where(data =>
				data.Time >= startTime
				&& data.Time <= endTime
				&& data.UserId == userId
			)
			.ToListAsync();

		// For vibration data, danger levels are always calculated from cumulative daily sum expore,
		// ignoring the requested aggregation function.
		// If the requested aggregation function is sum, the value is cumulated.
		// NOTE: Maybe this should be changed in the future, for example by only allowing sum aggregation for vibration data,
		// but for now this is done to allow fetching different aggregations while making sure the threshold logic remains correct.
		
		
		
		var dataWithCumulatedExposureSumValues = ExposureUtils.CumulateVibrationSumValues(
			exposureType,
			AggregationFunction.Avg,
			rawExposureData
		);
		
		var dataHourly = dataWithCumulatedExposureSumValues.GroupBy(d => new { Date = d.Time.Date, Hour = d.Time.Hour })
		.Select(g => new RawExposureData(
			new DateTime(g.Key.Date.Year, g.Key.Date.Month, g.Key.Date.Day, g.Key.Hour, 0, 0).ToUniversalTime(),
			g.Average(x => x.Value),
			g.Average(x => x.AvgValue),
			g.Average(x => x.MaxValue),
			g.Average(x => x.SumValue),
			userId
		));


		var dataWithDangerLevels = ThresholdUtils.CalculateDangerLevels(
			exposureType,
			dataWithCumulatedExposureSumValues,
			field
		);

		var result = dataWithDangerLevels.Select(item => new ExposureDataDto
		{
			Time = item.data.Time,
			Value = item.data.Value,
			PeakValue = exposureType == ExposureType.Noise ? item.data.MaxValue : null,
			DangerLevel = item.dangerLevels.dangerLevel,
			PeakDangerLevel = item.dangerLevels.peakDangerLevel,
		});

		return result;
	}


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

}