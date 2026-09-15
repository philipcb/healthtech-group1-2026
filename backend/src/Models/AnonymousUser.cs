using Backend.Records;

namespace Backend.Models;

public class AnonymousUser
{
	public required Guid Id { get; set; }
	public string? JobDescription { get; set; }
	public required UserRole Role { get; set; }
	public required Guid LocationId { get; set; }

	/// <summary>
	/// The location associated with the user. If the user type is Worker, the user should not set a value and instead
	/// inherit the location from their supervisor.
	/// </summary>
	public Location? Location { get; set; }
	public ICollection<AnonymousUser> Managers { get; set; } = [];
	public ICollection<AnonymousUser> Subordinates { get; set; } = [];
	public ICollection<AnonymousVibrationData> VibrationData { get; set; } = [];
	public ICollection<AnonymousDustData> DustData { get; set; } = [];
	public ICollection<AnonymousNoiseData> NoiseData { get; set; } = [];
}
