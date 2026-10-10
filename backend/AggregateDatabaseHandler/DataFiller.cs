using System.Diagnostics;
using System.Runtime.CompilerServices;
using Backend;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

public class DataFiller
{
	private readonly AppDbContext _context;
	private readonly AggregateDbContext _aggregatedContext;

	private readonly DataFetchHandler _fetchHandler;
	private readonly DataInsertHandler _insertHandler;

	public DataFiller(AppDbContext context, AggregateDbContext aggregatedContext)
	{
		_context = context;
		_aggregatedContext = aggregatedContext;
		_fetchHandler = new DataFetchHandler(_context);
		_insertHandler = new DataInsertHandler(_aggregatedContext);
	}

	public async Task updateAggregatedDB()
	{
		await updateSamples();
		await _aggregatedContext.SaveChangesAsync();
		await updateAggregatedDataAsync();
		await _aggregatedContext.SaveChangesAsync();
	}


	public async Task updateAggregatedDataAsync()
	{
		DateTime now = DateTime.UtcNow;
		List<Sample> samples = await _aggregatedContext.Samples.ToListAsync();
		foreach (Sample s in samples)
		{
			Console.WriteLine($"Sample {s.LocationQualifier}-({s.JobQualifier}) : {s.Id} with {s.SampleCount} users ");
			List<User>? sampleUsers = await _fetchHandler.getUsersBySample(s);
			await updateDustDataAsync(s.Id, sampleUsers!, now);
			await updateVibrationDataAsync(s.Id, sampleUsers!, now);
			await updateNoiseDataAsync(s.Id, sampleUsers!, now);
		}
	}

	public async Task updateVibrationDataAsync(Guid sampleId, List<User> users, DateTime endTime)
	{
		DateTime lowestTime = await _aggregatedContext.VibrationAverages.OrderByDescending(d => d.Time).Where(d => d.SampleId == sampleId).Select(d => d.Time).FirstOrDefaultAsync();
		DateTime startTime = lowestTime.AddHours(1).ToUniversalTime();
		List<TimedData> aggregatedData = await _fetchHandler.fetchAggregatedDataOverSampleUsers(users, startTime, endTime, ExposureType.Vibration, null);
		Console.WriteLine($"Update Vibration averages from {startTime} to {endTime}");
		List<VibrationAverage> finalAggregatedData = aggregatedData.Select(d => new VibrationAverage{
			SampleId = sampleId,
			Time = d.Time,
			AverageExposure = d.AvgValue
		}).ToList();
		await _insertHandler.addDataRange(finalAggregatedData);
		Console.WriteLine("Done");
	}

	public async Task updateNoiseDataAsync(Guid sampleId, List<User> users, DateTime endTime)
	{
		DateTime lowestTime = await _aggregatedContext.NoiseAverages.OrderByDescending(d => d.Time).Where(d => d.SampleId == sampleId).Select(d => d.Time).FirstOrDefaultAsync();
		DateTime startTime = lowestTime.AddHours(1).ToUniversalTime();
		Console.WriteLine($"Update Noise averages from {startTime} to {endTime}");
		List<TimedData> aggregatedData = await _fetchHandler.fetchAggregatedDataOverSampleUsers(users, startTime, endTime, ExposureType.Noise, null);
		List<NoiseAverage> finalAggregatedData = aggregatedData.Select(d => new NoiseAverage{
			SampleId = sampleId,
			Time = d.Time,
			AverageLcpk = d.AvgValue,
			AverageLaeq = (double)d.PeakValue!
		}).ToList();
		await _insertHandler.addDataRange(finalAggregatedData);
		Console.WriteLine("Done");
	}

	public async Task updateDustDataAsync(Guid sampleId, List<User> users, DateTime endTime)
	{
		DateTime lowestTime = await _aggregatedContext.DustAverages.OrderByDescending(d => d.Time).Where(d => d.SampleId == sampleId).Select(d => d.Time).FirstOrDefaultAsync();
		DateTime startTime = lowestTime.AddHours(1).ToUniversalTime();
		Console.WriteLine($"Update Dust averages from {startTime} to {endTime}");
		List<TimedData> aggregatedDataPm1Stel = await _fetchHandler.fetchAggregatedDataOverSampleUsers(users, startTime, endTime, ExposureType.Dust, Backend.DTOs.Field.Pm1_stel);
		var Pm1StelDico = aggregatedDataPm1Stel.ToDictionary(g => g.Time, g => g.AvgValue);
		List<TimedData> aggregatedDataPm25Stel = await _fetchHandler.fetchAggregatedDataOverSampleUsers(users, startTime, endTime, ExposureType.Dust, Backend.DTOs.Field.Pm25_stel);
		var Pm25StelDico = aggregatedDataPm25Stel.ToDictionary(g => g.Time, g => g.AvgValue);
		List<TimedData> aggregatedDataPm4Stel = await _fetchHandler.fetchAggregatedDataOverSampleUsers(users, startTime, endTime, ExposureType.Dust, Backend.DTOs.Field.Pm4_stel);
		var Pm4StelDico = aggregatedDataPm4Stel.ToDictionary(g => g.Time, g => g.AvgValue);
		List<TimedData> aggregatedDataPm10Stel = await _fetchHandler.fetchAggregatedDataOverSampleUsers(users, startTime, endTime, ExposureType.Dust, Backend.DTOs.Field.Pm10_stel);
		var Pm10StelDico = aggregatedDataPm10Stel.ToDictionary(g => g.Time, g => g.AvgValue);
		List<TimedData> aggregatedDataPm1Twa = await _fetchHandler.fetchAggregatedDataOverSampleUsers(users, startTime, endTime, ExposureType.Dust, Backend.DTOs.Field.Pm1_twa);
		var Pm1TwaDico = aggregatedDataPm1Twa.ToDictionary(g => g.Time, g => g.AvgValue);
		List<TimedData> aggregatedDataPm25Twa = await _fetchHandler.fetchAggregatedDataOverSampleUsers(users, startTime, endTime, ExposureType.Dust, Backend.DTOs.Field.Pm25_twa);
		var Pm25TwaDico = aggregatedDataPm25Twa.ToDictionary(g => g.Time, g => g.AvgValue);
		List<TimedData> aggregatedDataPm4Twa = await _fetchHandler.fetchAggregatedDataOverSampleUsers(users, startTime, endTime, ExposureType.Dust, Backend.DTOs.Field.Pm4_twa);
		var Pm4TwaDico = aggregatedDataPm4Twa.ToDictionary(g => g.Time, g => g.AvgValue);
		List<TimedData> aggregatedDataPm10Twa = await _fetchHandler.fetchAggregatedDataOverSampleUsers(users, startTime, endTime, ExposureType.Dust, Backend.DTOs.Field.Pm10_twa);
		var Pm10TwaDico = aggregatedDataPm10Twa.ToDictionary(g => g.Time, g => g.AvgValue);
		

		var dates = aggregatedDataPm1Stel.Select(d => d.Time)
					.Union(aggregatedDataPm25Stel.Select(d => d.Time))
					.Union(aggregatedDataPm4Stel.Select(d => d.Time))
					.Union(aggregatedDataPm10Stel.Select(d => d.Time))
					.Union(aggregatedDataPm1Twa.Select(d => d.Time))
					.Union(aggregatedDataPm25Twa.Select(d => d.Time))
					.Union(aggregatedDataPm4Twa.Select(d => d.Time))
					.Union(aggregatedDataPm10Twa.Select(d => d.Time))
					.Distinct().OrderBy(x => x).ToList();
		


		List<DustAverage> finalAggregatedData = new List<DustAverage>();
		foreach (DateTime date in dates)
		{
			finalAggregatedData.Add(new DustAverage
			{
				SampleId = sampleId,
				Time = date,
				AveragePm1Stel = Pm1StelDico[date],
				AveragePm25Stel = Pm25StelDico[date],
				AveragePm4Stel = Pm4StelDico[date],
				AveragePm10Stel = Pm10StelDico[date],
				AveragePm1Twa = Pm1TwaDico[date],
				AveragePm25Twa = Pm25TwaDico[date],
				AveragePm4Twa = Pm4TwaDico[date],
				AveragePm10Twa = Pm10TwaDico[date],
			});
		} 
		
		await _insertHandler.addDataRange(finalAggregatedData);
		Console.WriteLine("Done");
	}



	public async Task<Sample?> createSample(String Site , String? LocationQualifier, String? JobQualifier)
	{
		List<User>? sampleUsers = await _fetchHandler.getUserBySiteAndQualifiers(
			Site,
			LocationQualifier,
			JobQualifier
		);
		if (!sampleUsers.IsNullOrEmpty())
		{
			Sample newSample = new Sample
			{
				Id = Guid.NewGuid(),
				SampleCount = sampleUsers!.Count,
				Site = Site,
				LocationQualifier = LocationQualifier,
				JobQualifier = JobQualifier,
			};
			return newSample;
		}
		return null;
	}

	const String notSpecifiedKey = "NotSpecified";

	public async Task updateSamples()
	{
		List<Location> allLocations = (await _fetchHandler.getAllLocations()).Distinct().ToList();
		List<String> allSites = allLocations.Select(l => l.Site).Distinct().ToList();
		List<String?> allJobs = (await _fetchHandler.getAllJobs()).Distinct().ToList();
		
		//It is possible to select no jobs
		allJobs.Add(null);
		allJobs.Distinct();
		List<Sample> currentSamples = await _aggregatedContext.Samples.ToListAsync();
		Dictionary<String, HashSet<String>> existingSamples = new Dictionary<String, HashSet<string>>();
		//fill dico in a way to be able to detect every combinaison of jobs and locations already in db
		foreach (Sample s in currentSamples)
		{
			String locationKey = s.LocationQualifier ?? notSpecifiedKey;
			String jobKey = s.JobQualifier ?? notSpecifiedKey;
			if (!existingSamples.ContainsKey(locationKey))
			{
				existingSamples.Add(locationKey, new HashSet<string>());
			}
			existingSamples[locationKey].Add(jobKey);
		}

		List<Sample> allSamples = [];
		foreach (Location location in allLocations)
		{
			foreach (String? job in allJobs)
			{
				String locationKey = location.Id.ToString();
				String? JobKey = job ?? notSpecifiedKey;
				//If this combinaison of location and job isn't already in db
				if (!existingSamples.ContainsKey(locationKey) || (existingSamples.ContainsKey(locationKey) && !existingSamples[locationKey].Contains(JobKey)))
				{
					Sample? potentialSample = await createSample(location.Site, locationKey, job);
					if (potentialSample != null)
					{
						allSamples.Add(potentialSample);
					}				
				}
			}
		}
		//If location isn't specified, we still have samples for jobs on different site
		foreach (String site in allSites)
		{
			foreach (String? job in allJobs)
			{
				String locationKey = notSpecifiedKey;
				String? JobKey = job ?? notSpecifiedKey;
				//If this combinaison of location and job isn't already in db
				if (!existingSamples.ContainsKey(locationKey) || (existingSamples.ContainsKey(locationKey) && !existingSamples[locationKey].Contains(JobKey)))
				{
					Sample? potentialSample = await createSample(site, null, job);
					if (potentialSample != null)
					{
						allSamples.Add(potentialSample);
					}				
				}
			}
		}

		await _insertHandler.addSamples(allSamples);
	}

}
