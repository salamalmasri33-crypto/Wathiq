# Performance Test Summary

Date: 2026-04-19
Scenario: `k6/login-and-search.js`
Flow: bootstrap admin login followed by authenticated document search
Load profile: 5 virtual users for 30 seconds

## Results

- Total iterations: 150
- Throughput: 4.87 iterations/second
- Average response time: 19.34 ms
- Median response time: 10.00 ms
- 90th percentile: 34.81 ms
- 95th percentile: 87.23 ms
- Maximum response time: 233.10 ms
- Failed requests: 0%
- Checks passed: 100%

## Interpretation

- The tested login and search flow stayed stable during the 30-second run.
- The `p95` response time remained well below the configured threshold of `1500 ms`.
- No request failures were observed, so the flow handled the current load reliably.
- No obvious bottleneck appeared at this load level. If you want bonus optimization evidence later, the next useful step would be rerunning the same script with higher virtual-user counts and comparing before/after results.
