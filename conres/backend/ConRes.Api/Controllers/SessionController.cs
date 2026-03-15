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

        if (!result.Success)
        {
            return BadRequest(new
            {
                message = result.Message
            });
        }

        return Ok(new
        {
            message = result.Message,
            session = result.Session
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
}