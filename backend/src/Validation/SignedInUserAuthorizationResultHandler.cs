using Backend.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

/// <summary>
/// Responds to requests the authorization policies reject. There's no authentication scheme, only the signed-in user
/// that SignedInUserMiddleware loads, so ASP.NET's default handler would throw when it challenges or forbids them.
/// Responds 401 when no known user is signed in, and 403 when the signed-in user isn't allowed. Allowed requests are
/// handled by the default handler.
/// </summary>
public class SignedInUserAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
	private readonly AuthorizationMiddlewareResultHandler _defaultHandler = new();

	public Task HandleAsync(
		RequestDelegate next,
		HttpContext context,
		AuthorizationPolicy policy,
		PolicyAuthorizationResult authorizeResult
	)
	{
		if (authorizeResult.Succeeded)
		{
			return _defaultHandler.HandleAsync(next, context, policy, authorizeResult);
		}

		// Registered as a singleton, so the scoped context is resolved per request
		var signedInUser = context.RequestServices.GetRequiredService<SignedInUserContext>();
		context.Response.StatusCode = signedInUser.User is null
			? StatusCodes.Status401Unauthorized
			: StatusCodes.Status403Forbidden;

		return Task.CompletedTask;
	}
}
