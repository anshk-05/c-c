namespace ConRes.Api.Dtos;

public class QueuedRequest
{
    public int UserId { get; set; }
    public bool IsWrite { get; set; }
    public int Position { get; set; }
}
