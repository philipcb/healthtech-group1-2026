using Backend.Utils;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

public class AggregateDbContextFactory : IDesignTimeDbContextFactory<AggregateDbContext>
{
	public AggregateDbContext CreateDbContext(string[] args)
	{
		EnvUtils.LoadEnvFile();

		var configuration = new ConfigurationBuilder().AddEnvironmentVariables().Build();
		string? connectionString = configuration.GetValue<string>("AGGREGATE_DATABASE_URL");

		if (string.IsNullOrWhiteSpace(connectionString))
		{
			throw new InvalidOperationException("AGGREGATE_DATABASE_URL is not configured.");
		}

		var options = new DbContextOptionsBuilder<AggregateDbContext>()
			.UseNpgsql(connectionString)
			.Options;

		return new AggregateDbContext(options);
	}
}
