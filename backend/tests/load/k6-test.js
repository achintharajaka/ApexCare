import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 25 },  // Ramp-up to 25 clinical users
    { duration: "1m", target: 100 },  // Peak hospital shift load (100 concurrent users)
    { duration: "30s", target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<800"], // 95% of queries must resolve under 800ms
    http_req_failed: ["rate<0.01"],   // Error rates must stay below 1%
  },
};

export default function () {
  const params = {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer DEMO_JWT_SESSION_TOKEN",
    },
  };

  const res = http.get("http://localhost:5000/api/dashboard/summary", params);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "latency within safe limit": (r) => r.timings.duration < 800,
  });

  sleep(1);
}
