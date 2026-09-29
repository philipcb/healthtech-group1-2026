using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Backend.Utils;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/users")]
public class UserController(IUserService _userService, IUserStatusService _userStatusService)
	: ControllerBase
{
	[HttpGet]
	public async Task<ActionResult<IEnumerable<FullUserDto>>> GetAllUsers()
	{
		List<FullUser> users = await _userService.GetAllUsersAsync();
		List<FullUserDto> dtos = users.Select(FullUserDto.FromEntity).ToList();
		Console.WriteLine("plz answerrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",dtos);
		return dtos;
	}

	[HttpGet("{id}")]
	public async Task<ActionResult<FullUserDto>> GetUserById(Guid id)
	{
		FullUser? user = await _userService.GetFullUserByIdAsync(id);
		if (user == null)
		{
			return NotFound();
		}

		return FullUserDto.FromEntity(user);
	}

	[HttpGet("{managerId}/subordinates")]
	public async Task<ActionResult<IEnumerable<FullUserWithStatusDto>>> GetSubordinates(
		Guid managerId,
		[FromQuery] DateTime? startTime,
		[FromQuery] DateTime? endTime
	)
	{
		List<FullUser> subordinates = await _userService.GetSubordinatesAsync(managerId);

		// Default to current day if no time range is provided
		DateTime start = startTime ?? DateTime.UtcNow.Date;
		DateTime end = endTime ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);

		IEnumerable<UserStatusDto> userStatuses = await _userStatusService.GetStatusForUsersInRange(
			subordinates.Select(u => u.user.Id),
			start,
			end
		);

		List<FullUserWithStatusDto> dtos = subordinates
			.Select(u =>
			{
				UserStatusDto? status = userStatuses.FirstOrDefault(s => s.UserId == u.userInfo.Id);
				return FullUserWithStatusDto.FromEntity(
					u,
					status ?? new UserStatusDto { UserId = u.user.Id, Status = DangerLevel.Safe }
				);
			})
			.ToList();

		return dtos;
	}

	[HttpGet("{managerId}/subordinates/threshold-summary")]
	public async Task<
		ActionResult<Dictionary<string, ExposureThresholdSummaryDto>>
	> GetSubordinatesThresholdStatus(
		Guid managerId,
		[FromQuery] DateTime? startTime,
		[FromQuery] DateTime? endTime
	)
	{
		List<FullUser> subordinates = await _userService.GetSubordinatesAsync(managerId);
		if (subordinates.Count == 0)
		{
			return Ok(new Dictionary<string, ExposureThresholdSummaryDto>());
		}

		var start = startTime ?? DateTime.UtcNow.Date;
		var end = endTime ?? DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);

		IEnumerable<UserStatusDto> userStatuses = await _userStatusService.GetStatusForUsersInRange(
			subordinates.Select(u => u.user.Id),
			start,
			end
		);

		var summary = new Dictionary<string, ExposureThresholdSummaryDto>(
			StringComparer.OrdinalIgnoreCase
		)
		{
			["noise"] = new ExposureThresholdSummaryDto(),
			["dust"] = new ExposureThresholdSummaryDto(),
			["vibration"] = new ExposureThresholdSummaryDto(),
			["total"] = new ExposureThresholdSummaryDto(),
		};

		// Helper function to safely increment the correct bucket
		void IncrementBucket(ExposureThresholdSummaryDto counts, DangerLevel? level)
		{
			switch (level)
			{
				case DangerLevel.Safe:
					counts.Safe++;
					break;
				case DangerLevel.Warning:
					counts.Warning++;
					break;
				case DangerLevel.Danger:
					counts.Danger++;
					break;
			}
		}

		foreach (var status in userStatuses)
		{
			IncrementBucket(summary["noise"], status.Noise?.dangerLevel);
			IncrementBucket(summary["dust"], status.Dust?.dangerLevel);
			IncrementBucket(summary["vibration"], status.Vibration?.dangerLevel);

			var highest = ThresholdUtils.GetHighestDangerLevel(
				status.Noise?.dangerLevel,
				status.Dust?.dangerLevel,
				status.Vibration?.dangerLevel
			);

			IncrementBucket(summary["total"], highest);
		}

		return Ok(summary);
	}

	[HttpPost]
	public async Task<ActionResult<FullUserDto>> CreateUser(CreateUserDto createUserDto)
	{
		FullUser user = await _userService.CreateUserAsync(createUserDto);

		return FullUserDto.FromEntity(user);
	}

	[HttpPut("{id}")]
	public async Task<ActionResult<FullUserDto>> UpdateUser(Guid id, UpdateUserDto updateUserDto)
	{
		FullUser? user = await _userService.UpdateUserAsync(id, updateUserDto);
		if (user == null)
		{
			return NotFound();
		}

		return FullUserDto.FromEntity(user);
	}

	[HttpDelete("{id}")]
	public async Task<IActionResult> DeleteUser(Guid id)
	{
		bool success = await _userService.DeleteUserAsync(id);
		if (!success)
		{
			return NotFound();
		}

		return NoContent();
	}

	[HttpPut("{managerId}/subordinates/delete")]
	public async Task<ActionResult<FullUserDto>> DeleteSubordinates(
		Guid managerId,
		List<Guid> subordinateIds
	)
	{
		List<FullUser> subordinates = await _userService.GetSubordinatesAsync(managerId);
		List<Guid> remainingSubordinateIds = subordinates
			.Select(s => s.user.Id)
			.Where(id => !subordinateIds.Contains(id))
			.ToList();

		FullUser? user = await _userService.UpdateSubordinatesAsync(managerId, remainingSubordinateIds);
		if (user == null)
		{
			return NotFound();
		}

		return FullUserDto.FromEntity(user);
	}

	[HttpPut("{managerId}/subordinates/create")]
	public async Task<ActionResult<FullUserDto>> CreateSubordinates(
		Guid managerId,
		List<Guid> subordinateIds
	)
	{
		List<FullUser> subordinates = await _userService.GetSubordinatesAsync(managerId);
		List<Guid> newSubordinateIdList = subordinates
			.Select(s => s.user.Id)
			.Concat(subordinateIds)
			.ToList();

		FullUser? user = await _userService.UpdateSubordinatesAsync(managerId, newSubordinateIdList);
		if (user == null)
		{
			return NotFound();
		}

		return FullUserDto.FromEntity(user);
	}
}
