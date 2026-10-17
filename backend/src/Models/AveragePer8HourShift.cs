namespace Backend.Models;

public class AveragePer8HourShift
{
	public Guid SampleId { get; set; }
	public DateTime Time { get; set; }
	public ExposureType ExposureType { get; set; }
	public float AverageTimeOverLimit { get; set; }
	public float AverageTimeOverAction { get; set; }
	public float AverageTimeInSafeLimits { get; set; }
	public Sample Sample { get; set; } = null!;
}
