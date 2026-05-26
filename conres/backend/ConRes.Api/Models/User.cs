using System.Text.Json.Serialization;

namespace ConRes.Api.Models;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    [JsonIgnore]
    public string Password { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}
