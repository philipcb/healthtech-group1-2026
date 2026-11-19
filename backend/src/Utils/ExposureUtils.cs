using Backend.DTOs;
using Backend.Models;
using Backend.Records;

namespace Backend.Utils;

public class ExposureUtils
{
	/// <summary>
	/// Method that returns the name of a materialized view, from granularity and exposureType
	/// </summary>
	public static string GetMaterializedViewName(
		ExposureType exposureType,
		TimeGranularity granularity
	)
	{
		var exposureTypeLower = exposureType.ToString().ToLower();

		var exposureType_split = exposureTypeLower + "_data";

		return granularity switch
		{
			TimeGranularity.Minute => exposureType_split + "_minutely",
			TimeGranularity.Hour => exposureType_split + "_hourly",
			TimeGranularity.Day => exposureType_split + "_daily",
			_ => throw new ArgumentException($"Unsupported scope: {granularity}"),
		};
	}

	/// <summary>
	/// Method that returns the name of a aggregated materialized view, from an AggregationFunction, and ExposureType and a Field (null if not dust)
	/// </summary>
	public static string GetAggregateColumnName(
		AggregationFunction function,
		ExposureType exposureType,
		Field? field
	)
	{
		var exposureTypeLower = exposureType.ToString().ToLower();

		// Noise uses laeq for average and lcpk for max
		if (exposureType == ExposureType.Noise)
		{
			if (function == AggregationFunction.Avg)
			{
				return "avg_noise_laeq";
			}
			else if (function == AggregationFunction.Max)
			{
				return "max_noise_lcpk";
			}
		}

		var aggregateColumnName = function switch
		{
			AggregationFunction.Avg => "avg_" + exposureTypeLower,
			AggregationFunction.Sum => "sum_" + exposureTypeLower,
			AggregationFunction.Min => "min_" + exposureTypeLower,
			AggregationFunction.Max => "max_" + exposureTypeLower,
			AggregationFunction.Count => "sample_count",
			_ => throw new ArgumentException($"Unsupported aggregation type: {function}"),
		};

		if (field.HasValue)
		{
			aggregateColumnName += "_" + field.Value.ToString().ToLower();
		}

		if (exposureType == ExposureType.Noise)
		{
			if (function == AggregationFunction.Max)
			{
				aggregateColumnName += "_lcpk";
			}
			else
			{
				aggregateColumnName += "_laeq";
			}
		}

		return aggregateColumnName;
	}

	/// <summary>
	/// Method that transforms RawExposuresData to their cumulative alternative (value of different hours are summed during the day)
	/// Only works for Vibration, doesn't change RawExposureData otherwise
	/// </summary>
	public static List<RawExposureData> CumulateVibrationSumValues(
		ExposureType exposure,
		AggregationFunction function,
		List<RawExposureData> rawData
	)
	{
		// Only summed vibration data is cumulative
		if (exposure != ExposureType.Vibration || function != AggregationFunction.Sum)
		{
			return rawData;
		}

		List<RawExposureData> result = [];

		// The points add up over a Norwegian day, and start from 0 at midnight in Oslo
		var sortedData = rawData.OrderBy(data => data.Time).ToList();
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

			cumulativeValue += data.Value;
			result.Add(
				new RawExposureData(
					data.Time,
					cumulativeValue,
					data.AvgValue,
					data.MaxValue,
					data.SumValue,
					data.UserId
				)
			);
		}

		return result;
	}
}
