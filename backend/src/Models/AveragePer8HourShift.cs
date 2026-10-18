namespace Backend.Models;

public class AveragePer8HourShift
{
	public Guid SampleId { get; set; }
	public DateTime Time { get; set; }
	public ExposureType ExposureType { get; set; }
	public double AverageTimeOverLimit { get; set; }
	public double AverageTimeOverAction { get; set; }
	public double AverageTimeInSafeLimits { get; set; }
	public Sample Sample { get; set; } = null!;
}
