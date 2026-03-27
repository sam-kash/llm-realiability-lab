import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type Job = {
  status: "pending" | "completed";
  result?: string;
};

const storeDir = path.resolve(process.cwd(), ".data");
const storePath = path.join(storeDir, "jobs.json");

const ensureStoreFile = () => {
  if (!existsSync(storeDir)) {
    mkdirSync(storeDir, { recursive: true });
  }

  if (!existsSync(storePath)) {
    writeFileSync(storePath, JSON.stringify({}, null, 2), "utf8");
  }
};

const readJobs = (): Record<string, Job> => {
  ensureStoreFile();

  try {
    return JSON.parse(readFileSync(storePath, "utf8")) as Record<string, Job>;
  } catch {
    return {};
  }
};

const writeJobs = (jobs: Record<string, Job>) => {
  ensureStoreFile();
  writeFileSync(storePath, JSON.stringify(jobs, null, 2), "utf8");
};

export const setJob = (jobId: string, job: Job) => {
  const jobs = readJobs();
  jobs[jobId] = job;
  writeJobs(jobs);
};

export const getJob = (jobId: string) => {
  const jobs = readJobs();
  return jobs[jobId];
};
