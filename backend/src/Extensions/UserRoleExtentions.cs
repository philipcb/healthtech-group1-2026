namespace Backend.Extensions;

public static class UserRoleExtensions
{
	/// <summary>
	/// Method that return a boolean showing whether or not a role can manage another (Old function, should probably be updated with the UserRole Class)
	/// </summary>
	public static bool CanManage(this UserRole managerRole, UserRole subordinateRole)
	{
		return managerRole > subordinateRole;
	}
}
