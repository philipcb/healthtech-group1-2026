using Backend.Records;

namespace Backend.Models;

public class AnonymousUser
{
	public required Guid UserId { get; set; }
	public string? JobDescription { get; set; }
	public required UserRole Role { get; set; }
	public required Guid LocationId { get; set; }

	/// <summary>
	/// The location associated with the user. If the user type is Worker, the user should not set a value and instead
	/// inherit the location from their supervisor.
	/// </summary>
	public Location? Location { get; set; }
	public ICollection<User> Managers { get; set; } = [];
	public ICollection<User> Subordinates { get; set; } = [];
	public ICollection<VibrationData> VibrationData { get; set; } = [];
	public ICollection<DustData> DustData { get; set; } = [];
	public ICollection<NoiseData> NoiseData { get; set; } = [];
}
