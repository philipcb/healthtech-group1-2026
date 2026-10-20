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
			Console.WriteLine(
				$"Sample {s.LocationQualifier}-({s.JobQualifier}) : {s.Id} with {s.SampleCount} users "
			);
			List<User>? sampleUsers = await _fetchHandler.getUsersBySample(s);
			await updateDustDataAsync(s.Id, sampleUsers!, now);
			await updateVibrationDataAsync(s.Id, sampleUsers!, now);
			await updateNoiseDataAsync(s.Id, sampleUsers!, now);
		}
	}

	public async Task updateVibrationDataAsync(Guid sampleId, List<User> users, DateTime endTime)
	{
		DateTime lowestTime = await _aggregatedContext
			.VibrationAverages.OrderByDescending(d => d.Time)
			.Where(d => d.SampleId == sampleId)
			.Select(d => d.Time)
			.FirstOrDefaultAsync();
		DateTime startTime = lowestTime.Date.AddDays(1).ToUniversalTime();

		var (dataList, aboveThresholdDataList) =
			await _fetchHandler.fetchAggregatedDataOverSampleUsers(
				users,
				startTime,
				endTime,
				ExposureType.Vibration,
				null
			);

		Console.WriteLine($"Update Vibration averages from {startTime} to {endTime}");
		List<VibrationAverage> finalAggregatedData = dataList
			.Select(d => new VibrationAverage
			{
				SampleId = sampleId,
				Time = d.Time,
				AverageExposure = d.AvgValue,
			})
			.ToList();

		List<AveragePer8HourShift> finalAggregatedDataRate = aboveThresholdDataList
			.Select(d => new AveragePer8HourShift
			{
				SampleId = sampleId,
				Time = d.Time,
				ExposureType = ExposureType.Vibration,
				AverageTimeInSafeLimits = 1 - d.WarningRate - d.DangerRate,
				AverageTimeOverLimit = d.WarningRate,
				AverageTimeOverAction = d.DangerRate,
			})
			.ToList();

		await _insertHandler.addDataRange(finalAggregatedData);
		await _insertHandler.addDataRange(finalAggregatedDataRate);
		Console.WriteLine("Done");
	}

	public async Task updateNoiseDataAsync(Guid sampleId, List<User> users, DateTime endTime)
	{
		DateTime lowestTime = await _aggregatedContext
			.NoiseAverages.OrderByDescending(d => d.Time)
			.Where(d => d.SampleId == sampleId)
			.Select(d => d.Time)
			.FirstOrDefaultAsync();
		DateTime startTime = lowestTime.AddHours(1).ToUniversalTime();
		Console.WriteLine($"Update Noise averages from {startTime} to {endTime}");

		var (dataList, aboveThresholdDataList) =
			await _fetchHandler.fetchAggregatedDataOverSampleUsers(
				users,
				startTime,
				endTime,
				ExposureType.Noise,
				null
			);
		List<NoiseAverage> finalAggregatedData = dataList
			.Select(d => new NoiseAverage
			{
				SampleId = sampleId,
				Time = d.Time,
				AverageLcpk = d.AvgValue,
				AverageLaeq = (double)d.PeakValue!,
			})
			.ToList();

		List<AveragePer8HourShift> finalAggregatedDataRate = aboveThresholdDataList
			.Select(d => new AveragePer8HourShift
			{
				SampleId = sampleId,
				Time = d.Time,
				ExposureType = ExposureType.Noise,
				AverageTimeInSafeLimits = 1 - d.WarningRate - d.DangerRate,
				AverageTimeOverLimit = d.WarningRate,
				AverageTimeOverAction = d.DangerRate,
			})
			.ToList();

		await _insertHandler.addDataRange(finalAggregatedData);
		await _insertHandler.addDataRange(finalAggregatedDataRate);
		Console.WriteLine("Done");
	}

	public async Task updateDustDataAsync(Guid sampleId, List<User> users, DateTime endTime)
	{
		DateTime lowestTime = await _aggregatedContext
			.DustAverages.OrderByDescending(d => d.Time)
			.Where(d => d.SampleId == sampleId)
			.Select(d => d.Time)
			.FirstOrDefaultAsync();
		DateTime startTime = lowestTime.AddHours(1).ToUniversalTime();
		Console.WriteLine($"Update Dust averages from {startTime} to {endTime}");

		var (dataListPm1Stel, _) = await _fetchHandler.fetchAggregatedDataOverSampleUsers(
			users,
			startTime,
			endTime,
			ExposureType.Dust,
			Backend.DTOs.Field.Pm1_stel
		);
		var Pm1StelDico = dataListPm1Stel.ToDictionary(g => g.Time, g => g.AvgValue);

		var (dataListPm25Stel, _) = await _fetchHandler.fetchAggregatedDataOverSampleUsers(
			users,
			startTime,
			endTime,
			ExposureType.Dust,
			Backend.DTOs.Field.Pm25_stel
		);
		var Pm25StelDico = dataListPm25Stel.ToDictionary(g => g.Time, g => g.AvgValue);
		var (dataListPm4Stel, _) = await _fetchHandler.fetchAggregatedDataOverSampleUsers(
			users,
			startTime,
			endTime,
			ExposureType.Dust,
			Backend.DTOs.Field.Pm4_stel
		);
		var Pm4StelDico = dataListPm4Stel.ToDictionary(g => g.Time, g => g.AvgValue);
		var (dataListPm10Stel, _) = await _fetchHandler.fetchAggregatedDataOverSampleUsers(
			users,
			startTime,
			endTime,
			ExposureType.Dust,
			Backend.DTOs.Field.Pm10_stel
		);
		var Pm10StelDico = dataListPm10Stel.ToDictionary(g => g.Time, g => g.AvgValue);
		var (dataListPm1Twa, aboveThresholdDataListPm1Twa) =
			await _fetchHandler.fetchAggregatedDataOverSampleUsers(
				users,
				startTime,
				endTime,
				ExposureType.Dust,
				Backend.DTOs.Field.Pm1_twa
			);
		var Pm1TwaDico = dataListPm1Twa.ToDictionary(g => g.Time, g => g.AvgValue);
		var (dataListPm25Twa, _) = await _fetchHandler.fetchAggregatedDataOverSampleUsers(
			users,
			startTime,
			endTime,
			ExposureType.Dust,
			Backend.DTOs.Field.Pm25_twa
		);
		var Pm25TwaDico = dataListPm25Twa.ToDictionary(g => g.Time, g => g.AvgValue);
		var (dataListPm4Twa, _) = await _fetchHandler.fetchAggregatedDataOverSampleUsers(
			users,
			startTime,
			endTime,
			ExposureType.Dust,
			Backend.DTOs.Field.Pm4_twa
		);
		var Pm4TwaDico = dataListPm4Twa.ToDictionary(g => g.Time, g => g.AvgValue);
		var (dataListPm10Twa, _) = await _fetchHandler.fetchAggregatedDataOverSampleUsers(
			users,
			startTime,
			endTime,
			ExposureType.Dust,
			Backend.DTOs.Field.Pm10_twa
		);
		var Pm10TwaDico = dataListPm10Twa.ToDictionary(g => g.Time, g => g.AvgValue);

		List<AveragePer8HourShift> finalAggregatedDataRate = aboveThresholdDataListPm1Twa
			.Select(d => new AveragePer8HourShift
			{
				SampleId = sampleId,
				Time = d.Time,
				ExposureType = ExposureType.Dust,
				AverageTimeInSafeLimits = 1 - d.WarningRate - d.DangerRate,
				AverageTimeOverLimit = d.WarningRate,
				AverageTimeOverAction = d.DangerRate,
			})
			.ToList();

		var dates = dataListPm1Stel
			.Select(d => d.Time)
			.Union(dataListPm25Stel.Select(d => d.Time))
			.Union(dataListPm4Stel.Select(d => d.Time))
			.Union(dataListPm10Stel.Select(d => d.Time))
			.Union(dataListPm1Twa.Select(d => d.Time))
			.Union(dataListPm25Twa.Select(d => d.Time))
			.Union(dataListPm4Twa.Select(d => d.Time))
			.Union(dataListPm10Twa.Select(d => d.Time))
			.Distinct()
			.OrderBy(x => x)
			.ToList();

		List<DustAverage> finalAggregatedData = new List<DustAverage>();
		foreach (DateTime date in dates)
		{
			finalAggregatedData.Add(
				new DustAverage
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
				}
			);
		}

		await _insertHandler.addDataRange(finalAggregatedData);
		await _insertHandler.addDataRange(finalAggregatedDataRate);
		Console.WriteLine("Done");
	}

	public async Task<Sample?> createSample(
		String Site,
		Guid? LocationQualifier,
		String? JobQualifier,
		List<Location> allLocations,
		List<string?> allJobs
	)
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
				LocationName =
					LocationQualifier != null
						? allLocations.FirstOrDefault(l => l.Id == LocationQualifier)?.Building
						: null,
				JobQualifier = JobQualifier,
			};
			return newSample;
		}
		return null;
	}

	const String notSpecifiedKey = "NotSpecified";
	Guid notSpecifiedGuid = new Guid("00000000-0000-0000-0000-000000000000");

	//Note : right now, this method doesn't remove sample if users have been deleted, but in a final product, it should probably
	//or at least make the sample depend on time, so you could keep previous valid value while not having currently a particular sample that is valid
	public async Task updateSamples()
	{
		List<Location> allLocations = (await _fetchHandler.getAllLocations()).Distinct().ToList();
		List<string> allSites = allLocations.Select(l => l.Site).Distinct().ToList();
		List<string?> allJobs = (await _fetchHandler.getAllJobs()).Distinct().ToList();

		//It is possible to select no jobs
		allJobs.Add(null);
		allJobs.Distinct();
		List<Sample> currentSamples = await _aggregatedContext.Samples.ToListAsync();
		Dictionary<Guid, HashSet<string>> existingSamples = new Dictionary<Guid, HashSet<string>>();

		//fill dico in a way to be able to detect every combinaison of jobs and locations already in db
		foreach (Sample s in currentSamples)
		{
			Guid locationKey = s.LocationQualifier ?? notSpecifiedGuid;
			string jobKey = s.JobQualifier ?? notSpecifiedKey;
			if (!existingSamples.ContainsKey(locationKey))
			{
				existingSamples.Add(locationKey, new HashSet<string>());
			}
			existingSamples[locationKey].Add(jobKey);
		}

		List<Sample> allSamples = [];
		foreach (Location location in allLocations)
		{
			foreach (string? job in allJobs)
			{
				Guid locationKey = location.Id;
				string? JobKey = job ?? notSpecifiedKey;
				//If this combinaison of location and job isn't already in db
				if (
					!existingSamples.ContainsKey(locationKey)
					|| (
						existingSamples.ContainsKey(locationKey)
						&& !existingSamples[locationKey].Contains(JobKey)
					)
				)
				{
					//Here, job can be null, which is intended
					Sample? potentialSample = await createSample(
						location.Site,
						locationKey,
						job,
						allLocations,
						allJobs
					);
					if (potentialSample != null)
					{
						allSamples.Add(potentialSample);
					}
				}
			}
		}
		//If location isn't specified, we still have samples for jobs on different site
		foreach (string site in allSites)
		{
			foreach (string? job in allJobs)
			{
				Guid locationKey = notSpecifiedGuid;
				string? JobKey = job ?? notSpecifiedKey;
				//If this combinaison of location and job isn't already in db
				if (
					!existingSamples.ContainsKey(locationKey)
					|| (
						existingSamples.ContainsKey(locationKey)
						&& !existingSamples[locationKey].Contains(JobKey)
					)
				)
				{
					Sample? potentialSample = await createSample(
						site,
						null,
						job,
						allLocations,
						allJobs
					);
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
