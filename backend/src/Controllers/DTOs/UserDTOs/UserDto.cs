using Backend.Models;

namespace Backend.DTOs;

public class UserDto
{
	public Guid Id { get; set; }
	public string? JobDescription { get; set; }
	public LocationDto? Location { get; set; }

	public required UserRole Role { get; set; }

	public static UserDto FromEntity(User user) =>
		new UserDto
		{
			Id = user.Id,
			JobDescription = user.JobDescription,
			Location = user.Location != null ? LocationDto.FromEntity(user.Location) : null,
			Role = user.Role,
		};
}

public class UserWithStatusDto : UserDto
{
	public required UserStatusDto Status { get; set; }

	public static UserWithStatusDto FromEntity(User user, UserStatusDto status) =>
		new UserWithStatusDto
		{
			Id = user.Id,
			JobDescription = user.JobDescription,
			Location = user.Location != null ? LocationDto.FromEntity(user.Location) : null,
			Status = status,
			Role = user.Role,
		};
}

public class UserStatusDto
{
	public Guid UserId { get; set; }
	public DangerLevel Status { get; set; }
	public UserExposureStatusDto? Noise { get; set; }
	public UserExposureStatusDto? Dust { get; set; }
	public UserExposureStatusDto? Vibration { get; set; }
}

public record UserExposureStatusDto(
	DangerLevel dangerLevel,
	DangerLevel? peakDangerLevel,
	double Value,
	double? PeakValue
);
