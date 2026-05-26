using ConRes.Api.Dtos;
using ConRes.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace ConRes.Api.Services;

public class SignalRRealtimeEventPublisher : IRealtimeEventPublisher
{
    private readonly IHubContext<DistResHub> _hubContext;
    private readonly ILogger<SignalRRealtimeEventPublisher> _logger;

    public SignalRRealtimeEventPublisher(
        IHubContext<DistResHub> hubContext,
        ILogger<SignalRRealtimeEventPublisher> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public Task PublishSessionStateChangedAsync(SessionStateChangedResponse payload)
    {
        return SendAsync("SessionStateChanged", payload);
    }

    public Task PublishFileAccessChangedAsync(FileAccessChangedResponse payload)
    {
        return SendAsync("FileAccessChanged", payload);
    }

    public async Task PublishFileUpdatedAsync(FileUpdatedResponse payload)
    {
        await SendAsync("FileUpdated", payload);
        await PublishSystemStatusChangedAsync("file-updated");
    }

    public Task PublishSystemStatusChangedAsync(string reason)
    {
        return SendAsync("SystemStatusChanged", new SystemStatusChangedResponse
        {
            Reason = reason,
            OccurredAtUtc = DateTime.UtcNow
        });
    }

    private async Task SendAsync(string eventName, object payload)
    {
        try
        {
            await _hubContext.Clients.All.SendAsync(eventName, payload);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish realtime event {EventName}.", eventName);
        }
    }
}
