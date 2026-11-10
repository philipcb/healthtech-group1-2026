using Backend.Records;

namespace Backend.Tests.UnitTests.AggregateDatabaseHandler;

/// <summary>
/// Unit tests for the hours the aggregate job stores, which stay UTC whatever the process's time zone. Run the tests
/// with different `TZ` values to check that.
/// </summary>
public class GroupByHourTests
{
	private static readonly Guid UserId = Guid.NewGuid();

	private static RawExposureData At(DateTime time, double value) =>
		new(time, value, value, value, value, UserId);

	/// <summary>
	/// Verifies that the rows of each UTC hour are averaged into one row at the start of that hour, in UTC.
	/// </summary>
	[Fact]
	public void GroupByHour_KeepsTheUtcHour()
	{
		var rows = DataFetchHandler
			.GroupByHour(
				[
					At(new DateTime(2026, 10, 1, 7, 15, 0, DateTimeKind.Utc), 10),
					At(new DateTime(2026, 10, 1, 7, 45, 0, DateTimeKind.Utc), 20),
					At(new DateTime(2026, 10, 1, 23, 30, 0, DateTimeKind.Utc), 40),
				],
				UserId
			)
			.OrderBy(d => d.Time)
			.ToList();

		Assert.Equal(2, rows.Count);
		Assert.Equal(new DateTime(2026, 10, 1, 7, 0, 0, DateTimeKind.Utc), rows[0].Time);
		Assert.Equal(15, rows[0].Value);
		Assert.Equal(new DateTime(2026, 10, 1, 23, 0, 0, DateTimeKind.Utc), rows[1].Time);
		Assert.All(rows, d => Assert.Equal(DateTimeKind.Utc, d.Time.Kind));
		Assert.All(rows, d => Assert.Equal(UserId, d.UserId));
	}
}
