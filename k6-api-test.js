
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://host.docker.internal:8081';

export const options = {
  vus: 5,
  iterations: 20,
};

export default function () {
  // CREATE
  const createRes = http.post(
    `${BASE_URL}/tasks`,
    JSON.stringify({
      title: `k6 test task ${__VU}-${__ITER}`
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const created = check(createRes, {
    'POST task returns 201': (r) => r.status === 201,
  });

  if (!created) return;

  const task = createRes.json();
  const id = task.id;

  // READ
  const getRes = http.get(`${BASE_URL}/tasks`);

  check(getRes, {
    'GET tasks returns 200': (r) => r.status === 200,
  });

  // UPDATE
  const updateRes = http.put(
    `${BASE_URL}/tasks/${id}`,
    JSON.stringify({ completed: true }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(updateRes, {
    'PUT task returns 200': (r) =>
      r.status === 200 && r.json('completed') === true,
  });

  // DELETE
  const deleteRes = http.del(`${BASE_URL}/tasks/${id}`);

  check(deleteRes, {
    'DELETE task returns 200': (r) => r.status === 200,
  });

  sleep(1);
}
