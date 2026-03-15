namespace ConRes.Api.Dtos;

public class SystemStatusResponse
{
    public List<int> ActiveUserIds { get; set; } = new();
    public List<int> WaitingUserIds { get; set; } = new();
    public int MaxConcurrentUsers { get; set; }
    public int AvailableSlots { get; set; }
}