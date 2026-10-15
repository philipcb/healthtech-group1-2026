namespace Backend.Models;

public class Sample
{
	public Guid Id { get; set; }
	public int SampleCount { get; set; }
	public required string Site { get; set; }
	public string? LocationQualifier{ get; set; }
	public string? LocationName{ get; set; }
	public string? JobQualifier{ get; set; }
	public ICollection<NoiseAverage> NoiseAverages { get; set; } = [];
	public ICollection<DustAverage> DustAverages { get; set; } = [];
	public ICollection<VibrationAverage> VibrationAverages { get; set; } = [];
	public ICollection<AveragePer8HourShift> AveragesPer8HourShift { get; set; } = [];
}
