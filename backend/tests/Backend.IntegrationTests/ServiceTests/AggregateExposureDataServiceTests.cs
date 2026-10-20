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

	private async Task SeedGroupsAsync()
	{
		await using var context = Fixture.CreateAggregateDbContext();

		foreach (
			var (id, site) in new[] { (OwnSiteGroupId, OwnSite), (OtherSiteGroupId, OtherSite) }
		)
		{
			context.Samples.Add(
				new Sample
				{
					Id = id,
					SampleCount = 5,
					Site = site,
					LocationQualifier = Guid.NewGuid(),
					LocationName = "A2",
					JobQualifier = "Welder",
				}
			);
			context.NoiseAverages.Add(
				new NoiseAverage
				{
					SampleId = id,
					Time = new DateTime(2026, 9, 15, 10, 0, 0, DateTimeKind.Utc),
					AverageLaeq = 82,
					AverageLcpk = 120,
				}
			);
		}

		// A whole site, which the overview and trend never return
		context.Samples.Add(
			new Sample
			{
				Id = Guid.NewGuid(),
				SampleCount = 10,
				Site = OtherSite,
			}
		);

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

		var groups = (await service.GetOverviewAggregateDataAsync(StartTime, EndTime)).ToList();

		var group = Assert.Single(groups);
		Assert.Equal(OwnSiteGroupId, group.GroupId);
		Assert.Equal(OwnSite, group.Site);
		Assert.Equal(82, group.Averages.Noise);
	}

	[Fact]
	public async Task GetOverviewAggregateDataAsync_ReturnsEverySite_ForManager()
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.Manager);

		var groups = (await service.GetOverviewAggregateDataAsync(StartTime, EndTime)).ToList();

		Assert.Equal(2, groups.Count);
		Assert.Contains(groups, g => g.GroupId == OwnSiteGroupId && g.Site == OwnSite);
		Assert.Contains(groups, g => g.GroupId == OtherSiteGroupId && g.Site == OtherSite);
	}

	[Theory]
	[InlineData(UserRole.Operator)]
	[InlineData(UserRole.Foreman)]
	public async Task GetOverviewAggregateDataAsync_ReturnsNothing_ForOtherRoles(UserRole role)
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, role);

		var groups = await service.GetOverviewAggregateDataAsync(StartTime, EndTime);

		Assert.Empty(groups);
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
}
