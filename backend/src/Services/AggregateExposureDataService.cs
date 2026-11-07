using System.Linq.Expressions;
using System.Runtime.CompilerServices;
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
		string? field,
		bool isHourly
	);

	Task<IEnumerable<SampleDto>> GetOverviewAggregateDataAsync(
		DateTime startTime,
		DateTime endTime,
		string? dustField
	);
}

public class AggregateExposureDataService(
	AggregateDbContext context,
	SignedInUserContext signedInUserContext
) : IAggregateExposureDataService
{
	private readonly AggregateDbContext _context = context;
	private readonly SignedInUserContext _signedInUserContext = signedInUserContext;

	// The groups the signed-in user may see. Management and the occupational health service share the dashboard and see
	// every site. Any other role sees nothing, even if an endpoint lets it through.
	private IQueryable<Sample> GetAccessibleSamples() =>
		_signedInUserContext.User?.Role switch
		{
			UserRole.Manager or UserRole.OHS => _context.Samples,
			_ => _context.Samples.Where(_ => false),
		};

	// An expression rather than a method call, so EF Core can put it into the SQL, used with
	// `g.AsQueryable().Average(...)`. Throws for any other field, since the query would otherwise average NULL, which
	private static Expression<Func<DustAverage, double?>> GetCorrectDustValue(string? field) =>
		field?.ToLowerInvariant() switch
		{
			"pm1_twa" => d => d.AveragePm1Twa,
			"pm25_twa" => d => d.AveragePm25Twa,
			"pm4_twa" => d => d.AveragePm4Twa,
			"pm10_twa" => d => d.AveragePm10Twa,

			"pm1_stel" => d => d.AveragePm1Stel,
			"pm25_stel" => d => d.AveragePm25Stel,
			"pm4_stel" => d => d.AveragePm4Stel,
			"pm10_stel" => d => d.AveragePm10Stel,
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
					.Select(g => g.AsQueryable().Average(dustValue))
					.Average();
			case ExposureType.Noise:
				return _context
					.NoiseAverages.Where(d =>
						d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime
					)
					.GroupBy(d => d.Time.Date)
					.Select(g => (double?)g.Average(d => d.AverageLaeq))
					.Average();
			case ExposureType.Vibration:
				//For vibration, we have to take the last average hour
				// Nullable, so a group without data in the period gets `null` instead of failing on the SQL `NULL`
				return _context
					.VibrationAverages.Where(d =>
						d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime
					)
					.GroupBy(d => d.Time.Date)
					.Select(g =>
						g.OrderByDescending(d => d.Time)
							.Select(d => (double?)d.AverageExposure)
							.First()
					)
					.Average();
			default:
				return null;
		}
	}

	public async Task<AggregatedTrendResponseDto> GetTrendAsync(
		DateTime startTime,
		DateTime endTime,
		Guid? sampleId,
		ExposureType exposureType,
		string? field,
		bool isHourly
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
				var hourlyDustAggregates = await _context
					.DustAverages.Where(d =>
						d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime
					)
					.ToListAsync();

				if (isHourly)
				{
					exposureAverages = hourlyDustAggregates
						.Select(d => new TrendPointDto
						{
							Time = d.Time,
							Value = dustValue.Compile().Invoke(d),
						})
						.OrderBy(d => d.Time)
						.ToList();
				}
				else
				{
					exposureAverages = hourlyDustAggregates
						.GroupBy(d => d.Time.Date)
						.Select(g => new TrendPointDto
						{
							Time = g.Key,
							Value = g.AsQueryable().Average(dustValue),
						})
						.OrderBy(d => d.Time)
						.ToList();
				}
				break;
			case ExposureType.Noise:
				unit = "db";

				var hourlyNoiseAggregates = await _context
					.NoiseAverages.Where(d =>
						d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime
					)
					.ToListAsync();

				if (isHourly)
				{
					exposureAverages = hourlyNoiseAggregates
						.Select(d => new TrendPointDto { Time = d.Time, Value = d.AverageLaeq })
						.OrderBy(d => d.Time)
						.ToList();
				}
				else
				{
					exposureAverages = hourlyNoiseAggregates
						.GroupBy(d => d.Time.Date)
						.Select(g => new TrendPointDto
						{
							Time = g.Key,
							Value = g.Average(d => d.AverageLaeq),
						})
						.OrderBy(d => d.Time)
						.ToList();
				}
				break;

			case ExposureType.Vibration:
				unit = "points";
				var hourlyVibrationAggregates = await _context
					.VibrationAverages.Where(d =>
						d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime
					)
					.ToListAsync();

				if (isHourly)
				{
					exposureAverages = hourlyVibrationAggregates
						.Select(d => new TrendPointDto { Time = d.Time, Value = d.AverageExposure })
						.OrderBy(d => d.Time)
						.ToList();
				}
				else
				{
					exposureAverages = hourlyVibrationAggregates
						.GroupBy(d => d.Time.Date)
						.Select(g => new TrendPointDto
						{
							Time = g.Key,
							Value = g.OrderByDescending(d => d.Time)
								.FirstOrDefault()!
								.AverageExposure,
						})
						.OrderBy(d => d.Time)
						.ToList();
				}
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

		var lowercaseField = field?.ToLowerInvariant();
		var shiftAverages = await _context
			.AveragesPer8HourShift.Where(d =>
				d.SampleId == sampleId
				&& d.ExposureType == exposureType
				&& startTime <= d.Time
				&& d.Time < endTime
				&& (lowercaseField == null || d.Field.ToLower() == lowercaseField)
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
				point.RateOfWorkerOverAction = shiftAverage.DailyRateOfWorkerOverAction;
				point.AverageTimeOverLimit = shiftAverage.AverageTimeOverLimit;
				point.RateOfWorkerLimit = shiftAverage.DailyRateOfWorkerOverLimit;
			}
		}

		return new AggregatedTrendResponseDto
		{
			Status = "ok",
			Group = new TrendSampleDto { Hall = building, Occupation = occupation },
			Unit = unit,
			Average = exposureAverages!.Average(d => d.Value),
			Granularity = isHourly ? "hour" : "day",
			Points = exposureAverages,
		};
	}

	public async Task<IEnumerable<SampleDto>> GetOverviewAggregateDataAsync(
		DateTime startTime,
		DateTime endTime,
		string? dustField
	)
	{
		// PM1 TWA unless another fraction is asked for. Checked before the loop, so an unsupported field is rejected even
		// when the user has no groups.
		var field = dustField ?? "pm1_twa";
		GetCorrectDustValue(field);

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
				field
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
					WorkerCount = s.SampleCount,
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
