import client from "prom-client";
import { redis } from "../store/redis.js";

export const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

export const requestCounter = new client.Counter({
  name: "api_requests_total",
  help: "Total number of API requests",
});

// --- Redis-backed shared worker metrics ---

const JOBS_PROCESSED_KEY = "metrics:jobs_processed_total";
const JOB_TIME_COUNT_KEY = "metrics:job_time_count";
const JOB_TIME_SUM_KEY = "metrics:job_time_sum";
const HISTOGRAM_BUCKETS = [0.1, 0.5, 1, 2, 5];

/**
 * Workers call this after processing a job.
 * Uses Redis so all workers share the same counters.
 */
export async function recordJobProcessed(durationSeconds: number) {
  const pipeline = redis.pipeline();
  pipeline.incr(JOBS_PROCESSED_KEY);
  pipeline.incr(JOB_TIME_COUNT_KEY);
  pipeline.incrbyfloat(JOB_TIME_SUM_KEY, durationSeconds);
  for (const bucket of HISTOGRAM_BUCKETS) {
    if (durationSeconds <= bucket) {
      pipeline.incr(`metrics:job_time_bucket:${bucket}`);
    }
  }
  pipeline.incr("metrics:job_time_bucket:+Inf");
  await pipeline.exec();
}

/**
 * Reads aggregated worker metrics from Redis and returns Prometheus-formatted text.
 */
export async function getWorkerMetricsText(): Promise<string> {
  const keys = [
    JOBS_PROCESSED_KEY,
    JOB_TIME_COUNT_KEY,
    JOB_TIME_SUM_KEY,
    ...HISTOGRAM_BUCKETS.map((b) => `metrics:job_time_bucket:${b}`),
    "metrics:job_time_bucket:+Inf",
  ];

  const values = await redis.mget(...keys);
  const [total, count, sum, ...bucketCounts] = values;

  let text = "";

  // jobs_processed_total counter
  text += "# HELP jobs_processed_total Total jobs processed by workers\n";
  text += "# TYPE jobs_processed_total counter\n";
  text += `jobs_processed_total ${total || 0}\n\n`;

  // job_processing_time_seconds histogram
  text += "# HELP job_processing_time_seconds Time taken to process jobs\n";
  text += "# TYPE job_processing_time_seconds histogram\n";
  for (let i = 0; i < HISTOGRAM_BUCKETS.length; i++) {
    text += `job_processing_time_seconds_bucket{le="${HISTOGRAM_BUCKETS[i]}"} ${bucketCounts[i] || 0}\n`;
  }
  text += `job_processing_time_seconds_bucket{le="+Inf"} ${bucketCounts[HISTOGRAM_BUCKETS.length] || 0}\n`;
  text += `job_processing_time_seconds_sum ${sum || 0}\n`;
  text += `job_processing_time_seconds_count ${count || 0}\n`;

  return text;
}

export const register = client.register;