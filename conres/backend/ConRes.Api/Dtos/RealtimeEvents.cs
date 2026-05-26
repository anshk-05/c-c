namespace ConRes.Api.Dtos;

public class SessionStateChangedResponse
{
    public string Reason { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; }
    public List<int> ActiveUserIds { get; set; } = new();
    public List<int> WaitingUserIds { get; set; } = new();
    public int MaxConcurrentUsers { get; set; }
    public int AvailableSlots { get; set; }
}

public class FileAccessChangedResponse
{
    public string Reason { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; }
    public FileAccessStatusResponse Status { get; set; } = new();
}

public class FileUpdatedResponse
{
    public string FileName { get; set; } = string.Empty;
    public long FileVersion { get; set; }
    public int UserId { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public class SystemStatusChangedResponse
{
    public string Reason { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; }
}
