using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Domain.Models;
using eArchiveSystem.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace eArchiveSystem.IntegrationTests.Documents;

public class SearchPerformanceEvidenceTests : IClassFixture<IntegrationWebApplicationFactory>
{
    private readonly IntegrationWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public SearchPerformanceEvidenceTests(
        IntegrationWebApplicationFactory factory,
        ITestOutputHelper output)
    {
        _factory = factory;
        _output = output;
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
    }

    [Fact]
    public async Task SearchPayloadOptimizationEvidence_ShowsProjectedResponseIsSignificantlySmaller()
    {
        await _factory.ResetDatabaseAsync();

        var manager = await _factory.SeedUserAsync(
            email: "manager-performance@example.com",
            password: "Password@123",
            role: "Manager",
            department: "Finance");

        var seededDocuments = new List<Document>();

        for (var i = 1; i <= 30; i++)
        {
            seededDocuments.Add(await _factory.SeedDocumentAsync(
                userId: $"finance-user-{i:000}",
                title: $"Performance Search Report {i:000}",
                department: "Finance",
                metadata: new Metadata
                {
                    Description = $"Detailed finance report {i:000}",
                    Category = "Finance",
                    DocumentType = "Report",
                    Tags = new List<string> { "finance", "report", "performance" },
                    Department = "Finance"
                },
                fileHash: $"perf-hash-{i:000}",
                content: new string('A', 12_000)));
        }

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _factory.GenerateJwtToken(manager));

        await WarmUpSearchAsync();

        var stopwatch = Stopwatch.StartNew();
        HttpResponseMessage? lastResponse = null;

        for (var i = 0; i < 5; i++)
        {
            lastResponse = await PostSearchAsync();
            lastResponse.EnsureSuccessStatusCode();
        }

        stopwatch.Stop();

        var responseBytes = (await lastResponse!.Content.ReadAsByteArrayAsync()).Length;
        var responsePayload = await lastResponse.Content.ReadFromJsonAsync<SearchDocumentsResponseDto>();
        var baselineBytes = Encoding.UTF8.GetByteCount(
            JsonSerializer.Serialize(seededDocuments, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
        var avgResponseMs = stopwatch.Elapsed.TotalMilliseconds / 5d;
        var reductionPercent = (1d - ((double)responseBytes / baselineBytes)) * 100d;

        _output.WriteLine($"baselineFullDocumentBytes={baselineBytes}");
        _output.WriteLine($"optimizedSearchResponseBytes={responseBytes}");
        _output.WriteLine($"payloadReductionPct={reductionPercent:F2}");
        _output.WriteLine($"averageSearchResponseMs={avgResponseMs:F2}");

        Assert.NotNull(responsePayload);
        Assert.Equal(30, responsePayload!.Total);
        Assert.Equal(30, responsePayload.Items.Count);
        Assert.True(responseBytes < baselineBytes / 4,
            $"Expected projected search payload to be at most 25% of the full-document payload, but got {responseBytes} vs {baselineBytes} bytes.");
    }

    private async Task WarmUpSearchAsync()
    {
        var response = await PostSearchAsync();
        response.EnsureSuccessStatusCode();
    }

    private Task<HttpResponseMessage> PostSearchAsync()
    {
        return _client.PostAsJsonAsync("/api/documents/search", new
        {
            Query = "report",
            SortBy = "CreatedAt",
            Desc = true
        });
    }
}
