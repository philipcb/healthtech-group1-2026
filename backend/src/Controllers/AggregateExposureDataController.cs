using System.Text.RegularExpressions;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Backend.Utils;
using Backend.Validation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Authorize(Policy = "AggregateExposureAccess")]
[Route("api/medical-team")]
public class AggregateExposureDataController(
	IAggregateExposureDataService aggregateExposureDataService
) : ControllerBase
{
	private readonly IAggregateExposureDataService _aggregateExposureDataService =
		aggregateExposureDataService;

	[HttpGet("groups/{groupId}/trend")]
	//[ServiceFilter(typeof(ValidateFieldForExposureTypeFilter))]
	[ProducesResponseType(typeof(AggregatedTrendResponseDto), StatusCodes.Status200OK)]
	public async Task<ActionResult<AggregatedTrendResponseDto>> GetSampleTrend(
		[FromRoute] Guid groupId,
		[FromQuery] ExposureType exposure,
		[FromQuery] string period,
		[FromQuery] int year,
		[FromQuery] int? month,
		[FromQuery] int? day,
		[FromQuery] bool isHourly,
		[FromQuery] string? dustField = null
	)
	{
		try
		{
			var timeLimits = TimeWindowUtils.GetPeriodLimit(period, year, month, day);

			AggregatedTrendResponseDto data = await _aggregateExposureDataService.GetTrendAsync(
				timeLimits.startTime,
				timeLimits.endTime,
				groupId,
				exposure,
				dustField,
				isHourly
			);

			return Ok(data);
		}
		catch (ArgumentException ex)
		{
			return BadRequest($"The request is invalid: {ex.Message}");
		}
		catch (Exception)
		{
			return StatusCode(500, "Internal server error");
		}
	}

	[HttpGet("groups")]
	//[ServiceFilter(typeof(ValidateFieldForExposureTypeFilter))]
	[ProducesResponseType(typeof(AggregatedOverviewResponseDto), StatusCodes.Status200OK)]
	public async Task<ActionResult<AggregatedOverviewResponseDto>> GetAggregateOverview(
		[FromQuery] string period,
		[FromQuery] int year,
		[FromQuery] int? month,
		[FromQuery] int? day,
		[FromQuery] string? dustField = null
	)
	{
		try
		{
			var timeLimits = TimeWindowUtils.GetPeriodLimit(period, year, month, day);

			return new AggregatedOverviewResponseDto
			{
				Units = new MeasurementUnitsDto()
				{
					Dust = "ug",
					Noise = "db",
					Vibration = "points",
				},
				Groups =
					(List<SampleDto>)
						await _aggregateExposureDataService.GetOverviewAggregateDataAsync(
							timeLimits.startTime,
							timeLimits.endTime,
							dustField,
							period == "day"
						),
			};
		}
		catch (ArgumentException ex)
		{
			return BadRequest($"The request is invalid: {ex.Message}");
		}
	}
}
