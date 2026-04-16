import "dotenv/config";
import Fastify from "fastify";
import askRoute from "./routes/ask.js";
import { loadData } from "./rag/ingest.js";
import { producer } from "./kafka/client.js";
import { ensureEvaluationTopic } from "./kafka/topics.js";
import {register, getWorkerMetricsText} from "./metrics/metrics.js"

await loadData()
await ensureEvaluationTopic();
await producer.connect(); 
const app = Fastify({logger : true})

app.register(askRoute)

const start = async () => {
    try{
        await app.listen({port : 3000});
        console.log("server running on port 3000");
    }catch(err){
        app.log.error(err);
        process.exit(1)
    }
};

app.get("/metrics", async (req, reply) => {
  const [appMetrics, workerMetrics] = await Promise.all([
    register.metrics(),
    getWorkerMetricsText(),
  ]);
  reply.header("Content-Type", register.contentType);
  return appMetrics + "\n" + workerMetrics;
});

start();
