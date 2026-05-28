namespace ConRes.Api.Services;

public class StaleSessionCleanupService : BackgroundService
{
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromSeconds(10);

    private readonly SessionService _sessionService;
    private readonly ILogger<StaleSessionCleanupService> _logger;

    public StaleSessionCleanupService(
        SessionService sessionService,
        ILogger<StaleSessionCleanupService> logger)
    {
        _sessionService = sessionService;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CleanupInterval);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            var cleaned = _sessionService.CleanupStaleSessions();

            if (cleaned > 0)
            {
                _logger.LogInformation("Cleaned up {Count} stale session(s).", cleaned);
            }
        }
    }
}
