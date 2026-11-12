using System.Diagnostics;
using System.Runtime.CompilerServices;
using Backend;
using Backend.DTOs;
using Backend.Models;
using Backend.Utils;
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

	/// <summary>
	/// Method that updates every table of the aggregate database in one transaction
	/// </summary>
	public async Task updateAggregatedDB()
	{
		// One transaction, so the rows removed to be computed again are kept if the update fails
		await using var transaction = await _aggregatedContext.Database.BeginTransactionAsync();
		await updateSamples();
		await _aggregatedContext.SaveChangesAsync();
		await updateAggregatedDataAsync();
		await _aggregatedContext.SaveChangesAsync();
		await transaction.CommitAsync();
	}

	// The job can run during a day, so the last stored day may be incomplete. It's computed again from its start at
	// midnight in Oslo, instead of continuing after its last hour, which would leave the day's daily values incomplete or
	// insert them twice. Without stored rows, it starts from the beginning.
	public static DateTime GetRestartTime(DateTime lastStoredTime) =>
		lastStoredTime == default
			? DateTime.SpecifyKind(default, DateTimeKind.Utc)
			: TimeWindowUtils.StartOfOsloDay(lastStoredTime);

	private async Task<DateTime> restartLastStoredDay(
		Guid sampleId,
		ExposureType exposureType,
		DateTime lastStoredTime
	)
	{
		DateTime startTime = GetRestartTime(lastStoredTime);
		await _insertHandler.removeDataFrom(sampleId, exposureType, startTime);
		return startTime;
	}

	/// <summary>
	/// Method that updates every exposure aggregates in the database
	/// </summary>
	public async Task updateAggregatedDataAsync()
	{
		DateTime now = DateTime.UtcNow;
		List<Sample> samples = await _aggregatedContext.Samples.ToListAsync();
		//For each valid groups
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

	/// <summary>
	/// Method that builds an <c> AveragePer8HourShift </c> from differents parameters
	/// </summary>
	/// <param name="sampleId">The corresponding sample Id.</param>
	/// <param name="exposureType"> the exposure type of the <c> AveragePer8HourShift </c> </param>
	/// <param name="field"> the field of the exposureType (<code>null</code> if not dust) </param>
	/// <param name="rate"> The averages rates of hours above action value/limit </param>
	/// <param name="dailyRate"> The averages rates of days above action value/limit </param>
	public static AveragePer8HourShift ToShiftAverage(
		Guid sampleId,
		ExposureType exposureType,
		string? field,
		AboveThresholdRate rate,
		DailyWorkerRate dailyRate
	) =>
		// Warning and danger are shares of the same data points that never overlap (see `AboveThresholdRate`). Over the
		// limit means danger only, over the action value means warning or danger, since the limit is above the action value.
		new()
		{
			SampleId = sampleId,
			Time = rate.Time,
			ExposureType = exposureType,
			HourCount = rate.UnitCount,
			DayCount = dailyRate.UnitCount,
			DailyRateOfWorkerOverAction = dailyRate.OverActionRate,
			DailyRateOfWorkerOverLimit = dailyRate.OverLimitRate,
			AverageTimeInSafeLimits = 1 - rate.WarningRate - rate.DangerRate,
			AverageTimeOverLimit = rate.DangerRate,
			AverageTimeOverAction = rate.WarningRate + rate.DangerRate,
			Field = field ?? "not specified",
		};

	/// <summary>
	/// Method that updates all Vibration Exposure Averages from valid Samples
	/// </summary>
	public async Task updateVibrationDataAsync(Guid sampleId, List<User> users, DateTime endTime)
	{
		DateTime lowestTime = await _aggregatedContext
			.VibrationAverages.OrderByDescending(d => d.Time)
			.Where(d => d.SampleId == sampleId)
			.Select(d => d.Time)
			.FirstOrDefaultAsync();
		DateTime startTime = await restartLastStoredDay(
			sampleId,
			ExposureType.Vibration,
			lowestTime
		);

		var (dataList, aboveThresholdDataList, dailyWorkerThresholds) =
			await _fetchHandler.fetchAggregatedDataOverSampleUsers(
				users,
				startTime,
				endTime,
				ExposureType.Vibration,
				null
			);

		Console.WriteLine($"Update Vibration averages from {startTime} to {endTime}");
		// One row per day: the average over the workers of their daily total of vibration points
		List<VibrationAverage> finalAggregatedData = dataList
			.Select(d => new VibrationAverage
			{
				SampleId = sampleId,
				Time = d.Time,
				AverageExposure = d.AvgValue,
			})
			.ToList();

		//Create all the AveragePer8HourShift from aboveThresholdDataList and dailyWorkerThresholds
		List<AveragePer8HourShift> finalAggregatedDataRate = aboveThresholdDataList
			.Join(
				dailyWorkerThresholds,
				threshold => threshold.Time,
				daysAbove => daysAbove.Time,
				(threshold, daysAbove) =>
					ToShiftAverage(sampleId, ExposureType.Vibration, null, threshold, daysAbove)
			)
			.ToList();

		await _insertHandler.addDataRange(finalAggregatedData);
		await _insertHandler.addDataRange(finalAggregatedDataRate);
		Console.WriteLine("Done");
	}

	/// <summary>
	/// Method that updates all Noise Exposure Averages from valid Samples
	/// </summary>
	public async Task updateNoiseDataAsync(Guid sampleId, List<User> users, DateTime endTime)
	{
		DateTime lowestTime = await _aggregatedContext
			.NoiseAverages.OrderByDescending(d => d.Time)
			.Where(d => d.SampleId == sampleId)
			.Select(d => d.Time)
			.FirstOrDefaultAsync();
		DateTime startTime = await restartLastStoredDay(sampleId, ExposureType.Noise, lowestTime);
		Console.WriteLine($"Update Noise averages from {startTime} to {endTime}");

		var (dataList, aboveThresholdDataList, dailyWorkerThresholds) =
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
				AverageLaeq = d.AvgValue,
				AverageLcpk = (double)d.PeakValue!,
			})
			.ToList();

		//Create all the AveragePer8HourShift from aboveThresholdDataList and dailyWorkerThresholds
		List<AveragePer8HourShift> finalAggregatedDataRate = aboveThresholdDataList
			.Join(
				dailyWorkerThresholds,
				threshold => threshold.Time,
				daysAbove => daysAbove.Time,
				(threshold, daysAbove) =>
					ToShiftAverage(sampleId, ExposureType.Noise, null, threshold, daysAbove)
			)
			.ToList();

		await _insertHandler.addDataRange(finalAggregatedData);
		await _insertHandler.addDataRange(finalAggregatedDataRate);
		Console.WriteLine("Done");
	}

	/// <summary>
	/// Method that updates all Dust Exposure Averages from valid Samples
	/// </summary>
	public async Task updateDustDataAsync(Guid sampleId, List<User> users, DateTime endTime)
	{
		DateTime lowestTime = await _aggregatedContext
			.DustAverages.OrderByDescending(d => d.Time)
			.Where(d => d.SampleId == sampleId)
			.Select(d => d.Time)
			.FirstOrDefaultAsync();
		DateTime startTime = await restartLastStoredDay(sampleId, ExposureType.Dust, lowestTime);
		Console.WriteLine($"Update Dust averages from {startTime} to {endTime}");

		var dustDataDico = new Dictionary<Field, Dictionary<DateTime, double>>();
		var aboveThresholdDataDico =
			new Dictionary<Field, Dictionary<DateTime, AveragePer8HourShift>>();

		//It has to be done for each field of dust
		foreach (Field field in Enum.GetValues<Field>())
		{
			var (dataList, thresholds, dailyWorkerThresholds) =
				await _fetchHandler.fetchAggregatedDataOverSampleUsers(
					users,
					startTime,
					endTime,
					ExposureType.Dust,
					field
				);
			dustDataDico[field] = dataList.ToDictionary(g => g.Time, g => g.AvgValue);
			//Create all the AveragePer8HourShift from aboveThresholdDataList and dailyWorkerThresholds, for every fields
			aboveThresholdDataDico[field] = thresholds
				.Join(
					dailyWorkerThresholds,
					threshold => threshold.Time,
					daysAbove => daysAbove.Time,
					(threshold, daysAbove) =>
						ToShiftAverage(
							sampleId,
							ExposureType.Dust,
							field.ToString(),
							threshold,
							daysAbove
						)
				)
				.ToDictionary(g => g.Time, g => g);
		}

		//Get all the hours with data
		var hourlyDates = new List<DateTime>();
		foreach (var element in dustDataDico)
		{
			hourlyDates = hourlyDates.Union(element.Value.Keys).ToList();
		}
		hourlyDates = hourlyDates.Distinct().OrderBy(x => x).ToList();

		//Get all the day with data
		var dailyDates = new List<DateTime>();
		foreach (var element in aboveThresholdDataDico)
		{
			dailyDates = dailyDates.Union(element.Value.Keys).ToList();
		}
		dailyDates = dailyDates.Distinct().OrderBy(x => x).ToList();

		List<DustAverage> finalAggregatedData = new List<DustAverage>();
		List<AveragePer8HourShift> finalAggregatedDataRate = new List<AveragePer8HourShift>();
		//Create a DustAverage for every hours
		foreach (DateTime date in hourlyDates)
		{
			finalAggregatedData.Add(
				new DustAverage
				{
					SampleId = sampleId,
					Time = date,
					AveragePm1Stel = dustDataDico[Field.Pm1_stel][date],
					AveragePm25Stel = dustDataDico[Field.Pm25_stel][date],
					AveragePm4Stel = dustDataDico[Field.Pm4_stel][date],
					AveragePm10Stel = dustDataDico[Field.Pm10_stel][date],
					AveragePm1Twa = dustDataDico[Field.Pm1_twa][date],
					AveragePm25Twa = dustDataDico[Field.Pm25_twa][date],
					AveragePm4Twa = dustDataDico[Field.Pm4_twa][date],
					AveragePm10Twa = dustDataDico[Field.Pm10_twa][date],
				}
			);
		}
		//add every AveragePer8HourShift to list
		foreach (DateTime date in dailyDates)
		{
			foreach (Field field in Enum.GetValues<Field>())
			{
				finalAggregatedDataRate.Add(aboveThresholdDataDico[field][date]);
			}
		}

		await _insertHandler.addDataRange(finalAggregatedData);
		await _insertHandler.addDataRange(finalAggregatedDataRate);
		Console.WriteLine("Done");
	}

	/// <summary>
	/// Method that creates a <c> Sample </c> from different parameters. If the sample have less that 5 users, the method returns <code> null </cool>
	/// </summary>
	public async Task<Sample?> createSample(
		String Site,
		Guid? LocationQualifier,
		String? JobQualifier,
		List<Location> allLocations,
		List<string?> allJobs
	)
	{
		//getUserBySiteAndQualifiers returns null if the number of valid user is below 5
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

	/// <summary>
	/// Method that updates the sample table to add any new valid sample to the table.
	/// </summary>
	public async Task updateSamples()
	{
		//Note : right now, this method doesn't remove sample if users have been deleted, but in a final product, it should probably
		//or at least make the sample depend on time, so you could keep previous valid value while not having currently a particular sample that is valid
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
				//If this combinaison of location and job isn't already in db, we create it
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
				//If this combinaison of location and job isn't already in db, we create it
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
