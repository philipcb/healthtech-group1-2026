using System.Security.Claims;
using Backend.Middleware;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Tests.UnitTests.Validation;

public class RoleAuthorizationHandlerTests
{
	private static readonly RoleRequirement AggregateExposureAccess = new(
		UserRole.OHS,
		UserRole.Manager
	);

	private static async Task<bool> IsAuthorizedAsync(
		RoleRequirement requirement,
		UserRole? role,
		bool hasLocation = true
	)
	{
		var signedInUser = new SignedInUserContext
		{
			User = role is null
				? null
				: new User
				{
					Id = Guid.NewGuid(),
					Role = role.Value,
					LocationId = Guid.NewGuid(),
					Location = hasLocation
						? new Location
						{
							Id = Guid.NewGuid(),
							Latitude = 0,
							Longitude = 0,
							Country = "Norway",
							Region = "Trøndelag",
							City = "Verdal",
							Site = "The Yard",
							Users = [],
						}
						: null,
				},
		};
		var context = new AuthorizationHandlerContext([requirement], new ClaimsPrincipal(), null);

		await new RoleAuthorizationHandler(signedInUser).HandleAsync(context);

		return context.HasSucceeded;
	}

	[Theory]
	[InlineData(UserRole.OHS)]
	[InlineData(UserRole.Manager)]
	public async Task AggregateExposureAccess_AllowsOhsAndManager(UserRole role)
	{
		Assert.True(await IsAuthorizedAsync(AggregateExposureAccess, role));
	}

	[Theory]
	[InlineData(UserRole.Operator)]
	[InlineData(UserRole.Foreman)]
	public async Task AggregateExposureAccess_RejectsOtherRoles(UserRole role)
	{
		Assert.False(await IsAuthorizedAsync(AggregateExposureAccess, role));
	}

	[Fact]
	public async Task AggregateExposureAccess_RejectsSignedOutUser()
	{
		Assert.False(await IsAuthorizedAsync(AggregateExposureAccess, null));
	}

	[Fact]
	public async Task AggregateExposureAccess_RejectsUserWithoutLocation()
	{
		Assert.False(await IsAuthorizedAsync(AggregateExposureAccess, UserRole.Manager, false));
	}

	[Theory]
	[InlineData(UserRole.Operator, false)]
	[InlineData(UserRole.Foreman, false)]
	[InlineData(UserRole.OHS, true)]
	[InlineData(UserRole.Manager, false)]
	public async Task SingleRoleRequirement_OnlyAllowsThatRole(UserRole role, bool expected)
	{
		Assert.Equal(expected, await IsAuthorizedAsync(new RoleRequirement(UserRole.OHS), role));
	}
}
