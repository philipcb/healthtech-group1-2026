using Backend.DTOs;
using Backend.IntegrationTests.Fixtures;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.IntegrationTests.ServiceTests;

[Collection(PostgresTestDbCollection.Name)]
public sealed class UserServiceTests(PostgresTestDbFixture fixture) : IntegrationTestBase(fixture)
{
	[Fact]
	public async Task GetUserByIdAsync_ReturnsUserWithLocation_WhenUserExists()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);

		User? user = await service.GetUserByIdAsync(SeedIds.KariId);

		Assert.NotNull(user);
		Assert.Equal(SeedIds.KariId, user!.Id);
		Assert.NotNull(user.Location);
		Assert.Equal(SeedIds.VerdalLocationId, user.Location!.Id);
	}

	[Fact]
	public async Task GetUserByIdAsync_ReturnsNull_WhenUserDoesNotExist()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);

		User? user = await service.GetUserByIdAsync(Guid.NewGuid());

		Assert.Null(user);
	}

	[Fact]
	public async Task GetSubordinatesAsync_ReturnsUsersOrderedByName_WhenManagerHasSubordinates()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);

		FullUser manager = CreateUser("mgr", UserRole.Foreman);
		FullUser subordinateZ = CreateUser("zed", UserRole.Operator);
		FullUser subordinateA = CreateUser("amy", UserRole.Operator);

		subordinateZ.user.Managers.Add(manager.user);
		subordinateA.user.Managers.Add(manager.user);

		await SaveFullUsersAsync(appContext, loginContext, [manager, subordinateZ, subordinateA]);

		List<FullUser> result = await service.GetSubordinatesAsync(manager.user.Id);

		Assert.Equal(2, result.Count);
		Assert.Equal(subordinateA.user.Id, result[0].user.Id);
		Assert.Equal(subordinateZ.user.Id, result[1].user.Id);
		Assert.All(result, user => Assert.NotNull(user.user.Location));
	}

	[Fact]
	public async Task GetAllUsersAsync_ReturnsUsersWithLocations()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);

		List<FullUser> users = await service.GetAllUsersAsync();

		Assert.NotEmpty(users);
		Assert.All(users, user => Assert.NotNull(user.user.Location));
	}

	[Fact]
	public async Task CreateUserAsync_PersistsUserAndHashesPassword()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);
		string suffix = NewSuffix();

		CreateUserDto createDto = new(
			Name: $"user-{suffix}",
			Email: $"user-{suffix}@example.com",
			Password: "password123",
			LocationId: SeedIds.VerdalLocationId,
			ManagerIds: [],
			Role: UserRole.Operator,
			JobDescription: "welder"
		);

		FullUser created = await service.CreateUserAsync(createDto);

		Assert.NotEqual(Guid.Empty, created.user.Id);
		Assert.Equal(createDto.Name, created.userInfo.Name);
		Assert.Equal(createDto.Email, created.userInfo.Email);
		Assert.Equal(createDto.LocationId, created.user.LocationId);
		Assert.NotNull(created.user.Location);
		Assert.NotEqual(createDto.Password, created.userInfo.PasswordHash);
		Assert.True(BCrypt.Net.BCrypt.Verify(createDto.Password, created.userInfo.PasswordHash));

		User? persisted = await appContext.User.FirstOrDefaultAsync(u => u.Id == created.user.Id);
		Assert.NotNull(persisted);
	}

	[Fact]
	public async Task UpdateUserAsync_ReturnsNull_WhenUserDoesNotExist()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);

		UpdateUserDto updateDto = new(Name: "new-name", Email: "new@example.com");

		FullUser? updated = await service.UpdateUserAsync(Guid.NewGuid(), updateDto);

		Assert.Null(updated);
	}

	[Fact]
	public async Task UpdateUserAsync_UpdatesFieldsAndPassword_WhenUserExists()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);

		FullUser user = CreateUser("upd", UserRole.Operator);
		user.userInfo.PasswordHash = BCrypt.Net.BCrypt.HashPassword("oldpass");
		await SaveFullUsersAsync(appContext, loginContext, user);

		UpdateUserDto updateDto = new(
			Name: "updated-name",
			Email: "updated-name@example.com",
			Password: "newpass123",
			JobDescription: "updated-job"
		);

		FullUser? updated = await service.UpdateUserAsync(user.user.Id, updateDto);

		Assert.NotNull(updated);
		Assert.Equal("updated-name", updated!.userInfo.Name);
		Assert.Equal("updated-name@example.com", updated.userInfo.Email);
		Assert.Equal("updated-job", updated.user.JobDescription);
		Assert.True(BCrypt.Net.BCrypt.Verify("newpass123", updated.userInfo.PasswordHash));
	}

	[Fact]
	public async Task DeleteUserAsync_ReturnsFalse_WhenUserDoesNotExist()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);

		bool deleted = await service.DeleteUserAsync(Guid.NewGuid());

		Assert.False(deleted);
	}

	[Fact]
	public async Task DeleteUserAsync_DeletesUser_WhenUserExists()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);

		FullUser user = CreateUser("del", UserRole.Operator);
		await SaveFullUsersAsync(appContext, loginContext, user);

		bool deleted = await service.DeleteUserAsync(user.user.Id);

		Assert.True(deleted);
		bool appUserExists = await appContext.User.AnyAsync(u => u.Id == user.user.Id);
		bool loginUserExists = await loginContext.User.AnyAsync(u => u.Id == user.user.Id);

		Assert.False(appUserExists);
		Assert.False(loginUserExists);
	}

	[Fact]
	public async Task UpdateSubordinatesAsync_ReturnsNull_WhenManagerDoesNotExist()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);

		FullUser? result = await service.UpdateSubordinatesAsync(Guid.NewGuid(), [Guid.NewGuid()]);

		Assert.Null(result);
	}

	[Fact]
	public async Task UpdateSubordinatesAsync_ReturnsNull_WhenAnySubordinateIdDoesNotExist()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);

		FullUser manager = CreateUser("mgr2", UserRole.Foreman);
		FullUser subordinate = CreateUser("sub1", UserRole.Operator);

		await SaveFullUsersAsync(appContext, loginContext, [manager, subordinate]);

		List<Guid> requestedIds = [subordinate.user.Id, Guid.NewGuid()];

		FullUser? result = await service.UpdateSubordinatesAsync(manager.user.Id, requestedIds);

		Assert.Null(result);
	}

	[Fact]
	public async Task UpdateSubordinatesAsync_ReturnsNull_WhenManagerIncludedAsSubordinate()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);

		FullUser manager = CreateUser("mgr3", UserRole.Foreman);
		appContext.User.Add(manager.user);
		await appContext.SaveChangesAsync();

		FullUser? result = await service.UpdateSubordinatesAsync(
			manager.user.Id,
			[manager.user.Id]
		);

		Assert.Null(result);
	}

	[Fact]
	public async Task UpdateSubordinatesAsync_ReturnsNull_WhenManagerCannotManageSubordinateRole()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);

		FullUser operatorManager = CreateUser("mgr4", UserRole.Operator);
		FullUser operatorSubordinate = CreateUser("sub2", UserRole.Operator);
		await SaveFullUsersAsync(appContext, loginContext, [operatorManager, operatorSubordinate]);

		FullUser? result = await service.UpdateSubordinatesAsync(
			operatorManager.user.Id,
			[operatorSubordinate.user.Id]
		);

		Assert.Null(result);
	}

	[Fact]
	public async Task UpdateSubordinatesAsync_UpdatesSubordinates_WhenInputIsValid()
	{
		await using var appContext = Fixture.CreateDbContext();
		await using var loginContext = Fixture.CreateLoginDbContext();
		var service = new UserService(appContext, loginContext);

		FullUser manager = CreateUser("mgr5", UserRole.Foreman);
		FullUser subordinateA = CreateUser("sub3", UserRole.Operator);
		FullUser subordinateB = CreateUser("sub4", UserRole.Operator);
		await SaveFullUsersAsync(appContext, loginContext, [manager, subordinateA, subordinateB]);

		FullUser? result = await service.UpdateSubordinatesAsync(
			manager.user.Id,
			[subordinateA.user.Id, subordinateB.user.Id]
		);

		Assert.NotNull(result);
		Assert.Equal(2, result!.user.Subordinates.Count);
		Assert.Contains(result.user.Subordinates, u => u.Id == subordinateA.user.Id);
		Assert.Contains(result.user.Subordinates, u => u.Id == subordinateB.user.Id);
	}

	private static string NewSuffix()
	{
		return Guid.NewGuid().ToString("N")[..8];
	}

	private static FullUser CreateUser(string suffix, UserRole role)
	{
		Guid Id_common = Guid.NewGuid();
		return new FullUser
		{
			user = new User
			{
				Id = Id_common,
				Role = role,
				JobDescription = "job",
				LocationId = SeedIds.VerdalLocationId,
			},

			userInfo = new UserInfo
			{
				Id = Id_common,
				Name = suffix,
				Email = suffix + "@test.no",
				PasswordHash = "hashed",
				CreatedAt = DateTime.UtcNow,
			},
		};
	}

	private static async Task SaveFullUsersAsync(
		AppDbContext appContext,
		LoginDbContext loginContext,
		params FullUser[] users
	)
	{
		appContext.User.AddRange(users.Select(user => user.user));
		loginContext.User.AddRange(users.Select(user => user.userInfo));

		await appContext.SaveChangesAsync();
		await loginContext.SaveChangesAsync();
	}
}
