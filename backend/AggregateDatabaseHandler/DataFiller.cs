using System.Runtime.CompilerServices;
using Backend;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
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

	public async Task initAggregatedData()
	{
		await updateSamples();
		await _aggregatedContext.SaveChangesAsync();
	}

	public async Task updateAggregatedData()
	{
		await updateSamples();
		await _aggregatedContext.SaveChangesAsync();
	}

	public async Task updateSamples()
	{
		await updateLocationSamples();
		await updateJobSamples();
		await updateShiftSamples();

		DateTime now = DateTime.UtcNow;
		List<Sample> samples = await _aggregatedContext.Samples.ToListAsync();
		foreach (Sample s in samples)
		{
			List<User>? sampleUsers = await _fetchHandler.getUsersBySample(s);
		}
	}

	public async Task updateLocationSamples()
	{
		List<Location> allLocations = (await _fetchHandler.getAllLocations()).Distinct().ToList();
		HashSet<Guid> existingLocationSamplesId = (
			await _aggregatedContext
				.Set<Sample>()
				.Select(sample => sample.SampleQualifier)
				.ToListAsync()
		)
			.Select(Guid.Parse)
			.ToHashSet();

		List<Sample> locationSample = [];
		foreach (Location location in allLocations)
		{
			if (!existingLocationSamplesId.Contains(location.Id))
			{
				List<User>? sampleUsers = await _fetchHandler.getUserBySiteAndQualifier(
					location.Site,
					location.Id.ToString(),
					SampleType.ByLocation
				);

				if (!sampleUsers.IsNullOrEmpty())
				{
					Sample newLocationSample = new Sample
					{
						Id = Guid.NewGuid(),
						SampleCount = sampleUsers!.Count,
						Site = location.Site,
						SampleType = SampleType.ByLocation,
						SampleQualifier = location.Id.ToString(),
					};
					locationSample.Add(newLocationSample);
				}
			}
		}

		await _insertHandler.addSamples(locationSample);
	}

	public async Task updateJobSamples() { }

	public async Task updateShiftSamples() { }
}
