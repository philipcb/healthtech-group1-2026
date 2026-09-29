namespace Backend.Models;

public class DustAverage
{
	public Guid SampleId { get; set; }
	public DateTime Time { get; set; }
	public double AveragePm1Stel { get; set; }
	public double AveragePm25Stel { get; set; }
	public double AveragePm4Stel { get; set; }
	public double AveragePm10Stel { get; set; }
	public double AveragePm1Twa { get; set; }
	public double AveragePm25Twa { get; set; }
	public double AveragePm4Twa { get; set; }
	public double AveragePm10Twa { get; set; }
	public Sample Sample { get; set; } = null!;
}
