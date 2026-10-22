using System.Linq.Expressions;
using System.Text.RegularExpressions;
using Backend.DTOs;
using Backend.Middleware;
using Backend.Models;
using Backend.Records;
using Backend.Utils;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql.Replication.PgOutput.Messages;

namespace Backend.Services;

public interface IAggregateExposureDataService
{
	Task<double?> GetWholeAverage(
		DateTime startTime,
		DateTime endTime,
		Guid? sampleId,
		ExposureType exposureType,
		string? field
	);

	Task<AggregatedTrendResponseDto> GetTrendAsync(
		DateTime startTime,
		DateTime endTime,
		Guid? sampleId,
		ExposureType exposureType,
		string? field
	);

	Task<IEnumerable<SampleDto>> GetOverviewAggregateDataAsync(
		DateTime startTime,
		DateTime endTime
	);
}

public class AggregateExposureDataService(
	AggregateDbContext context,
	SignedInUserContext signedInUserContext
) : IAggregateExposureDataService
{
	private readonly AggregateDbContext _context = context;
	private readonly SignedInUserContext _signedInUserContext = signedInUserContext;

	// public async Task<SampleDTOs?> getSampleFromQualifiers(string? locationId, string? job)
	// {
	// 	var sample = await _context.Samples.Where(s => s.Site.Equals(_signedInUserContext.User.Location.Site)
	// 	&& ((locationId == null && s.LocationQualifier == null) || (s.LocationQualifier != null && s.LocationQualifier.Equals(locationId)))
	// 	&& ((job == null && s.JobQualifier == null) || (s.JobQualifier != null && s.JobQualifier.Equals(job)))).FirstOrDefaultAsync();

	// 	if (sample != null)
	// 	{
	// 		return new SampleDTOs
	// 		{
	// 			Id = sample.Id,
	// 			SampleCount = sample.SampleCount,
	// 			Site = sample.Site,
	// 			LocationQualifier = sample.LocationQualifier,
	// 			JobQualifier = sample.JobQualifier
	// 		};
	// 	}
	// 	return null;
	// }

	// The groups the signed-in user may see. The occupational health service only sees its own site, management every
	// site. Any other role sees nothing, even if an endpoint lets it through.
	private IQueryable<Sample> GetAccessibleSamples()
	{
		var user = _signedInUserContext.User;
		var site = user?.Location?.Site;

		return user?.Role switch
		{
			UserRole.Manager => _context.Samples,
			UserRole.OHS when site != null => _context.Samples.Where(s => s.Site == site),
			_ => _context.Samples.Where(_ => false),
		};
	}

	// An expression rather than a method call, so EF Core can put it into the SQL, used with
	// `g.AsQueryable().Average(...)`. Throws for any other field, since the query would otherwise average NULL, which
	// Postgres rejects.
	private static Expression<Func<DustAverage, double?>> GetCorrectDustValue(string? field) =>
		field switch
		{
			"pm1_twa" => d => d.AveragePm1Twa,
			"pm25_twa" => d => d.AveragePm25Twa,
			"pm10_twa" => d => d.AveragePm10Twa,
			_ => throw new ArgumentException($"Unsupported dust field: {field}", nameof(field)),
		};

	//function to get the average of averages of each user of a given time period and a given exposure type
	public async Task<double?> GetWholeAverage(
		DateTime startTime,
		DateTime endTime,
		Guid? sampleId,
		ExposureType exposureType,
		string? field
	)
	{
		switch (exposureType)
		{
			case ExposureType.Dust:
				var dustValue = GetCorrectDustValue(field);
				return _context
					.DustAverages.Where(d =>
						d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime
					)
					.GroupBy(d => d.Time.Date)
					.Select(g => new TrendPointDto
					{
						Time = g.Key,
						Value = g.AsQueryable().Average(dustValue),
					})
					.Average(d => d.Value);
			case ExposureType.Noise:
				return _context
					.NoiseAverages.Where(d =>
						d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime
					)
					.GroupBy(d => d.Time.Date)
					.Select(g => new TrendPointDto
					{
						Time = g.Key,
						Value = g.Average(d => d.AverageLaeq),
					})
					.Average(d => d.Value);
			case ExposureType.Vibration:
				return _context
					.VibrationAverages.Where(d =>
						d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime
					)
					.GroupBy(d => d.Time.Date)
					.Select(g => new TrendPointDto
					{
						Time = g.Key,
						Value = g.Average(d => d.AverageExposure),
					})
					.Average(d => d.Value);
			default:
				return null;
		}
	}

	//function to get the averages of each user each day, and the average, of a given time period and a given exposure type
	public async Task<AggregatedTrendResponseDto> GetTrendAsync(
		DateTime startTime,
		DateTime endTime,
		Guid? sampleId,
		ExposureType exposureType,
		string? field
	)
	{
		// Any group the user may see, like the overview
		var sample = await GetAccessibleSamples()
			.Where(s => s.Id == sampleId)
			.FirstOrDefaultAsync();
		if (sample == null)
		{
			return new AggregatedTrendResponseDto
			{
				Status = "unavailable",
				Reason = "noSuchGroup",
			};
		}
		Guid? building = sample.LocationQualifier;
		String? occupation = sample.JobQualifier;
		String? unit;
		List<TrendPointDto>? exposureAverages;
		switch (exposureType)
		{
			case ExposureType.Dust:
				var dustValue = GetCorrectDustValue(field);
				unit = "ug";
				exposureAverages = await _context
					.DustAverages.Where(d =>
						d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime
					)
					.GroupBy(d => d.Time.Date)
					.Select(g => new TrendPointDto
					{
						Time = g.Key,
						Value = g.AsQueryable().Average(dustValue),
					})
					.OrderBy(d => d.Time)
					.ToListAsync();
				break;
			case ExposureType.Noise:
				unit = "db";
				exposureAverages = await _context
					.NoiseAverages.Where(d =>
						d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime
					)
					.GroupBy(d => d.Time.Date)
					.Select(g => new TrendPointDto
					{
						Time = g.Key,
						Value = g.Average(d => d.AverageLaeq),
					})
					.OrderBy(d => d.Time)
					.ToListAsync();
				break;
			case ExposureType.Vibration:
				unit = "points";
				exposureAverages = await _context
					.VibrationAverages.Where(d =>
						d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime
					)
					.GroupBy(d => d.Time.Date)
					.Select(g => new TrendPointDto
					{
						Time = g.Key,
						Value = g.OrderByDescending(d => d.Time).FirstOrDefault()!.AverageExposure,
					})
					.OrderBy(d => d.Time)
					.ToListAsync();
				break;
			default:
				unit = null;
				exposureAverages = null;
				break;
		}
		if (exposureAverages.IsNullOrEmpty())
		{
			return new AggregatedTrendResponseDto
			{
				Status = "unavailable",
				Reason = "noSuchGroup",
			};
		}

		// The aggregate job only computes the time over the thresholds of dust from PM1 TWA, so other dust fields have none
		if (exposureType != ExposureType.Dust || field == "pm1_twa")
		{
			var shiftAverages = await _context
				.AveragesPer8HourShift.Where(d =>
					d.SampleId == sampleId
					&& d.ExposureType == exposureType
					&& startTime <= d.Time
					&& d.Time < endTime
				)
				.ToListAsync();
			var shiftAverageByDay = shiftAverages
				.GroupBy(d => d.Time.Date)
				.ToDictionary(g => g.Key, g => g.First());
			foreach (var point in exposureAverages!)
			{
				if (shiftAverageByDay.TryGetValue(point.Time.Date, out var shiftAverage))
				{
					point.AverageTimeOverAction = shiftAverage.AverageTimeOverAction;
					point.AverageTimeOverLimit = shiftAverage.AverageTimeOverLimit;
				}
			}
		}

		return new AggregatedTrendResponseDto
		{
			Status = "ok",
			Group = new TrendSampleDto { Hall = building, Occupation = occupation },
			Unit = unit,
			Average = exposureAverages!.Average(d => d.Value),
			Granularity = "day",
			Points = exposureAverages,
		};
	}

	public async Task<IEnumerable<SampleDto>> GetOverviewAggregateDataAsync(
		DateTime startTime,
		DateTime endTime
	)
	{
		// Every group the user may see: one occupation in one hall, a whole hall, one occupation across the site and the
		// whole site. Groups with too few people are never created in the aggregate database.
		var allSamples = await GetAccessibleSamples().ToListAsync();
		List<SampleDto> overviewList = new();
		foreach (Sample s in allSamples)
		{
			var averageDustValues = await GetWholeAverage(
				startTime,
				endTime,
				s.Id,
				ExposureType.Dust,
				"pm1_twa"
			);
			var averageNoiseValues = await GetWholeAverage(
				startTime,
				endTime,
				s.Id,
				ExposureType.Noise,
				null
			);
			var averageVibrationValues = await GetWholeAverage(
				startTime,
				endTime,
				s.Id,
				ExposureType.Vibration,
				null
			);
			overviewList.Add(
				new SampleDto
				{
					GroupId = s.Id,
					Site = s.Site,
					Hall = s.LocationName,
					Occupation = s.JobQualifier,
					Averages = new SampleAveragesDto
					{
						Dust = averageDustValues,
						Noise = averageNoiseValues,
						Vibration = averageVibrationValues,
					},
				}
			);
		}
		return overviewList;
	}
}
