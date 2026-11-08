using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

public sealed class AggregatedTrendResponseDto
{
	[JsonPropertyName("status")]
	public required string Status { get; set; } = "ok";

	// Present when status == "ok"
	[JsonPropertyName("group")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public TrendSampleDto? Group { get; set; }

	[JsonPropertyName("unit")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? Unit { get; set; }

	[JsonPropertyName("average")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public double? Average { get; set; }

	[JsonPropertyName("granularity")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? Granularity { get; set; }

	[JsonPropertyName("points")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public List<TrendPointDto>? Points { get; set; }

	[JsonPropertyName("dayCount")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public int DayCount { get; set; }

	[JsonPropertyName("hourCount")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public int HourCount { get; set; }

	[JsonPropertyName("rateOfHourAboveAction")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public double RateOfHourAboveAction { get; set; }

	[JsonPropertyName("rateOfHourAboveLimit")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public double RateOfHourAboveLimit { get; set; }

	[JsonPropertyName("rateOfDayAboveAction")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public double RateOfDayAboveAction { get; set; }

	[JsonPropertyName("rateOfDayAboveLimit")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public double RateOfDayAboveLimit { get; set; }

	// Present when status == "unavailable"
	[JsonPropertyName("reason")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? Reason { get; set; }
}

public sealed class TrendSampleDto
{
	[JsonPropertyName("hall")]
	public Guid? Hall { get; set; } = null;

	[JsonPropertyName("occupation")]
	public string? Occupation { get; set; } = null;
}

public sealed class TrendPointDto
{
	[JsonPropertyName("time")]
	public DateTime Time { get; set; }

	// Null means the measurement is hidden for privacy
	[JsonPropertyName("value")]
	public double? Value { get; set; }

	// Share (0 to 1) of worker of the group who went over action value for the day (same as number of days above action value for 1 day)
	[JsonPropertyName("rateOfWorkerOverAction")]
	public double? RateOfWorkerOverAction { get; set; }

	// Share (0 to 1) of worker of the group who went over limit for the day (same as number of days above limit for 1 day)
	[JsonPropertyName("rateOfWorkerOverLimit")]
	public double? RateOfWorkerLimit { get; set; }

	// Share (0 to 1) of hours of the group over the action value, including over the limit, for the day of "Time"
	[JsonPropertyName("averageTimeOverAction")]
	public double? AverageTimeOverAction { get; set; }

	// Share (0 to 1) of hours over the limit, for the day of "Time"
	[JsonPropertyName("averageTimeOverLimit")]
	public double? AverageTimeOverLimit { get; set; }
}
