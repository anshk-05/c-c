namespace ConRes.Api.Dtos;

public class FileAccessStatusResponse
{
    public string FileName { get; set; } = string.Empty;
    public List<int> ReadingUserIds { get; set; } = new();
    public int? WritingUserId { get; set; }
}