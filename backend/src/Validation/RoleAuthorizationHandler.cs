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

		if (user is not null && user.Role == requirement.RequiredRole && user.Location != null)
		{
			context.Succeed(requirement);
		}

		return Task.CompletedTask;
	}
}

public class RoleRequirement(UserRole requiredRole) : IAuthorizationRequirement
{
	public UserRole RequiredRole { get; } = requiredRole;
}
