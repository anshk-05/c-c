using ConRes.Api.Dtos;
using ConRes.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ConRes.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FileController : ControllerBase
{
    private readonly FileService _fileService;

    public FileController(FileService fileService)
    {
        _fileService = fileService;
    }

    [HttpPost("acquireRead")]
    public async Task<IActionResult> AcquireRead([FromBody] FileReadRequest request, CancellationToken cancellationToken)
    {
        var result = await _fileService.AcquireReadAsync(request.UserId, cancellationToken);

        if (!result.Success)
            return BadRequest(new { message = result.Message });

        return Ok(new { message = result.Message, content = result.Content });
    }

    [HttpPost("releaseRead")]
    public async Task<IActionResult> ReleaseRead([FromBody] FileReadRequest request)
    {
        var result = await _fileService.ReleaseReadAsync(request.UserId);

        if (!result.Success)
            return BadRequest(new { message = result.Message });

        return Ok(new { message = result.Message });
    }

    [HttpPost("acquireWrite")]
    public async Task<IActionResult> AcquireWrite([FromBody] FileReadRequest request, CancellationToken cancellationToken)
    {
        var result = await _fileService.AcquireWriteLockAsync(request.UserId, cancellationToken);
        if (!result.Success)
            return BadRequest(new { message = result.Message });
        return Ok(new { message = result.Message });
    }

    [HttpPost("releaseWrite")]
    public async Task<IActionResult> ReleaseWrite([FromBody] FileReadRequest request)
    {
        var result = await _fileService.ReleaseWriteLockAsync(request.UserId);
        if (!result.Success)
            return BadRequest(new { message = result.Message });
        return Ok(new { message = result.Message });
    }

    [HttpPost("write")]
    public async Task<IActionResult> WriteFile([FromBody] WriteFileRequest request)
    {
        var result = await _fileService.WriteFileAsync(request.UserId, request.Content);

        if (!result.Success)
        {
            return BadRequest(new
            {
                message = result.Message
            });
        }

        return Ok(new
        {
            message = result.Message
        });
    }

    [HttpGet("status")]
    public IActionResult GetFileStatus()
    {
        var status = _fileService.GetFileAccessStatus();
        return Ok(status);
    }
}