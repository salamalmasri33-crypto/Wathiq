# Bonus Performance Optimization Case Study

## Goal

Identify a realistic bottleneck in the system, optimize it, and provide measurable evidence.

## Bottleneck Identified

The `/api/documents/search` endpoint originally returned full `Document` entities. That response shape included heavy or unnecessary fields for a search-results screen, especially:

- `Content` (OCR extracted text, potentially very large)
- `FilePath`
- `FileHash`

The frontend search-related pages do not need those fields to render result lists. Returning them made every search response heavier than necessary.

## Optimization Applied

The search flow now returns a lightweight projection:

- `SearchDocumentItemDto`
- `SearchDocumentMetadataDto`
- `SearchDocumentsResponseDto`

This keeps the fields actually needed by the UI:

- identity and title
- file name and content type
- size and timestamps
- owner id and department
- lightweight metadata used by filters and result cards

At the repository level, the MongoDB query now projects directly into the lightweight DTO instead of materializing full `Document` objects for API search responses.

## Evidence

### A. Existing k6 baseline

From [tests/performance/results/summary.md](/Users/LENOVO/Desktop/project_testing/tests/performance/results/summary.md):

- Load profile: 5 virtual users for 30 seconds
- Average response time: `19.34 ms`
- p95 response time: `87.23 ms`
- Throughput: `4.87 iterations/second`
- Failed requests: `0%`

This baseline showed the flow was stable, but it did not expose the hidden payload inefficiency of returning full documents.

### B. Isolated optimization evidence

Measured with the integration test:
[SearchPerformanceEvidenceTests.cs](/Users/LENOVO/Desktop/project_testing/tests/eArchiveSystem.IntegrationTests/Documents/SearchPerformanceEvidenceTests.cs)

Test setup:

- isolated MongoDB test database
- 30 seeded documents
- each document includes `12,000` characters of OCR `Content`
- 5 repeated authenticated search requests against the real API

Observed results:

| Metric | Before (full document payload model) | After (optimized search DTO) |
| --- | ---: | ---: |
| Representative response payload size | `380,269 bytes` | `14,536 bytes` |
| Payload reduction | - | `96.18% smaller` |
| Average optimized search response time | - | `35.10 ms` |

## Why This Is A Good Optimization

- It reduces network transfer for every search call.
- It lowers frontend memory pressure when rendering lists of documents.
- It avoids sending large OCR text to pages that do not use it.
- It reduces accidental exposure of internal fields such as file paths and hashes.
- It keeps the API behavior correct while making the contract more intentional and production-like.

## Reproducibility

You can rerun the evidence test with:

```powershell
$env:WATHIQ_TEST_MONGODB_CONNECTION="mongodb://localhost:27017"
dotnet test tests/eArchiveSystem.IntegrationTests/eArchiveSystem.IntegrationTests.csproj `
  --filter FullyQualifiedName~SearchPerformanceEvidenceTests `
  --logger "console;verbosity=detailed"
```

The test prints:

- `baselineFullDocumentBytes`
- `optimizedSearchResponseBytes`
- `payloadReductionPct`
- `averageSearchResponseMs`

## Summary

This bonus optimization focuses on a real backend inefficiency in the document-search flow. The endpoint still returns the same useful search information, but without shipping large OCR content and internal storage fields on every request. In the measured scenario, the search payload became `96.18%` smaller, which is a strong and defensible optimization result for the assignment.
