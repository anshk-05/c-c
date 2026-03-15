using ConRes.Api.Dtos;
using ConRes.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ConRes.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SessionController : ControllerBase
{
    private readonly SessionService _sessionService;

    public SessionController(SessionService sessionService)
    {
        _sessionService = sessionService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _sessionService.LoginAsync(request.Username);

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

        _sessionService.TryPromoteNextWaitingUser();

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
        var response = new SystemStatusResponse
        {
            ActiveUserIds = _sessionService.GetActiveSessions()
                .Select(s => s.UserId)
                .ToList(),
            WaitingUserIds = _sessionService.GetWaitingUserIds().ToList(),
            MaxConcurrentUsers = _sessionService.GetMaxConcurrentUsers(),
            AvailableSlots = _sessionService.GetAvailableSlots()
        };

        return Ok(response);
    }
}