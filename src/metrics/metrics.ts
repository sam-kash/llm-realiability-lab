import client from "prom-client";

export const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

export const requestCounter = new client.Counter({
  name: "api_requests_total",
  help: "Total number of API requests",
});

export const jobProcessedCounter = new client.Counter({
  name: "jobs_processed_total",
  help: "Total jobs processed by workers",
});

export const jobProcessingTime = new client.Histogram({
  name: "job_processing_time_seconds",
  help: "Time taken to process jobs",
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const register = client.register;