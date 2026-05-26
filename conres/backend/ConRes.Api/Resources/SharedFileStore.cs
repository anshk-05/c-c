namespace ConRes.Api.Resources;

public class SharedFileStore : ISharedFileStore
{
    private readonly string _filePath;

    public SharedFileStore(IWebHostEnvironment environment)
    {
        FileName = "ProductSpecification.txt";
        _filePath = Path.Combine(environment.ContentRootPath, "SharedFiles", FileName);
    }

    public string FileName { get; }

    public Task<string> ReadContentAsync(CancellationToken cancellationToken = default)
    {
        return File.ReadAllTextAsync(_filePath, cancellationToken);
    }

    public Task WriteContentAsync(string content, CancellationToken cancellationToken = default)
    {
        return File.WriteAllTextAsync(_filePath, content, cancellationToken);
    }
}
