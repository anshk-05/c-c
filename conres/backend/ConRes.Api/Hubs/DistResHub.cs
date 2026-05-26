using Microsoft.AspNetCore.SignalR;

namespace ConRes.Api.Hubs;

public class DistResHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("ServerConnected", new
        {
            Context.ConnectionId,
            ConnectedAtUtc = DateTime.UtcNow
        });

        await base.OnConnectedAsync();
    }
}
