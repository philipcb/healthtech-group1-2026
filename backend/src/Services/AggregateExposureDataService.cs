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

	Task<double?> GetWholeAverage
	(
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

public class AggregateExposureDataService(AggregateDbContext context, SignedInUserContext signedInUserContext)
	: IAggregateExposureDataService
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


	private double? GetCorrectDustValue(DustAverage data, string field)
	{
		switch (field)
		{
			case "pm1_twa":
				return data.AveragePm1Twa;
			case "pm25_twa":
				return data.AveragePm25Twa;
			case "pm10_twa":
				return data.AveragePm10Twa;
		}
		return null;
	}


	//function to get the average of averages of each user of a given time period and a given exposure type
	public async Task<double?> GetWholeAverage
	(
		DateTime startTime,
		DateTime endTime,
		Guid? sampleId,
		ExposureType exposureType,
		string? field
	)
	{
		switch (exposureType){
			case ExposureType.Dust:
				return _context.DustAverages.Where(d => d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime)
				.GroupBy(d => d.Time.Date)
				.Select(g => new TrendPointDto{Time = g.Key, Value = g.Average(d => GetCorrectDustValue(d, field!))})
				.Average(d => d.Value);
			case ExposureType.Noise:
				return _context.NoiseAverages.Where(d => d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime)
				.GroupBy(d => d.Time.Date)
				.Select(g => new TrendPointDto{Time = g.Key, Value = g.Average(d => d.AverageLaeq)})
				.Average(d => d.Value);
			case ExposureType.Vibration:
				return _context.VibrationAverages.Where(d => d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime)
				.GroupBy(d => d.Time.Date)
				.Select(g => new TrendPointDto{Time = g.Key, Value = g.Average(d => d.AverageExposure)})
				.Average(d => d.Value);
			default :
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
		var sample = await _context.Samples.Where(s => s.Id == sampleId && s.Site.Equals(_signedInUserContext.User.Location.Site)).FirstOrDefaultAsync();
		if (sample == null)
		{
			return new AggregatedTrendResponseDto
			{
				Status = "unavailable",
				Reason = "noSuchGroup"
			};
		}
		String? building = sample.LocationQualifier;
		String? occupation = sample.JobQualifier;
		String? unit;
		List<TrendPointDto>? exposureAverages;
		switch (exposureType){
			case ExposureType.Dust:
				unit = "ug";
				exposureAverages = await _context.DustAverages.Where(d => d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime)
				.GroupBy(d => d.Time.Date)
				.Select(g => new TrendPointDto{Time = g.Key, Value = g.Average(d => GetCorrectDustValue(d, field!))})
				.OrderBy(d => d.Time).ToListAsync();
				break;
			case ExposureType.Noise:
				unit = "db";
				exposureAverages = await _context.NoiseAverages.Where(d => d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime)
				.GroupBy(d => d.Time.Date)
				.Select(g => new TrendPointDto{Time = g.Key, Value = g.Average(d => d.AverageLaeq)})
				.OrderBy(d => d.Time).ToListAsync();
				break;
			case ExposureType.Vibration:
				unit = "points";
				exposureAverages = await _context.VibrationAverages.Where(d => d.Sample.Id == sampleId && startTime <= d.Time && d.Time < endTime)
				.GroupBy(d => d.Time.Date)
				.Select(g => new TrendPointDto{Time = g.Key, Value = g.Average(d => d.AverageExposure)})
				.OrderBy(d => d.Time).ToListAsync();
				break;
			default :
				unit = null;
				exposureAverages = null;
				break;
		}
		if (exposureAverages.IsNullOrEmpty())
		{
			return new AggregatedTrendResponseDto
			{
				Status = "unavailable",
				Reason = "noSuchGroup"
			};
		}
		return new AggregatedTrendResponseDto
		{
			Status = "ok",
			Group = new TrendSampleDto
			{
				Hall = building,
				Occupation = occupation
			},
			Unit = unit,
			Average = exposureAverages!.Average(d => d.Value),
			Granularity = "day",
			Points = exposureAverages
		};
	}

	public async Task<IEnumerable<SampleDto>> GetOverviewAggregateDataAsync(
		DateTime startTime, 
		DateTime endTime
		)
	{
		var allSamples = await _context.Samples.Where(s => s.Site.Equals(_signedInUserContext.User.Location.Site)).ToListAsync();
		List<SampleDto> overviewList = new();
		foreach (Sample s in allSamples)
		{
			var averageDustValues = await GetWholeAverage(startTime, endTime, s.Id, ExposureType.Dust, "pm1_twa");
			var averageNoiseValues = await GetWholeAverage(startTime, endTime, s.Id, ExposureType.Noise, null);
			var averageVibrationValues = await GetWholeAverage(startTime, endTime, s.Id, ExposureType.Vibration, null);
			overviewList.Add(new SampleDto
			{
				GroupId = s.Id,
				Hall = s.LocationQualifier,
				Occupation = s.JobQualifier,
				Averages = new SampleAveragesDto
				{
					Dust = averageDustValues,
					Noise = averageNoiseValues,
					Vibration = averageVibrationValues
				}
			});
		}
		return overviewList;
	}
}
