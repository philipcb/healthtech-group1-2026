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

	// Share (0 to 1) over the action value, including over the limit, always from the group's values in the chart. For
	// noise and dust the share of the day's hours where the group's hourly average was over it. For vibration 1 when the
	// group's daily value, the average of the workers' daily totals, was over it, and 0 otherwise, so the period's average
	// is the share of the days. Null when there is none.
	[JsonPropertyName("averageTimeOverAction")]
	public double? AverageTimeOverAction { get; set; }

	// Share (0 to 1) over the limit, measured like `AverageTimeOverAction`. Null when there is none.
	[JsonPropertyName("averageTimeOverLimit")]
	public double? AverageTimeOverLimit { get; set; }
}
