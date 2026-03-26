import { vectorStore } from "./ingest.js";

export const retrieveContext = async (question: string) => {
  const results = await vectorStore.similaritySearch(question, 2);

  return results.map((result) => result.pageContent).join("\n");
};
