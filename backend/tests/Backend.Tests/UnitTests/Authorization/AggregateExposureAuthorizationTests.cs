using System.Net;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Backend.Tests.UnitTests.Authorization;

/// <summary>
/// Sends requests through the real pipeline, so the controller's policy, the signed-in user middleware, the
/// authorization result handler and CORS are tested together. The services are mocked, so no database is needed.
/// </summary>
public class AggregateExposureAuthorizationTests : IClassFixture<WebApplicationFactory<Program>>
{
	private const string AllowedOrigin = "http://localhost:5173";
	private const string DisallowedOrigin = "https://example.com";

	private static readonly Dictionary<UserRole, Guid> UserIds = Enum.GetValues<UserRole>()
		.ToDictionary(role => role, _ => Guid.NewGuid());

	private readonly WebApplicationFactory<Program> _factory;

	public AggregateExposureAuthorizationTests(WebApplicationFactory<Program> factory)
	{
		// Any other ID is an unknown user, for which the mock returns null
		var userService = new Mock<IUserService>();
		foreach (var (role, id) in UserIds)
		{
			userService
				.Setup(s => s.GetUserByIdAsync(id))
				.ReturnsAsync(
					new User
					{
						Id = id,
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
							Site = "The Yard",
							Users = [],
						},
					}
				);
		}

		var aggregateService = new Mock<IAggregateExposureDataService>();
		aggregateService
			.Setup(s =>
				s.GetOverviewAggregateDataAsync(
					It.IsAny<DateTime>(),
					It.IsAny<DateTime>(),
					It.IsAny<string?>()
				)
			)
			.ReturnsAsync(new List<SampleDto>());
		aggregateService
			.Setup(s =>
				s.GetTrendAsync(
					It.IsAny<DateTime>(),
					It.IsAny<DateTime>(),
					It.IsAny<Guid?>(),
					It.IsAny<ExposureType>(),
					It.IsAny<string?>()
				)
			)
			.ReturnsAsync(
				new AggregatedTrendResponseDto { Status = "unavailable", Reason = "noSuchGroup" }
			);

		_factory = factory.WithWebHostBuilder(builder =>
			builder.ConfigureServices(services =>
			{
				services.AddScoped(_ => userService.Object);
				services.AddScoped(_ => aggregateService.Object);
			})
		);
	}

	public static TheoryData<string> Endpoints =>
		[
			"/api/medical-team/groups?period=month&year=2026&month=8",
			$"/api/medical-team/groups/{Guid.NewGuid()}/trend?exposure=noise&period=month&year=2026&month=8",
		];

	private static string WithUser(string endpoint, string? signedInUserId) =>
		signedInUserId is null ? endpoint : $"{endpoint}&signedInUserId={signedInUserId}";

	private async Task<HttpResponseMessage> GetAsync(
		string endpoint,
		string? signedInUserId,
		string? origin = null
	)
	{
		var request = new HttpRequestMessage(HttpMethod.Get, WithUser(endpoint, signedInUserId));
		if (origin is not null)
		{
			request.Headers.Add("Origin", origin);
		}

		return await _factory.CreateClient().SendAsync(request);
	}

	[Theory]
	[MemberData(nameof(Endpoints))]
	public async Task AllowsOhsAndManager(string endpoint)
	{
		foreach (var role in new[] { UserRole.OHS, UserRole.Manager })
		{
			var response = await GetAsync(endpoint, UserIds[role].ToString());
			Assert.Equal(HttpStatusCode.OK, response.StatusCode);
		}
	}

	[Theory]
	[MemberData(nameof(Endpoints))]
	public async Task ForbidsSignedInUsersWithOtherRoles(string endpoint)
	{
		foreach (var role in new[] { UserRole.Operator, UserRole.Foreman })
		{
			var response = await GetAsync(endpoint, UserIds[role].ToString());
			Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
			Assert.Empty(await response.Content.ReadAsStringAsync());
		}
	}

	[Theory]
	[MemberData(nameof(Endpoints))]
	public async Task RejectsMissingUserIdAsUnauthenticated(string endpoint)
	{
		var response = await GetAsync(endpoint, null);
		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Theory]
	[MemberData(nameof(Endpoints))]
	public async Task RejectsUnknownUserIdAsUnauthenticated(string endpoint)
	{
		var response = await GetAsync(endpoint, Guid.NewGuid().ToString());
		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Theory]
	[MemberData(nameof(Endpoints))]
	public async Task RejectsMalformedUserIdAsUnauthenticated(string endpoint)
	{
		var response = await GetAsync(endpoint, "not-a-guid");
		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Theory]
	[MemberData(nameof(Endpoints))]
	public async Task AddsCorsHeaders_ForAllowedOrigin_OnAllowedAndRejectedResponses(
		string endpoint
	)
	{
		foreach (
			var signedInUserId in new string?[]
			{
				UserIds[UserRole.Manager].ToString(),
				UserIds[UserRole.Operator].ToString(),
				null,
			}
		)
		{
			var response = await GetAsync(endpoint, signedInUserId, AllowedOrigin);
			Assert.Equal(
				AllowedOrigin,
				Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin"))
			);
		}
	}

	[Theory]
	[MemberData(nameof(Endpoints))]
	public async Task AddsNoCorsHeaders_ForDisallowedOrigin(string endpoint)
	{
		foreach (
			var signedInUserId in new string?[]
			{
				UserIds[UserRole.Manager].ToString(),
				UserIds[UserRole.Operator].ToString(),
			}
		)
		{
			var response = await GetAsync(endpoint, signedInUserId, DisallowedOrigin);
			Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
		}
	}

	// The browser sends a preflight for the frontend's `Content-Type: application/json` requests, without the user
	[Theory]
	[MemberData(nameof(Endpoints))]
	public async Task AnswersPreflight_ForAllowedOrigin(string endpoint)
	{
		var request = new HttpRequestMessage(HttpMethod.Options, endpoint);
		request.Headers.Add("Origin", AllowedOrigin);
		request.Headers.Add("Access-Control-Request-Method", "GET");
		request.Headers.Add("Access-Control-Request-Headers", "content-type");

		var response = await _factory.CreateClient().SendAsync(request);

		Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
		Assert.Equal(
			AllowedOrigin,
			Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin"))
		);
	}
}
