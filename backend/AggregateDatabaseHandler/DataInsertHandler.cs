using System.Text.RegularExpressions;
using Backend;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

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

	public async Task addDataRange(List<AveragePer8HourShift> datas)
	{
		await _context.AveragesPer8HourShift.AddRangeAsync(datas);
	}

	// Removes a group's rows for an exposure from `startTime`, so they can be computed again without duplicate keys
	public async Task removeDataFrom(Guid sampleId, ExposureType exposureType, DateTime startTime)
	{
		switch (exposureType)
		{
			case ExposureType.Dust:
				await _context
					.DustAverages.Where(d => d.SampleId == sampleId && d.Time >= startTime)
					.ExecuteDeleteAsync();
				break;
			case ExposureType.Noise:
				await _context
					.NoiseAverages.Where(d => d.SampleId == sampleId && d.Time >= startTime)
					.ExecuteDeleteAsync();
				break;
			case ExposureType.Vibration:
				await _context
					.VibrationAverages.Where(d => d.SampleId == sampleId && d.Time >= startTime)
					.ExecuteDeleteAsync();
				break;
		}

		await _context
			.AveragesPer8HourShift.Where(d =>
				d.SampleId == sampleId && d.ExposureType == exposureType && d.Time >= startTime
			)
			.ExecuteDeleteAsync();
	}
};
