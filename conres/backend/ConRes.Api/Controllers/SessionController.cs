using ConRes.Api.Dtos;
using ConRes.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ConRes.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SessionController : ControllerBase
{
    private readonly SessionService _sessionService;
    private readonly FileService _fileService;

    public SessionController(SessionService sessionService, FileService fileService)
    {
        _sessionService = sessionService;
        _fileService = fileService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _sessionService.LoginAsync(request.UserId, request.Username);

        if (result.Success)
        {
            return Ok(new
            {
                message = result.Message,
                session = result.Session
            });
        }

        if (result.Queued)
        {
            return StatusCode(StatusCodes.Status202Accepted, new
            {
                message = result.Message
            });
        }

        return BadRequest(new
        {
            message = result.Message
        });
    }

    [HttpPost("logout")]
    public IActionResult Logout([FromBody] LogoutRequest request)
    {
        var success = _sessionService.Logout(request.UserId);

        if (!success)
        {
            return NotFound(new
            {
                message = "Active session not found."
            });
        }

        return Ok(new
        {
            message = "Logout successful."
        });
    }

    [HttpGet("active")]
    public IActionResult GetActiveSessions()
    {
        var sessions = _sessionService.GetActiveSessions();
        return Ok(sessions);
    }

    [HttpGet("status")]
    public IActionResult GetSystemStatus()
    {
        var fileStatus = _fileService.GetFileAccessStatus();

        var response = new SystemStatusResponse
        {
            ActiveUserIds = _sessionService.GetActiveSessions()
                .Select(s => s.UserId)
                .ToList(),
            WaitingUserIds = _sessionService.GetWaitingUserIds().ToList(),
            MaxConcurrentUsers = _sessionService.GetMaxConcurrentUsers(),
            AvailableSlots = _sessionService.GetAvailableSlots(),
            ReadingUserIds = fileStatus.ReadingUserIds,
            WritingUserId = fileStatus.WritingUserId,
            FileName = fileStatus.FileName
        };

        return Ok(response);
    }
}
