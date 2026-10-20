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
}
