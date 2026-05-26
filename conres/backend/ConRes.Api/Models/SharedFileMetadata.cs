namespace ConRes.Api.Models;

public class SharedFileMetadata
{
    public string FileName { get; set; } = string.Empty;
    public long Version { get; set; }
    public DateTime LastUpdatedUtc { get; set; }
}
