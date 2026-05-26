using ConRes.Api.Dtos;

namespace ConRes.Api.Services;

public interface IRealtimeEventPublisher
{
    Task PublishSessionStateChangedAsync(SessionStateChangedResponse payload);
    Task PublishFileAccessChangedAsync(FileAccessChangedResponse payload);
    Task PublishFileUpdatedAsync(FileUpdatedResponse payload);
    Task PublishSystemStatusChangedAsync(string reason);
}
