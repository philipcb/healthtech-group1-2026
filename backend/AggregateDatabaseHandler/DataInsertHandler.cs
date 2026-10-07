using System.Text.RegularExpressions;
using Backend;
using Backend.Models;

public class DataInsertHandler(AggregateDbContext _context)
{
	public async Task addSamples(List<Sample> samples)
	{
		await _context.Set<Sample>().AddRangeAsync(samples);
	}

	
	public async Task addDataRange(List<DustAverage> datas)
	{
		await _context.DustAverages.AddRangeAsync(datas);
	}

	public async Task addDataRange(List<VibrationAverage> datas)
	{
		await _context.VibrationAverages.AddRangeAsync(datas);
	}
	
	public async Task addDataRange(List<NoiseAverage> datas)
	{
		await _context.NoiseAverages.AddRangeAsync(datas);
	}

};
