using Backend.DTOs;
using Backend.Extensions;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Services;

public interface IUserService
{
	Task<FullUser?> GetFullUserByIdAsync(Guid id);
	Task<User?> GetUserByIdAsync(Guid id);
	Task<UserInfo?> GetUserInfoByIdAsync(Guid id);
	Task<List<FullUser>> GetSubordinatesAsync(Guid managerId);
	Task<FullUser?> GetUserByNameAsync(string name);
	Task<FullUser?> GetUserByEmailAsync(string email);
	Task<List<FullUser>> GetAllUsersAsync();
	Task<FullUser> CreateUserAsync(CreateUserDto createUserDto);
	Task<FullUser?> UpdateUserAsync(Guid id, UpdateUserDto updateUserDto);
	Task<bool> DeleteUserAsync(Guid id);
	Task<FullUser?> UpdateSubordinatesAsync(Guid managerId, List<Guid> subordinateIds);

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

	public async Task<FullUser?> GetFullUserByIdAsync(Guid id)
	{
		
		User? user = await _context.User.Include(u => u.Location).FirstOrDefaultAsync(u => u.Id == id);
		UserInfo? userInfo = await GetUserInfoByIdAsync(id);
		return new FullUser(){user = user!, userInfo = userInfo!};
	}

	public async Task<User?> GetUserByIdAsync(Guid id){
		return await _context.User.Include(u => u.Location).FirstOrDefaultAsync(u => u.Id == id);
	}

	public async Task<UserInfo?> GetUserInfoByIdAsync(Guid id)
	{
		return await _login_context.User.AsQueryable().FirstOrDefaultAsync(u => u.Id == id);
	}


	public async Task<List<FullUser>> GetSubordinatesAsync(Guid managerId)
	{
		//TODO fix this with the new architecture
		List<User> subordinateList = await _context.User.Where(u => u.Managers.Any(m => m.Id == managerId)).Include(u => u.Location).ToListAsync();
		List<FullUser> returnedList = [];
		foreach (User subordinate in subordinateList)
		{
			UserInfo? subordinateInfo = await GetUserInfoByIdAsync(subordinate.Id);
			returnedList.Add(new FullUser(){user = subordinate, userInfo = subordinateInfo!});
		}
		return returnedList.OrderBy(u => u.userInfo.Name).ToList<FullUser>();
	}

	public async Task<FullUser?> GetUserByNameAsync(string name)
	{
		//TODO fix maybe
		//return await _login_context
			//.User.Include(u => u.Location)
			//.FirstOrDefaultAsync(u => u.Name == name);
		
		UserInfo? login = await _login_context.User.AsQueryable().FirstOrDefaultAsync(u => u.Name == name);
		if (login == null)
		{
			return null;
		} 
		
		User? user = await GetUserByIdAsync(login.Id);
		return new FullUser(){user = user!, userInfo = login};
	}

	//TODO fix maybe
	public async Task<FullUser?> GetUserByEmailAsync(string email)
	{
		//await _context.User.Include(u => u.Location).FirstOrDefaultAsync(u => u.Email == email);

		UserInfo? login = await _login_context.User.AsQueryable().FirstOrDefaultAsync(u => u.Email == email);
		if (login == null)
		{
			return null;
		} 
		User? user = await GetUserByIdAsync(login.Id);
		return new FullUser(){user = user!, userInfo = login};
	}

	public async Task<List<FullUser>> GetAllUsersAsync()
	{
		List<User> userList = await _context.User.Include(u => u.Location).OrderBy(u => u.Id).ToListAsync();
		List<UserInfo> userInfoList = await _login_context.User.AsQueryable().OrderBy(u => u.Id).ToListAsync();
		if (userList.Count != userInfoList.Count)
		{
			throw new Exception("user and userinfo have different count");
		}
		List<FullUser> returnedList = [];
		for (int i = 0; i < userList.Count; i++)
		{
			// Should definitely not happen, if it does, rewrite the function
			if (userList[i].Id != userInfoList[i].Id)
			{
				throw new Exception("Ids not matching");
			}
			returnedList.Add(new FullUser(){user = userList[i], userInfo = userInfoList[i]});
		}
		
		
		return returnedList;
	}

	//TODO Check if it seems correct
	public async Task<FullUser> CreateUserAsync(CreateUserDto createUserDto)
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
		User? createdUser = await GetUserByIdAsync(user.Id);
		
		FullUser returnedUser = new FullUser(){user = createdUser!, userInfo = userInfo};
		return returnedUser;
	}


	//TODO check if correct
	public async Task<FullUser?> UpdateUserAsync(Guid id, UpdateUserDto updateUserDto)
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
		return new FullUser(){user = user, userInfo = userInfo};
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

	public async Task<FullUser?> UpdateSubordinatesAsync(Guid managerId, List<Guid> subordinateIds)
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

		return new FullUser(){user = manager, userInfo = (await GetUserInfoByIdAsync(manager.Id))!};
	}
}

public class FullUser
{
	public required User user { get; set; }
	public required UserInfo userInfo { get; set; }
} 