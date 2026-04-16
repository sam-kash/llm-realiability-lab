import client from "prom-client";
import { redis } from "../store/redis.js";

// --- API server metrics (prom-client, in-memory) ---

export const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

export const requestCounter = new client.Counter({
  name: "api_requests_total",
  help: "Total number of API requests",
});

// --- Per-worker metrics (prom-client, local to each worker process) ---

export const workerRegister = new client.Registry();
client.collectDefaultMetrics({ register: workerRegister }); // CPU, memory, event loop lag

export const jobProcessingTime = new client.Histogram({
  name: "job_processing_time_seconds",
  help: "Time taken to process jobs",
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [workerRegister],
});

// --- Redis-backed shared counters (global aggregation) ---

const JOBS_PROCESSED_KEY = "metrics:jobs_processed_total";

/**
 * Workers call this after processing a job.
 * - Increments global counter in Redis (shared across all workers)
 * - Observes latency in local prom-client histogram (per-worker)
 */
export async function recordJobProcessed(durationSeconds: number) {
  // Global counter → Redis
  await redis.incr(JOBS_PROCESSED_KEY);
  // Local histogram → prom-client (per-worker, for p95/p99/distribution)
  jobProcessingTime.observe(durationSeconds);
}

/**
 * Reads aggregated global counters from Redis.
 * Used by the API server's /metrics endpoint.
 */
export async function getWorkerMetricsText(): Promise<string> {
  const total = await redis.get(JOBS_PROCESSED_KEY);

  let text = "";
  text += "# HELP jobs_processed_total Total jobs processed by all workers\n";
  text += "# TYPE jobs_processed_total counter\n";
  text += `jobs_processed_total ${total || 0}\n`;

  return text;
}

export const register = client.register;