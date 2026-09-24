using Backend.Models;

namespace Backend.DTOs;

public class UserInfoDto
{
	public Guid Id { get; set; }
	public required string Name { get; set; }
	public required string Email { get; set; }
	public string? JobDescription { get; set; }
	public required DateTime CreatedAt { get; set; }
	public required UserRole Role { get; set; }
	public LocationDto? Location { get; set; }

	public static UserInfoDto FromEntity(UserInfo user) =>
		new UserInfoDto
		{
			Id = user.Id,
			Name = user.Name,
			Email = user.Email,
			CreatedAt = user.CreatedAt,
			Role = user.Role,
		};
}

public class UserInfoWithStatusDto : UserInfoDto
{
	public required UserInfoStatusDto Status { get; set; }

	public static UserInfoWithStatusDto FromEntity(UserInfo user, UserInfoStatusDto status) =>
		new UserInfoWithStatusDto
		{
			Id = user.Id,
			Name = user.Name,
			Email = user.Email,
			CreatedAt = user.CreatedAt,
			Role = user.Role,
			Status = status,
		};
}

public class UserInfoStatusDto
{
	public Guid UserId { get; set; }
	public DangerLevel Status { get; set; }
	public UserExposureStatusDto? Noise { get; set; }
	public UserExposureStatusDto? Dust { get; set; }
	public UserExposureStatusDto? Vibration { get; set; }
}

