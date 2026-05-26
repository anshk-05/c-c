namespace ConRes.Api.Dtos;

public class SystemStatusResponse
{
    public List<int> ActiveUserIds { get; set; } = new();
    public List<int> WaitingUserIds { get; set; } = new();
    public int MaxConcurrentUsers { get; set; }
    public int AvailableSlots { get; set; }
    public List<int> ReadingUserIds { get; set; } = new();
    public int? WritingUserId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileVersion { get; set; }
    public DateTime LastUpdatedUtc { get; set; }
    public int? LastUpdatedByUserId { get; set; }
    public List<QueuedRequest> FileQueue { get; set; } = new();
}
