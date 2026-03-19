namespace ConRes.Api.Dtos;

public class LoginRequest
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
}
