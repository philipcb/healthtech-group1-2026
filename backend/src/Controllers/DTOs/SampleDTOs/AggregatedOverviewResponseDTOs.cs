namespace Backend.DTOs;

using System.Collections.Generic;
using System.Text.Json.Serialization;


public sealed class AggregatedOverviewResponseDto
{
    [JsonPropertyName("units")]
    public MeasurementUnitsDto Units { get; set; } = new MeasurementUnitsDto{Dust = "ug", Noise = "db", Vibration = "points"};

    [JsonPropertyName("groups")]
    public List<SampleDto> Groups { get; set; } = new();
}

public sealed class MeasurementUnitsDto
{
    [JsonPropertyName("dust")]
    public required string Dust { get; set; } = "ug";

    [JsonPropertyName("noise")]
    public required string Noise { get; set; } = "db";

    [JsonPropertyName("vibration")]
    public required string Vibration { get; set; } = "points";
}

public sealed class SampleDto
{
    [JsonPropertyName("groupId")]
    public required Guid GroupId { get; set; }

    [JsonPropertyName("hall")]
    public Guid? Hall { get; set; } = null;

    [JsonPropertyName("occupation")]
    public String? Occupation { get; set; } = null;

    [JsonPropertyName("averages")]
    public SampleAveragesDto Averages { get; set; } = new();
}

public sealed class SampleAveragesDto
{
    [JsonPropertyName("dust")]
    public double? Dust { get; set; }

    [JsonPropertyName("noise")]
    public double? Noise { get; set; }

    [JsonPropertyName("vibration")]
    public double? Vibration { get; set; }
}