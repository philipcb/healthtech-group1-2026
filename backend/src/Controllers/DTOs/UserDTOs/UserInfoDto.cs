using Backend.Models;

namespace Backend.DTOs;

public class UserInfoDto
{
	public Guid Id { get; set; }
	public required string Name { get; set; }
	public required string Email { get; set; }
	public string? JobDescription { get; set; }
	public required DateTime CreatedAt { get; set; }

	public LocationDto? Location { get; set; }

	public static UserInfoDto FromEntity(UserInfo user) =>
		new UserInfoDto
		{
			Id = user.Id,
			Name = user.Name,
			Email = user.Email,
			CreatedAt = user.CreatedAt,
		};
}

