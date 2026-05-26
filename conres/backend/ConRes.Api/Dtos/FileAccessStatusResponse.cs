namespace ConRes.Api.Dtos;

public class FileAccessStatusResponse
{
    public string FileName { get; set; } = string.Empty;
    public long FileVersion { get; set; }
    public DateTime LastUpdatedUtc { get; set; }
    public int? LastUpdatedByUserId { get; set; }
    public List<int> ReadingUserIds { get; set; } = new();
    public int? WritingUserId { get; set; }
    public List<QueuedRequest> Queue { get; set; } = new();
}
