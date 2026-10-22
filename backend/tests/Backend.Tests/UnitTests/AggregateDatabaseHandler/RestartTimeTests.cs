namespace Backend.Tests.UnitTests.AggregateDatabaseHandler;

/// <summary>
/// Unit tests for where the aggregate job starts computing a group again.
/// </summary>
public class RestartTimeTests
{
	/// <summary>
	/// Verifies that the job starts at the beginning of the last stored day, so a day stored during the day is computed
	/// again in full.
	/// </summary>
	[Fact]
	public void GetRestartTime_IsTheStartOfTheLastStoredDay()
	{
		var restartTime = DataFiller.GetRestartTime(
			new DateTime(2026, 10, 21, 11, 0, 0, DateTimeKind.Utc)
		);

		Assert.Equal(new DateTime(2026, 10, 21, 0, 0, 0, DateTimeKind.Utc), restartTime);
		Assert.Equal(DateTimeKind.Utc, restartTime.Kind);
	}

	/// <summary>
	/// Verifies that a group without stored rows starts from the beginning, in UTC as Postgres requires.
	/// </summary>
	[Fact]
	public void GetRestartTime_StartsFromTheBeginning_WithoutStoredRows()
	{
		var restartTime = DataFiller.GetRestartTime(default);

		Assert.Equal(DateTime.MinValue, restartTime);
		Assert.Equal(DateTimeKind.Utc, restartTime.Kind);
	}
}
