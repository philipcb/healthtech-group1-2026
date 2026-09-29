using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class DatabaseSeeder
{


	// password123
	private const string DefaultPasswordHash =
		"$2a$11$QXVHkr6TQC8gJvh5P4GFzOYc.HyZA3FxDC3/BghAM3hODQVAoWwwi";


	public async Task SeedLoginAsync(DbContext dbContext, CancellationToken ct)
	{
		DateTime now = DateTime.UtcNow;
		List<UserInfo> seedUsers =
		[
			new UserInfo
			{
				Id = SeedIds.OlaId,
				Name = "Ola Nordmann",
				Email = "ola.nordmann@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
			new UserInfo
			{
				Id = SeedIds.KariId,
				Name = "Kari Nordmann",
				Email = "kari.nordmann@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
			new UserInfo
			{
				Id = SeedIds.PerId,
				Name = "Per Hansen",
				Email = "per.hansen@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
			new UserInfo
			{
				Id = SeedIds.TrondId,
				Name = "Trond Pedersen",
				Email = "trond.pedersen@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
			new UserInfo
			{
				Id = SeedIds.GjertrudId,
				Name = "Gjertrud Olsen",
				Email = "gjertrud.olsen@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
			new UserInfo
			{
				Id = SeedIds.KlaraId,
				Name = "Klara Johansen",
				Email = "klara.johansen@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
			new UserInfo
			{
				Id = SeedIds.BirgirId,
				Name = "Birgir Sigurdsson",
				Email = "birgir.sigurdsson@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
			new UserInfo
			{
				Id = SeedIds.TorleifId,
				Name = "Torleif Eriksen",
				Email = "torleif.eriksen@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
			new UserInfo
			{
				Id = SeedIds.BjornulfId,
				Name = "Bjørnulf Knutsen",
				Email = "bjornul.knutsen@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},

			//----
			new UserInfo
			{
				Id = SeedIds.AstridId,
				Name = "Astrid Bers",
				Email = "astrid.bers@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
			new UserInfo
			{
				Id = SeedIds.ErikId,
				Name = "Erik Belsen",
				Email = "erik.belsen@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
			new UserInfo
			{
				Id = SeedIds.MagnusId,
				Name = "Magnus Motok",
				Email = "magnus.motok@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
			new UserInfo
			{
				Id = SeedIds.HakonId,
				Name = "Hakon Damar",
				Email = "hakon.damar@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
			new UserInfo
			{
				Id = SeedIds.NoraId,
				Name = "Nora Eriksen",
				Email = "nora.eriksen@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
			new UserInfo
			{
				Id = SeedIds.EgonId,
				Name = "Egon Knutsen",
				Email = "egon.knutsen@aker.com",
				PasswordHash = DefaultPasswordHash,
				CreatedAt = now,
			},
		];
		
		HashSet<Guid> existingUserIds = await dbContext
			.Set<UserInfo>()
			.Select(user => user.Id)
			.ToHashSetAsync(ct);

		List<UserInfo> usersToAdd = [];

		foreach (UserInfo user in seedUsers)
		{
			if (!existingUserIds.Contains(user.Id))
			{
				usersToAdd.Add(user);
			}
		}

		dbContext.Set<UserInfo>().AddRange(usersToAdd);
		await dbContext.SaveChangesAsync(ct);
	}

	public async Task SeedDataAsync(DbContext dbContext, CancellationToken ct)
	{
		DateTime now = DateTime.UtcNow;

		List<Location> seedLocations =
		[
			new Location
			{
				Id = SeedIds.VerdalLocationId,
				Site = "Aker Solutions Verdal",
				Building = "M-hallen",
				Country = "Norway",
				Region = "Trøndelag",
				Latitude = 63.78788207165566f,
				Longitude = 11.440749156413084f,
				City = "Verdal",
				Users = [],
			},
			new Location
			{
				Id = SeedIds.VerdalLocation2Id,
				Site = "Aker Solutions Verdal",
				Building = "A-hallen",
				Country = "Norway",
				Region = "Trøndelag",
				Latitude = 50.45557107165522f,
				Longitude = 21.100749156413084f,
				City = "Verdal",
				Users = [],
			},
			new Location
			{
				Id = SeedIds.SandsliLocationId,
				Site = "Aker Solutions Sandsli",
				Building = "Bygg 1",
				Country = "Norway",
				Region = "Bergen",
				Latitude = 60.29278334510331f,
				Longitude = 5.279473042646057f,
				City = "Bergen",
				Users = [],
			},
		];

		List<User> seedUsers =
		[
			new User
			{
				Id = SeedIds.OlaId,
				JobDescription = "Formann for bygg 1",
				LocationId = SeedIds.VerdalLocationId,
				Role = UserRole.Foreman,
			},
			new User
			{
				Id = SeedIds.KariId,
				JobDescription = "Sveiser",
				LocationId = SeedIds.VerdalLocationId,
				Role = UserRole.Operator,
			},
			new User
			{
				Id = SeedIds.PerId,
				JobDescription = "Technician",
				LocationId = SeedIds.VerdalLocationId,
				Role = UserRole.Operator,
			},
			new User
			{
				Id = SeedIds.TrondId,
				JobDescription = "Technician",
				LocationId = SeedIds.VerdalLocationId,
				Role = UserRole.Operator,
			},
			new User
			{
				Id = SeedIds.GjertrudId,
				JobDescription = "Technician",
				LocationId = SeedIds.VerdalLocationId,
				Role = UserRole.Operator,
			},
			new User
			{
				Id = SeedIds.KlaraId,
				JobDescription = "Technician",
				LocationId = SeedIds.VerdalLocationId,
				Role = UserRole.Operator,
			},
			new User
			{
				Id = SeedIds.BirgirId,
				JobDescription = "Technician",
				LocationId = SeedIds.VerdalLocationId,
				Role = UserRole.Operator,
			},
			new User
			{
				Id = SeedIds.TorleifId,
				JobDescription = "Technician",
				LocationId = SeedIds.VerdalLocationId,
				Role = UserRole.Operator,
			},
			new User
			{
				Id = SeedIds.BjornulfId,
				JobDescription = "Technician",
				LocationId = SeedIds.VerdalLocationId,
				Role = UserRole.Operator,
			},
			//---------Second building users--------------
			new User
			{
				Id = SeedIds.AstridId,
				JobDescription = "Formann for bygg 2",
				LocationId = SeedIds.VerdalLocation2Id,
				Role = UserRole.Foreman,
			},
			new User
			{
				Id = SeedIds.ErikId,
				JobDescription = "Technician",
				LocationId = SeedIds.VerdalLocation2Id,
				Role = UserRole.Operator,
			},
			new User
			{
				Id = SeedIds.MagnusId,
				JobDescription = "Technician",
				LocationId = SeedIds.VerdalLocation2Id,
				Role = UserRole.Operator,
			},
			new User
			{
				Id = SeedIds.HakonId,
				JobDescription = "Technician",
				LocationId = SeedIds.VerdalLocation2Id,
				Role = UserRole.Operator,
			},
			new User
			{
				Id = SeedIds.NoraId,
				JobDescription = "Technician",
				LocationId = SeedIds.VerdalLocation2Id,
				Role = UserRole.Operator,
			},
			new User
			{
				Id = SeedIds.EgonId,
				JobDescription = "Technician",
				LocationId = SeedIds.VerdalLocation2Id,
				Role = UserRole.Operator,
			},
		];

		List<(Guid ManagerId, Guid SubordinateId)> seedUserManagers =
		[
			(SeedIds.OlaId, SeedIds.KariId),
			(SeedIds.OlaId, SeedIds.PerId),
			(SeedIds.OlaId, SeedIds.TrondId),
			(SeedIds.OlaId, SeedIds.GjertrudId),
			(SeedIds.OlaId, SeedIds.KlaraId),
			(SeedIds.OlaId, SeedIds.BirgirId),
			(SeedIds.OlaId, SeedIds.TorleifId),
			(SeedIds.OlaId, SeedIds.BjornulfId),
		];

		HashSet<Guid> existingLocationIds = await dbContext
			.Set<Location>()
			.Select(location => location.Id)
			.ToHashSetAsync(ct);

		HashSet<Guid> existingUserIds = await dbContext
			.Set<User>()
			.Select(user => user.Id)
			.ToHashSetAsync(ct);

		List<Location> locationsToAdd = [];
		List<User> usersToAdd = [];

		foreach (Location location in seedLocations)
		{
			if (!existingLocationIds.Contains(location.Id))
			{
				locationsToAdd.Add(location);
			}
		}

		foreach (User user in seedUsers)
		{
			if (!existingUserIds.Contains(user.Id))
			{
				usersToAdd.Add(user);
			}
		}

		dbContext.Set<Location>().AddRange(locationsToAdd);
		dbContext.Set<User>().AddRange(usersToAdd);
		await dbContext.SaveChangesAsync(ct);

		HashSet<Guid> managerIds = seedUserManagers
			.Select(seedUserManager => seedUserManager.ManagerId)
			.ToHashSet();

		Dictionary<Guid, User> managers = await dbContext
			.Set<User>()
			.Where(user => managerIds.Contains(user.Id))
			.Include(user => user.Subordinates)
			.ToDictionaryAsync(user => user.Id, ct);

		HashSet<Guid> subordinateIds = seedUserManagers
			.Select(seedUserManager => seedUserManager.SubordinateId)
			.ToHashSet();

		Dictionary<Guid, User> subordinates = await dbContext
			.Set<User>()
			.Where(user => subordinateIds.Contains(user.Id))
			.ToDictionaryAsync(user => user.Id, ct);

		bool addedManagerLinks = false;

		foreach ((Guid managerId, Guid subordinateId) in seedUserManagers)
		{
			if (!managers.TryGetValue(managerId, out User? manager))
			{
				continue;
			}

			if (!subordinates.TryGetValue(subordinateId, out User? subordinate))
			{
				continue;
			}

			if (manager.Subordinates.Any(existing => existing.Id == subordinateId))
			{
				continue;
			}

			manager.Subordinates.Add(subordinate);
			addedManagerLinks = true;
		}

		if (!addedManagerLinks)
		{
			return;
		}

		await dbContext.SaveChangesAsync(ct);
	}
}
