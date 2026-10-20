using Backend.Middleware;
using Microsoft.AspNetCore.Authorization;

public class RoleAuthorizationHandler(SignedInUserContext signedInUserContext)
	: AuthorizationHandler<RoleRequirement>
{
	private readonly SignedInUserContext _signedInUserContext = signedInUserContext;

	protected override Task HandleRequirementAsync(
		AuthorizationHandlerContext context,
		RoleRequirement requirement
	)
	{
		var user = _signedInUserContext.User;

		if (
			user is not null
			&& requirement.AllowedRoles.Contains(user.Role)
			&& user.Location != null
		)
		{
			context.Succeed(requirement);
		}

		return Task.CompletedTask;
	}
}

/// <summary>
/// Requires the signed-in user to have exactly one of the given roles. Roles aren't hierarchical here, so a higher role
/// doesn't get access to a lower role's endpoints.
/// </summary>
public class RoleRequirement(params UserRole[] allowedRoles) : IAuthorizationRequirement
{
	public IReadOnlyCollection<UserRole> AllowedRoles { get; } = allowedRoles;
}
