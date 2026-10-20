using Backend.Services;
using Backend.Utils;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

/// <summary>
/// This runs when migrating the database via the EF Core CLI.
/// It loads environment variables from the .env file so that the CLI does not need to explicitly pass the DATABASE_URL.
/// </summary>
public class LoginDbContextFactory : IDesignTimeDbContextFactory<LoginDbContext>
{
	public LoginDbContext CreateDbContext(string[] args)
	{
		EnvUtils.LoadEnvFile();

		var builder = new DbContextOptionsBuilder<LoginDbContext>();

		var configuration = new ConfigurationBuilder().AddEnvironmentVariables().Build();

		builder
			.UseNpgsql(configuration.GetValue<string>("LOGIN_DATABASE_URL"))
			.UseSeeding(
				(context, _) =>
				{
					DatabaseSeeder seeder = new();
					seeder.SeedLoginAsync(context, CancellationToken.None).GetAwaiter().GetResult();
				}
			)
			.UseAsyncSeeding(
				(context, _, ct) =>
				{
					DatabaseSeeder seeder = new();
					return seeder.SeedLoginAsync(context, ct);
				}
			);

		return new LoginDbContext(builder.Options);
	}
}
