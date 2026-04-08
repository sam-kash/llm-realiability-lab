import { kafka } from "./client.js";

export const EVALUATION_REQUESTS_TOPIC = "evaluation_requests";

export const ensureEvaluationTopic = async () => {
  const admin = kafka.admin();

  await admin.connect();

  try {
    await admin.createTopics({
      waitForLeaders: true,
      topics: [
        {
          topic: EVALUATION_REQUESTS_TOPIC,
          numPartitions: 3,
          replicationFactor: 1,
        },
      ],
    });
  } finally {
    await admin.disconnect();
  }
};
