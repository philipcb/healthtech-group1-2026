using Backend.Models;
using Backend.Services;

namespace Backend.DTOs;

public class FullUserDto
{
	public Guid Id { get; set; }
	public required string Name { get; set; }
	public required string Email { get; set; }
	public string? JobDescription { get; set; }
	public required DateTime CreatedAt { get; set; }
	public required UserRole Role { get; set; }
	public LocationDto? Location { get; set; }

	public static FullUserDto FromEntity(User user, UserInfo userInfo) =>
		new FullUserDto
		{
			Id = user.Id,
			Name = userInfo.Name,
			Email = userInfo.Email,
			JobDescription = user.JobDescription,
			CreatedAt = userInfo.CreatedAt,
			Role = user.Role,
			Location = user.Location != null ? LocationDto.FromEntity(user.Location) : null,
		};
    
    public static FullUserDto FromEntity(FullUser fullUser) => FullUserDto.FromEntity(fullUser.user, fullUser.userInfo);
}

public class FullUserWithStatusDto : FullUserDto
{
	public required UserStatusDto Status { get; set; }

	public static FullUserWithStatusDto FromEntity(User user, UserInfo userInfo, UserStatusDto status) =>
		new FullUserWithStatusDto
		{
			Id = user.Id,
			Name = userInfo.Name,
			Email = userInfo.Email,
			JobDescription = user.JobDescription,
			CreatedAt = userInfo.CreatedAt,
			Role = user.Role,
			Location = user.Location != null ? LocationDto.FromEntity(user.Location) : null,
			Status = status,
		};

	public static FullUserWithStatusDto FromEntity(FullUser fullUser, UserStatusDto status) => FullUserWithStatusDto.FromEntity(fullUser.user, fullUser.userInfo, status);	

}

