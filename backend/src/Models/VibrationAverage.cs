namespace Backend.Models;

public class VibrationAverage
{
	public Guid SampleId { get; set; }
	public DateTime Time { get; set; }
	public double AverageExposure { get; set; }
	public Sample Sample { get; set; } = null!;
}
