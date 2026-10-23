using Backend.IntegrationTests.Fixtures;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.IntegrationTests.ServiceTests;

[Collection(PostgresTestDbCollection.Name)]
public sealed class DataInsertHandlerTests(PostgresTestDbFixture fixture)
	: IntegrationTestBase(fixture)
{
	private static readonly Guid SampleId = Guid.Parse("d0000000-0000-0000-0000-000000000001");
	private static readonly DateTime PreviousDay = new(2026, 10, 20, 0, 0, 0, DateTimeKind.Utc);
	private static readonly DateTime LastDay = new(2026, 10, 21, 0, 0, 0, DateTimeKind.Utc);

	private static AveragePer8HourShift ShiftAverage(ExposureType exposureType, DateTime day) =>
		new()
		{
			SampleId = SampleId,
			Time = day,
			ExposureType = exposureType,
			AverageTimeOverAction = 0.5,
			AverageTimeOverLimit = 0.25,
			AverageTimeInSafeLimits = 0.5,
		};

	private static NoiseAverage NoiseHour(DateTime time) =>
		new()
		{
			SampleId = SampleId,
			Time = time,
			AverageLaeq = 80,
			AverageLcpk = 120,
		};

	// A group with noise for two days and the daily values of noise and dust for the last day
	private async Task SeedAsync()
	{
		await using var context = Fixture.CreateAggregateDbContext();
		context.Samples.Add(
			new Sample
			{
				Id = SampleId,
				SampleCount = 5,
				Site = "The Yard",
			}
		);
		context.NoiseAverages.AddRange(
			NoiseHour(PreviousDay.AddHours(10)),
			NoiseHour(LastDay.AddHours(10)),
			NoiseHour(LastDay.AddHours(11))
		);
		context.AveragesPer8HourShift.AddRange(
			ShiftAverage(ExposureType.Noise, PreviousDay),
			ShiftAverage(ExposureType.Noise, LastDay),
			ShiftAverage(ExposureType.Dust, LastDay)
		);
		await context.SaveChangesAsync();
	}

	[Fact]
	public async Task RemoveDataFrom_RemovesTheExposuresRowsFromTheStartTime_Only()
	{
		await SeedAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var handler = new DataInsertHandler(context);

		await handler.removeDataFrom(SampleId, ExposureType.Noise, LastDay);

		var noiseHour = Assert.Single(await context.NoiseAverages.ToListAsync());
		Assert.Equal(PreviousDay.AddHours(10), noiseHour.Time);
		var shiftAverages = await context.AveragesPer8HourShift.OrderBy(d => d.Time).ToListAsync();
		Assert.Equal(2, shiftAverages.Count);
		Assert.Contains(
			shiftAverages,
			d => d.ExposureType == ExposureType.Noise && d.Time == PreviousDay
		);
		Assert.Contains(
			shiftAverages,
			d => d.ExposureType == ExposureType.Dust && d.Time == LastDay
		);
	}

	[Fact]
	public async Task RemoveDataFrom_ThenAddingTheDayAgain_GivesNoDuplicateKeys()
	{
		await SeedAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var handler = new DataInsertHandler(context);

		await handler.removeDataFrom(SampleId, ExposureType.Noise, LastDay);
		await handler.addDataRange([
			NoiseHour(LastDay.AddHours(10)),
			NoiseHour(LastDay.AddHours(12)),
		]);
		await handler.addDataRange([ShiftAverage(ExposureType.Noise, LastDay)]);
		await context.SaveChangesAsync();

		Assert.Equal(3, await context.NoiseAverages.CountAsync());
		Assert.Equal(
			2,
			await context.AveragesPer8HourShift.CountAsync(d =>
				d.ExposureType == ExposureType.Noise
			)
		);
	}
}
