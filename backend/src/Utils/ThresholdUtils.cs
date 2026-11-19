using Backend.DTOs;
using Backend.Models;
using Backend.Records;

namespace Backend.Utils;

public static class ThresholdUtils
{
	/// <summary>
	/// Method that determines the correct danger level of exposure values from a list, by comparing them to thresholds
	/// </summary>
	public static IEnumerable<(
		RawExposureData data,
		(DangerLevel dangerLevel, DangerLevel? peakDangerLevel) dangerLevels
	)> CalculateDangerLevels(
		ExposureType exposureType,
		IEnumerable<RawExposureData> rawExposureData,
		Field? field = null
	)
	{
		var result =
			new List<(
				RawExposureData data,
				(DangerLevel dangerLevel, DangerLevel? peakDangerLevel) dangerLevels
			)>();

		// Vibration thresholds are calculated cumulatively over a Norwegian day
		if (exposureType == ExposureType.Vibration)
		{
			var sortedData = rawExposureData.OrderBy(data => data.Time).ToList();
			double cumulativeValue = 0;
			DateTime? currentDay = null;

			foreach (var data in sortedData)
			{
				var day = TimeWindowUtils.StartOfOsloDay(data.Time);
				if (currentDay != day)
				{
					cumulativeValue = 0;
					currentDay = day;
				}

				cumulativeValue += data.SumValue;

				result.Add(
					(data, CalculateDangerLevel(exposureType, cumulativeValue, null, field))
				);
			}

			return result;
		}

		foreach (var data in rawExposureData)
		{
			// We only use max value for noise thresholds to calculate peak danger levels
			double? maxValue = exposureType == ExposureType.Noise ? data.MaxValue : null;

			result.Add((data, CalculateDangerLevel(exposureType, data.AvgValue, maxValue, field)));
		}

		return result;
	}

	/// <summary>
	/// Method that determines the correct danger level of one exposure value, by comparing it to thresholds
	/// </summary>
	public static (DangerLevel dangerLevel, DangerLevel? peakDangerLevel) CalculateDangerLevel(
		ExposureType exposureType,
		double value,
		double? maxValue,
		Field? field = null
	)
	{
		Threshold threshold = Threshold.GetThresholdForExposureTypeAndField(exposureType, field);

		DangerLevel dangerLevel = DangerLevel.Safe;
		DangerLevel? peakDangerLevel = null;

		if (threshold.PeakDanger.HasValue && maxValue.HasValue)
		{
			if (maxValue.Value >= threshold.PeakDanger.Value)
			{
				peakDangerLevel = DangerLevel.Danger;
			}
			else
			{
				peakDangerLevel = DangerLevel.Safe;
			}
		}

		if (value >= threshold.Danger)
		{
			dangerLevel = DangerLevel.Danger;
		}
		else if (value >= threshold.Warning)
		{
			dangerLevel = DangerLevel.Warning;
		}

		return (dangerLevel, peakDangerLevel);
	}

	public static DangerLevel GetHighestDangerLevel(params DangerLevel?[] levels)
	{
		var worst = DangerLevel.Safe;
		foreach (var lvl in levels)
		{
			if (lvl.HasValue && lvl.Value > worst)
			{
				worst = lvl.Value;
			}
		}
		return worst;
	}
}
