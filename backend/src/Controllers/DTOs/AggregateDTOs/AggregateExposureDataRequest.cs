using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using ExposureType = Backend.Models.ExposureType;

namespace Backend.DTOs;

public record AggregateExposureDataRequestDto(
	[Required] DateTimeOffset StartTime,
	[Required] DateTimeOffset EndTime,
	[Required] TimeGranularity Granularity,
	[Required] AggregationFunction Function,
	Field? Field
) : IValidatableObject
{
	public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
	{
		if (Granularity == TimeGranularity.Minute)
		{
			yield return new ValidationResult(
				"Minutely granularity is not supported.",
				[nameof(Granularity)]
			);
		}
	}
}
