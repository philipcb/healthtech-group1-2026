namespace Backend.Models;

public class NoiseAverage
{
	public Guid SampleId { get; set; }
	public DateTime Time { get; set; }
	public double AverageLcpk { get; set; }
	public double AverageLaeq { get; set; }
	public Sample Sample { get; set; } = null!;
}
