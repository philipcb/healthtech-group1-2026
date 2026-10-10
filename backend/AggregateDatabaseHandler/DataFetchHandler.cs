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
		
		
		if (locationQualifier != null)
		{
			users = users.Where(u => u.Location!.Id == Guid.Parse(locationQualifier)).ToList();
		}
		if (jobQualifier != null)
		{	
			users = users.Where(u => u.JobDescription != null && u.JobDescription.Equals(jobQualifier)).ToList();
		}			

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

	public async Task<List<TimedData>> fetchAggregatedDataOverSampleUsers(List<User> users, DateTime startTime, DateTime endTime, ExposureType exposureType, Field? field)
	{
		var rawData = new List<TimedData>();
		foreach(var user in users)
		{
			rawData.AddRange(await fetchUserAggregatedDataAsync(user.Id, startTime, endTime, exposureType, field));
		}
				
		var rawDataFlat = rawData.GroupBy(d => d.Time).Select(g => new TimedData
		{
			Time = g.Key,
			AvgValue = g.Average(x => x.AvgValue),
			PeakValue = g.Average(x => x.PeakValue)
		});
		return rawDataFlat.ToList();				
	}

	public async Task<IEnumerable<TimedData>> fetchUserAggregatedDataAsync(Guid userId, DateTime startTime, DateTime endTime, ExposureType exposureType, Field? field)
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

		// var dataWithDangerLevels = ThresholdUtils.CalculateDangerLevels(
		// 	exposureType,
		// 	dataWithCumulatedExposureSumValues,
		// 	request.Field
		// );

		var result = dataWithCumulatedExposureSumValues.Select<RawExposureData, TimedData>(data => new TimedData{
			Time = data.Time,
			AvgValue = data.Value,
			PeakValue = exposureType == ExposureType.Noise ? data.MaxValue : null
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