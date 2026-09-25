using Backend.DTOs;
using Backend.Extensions;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IUserService
{
	Task<User?> GetUserByIdAsync(Guid id);
	Task<UserInfo?> GetUserInfoByIdAsync(Guid id);
	Task<List<User>> GetSubordinatesAsync(Guid managerId);
	Task<User?> GetUserByNameAsync(string name);
	Task<User?> GetUserByEmailAsync(string email);
	Task<List<User>> GetAllUsersAsync();
	Task<User> CreateUserAsync(CreateUserDto createUserDto);
	Task<User?> UpdateUserAsync(Guid id, UpdateUserDto updateUserDto);
	Task<bool> DeleteUserAsync(Guid id);
	Task<User?> UpdateSubordinatesAsync(Guid managerId, List<Guid> subordinateIds);

}

public class UserService : IUserService
{
	private readonly AppDbContext _context;
	private readonly LoginDbContext _login_context;

	public UserService(AppDbContext context, LoginDbContext login_context)
	{
		_context = context;
		_login_context = login_context;
	}

	public async Task<User?> GetUserByIdAsync(Guid id)
	{
		return await _context.User.Include(u => u.Location).FirstOrDefaultAsync(u => u.Id == id);
	}

	public async Task<UserInfo?> GetUserInfoByIdAsync(Guid id)
	{
		return await _login_context.User.Include(u => u.Name).FirstOrDefaultAsync(u => u.Id == id);
	}


	public async Task<List<User>> GetSubordinatesAsync(Guid managerId)
	{
		
		//TODO fix this with the new architecture
		return await _context
			.User.Where(u => u.Managers.Any(m => m.Id == managerId))
			.Include(u => u.Location)
			//.OrderBy(u => u.Name)
			.ToListAsync();
	}

	public async Task<UserInfo?> GetUserByNameAsync(string name)
	{
		//TODO fix
		//return await _login_context
			//.User.Include(u => u.Location)
			//.FirstOrDefaultAsync(u => u.Name == name);
		return await _login_context.User.AsQueryable().FirstOrDefaultAsync(u => u.Name == name);
	}

	//TODO fix
	// public async Task<User?> GetUserByEmailAsync(string email)
	// {
	// 	return await _context
	// 		.User.Include(u => u.Location)
	// 		.FirstOrDefaultAsync(u => u.Email == email);
	// }

	public async Task<List<User>> GetAllUsersAsync()
	{
		return await _context.User.Include(u => u.Location).ToListAsync();
	}

	//TODO Check if it seems correct
	public async Task<User> CreateUserAsync(CreateUserDto createUserDto)
	{
		Guid newGuid = Guid.NewGuid();
		UserInfo userInfo = new UserInfo
		{
			Id = newGuid,
			Name = createUserDto.Name,
			Email = createUserDto.Email,
			PasswordHash = BCrypt.Net.BCrypt.HashPassword(createUserDto.Password),
			CreatedAt = DateTime.UtcNow,
		};
		
		
		User user = new User
		{
			Id = newGuid,
			JobDescription = createUserDto.JobDescription,
			Role = createUserDto.Role,
			LocationId = createUserDto.LocationId,
		};

		_login_context.User.Add(userInfo);
		await _login_context.SaveChangesAsync();
		_context.User.Add(user);
		await _context.SaveChangesAsync();

		var createdUser = await GetUserByIdAsync(user.Id);
		return createdUser!;
	}


	//TODO check if correct
	public async Task<User?> UpdateUserAsync(Guid id, UpdateUserDto updateUserDto)
	{
		User? user = await GetUserByIdAsync(id);
		UserInfo? userInfo = await GetUserInfoByIdAsync(id);
		
		if (user == null || userInfo == null)
			return null;
		
		userInfo.Name = updateUserDto.Name ?? userInfo.Name;
		userInfo.Email = updateUserDto.Email ?? userInfo.Email;
		user.JobDescription = updateUserDto.JobDescription ?? user.JobDescription;

		if (!string.IsNullOrEmpty(updateUserDto.Password))
		{
			userInfo.PasswordHash = BCrypt.Net.BCrypt.HashPassword(updateUserDto.Password);
		}

		_context.User.Update(user);
		_login_context.User.Update(userInfo);
		await _context.SaveChangesAsync();
		await _login_context.SaveChangesAsync();
		return user;
	}

	//TODO check if correct
	public async Task<bool> DeleteUserAsync(Guid id)
	{
		//Before, the next line was var user = ... instead of User? If there is a bug here, that might be why
		User? user = await GetUserByIdAsync(id);
		UserInfo? userInfo = await GetUserInfoByIdAsync(id);
		bool wasUserFound = true;
		if (user == null) {
			wasUserFound = false;
		}
		else {
			_context.User.Remove(user);
			await _context.SaveChangesAsync();
		}


		if (userInfo == null) {
			wasUserFound = false;
		}
		else {
			_login_context.User.Remove(userInfo);
			await _login_context.SaveChangesAsync();
		}
		return wasUserFound;
	}

	public async Task<User?> UpdateSubordinatesAsync(Guid managerId, List<Guid> subordinateIds)
	{
		User? manager = await _context
			.User.Include(u => u.Subordinates)
			.FirstOrDefaultAsync(u => u.Id == managerId);

		if (manager == null)
			return null;

		List<User> newSubordinates = await _context
			.User.Where(u => subordinateIds.Contains(u.Id))
			.ToListAsync();

		if (subordinateIds.Count > 0)
		{
			if (newSubordinates.Count != subordinateIds.Distinct().Count())
				return null;

			if (newSubordinates.Any(u => u.Id == managerId))
				return null;

			if (!newSubordinates.All(u => manager.Role.CanManage(u.Role)))
				return null;
		}

		manager.Subordinates = newSubordinates;
		await _context.SaveChangesAsync();

		return manager;
	}
}
