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

    [HttpPost("read")]
    public async Task<IActionResult> ReadFile([FromBody] FileReadRequest request)
    {
        var result = await _fileService.ReadFileAsync(request.UserId);

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
            content = result.Content
        });
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