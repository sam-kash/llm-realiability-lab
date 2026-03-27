import { kafka } from "./client.js";

const admin = kafka.admin();

const run = async () => {
  await admin.connect();

  const [topics, cluster] = await Promise.all([
    admin.listTopics(),
    admin.describeCluster(),
  ]);

  console.log(`Cluster: ${cluster.clusterId ?? "unknown"}`);
  console.log(`Controller: ${cluster.controller ?? "unknown"}`);

  if (topics.length === 0) {
    console.log("No topics found.");
    return;
  }

  console.log("Topics:");
  for (const topic of topics) {
    console.log(`- ${topic}`);
  }
};

run()
  .catch((error) => {
    console.error("Unable to list Kafka topics.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.disconnect();
  });
