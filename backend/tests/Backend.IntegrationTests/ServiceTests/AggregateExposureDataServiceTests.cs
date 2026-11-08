using Backend.DTOs;
using Backend.IntegrationTests.Fixtures;
using Backend.Middleware;
using Backend.Models;
using Backend.Services;
using Backend.Utils;

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
	public async Task GetOverviewAggregateDataAsync_ReturnsNull_ForExposuresWithoutData()
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		var groups = (
			await service.GetOverviewAggregateDataAsync(StartTime, EndTime, null, false)
		).ToList();

		var group = Assert.Single(groups, g => g.GroupId == OwnSiteGroupId);
		Assert.Equal(82, group.Averages.Noise);
		// The groups only have noise, so the other exposures have no data instead of 0
		Assert.Null(group.Averages.Vibration);
		Assert.Null(group.Averages.Dust);
	}

	[Fact]
	public async Task GetOverviewAggregateDataAsync_ReturnsEveryLevel_ForOhs()
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		var groups = (await service.GetOverviewAggregateDataAsync(StartTime, EndTime, null, false))
			.Where(g => g.Site == OwnSite)
			.ToList();

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

	// Both share the management dashboard. The signed-in user is on `OwnSite`, so the other site isn't theirs.
	[Theory]
	[InlineData(UserRole.Manager)]
	[InlineData(UserRole.OHS)]
	public async Task GetOverviewAggregateDataAsync_ReturnsEverySite_ForManagerAndOhs(UserRole role)
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, role);

		var groups = (
			await service.GetOverviewAggregateDataAsync(StartTime, EndTime, null, false)
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

		var groups = await service.GetOverviewAggregateDataAsync(StartTime, EndTime, null, false);

		Assert.Empty(groups);
	}

	// A different dust value and different shares over the thresholds for each field, so a test notices a mixed up field
	private static double DustValue(Field field) => 10 * ((int)field + 1);

	private static double TimeOverAction(Field field) => ((int)field + 1) / 10.0;

	private static double TimeOverLimit(Field field) => ((int)field + 1) / 20.0;

	private static double WorkersOverAction(Field field) => ((int)field + 1) / 40.0;

	private static double WorkersOverLimit(Field field) => ((int)field + 1) / 80.0;

	private static DustAverage DustAverageOfEveryField(DateTime time) =>
		new()
		{
			SampleId = OwnSiteGroupId,
			Time = time,
			AveragePm1Stel = DustValue(Field.Pm1_stel),
			AveragePm25Stel = DustValue(Field.Pm25_stel),
			AveragePm4Stel = DustValue(Field.Pm4_stel),
			AveragePm10Stel = DustValue(Field.Pm10_stel),
			AveragePm1Twa = DustValue(Field.Pm1_twa),
			AveragePm25Twa = DustValue(Field.Pm25_twa),
			AveragePm4Twa = DustValue(Field.Pm4_twa),
			AveragePm10Twa = DustValue(Field.Pm10_twa),
		};

	[Theory]
	[InlineData(null, Field.Pm1_twa)]
	[InlineData("pm1_twa", Field.Pm1_twa)]
	[InlineData("pm25_twa", Field.Pm25_twa)]
	[InlineData("pm4_twa", Field.Pm4_twa)]
	[InlineData("pm10_twa", Field.Pm10_twa)]
	[InlineData("pm1_stel", Field.Pm1_stel)]
	[InlineData("pm25_stel", Field.Pm25_stel)]
	[InlineData("pm4_stel", Field.Pm4_stel)]
	[InlineData("pm10_stel", Field.Pm10_stel)]
	public async Task GetOverviewAggregateDataAsync_ReturnsDustForField(
		string? dustField,
		Field expectedField
	)
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		context.DustAverages.Add(
			DustAverageOfEveryField(new DateTime(2026, 9, 15, 10, 0, 0, DateTimeKind.Utc))
		);
		await context.SaveChangesAsync();
		var service = CreateService(context, UserRole.OHS);

		var groups = await service.GetOverviewAggregateDataAsync(
			StartTime,
			EndTime,
			dustField,
			false
		);

		var group = Assert.Single(groups, g => g.GroupId == OwnSiteGroupId);
		Assert.Equal(DustValue(expectedField), group.Averages.Dust);
	}

	[Fact]
	public async Task GetOverviewAggregateDataAsync_Throws_ForUnsupportedDustField()
	{
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		await Assert.ThrowsAsync<ArgumentException>(() =>
			service.GetOverviewAggregateDataAsync(StartTime, EndTime, "pm2_twa", false)
		);
	}

	[Theory]
	[InlineData(UserRole.Manager)]
	[InlineData(UserRole.OHS)]
	public async Task GetTrendAsync_ReturnsAnySite_ForManagerAndOhs(UserRole role)
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, role);

		AggregatedTrendResponseDto other = await service.GetTrendAsync(
			StartTime,
			EndTime,
			OtherSiteGroupId,
			ExposureType.Noise,
			null,
			false
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
			null,
			false
		);

		Assert.Equal("unavailable", trend.Status);
	}

	[Theory]
	[InlineData(Level.OccupationInHall)]
	[InlineData(Level.WholeHall)]
	[InlineData(Level.OccupationAcrossSite)]
	[InlineData(Level.WholeSite)]
	public async Task GetTrendAsync_ReturnsEveryLevel_OnEverySite_ForOhs(Level level)
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		AggregatedTrendResponseDto own = await service.GetTrendAsync(
			StartTime,
			EndTime,
			GetGroupId(OwnSite, level),
			ExposureType.Noise,
			null,
			false
		);
		AggregatedTrendResponseDto other = await service.GetTrendAsync(
			StartTime,
			EndTime,
			GetGroupId(OtherSite, level),
			ExposureType.Noise,
			null,
			false
		);

		Assert.Equal("ok", own.Status);
		Assert.Equal(NoiseByLevel[level], own.Average);
		var inHall = level is Level.OccupationInHall or Level.WholeHall;
		var hasOccupation = level is Level.OccupationInHall or Level.OccupationAcrossSite;
		Assert.Equal(inHall ? OwnHall : null, own.Group!.Hall);
		Assert.Equal(hasOccupation ? "Welder" : null, own.Group.Occupation);
		Assert.Equal("ok", other.Status);
		Assert.Equal(NoiseByLevel[level], other.Average);
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
			null,
			false
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
			null,
			false
		);

		Assert.Equal("unavailable", trend.Status);
		Assert.Equal("noSuchGroup", trend.Reason);
	}

	// 15 and 16 September, as the aggregate job stores days: their midnight in Oslo, as UTC
	private static readonly DateTime DayWithShiftAverage = new(
		2026,
		9,
		14,
		22,
		0,
		0,
		DateTimeKind.Utc
	);
	private static readonly DateTime DayWithoutShiftAverage = new(
		2026,
		9,
		15,
		22,
		0,
		0,
		DateTimeKind.Utc
	);

	// Noise on two days and dust on one, with the time over the thresholds stored for the first day only. Dust has the
	// time over the thresholds of every field, stored with the enum's casing like the aggregate job does, e.g. `Pm1_twa`.
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
		context.AveragesPer8HourShift.Add(
			new AveragePer8HourShift
			{
				SampleId = OwnSiteGroupId,
				Time = DayWithShiftAverage,
				ExposureType = ExposureType.Noise,
				AverageTimeOverAction = 0.5,
				AverageTimeOverLimit = 0.125,
				AverageTimeInSafeLimits = 0.5,
				DailyRateOfWorkerOverAction = 0.75,
				DailyRateOfWorkerOverLimit = 0.25,
			}
		);
		context.DustAverages.Add(DustAverageOfEveryField(DayWithShiftAverage.AddHours(10)));
		foreach (var field in Enum.GetValues<Field>())
		{
			context.AveragesPer8HourShift.Add(
				new AveragePer8HourShift
				{
					SampleId = OwnSiteGroupId,
					Time = DayWithShiftAverage,
					ExposureType = ExposureType.Dust,
					Field = field.ToString(),
					AverageTimeOverAction = TimeOverAction(field),
					AverageTimeOverLimit = TimeOverLimit(field),
					AverageTimeInSafeLimits = 1 - TimeOverAction(field),
					DailyRateOfWorkerOverAction = WorkersOverAction(field),
					DailyRateOfWorkerOverLimit = WorkersOverLimit(field),
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
			null,
			false
		);

		Assert.Equal("ok", trend.Status);
		var withShiftAverage = Assert.Single(trend.Points!, p => p.Time == DayWithShiftAverage);
		Assert.Equal(0.5, withShiftAverage.AverageTimeOverAction);
		Assert.Equal(0.125, withShiftAverage.AverageTimeOverLimit);
		Assert.Equal(0.75, withShiftAverage.RateOfWorkerOverAction);
		Assert.Equal(0.25, withShiftAverage.RateOfWorkerLimit);
		var withoutShiftAverage = Assert.Single(
			trend.Points!,
			p => p.Time == DayWithoutShiftAverage
		);
		Assert.Null(withoutShiftAverage.AverageTimeOverAction);
		Assert.Null(withoutShiftAverage.AverageTimeOverLimit);

		var json = System.Text.Json.JsonSerializer.Serialize(withShiftAverage);
		Assert.Contains("\"averageTimeOverAction\":0.5", json);
		Assert.Contains("\"averageTimeOverLimit\":0.125", json);
		Assert.Contains("\"rateOfWorkerOverAction\":0.75", json);
		Assert.Contains("\"rateOfWorkerOverLimit\":0.25", json);
	}

	/// <summary>
	/// Verifies that the period's rates are the plain average of the days' rates, so a long day with 50 % of the hours
	/// over the action value and a short day with 10 % give 30 % whatever their hours, and that the hours and worker
	/// days are added up.
	/// </summary>
	[Fact]
	public async Task GetTrendAsync_AveragesThePeriodsRates_AndAddsUpTheCounts()
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		context.AveragesPer8HourShift.AddRange(
			new AveragePer8HourShift
			{
				SampleId = OwnSiteGroupId,
				Time = DayWithShiftAverage,
				ExposureType = ExposureType.Noise,
				HourCount = 30,
				DayCount = 3,
				AverageTimeOverAction = 0.5,
				AverageTimeOverLimit = 0.25,
				DailyRateOfWorkerOverAction = 0.75,
				DailyRateOfWorkerOverLimit = 0.25,
			},
			new AveragePer8HourShift
			{
				SampleId = OwnSiteGroupId,
				Time = DayWithoutShiftAverage,
				ExposureType = ExposureType.Noise,
				HourCount = 10,
				DayCount = 1,
				AverageTimeOverAction = 0.1,
				AverageTimeOverLimit = 0,
				DailyRateOfWorkerOverAction = 0.5,
				DailyRateOfWorkerOverLimit = 0,
			}
		);
		await context.SaveChangesAsync();
		var service = CreateService(context, UserRole.OHS);

		AggregatedTrendResponseDto trend = await service.GetTrendAsync(
			StartTime,
			EndTime,
			OwnSiteGroupId,
			ExposureType.Noise,
			null,
			false
		);

		Assert.Equal(40, trend.HourCount);
		Assert.Equal(4, trend.DayCount);
		// (0.5 + 0.1) / 2 and (0.25 + 0) / 2
		Assert.Equal(0.3, trend.RateOfHourAboveAction!.Value, 10);
		Assert.Equal(0.125, trend.RateOfHourAboveLimit!.Value, 10);
		// (0.75 + 0.5) / 2 and (0.25 + 0) / 2
		Assert.Equal(0.625, trend.RateOfDayAboveAction!.Value, 10);
		Assert.Equal(0.125, trend.RateOfDayAboveLimit!.Value, 10);
	}

	/// <summary>
	/// Verifies that the period's rates are left out, not 0 or an error, when the aggregate job hasn't stored the time
	/// over the thresholds for the period.
	/// </summary>
	[Fact]
	public async Task GetTrendAsync_LeavesOutThePeriodsRates_WithoutShiftAverages()
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		AggregatedTrendResponseDto trend = await service.GetTrendAsync(
			StartTime,
			EndTime,
			OwnSiteGroupId,
			ExposureType.Noise,
			null,
			false
		);

		Assert.Equal("ok", trend.Status);
		Assert.Equal(0, trend.HourCount);
		Assert.Equal(0, trend.DayCount);
		Assert.Null(trend.RateOfHourAboveAction);
		Assert.Null(trend.RateOfHourAboveLimit);
		Assert.Null(trend.RateOfDayAboveAction);
		Assert.Null(trend.RateOfDayAboveLimit);

		var json = System.Text.Json.JsonSerializer.Serialize(trend);
		Assert.DoesNotContain("rateOfHourAboveAction", json);
	}

	[Theory]
	[InlineData(false, "day")]
	[InlineData(true, "hour")]
	public async Task GetTrendAsync_ReturnsGranularity_ForIsHourly(
		bool isHourly,
		string expectedGranularity
	)
	{
		await SeedShiftAveragesAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		AggregatedTrendResponseDto trend = await service.GetTrendAsync(
			StartTime,
			EndTime,
			OwnSiteGroupId,
			ExposureType.Noise,
			null,
			isHourly
		);

		Assert.Equal("ok", trend.Status);
		Assert.Equal(expectedGranularity, trend.Granularity);
	}

	// The API's lowercase field finds the field's data, though the time over the thresholds is stored as e.g. `Pm1_twa`
	[Theory]
	[InlineData("pm1_twa", Field.Pm1_twa)]
	[InlineData("pm25_twa", Field.Pm25_twa)]
	[InlineData("pm4_twa", Field.Pm4_twa)]
	[InlineData("pm10_twa", Field.Pm10_twa)]
	[InlineData("pm1_stel", Field.Pm1_stel)]
	[InlineData("pm25_stel", Field.Pm25_stel)]
	[InlineData("pm4_stel", Field.Pm4_stel)]
	[InlineData("pm10_stel", Field.Pm10_stel)]
	public async Task GetTrendAsync_ReturnsValueAndTimeOverThresholds_ForEveryDustField(
		string dustField,
		Field expectedField
	)
	{
		await SeedShiftAveragesAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);

		foreach (var isHourly in new[] { false, true })
		{
			AggregatedTrendResponseDto trend = await service.GetTrendAsync(
				StartTime,
				EndTime,
				OwnSiteGroupId,
				ExposureType.Dust,
				dustField,
				isHourly
			);

			Assert.Equal("ok", trend.Status);
			var point = Assert.Single(trend.Points!);
			Assert.Equal(DustValue(expectedField), point.Value);
			Assert.Equal(TimeOverAction(expectedField), point.AverageTimeOverAction);
			Assert.Equal(TimeOverLimit(expectedField), point.AverageTimeOverLimit);
			Assert.Equal(WorkersOverAction(expectedField), point.RateOfWorkerOverAction);
			Assert.Equal(WorkersOverLimit(expectedField), point.RateOfWorkerLimit);
		}
	}

	private static DateTime Utc(int month, int day, int hour) =>
		new(2026, month, day, hour, 0, 0, DateTimeKind.Utc);

	// Vibration as the aggregate job stores it, in Norwegian days: 31 August's total of 560 points, kept until midnight in
	// Oslo at 22:00 UTC, then two days in September with their totals of 300 and 200 points in their last hour, 23:00 in
	// Oslo. 1 September has a measurement at midnight in Oslo.
	private async Task SeedVibrationAcrossMidnightAsync()
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();

		foreach (
			var (time, points) in new[]
			{
				(Utc(8, 31, 21), 560.0),
				(Utc(8, 31, 22), 40.0),
				(Utc(9, 1, 7), 100.0),
				(Utc(9, 1, 21), 300.0),
				(Utc(9, 2, 7), 50.0),
				(Utc(9, 2, 21), 200.0),
			}
		)
		{
			context.VibrationAverages.Add(
				new VibrationAverage
				{
					SampleId = OwnSiteGroupId,
					Time = time,
					AverageExposure = points,
				}
			);
		}

		await context.SaveChangesAsync();
	}

	// A Norwegian month starts at midnight in Oslo, 22:00 UTC the day before, after the day before's vibration total
	[Fact]
	public async Task GetOverviewAggregateDataAsync_LeavesOutTheDayBeforesVibration_ForANorwegianMonth()
	{
		await SeedVibrationAcrossMidnightAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);
		var (startTime, endTime) = TimeWindowUtils.GetPeriodLimit("month", 2026, 8, null);

		var groups = await service.GetOverviewAggregateDataAsync(startTime, endTime, null, false);

		var group = Assert.Single(groups, g => g.GroupId == OwnSiteGroupId);
		Assert.Equal(250, group.Averages.Vibration);
	}

	[Fact]
	public async Task GetTrendAsync_LeavesOutTheDayBeforesVibration_ForANorwegianMonth()
	{
		await SeedVibrationAcrossMidnightAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);
		var (startTime, endTime) = TimeWindowUtils.GetPeriodLimit("month", 2026, 8, null);

		AggregatedTrendResponseDto trend = await service.GetTrendAsync(
			startTime,
			endTime,
			OwnSiteGroupId,
			ExposureType.Vibration,
			null,
			false
		);

		// Each day is its midnight in Oslo, as UTC
		Assert.Equal([Utc(8, 31, 22), Utc(9, 1, 22)], trend.Points!.Select(p => p.Time));
		Assert.Equal([300.0, 200.0], trend.Points!.Select(p => p.Value));
		Assert.Equal(250, trend.Average);
	}

	// The day's hours start at midnight in Oslo, with vibration from then on
	[Fact]
	public async Task GetTrendAsync_HasVibrationFromMidnightInOslo_ForANorwegianDay()
	{
		await SeedVibrationAcrossMidnightAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);
		var (startTime, endTime) = TimeWindowUtils.GetPeriodLimit("day", 2026, 8, 1);

		AggregatedTrendResponseDto trend = await service.GetTrendAsync(
			startTime,
			endTime,
			OwnSiteGroupId,
			ExposureType.Vibration,
			null,
			true
		);

		Assert.Equal(
			[Utc(8, 31, 22), Utc(9, 1, 7), Utc(9, 1, 21)],
			trend.Points!.Select(p => p.Time)
		);
	}

	// 1 September in Norwegian time with a measurement at 01:00, which is 23:00 UTC on 31 August: noise 90 dB then 70 and
	// 80 dB, and PM1 9 then 3 and 6 µg/m³
	private async Task SeedHoursAcrossMidnightAsync()
	{
		await SeedVibrationAcrossMidnightAsync();
		await using var context = Fixture.CreateAggregateDbContext();

		foreach (
			var (time, noise, dust) in new[]
			{
				(Utc(8, 31, 23), 90.0, 9.0),
				(Utc(9, 1, 7), 70.0, 3.0),
				(Utc(9, 1, 8), 80.0, 6.0),
			}
		)
		{
			context.NoiseAverages.Add(
				new NoiseAverage
				{
					SampleId = OwnSiteGroupId,
					Time = time,
					AverageLaeq = noise,
					AverageLcpk = 120,
				}
			);
			context.DustAverages.Add(
				new DustAverage
				{
					SampleId = OwnSiteGroupId,
					Time = time,
					AveragePm1Twa = dust,
				}
			);
		}

		await context.SaveChangesAsync();
	}

	// A day's noise and dust are the average of its hours, 80 dB and 6 µg/m³. Vibration is the day's total, without 31
	// August's total.
	[Fact]
	public async Task GetOverviewAggregateDataAsync_AveragesTheHours_ForANorwegianDay()
	{
		await SeedHoursAcrossMidnightAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);
		var (startTime, endTime) = TimeWindowUtils.GetPeriodLimit("day", 2026, 8, 1);

		var groups = await service.GetOverviewAggregateDataAsync(startTime, endTime, null, true);

		var group = Assert.Single(groups, g => g.GroupId == OwnSiteGroupId);
		Assert.Equal(80, group.Averages.Noise);
		Assert.Equal(6, group.Averages.Dust);
		Assert.Equal(300, group.Averages.Vibration);
	}

	// The overview's day is the same as the group page's average of the day's hours
	[Fact]
	public async Task GetOverviewAggregateDataAsync_MatchesTheHourlyTrend_ForANorwegianDay()
	{
		await SeedHoursAcrossMidnightAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var service = CreateService(context, UserRole.OHS);
		var (startTime, endTime) = TimeWindowUtils.GetPeriodLimit("day", 2026, 8, 1);

		var groups = await service.GetOverviewAggregateDataAsync(startTime, endTime, null, true);
		AggregatedTrendResponseDto trend = await service.GetTrendAsync(
			startTime,
			endTime,
			OwnSiteGroupId,
			ExposureType.Noise,
			null,
			true
		);

		Assert.Equal(
			trend.Average,
			Assert.Single(groups, g => g.GroupId == OwnSiteGroupId).Averages.Noise
		);
	}

	// A month averages its Norwegian days: 1 September's hours from 01:00 in Oslo, 23:00 UTC on 31 August, give 80 dB, 2
	// September 60 dB and 15 September, from `SeedGroupsAsync`, 82 dB, so (80 + 60 + 82) / 3 = 74 dB. Its UTC days would
	// give (90 + 75 + 60 + 82) / 4 = 76.75 dB.
	[Fact]
	public async Task GetOverviewAggregateDataAsync_AveragesTheNorwegianDays_ForAMonth()
	{
		await SeedHoursAcrossMidnightAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		context.NoiseAverages.Add(
			new NoiseAverage
			{
				SampleId = OwnSiteGroupId,
				Time = Utc(9, 2, 8),
				AverageLaeq = 60,
				AverageLcpk = 120,
			}
		);
		await context.SaveChangesAsync();
		var service = CreateService(context, UserRole.OHS);
		var (startTime, endTime) = TimeWindowUtils.GetPeriodLimit("month", 2026, 8, null);

		var groups = await service.GetOverviewAggregateDataAsync(startTime, endTime, null, false);

		Assert.Equal(74, Assert.Single(groups, g => g.GroupId == OwnSiteGroupId).Averages.Noise);
	}

	// 25 October 2026, when daylight saving time ends, has 25 hours from midnight in Oslo, 22:00 UTC on 24 October, with
	// vibration from midnight on
	[Fact]
	public async Task GetTrendAsync_HasTheDaysHours_WhenDaylightSavingTimeEnds()
	{
		await SeedGroupsAsync();
		await using var context = Fixture.CreateAggregateDbContext();
		var midnight = Utc(10, 24, 22);
		for (var hour = 0; hour < 25; hour++)
		{
			context.VibrationAverages.Add(
				new VibrationAverage
				{
					SampleId = OwnSiteGroupId,
					Time = midnight.AddHours(hour),
					AverageExposure = hour + 1,
				}
			);
		}
		await context.SaveChangesAsync();
		var service = CreateService(context, UserRole.OHS);
		var (startTime, endTime) = TimeWindowUtils.GetPeriodLimit("day", 2026, 9, 25);

		AggregatedTrendResponseDto trend = await service.GetTrendAsync(
			startTime,
			endTime,
			OwnSiteGroupId,
			ExposureType.Vibration,
			null,
			true
		);

		Assert.Equal(25, trend.Points!.Count);
		Assert.Equal(midnight, trend.Points![0].Time);
	}
}
