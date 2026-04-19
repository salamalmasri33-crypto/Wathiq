import http from 'k6/http';
import { check, sleep } from 'k6';

const API_BASE_URL = __ENV.WATHIQ_API_BASE_URL || 'http://127.0.0.1:5005/api';
const USER_EMAIL = __ENV.WATHIQ_TEST_EMAIL || 'admin@example.com';
const USER_PASSWORD = __ENV.WATHIQ_TEST_PASSWORD || 'Admin@123';
const SEARCH_QUERY = __ENV.WATHIQ_SEARCH_QUERY || 'report';

export const options = {
  vus: Number(__ENV.WATHIQ_K6_VUS || 5),
  duration: __ENV.WATHIQ_K6_DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

function buildSummary(data) {
  return {
    checks: data.metrics.checks,
    http_req_duration: data.metrics.http_req_duration,
    http_req_failed: data.metrics.http_req_failed,
    iterations: data.metrics.iterations,
  };
}

export function setup() {
  const response = http.post(
    `${API_BASE_URL}/auth/login`,
    JSON.stringify({
      email: USER_EMAIL,
      password: USER_PASSWORD,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
    }
  );

  check(response, {
    'login status is 200': (res) => res.status === 200,
    'login returns token': (res) => {
      try {
        return !!res.json('token');
      } catch {
        return false;
      }
    },
  });

  return {
    token: response.json('token'),
  };
}

export default function (data) {
  const response = http.post(
    `${API_BASE_URL}/documents/search`,
    JSON.stringify({
      query: SEARCH_QUERY,
      sortBy: 'CreatedAt',
      desc: true,
    }),
    {
      headers: {
        Authorization: `Bearer ${data.token}`,
        'Content-Type': 'application/json',
      },
      timeout: '30s',
    }
  );

  check(response, {
    'search status is 200': (res) => res.status === 200,
  });

  sleep(1);
}

export function handleSummary(data) {
  const summary = buildSummary(data);

  return {
    'tests/performance/results/k6-summary.json': JSON.stringify(summary, null, 2),
    stdout: JSON.stringify(summary, null, 2),
  };
}
