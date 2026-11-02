using Backend.DTOs;
using Backend.IntegrationTests.Fixtures;
using Backend.Middleware;
using Backend.Models;
using Backend.Services;

namespace Backend.IntegrationTests.ServiceTests;

[Collection(PostgresTestDbCollection.Name)]
public sealed class AggregateExposureDataServiceTests(PostgresTestDbFixture fixture)
	: IntegrationTestBase(fixture)
{
	private const string OwnSite = "The Yard";
	private const string OtherSite = "Stord";

	private static readonly Guid OwnSiteGroupId = Guid.Parse(
		"a0000000-0000-0000-0000-000000000001"
	);
	private static readonly Guid OtherSiteGroupId = Guid.Parse(
		"a0000000-0000-0000-0000-000000000002"
	);

	private static readonly DateTime StartTime = new(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc);
	private static readonly DateTime EndTime = new(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);

	private static readonly Guid OwnHall = Guid.Parse("b0000000-0000-0000-0000-000000000001");
	private static readonly Guid OtherHall = Guid.Parse("b0000000-0000-0000-0000-000000000002");

	/// <summary>Every aggregation level the aggregate database has, with its noise average</summary>
	public enum Level
	{
		OccupationInHall,
		WholeHall,
		OccupationAcrossSite,
		WholeSite,
	}

	private static readonly Dictionary<Level, double> NoiseByLevel = new()
	{
		[Level.OccupationInHall] = 82,
		[Level.WholeHall] = 84,
		[Level.OccupationAcrossSite] = 86,
		[Level.WholeSite] = 88,
	};

	// One sample of every level on both sites. The occupation in one hall keeps its fixed IDs.
	private static Guid GetGroupId(string site, Level level) =>
		level == Level.OccupationInHall
			? site == OwnSite
				? OwnSiteGroupId
				: OtherSiteGroupId
			: Guid.Parse(
				$"c000000{(int)level}-0000-0000-0000-00000000000{(site == OwnSite ? 1 : 2)}"
			);

	private async Task SeedGroupsAsync()
	{
		await using var context = Fixture.CreateAggregateDbContext();

		foreach (var site in new[] { OwnSite, OtherSite })
		{
			var hall = site == OwnSite ? OwnHall : OtherHall;
			foreach (var level in Enum.GetValues<Level>())
			{
				var id = GetGroupId(site, level);
				var inHall = level is Level.OccupationInHall or Level.WholeHall;
				var hasOccupation = level is Level.OccupationInHall or Level.OccupationAcrossSite;
				context.Samples.Add(
					new Sample
					{
						Id = id,
						SampleCount = 5,
						Site = site,
						LocationQualifier = inHall ? hall : null,
						LocationName = inHall ? "A2" : null,
						JobQualifier = hasOccupation ? "Welder" : null,
					}
				);
				context.NoiseAverages.Add(
					new NoiseAverage
					{
						SampleId = id,
						Time = new DateTime(2026, 9, 15, 10, 0, 0, DateTimeKind.Utc),
						AverageLaeq = NoiseByLevel[level],
						AverageLcpk = 120,
					}
				);
			}
		}

		await context.SaveChangesAsync();
	}

	private AggregateExposureDataService CreateService(
		AggregateDbContext context,
		UserRole role,
		string site = OwnSite
	)
	{
		var user = new User
		{
			Id = Guid.NewGuid(),
			Role = role,
			LocationId = Guid.NewGuid(),
			Location = new Location
			{
				Id = Guid.NewGuid(),
				Latitude = 0,
				Longitude = 0,
				Country = "Norway",
				Region = "Trøndelag",
				City = "Verdal",
				Site = site,
				Users = [],
			},
		};

		return new AggregateExposureDataService(context, new SignedInUserContext { User = user });
	}

	[Fact]
	public async Task GetOverviewAggregateDataAsync_ReturnsOnlyOwnSite_ForOhs()
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		var groups = (
			await service.GetOverviewAggregateDataAsync(StartTime, EndTime, null)
		).ToList();

		Assert.Equal(Enum.GetValues<Level>().Length, groups.Count);
		Assert.All(groups, g => Assert.Equal(OwnSite, g.Site));
		var group = Assert.Single(groups, g => g.GroupId == OwnSiteGroupId);
		Assert.Equal(82, group.Averages.Noise);
	}

	[Fact]
	public async Task GetOverviewAggregateDataAsync_ReturnsEveryLevel_ForOhs()
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		var groups = (
			await service.GetOverviewAggregateDataAsync(StartTime, EndTime, null)
		).ToList();

		var occupationInHall = Assert.Single(groups, g => g.Hall != null && g.Occupation != null);
		var wholeHall = Assert.Single(groups, g => g.Hall != null && g.Occupation == null);
		var occupationAcrossSite = Assert.Single(
			groups,
			g => g.Hall == null && g.Occupation != null
		);
		var wholeSite = Assert.Single(groups, g => g.Hall == null && g.Occupation == null);
		Assert.Equal(GetGroupId(OwnSite, Level.OccupationInHall), occupationInHall.GroupId);
		Assert.Equal(GetGroupId(OwnSite, Level.WholeHall), wholeHall.GroupId);
		Assert.Equal("A2", wholeHall.Hall);
		Assert.Equal(84, wholeHall.Averages.Noise);
		Assert.Equal(GetGroupId(OwnSite, Level.OccupationAcrossSite), occupationAcrossSite.GroupId);
		Assert.Equal(86, occupationAcrossSite.Averages.Noise);
		Assert.Equal(GetGroupId(OwnSite, Level.WholeSite), wholeSite.GroupId);
		Assert.Equal(88, wholeSite.Averages.Noise);
	}

	[Fact]
	public async Task GetOverviewAggregateDataAsync_ReturnsEverySite_ForManager()
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.Manager);

		var groups = (
			await service.GetOverviewAggregateDataAsync(StartTime, EndTime, null)
		).ToList();

		Assert.Equal(2 * Enum.GetValues<Level>().Length, groups.Count);
		Assert.Contains(groups, g => g.GroupId == OwnSiteGroupId && g.Site == OwnSite);
		Assert.Contains(groups, g => g.GroupId == OtherSiteGroupId && g.Site == OtherSite);
		Assert.Contains(
			groups,
			g => g.GroupId == GetGroupId(OtherSite, Level.WholeHall) && g.Site == OtherSite
		);
	}

	[Theory]
	[InlineData(UserRole.Operator)]
	[InlineData(UserRole.Foreman)]
	public async Task GetOverviewAggregateDataAsync_ReturnsNothing_ForOtherRoles(UserRole role)
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, role);

		var groups = await service.GetOverviewAggregateDataAsync(StartTime, EndTime, null);

		Assert.Empty(groups);
	}

	[Theory]
	[InlineData(null, 1)]
	[InlineData("pm25_twa", 2.5)]
	[InlineData("pm10_twa", 10)]
	public async Task GetOverviewAggregateDataAsync_ReturnsDustForField(
		string? dustField,
		double expected
	)
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		context.DustAverages.Add(
			new DustAverage
			{
				SampleId = OwnSiteGroupId,
				Time = new DateTime(2026, 9, 15, 10, 0, 0, DateTimeKind.Utc),
				AveragePm1Twa = 1,
				AveragePm25Twa = 2.5,
				AveragePm10Twa = 10,
			}
		);
		await context.SaveChangesAsync();
		var service = CreateService(context, UserRole.OHS);

		var groups = await service.GetOverviewAggregateDataAsync(StartTime, EndTime, dustField);

		var group = Assert.Single(groups, g => g.GroupId == OwnSiteGroupId);
		Assert.Equal(expected, group.Averages.Dust);
	}

	[Fact]
	public async Task GetOverviewAggregateDataAsync_Throws_ForUnsupportedDustField()
	{
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		await Assert.ThrowsAsync<ArgumentException>(() =>
			service.GetOverviewAggregateDataAsync(StartTime, EndTime, "pm4_twa")
		);
	}

	[Fact]
	public async Task GetTrendAsync_ReturnsNoSuchGroup_ForOtherSite_ForOhs()
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		AggregatedTrendResponseDto own = await service.GetTrendAsync(
			StartTime,
			EndTime,
			OwnSiteGroupId,
			ExposureType.Noise,
			null
		);
		AggregatedTrendResponseDto other = await service.GetTrendAsync(
			StartTime,
			EndTime,
			OtherSiteGroupId,
			ExposureType.Noise,
			null
		);

		Assert.Equal("ok", own.Status);
		Assert.Equal("unavailable", other.Status);
		Assert.Equal("noSuchGroup", other.Reason);
	}

	[Fact]
	public async Task GetTrendAsync_ReturnsAnySite_ForManager()
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.Manager);

		AggregatedTrendResponseDto other = await service.GetTrendAsync(
			StartTime,
			EndTime,
			OtherSiteGroupId,
			ExposureType.Noise,
			null
		);

		Assert.Equal("ok", other.Status);
		Assert.Equal(82, other.Average);
	}

	[Theory]
	[InlineData(UserRole.Operator)]
	[InlineData(UserRole.Foreman)]
	public async Task GetTrendAsync_ReturnsNoSuchGroup_ForOtherRoles(UserRole role)
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, role);

		AggregatedTrendResponseDto trend = await service.GetTrendAsync(
			StartTime,
			EndTime,
			OwnSiteGroupId,
			ExposureType.Noise,
			null
		);

		Assert.Equal("unavailable", trend.Status);
	}

	[Theory]
	[InlineData(Level.OccupationInHall)]
	[InlineData(Level.WholeHall)]
	[InlineData(Level.OccupationAcrossSite)]
	[InlineData(Level.WholeSite)]
	public async Task GetTrendAsync_ReturnsEveryLevel_OnlyForOwnSite_ForOhs(Level level)
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		AggregatedTrendResponseDto own = await service.GetTrendAsync(
			StartTime,
			EndTime,
			GetGroupId(OwnSite, level),
			ExposureType.Noise,
			null
		);
		AggregatedTrendResponseDto other = await service.GetTrendAsync(
			StartTime,
			EndTime,
			GetGroupId(OtherSite, level),
			ExposureType.Noise,
			null
		);

		Assert.Equal("ok", own.Status);
		Assert.Equal(NoiseByLevel[level], own.Average);
		var inHall = level is Level.OccupationInHall or Level.WholeHall;
		var hasOccupation = level is Level.OccupationInHall or Level.OccupationAcrossSite;
		Assert.Equal(inHall ? OwnHall : null, own.Group!.Hall);
		Assert.Equal(hasOccupation ? "Welder" : null, own.Group.Occupation);
		Assert.Equal("unavailable", other.Status);
		Assert.Equal("noSuchGroup", other.Reason);
	}

	[Theory]
	[InlineData(Level.WholeHall)]
	[InlineData(Level.OccupationAcrossSite)]
	[InlineData(Level.WholeSite)]
	public async Task GetTrendAsync_ReturnsEveryLevel_OnAnySite_ForManager(Level level)
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.Manager);

		AggregatedTrendResponseDto other = await service.GetTrendAsync(
			StartTime,
			EndTime,
			GetGroupId(OtherSite, level),
			ExposureType.Noise,
			null
		);

		Assert.Equal("ok", other.Status);
		Assert.Equal(NoiseByLevel[level], other.Average);
	}

	[Theory]
	[InlineData(UserRole.Operator, Level.WholeHall)]
	[InlineData(UserRole.Foreman, Level.WholeHall)]
	[InlineData(UserRole.Operator, Level.WholeSite)]
	[InlineData(UserRole.Foreman, Level.WholeSite)]
	public async Task GetTrendAsync_ReturnsNoSuchGroup_ForOtherRoles_AtEveryLevel(
		UserRole role,
		Level level
	)
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, role);

		AggregatedTrendResponseDto trend = await service.GetTrendAsync(
			StartTime,
			EndTime,
			GetGroupId(OwnSite, level),
			ExposureType.Noise,
			null
		);

		Assert.Equal("unavailable", trend.Status);
		Assert.Equal("noSuchGroup", trend.Reason);
	}

	private static readonly DateTime DayWithShiftAverage = new(
		2026,
		9,
		15,
		0,
		0,
		0,
		DateTimeKind.Utc
	);
	private static readonly DateTime DayWithoutShiftAverage = new(
		2026,
		9,
		16,
		0,
		0,
		0,
		DateTimeKind.Utc
	);

	// Noise on two days and dust on one, with the time over the thresholds stored for the first day only
	private async Task SeedShiftAveragesAsync()
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();

		context.NoiseAverages.Add(
			new NoiseAverage
			{
				SampleId = OwnSiteGroupId,
				Time = DayWithoutShiftAverage.AddHours(10),
				AverageLaeq = 80,
				AverageLcpk = 120,
			}
		);
		context.DustAverages.Add(
			new DustAverage
			{
				SampleId = OwnSiteGroupId,
				Time = DayWithShiftAverage.AddHours(10),
				AveragePm1Twa = 1,
				AveragePm10Twa = 10,
			}
		);
		foreach (var exposureType in new[] { ExposureType.Noise, ExposureType.Dust })
		{
			context.AveragesPer8HourShift.Add(
				new AveragePer8HourShift
				{
					SampleId = OwnSiteGroupId,
					Time = DayWithShiftAverage,
					ExposureType = exposureType,
					AverageTimeOverAction = 0.5,
					AverageTimeOverLimit = 0.125,
					AverageTimeInSafeLimits = 0.5,
				}
			);
		}

		await context.SaveChangesAsync();
	}

	[Fact]
	public async Task GetTrendAsync_ReturnsTimeOverThresholds_PerDay()
	{
		await SeedShiftAveragesAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		AggregatedTrendResponseDto trend = await service.GetTrendAsync(
			StartTime,
			EndTime,
			OwnSiteGroupId,
			ExposureType.Noise,
			null
		);

		Assert.Equal("ok", trend.Status);
		var withShiftAverage = Assert.Single(trend.Points!, p => p.Time == DayWithShiftAverage);
		Assert.Equal(0.5, withShiftAverage.AverageTimeOverAction);
		Assert.Equal(0.125, withShiftAverage.AverageTimeOverLimit);
		var withoutShiftAverage = Assert.Single(
			trend.Points!,
			p => p.Time == DayWithoutShiftAverage
		);
		Assert.Null(withoutShiftAverage.AverageTimeOverAction);
		Assert.Null(withoutShiftAverage.AverageTimeOverLimit);

		var json = System.Text.Json.JsonSerializer.Serialize(withShiftAverage);
		Assert.Contains("\"averageTimeOverAction\":0.5", json);
		Assert.Contains("\"averageTimeOverLimit\":0.125", json);
	}

	[Theory]
	[InlineData("pm1_twa", 0.5, 0.125)]
	[InlineData("pm10_twa", null, null)]
	public async Task GetTrendAsync_ReturnsTimeOverThresholds_OnlyForPm1Twa_ForDust(
		string field,
		double? expectedTimeOverAction,
		double? expectedTimeOverLimit
	)
	{
		await SeedShiftAveragesAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		AggregatedTrendResponseDto trend = await service.GetTrendAsync(
			StartTime,
			EndTime,
			OwnSiteGroupId,
			ExposureType.Dust,
			field
		);

		var point = Assert.Single(trend.Points!);
		Assert.Equal(expectedTimeOverAction, point.AverageTimeOverAction);
		Assert.Equal(expectedTimeOverLimit, point.AverageTimeOverLimit);
	}
}
