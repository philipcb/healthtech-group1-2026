using Backend.Services;
using Backend.Utils;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

/// <summary>
/// This runs when migrating the database via the EF Core CLI.
/// It loads environment variables from the .env file so that the CLI does not need to explicitly pass the DATABASE_URL.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
	public AppDbContext CreateDbContext(string[] args)
	{
		EnvUtils.LoadEnvFile();
		//Init of the options used when creating DbContext
		var builder = new DbContextOptionsBuilder<AppDbContext>();
		//Get env files as a "map"
		var configuration = new ConfigurationBuilder().AddEnvironmentVariables().Build();

		builder
			.UseNpgsql(configuration.GetValue<string>("DATABASE_URL")) //config the database source with the databse Url
			.UseSeeding( //Insert into the database the initial users and locations
				(context, _) =>
				{
					DatabaseSeeder seeder = new();
					seeder.SeedDataAsync(context, CancellationToken.None).GetAwaiter().GetResult();
				}
			)
			.UseAsyncSeeding(
				(context, _, ct) =>
				{
					DatabaseSeeder seeder = new();
					return seeder.SeedDataAsync(context, ct);
				}
			);
		//We successfully created an AppDbContext with those options, that will be used only for intialization and migration
		return new AppDbContext(builder.Options);
	}
}
