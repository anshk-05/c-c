namespace ConRes.Api.Dtos;

public class WriteFileRequest
{
    public int UserId { get; set; }
    public string Content { get; set; } = string.Empty;
}