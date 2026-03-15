namespace ConRes.Api.Models;

public class SessionInfo
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime LoginTimeUtc { get; set; }
}