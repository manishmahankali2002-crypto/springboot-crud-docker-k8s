
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '30s', target: 500 },
    { duration: '60s', target: 500 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const response = http.get('http://host.docker.internal:8085');

  check(response, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(0.1);
}
