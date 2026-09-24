using Backend.Records;

namespace Backend.Models;

public class UserInfo
{
	public Guid Id { get; set; }
	public required string Name { get; set; }
	public required string Email { get; set; }
	public required string PasswordHash { get; set; }
	public required DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	public required UserRole Role { get; set; }
	
}
