namespace Backend.Models;

public class AveragePer8HourShift
{
	public Guid SampleId { get; set; }
	public DateTime Time { get; set; }
	public ExposureType ExposureType { get; set; }
	public TimeSpan AverageTimeOverLimit { get; set; }
	public TimeSpan AverageTimeOverAction { get; set; }
	public TimeSpan AverageTimeInSafeLimits { get; set; }
	public Sample Sample { get; set; } = null!;
}
