using Backend.Middleware;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Testcontainers.PostgreSql;

namespace Backend.IntegrationTests.Fixtures;

public sealed class PostgresTestDbFixture : IAsyncLifetime
{
	private const string LoginDatabaseName = "backend_login_test";
	private readonly PostgreSqlContainer _container;

	public PostgresTestDbFixture()
	{
		_container = new PostgreSqlBuilder("timescale/timescaledb:2.17.2-pg16")
			.WithDatabase("backend_test")
			.WithUsername("postgres")
			.WithPassword("postgres")
			.Build();
	}

	public async Task InitializeAsync()
	{
		await _container.StartAsync();
		await CreateLoginDatabaseAsync();
		await ResetDatabaseAsync();
	}

	public async Task DisposeAsync()
	{
		await _container.DisposeAsync();
	}

	public AppDbContext CreateDbContext()
	{
		string connectionString = _container.GetConnectionString();

		var options = new DbContextOptionsBuilder<AppDbContext>()
			.UseNpgsql(connectionString)
			.Options;

		return new AppDbContext(options);
	}

	public LoginDbContext CreateLoginDbContext()
	{
		string connectionString = new NpgsqlConnectionStringBuilder(
			_container.GetConnectionString()
		)
		{
			Database = LoginDatabaseName,
		}.ConnectionString;

		var options = new DbContextOptionsBuilder<LoginDbContext>()
			.UseNpgsql(connectionString)
			.Options;

		return new LoginDbContext(options);
	}

	private async Task CreateLoginDatabaseAsync()
	{
		await using var connection = new NpgsqlConnection(_container.GetConnectionString());
		await connection.OpenAsync();

		await using var command = new NpgsqlCommand(
			$"CREATE DATABASE {LoginDatabaseName}",
			connection
		);
		await command.ExecuteNonQueryAsync();
	}

	public async Task ResetDatabaseAsync()
	{
		await using var appContext = CreateDbContext();
		await using var loginContext = CreateLoginDbContext();

		await appContext.Database.EnsureDeletedAsync();
		await appContext.Database.MigrateAsync();
		await loginContext.Database.EnsureDeletedAsync();
		await loginContext.Database.MigrateAsync();

		DatabaseSeeder seeder = new();
		await seeder.SeedDataAsync(appContext, CancellationToken.None);
		await seeder.SeedLoginAsync(loginContext, CancellationToken.None);
	}

	public SignedInUserContext CreateOperatorContext()
	{
		return new SignedInUserContext
		{
			User = new User
			{
				Id = SeedIds.KariId,
				Role = UserRole.Operator,
				LocationId = SeedIds.VerdalLocationId,
			},
		};
	}
}
