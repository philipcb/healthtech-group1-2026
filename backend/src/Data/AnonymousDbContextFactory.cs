using Backend.Services;
using Backend.Utils;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

/// <summary>
/// This runs when migrating the database via the EF Core CLI.
/// It loads environment variables from the .env file so that the CLI does not need to explicitly pass the DATABASE_URL.
/// </summary>
public class AnonymousDbContextFactory : IDesignTimeDbContextFactory<AnonymousDbContext>
{
	public AnonymousDbContext CreateDbContext(string[] args)
	{
		EnvUtils.LoadEnvFile();

		var builder = new DbContextOptionsBuilder<AnonymousDbContext>();

		var configuration = new ConfigurationBuilder().AddEnvironmentVariables().Build();

		builder
			.UseNpgsql(configuration.GetValue<string>("DATABASE_URL_ANONYMOUS"))
			.UseSeeding(
				(context, _) =>
				{
					DatabaseSeeder seeder = new();
					seeder.SeedAnonymousDataAsync(context, CancellationToken.None).GetAwaiter().GetResult();
				}
			)
			.UseAsyncSeeding(
				(context, _, ct) =>
				{
					DatabaseSeeder seeder = new();
					return seeder.SeedAnonymousDataAsync(context, ct);
				}
			);

		return new AnonymousDbContext(builder.Options);
	}
}
