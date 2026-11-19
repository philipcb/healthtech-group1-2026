namespace Backend.Utils
{
	public static class AuthorizationUtils
	{
		/// <summary>
		/// Method that gives the correct starttime depending on user authorization
		/// (foreman can only see a week back at most)
		/// </summary>
		public static DateTime ClampRequestStartDateForRole(DateTime start, UserRole? role)
		{
			// Foremen can only see data for the past 7 days
			if (role == UserRole.Foreman)
			{
				DateTime sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
				if (start < sevenDaysAgo)
				{
					return sevenDaysAgo;
				}
			}

			return start;
		}
	}
}
