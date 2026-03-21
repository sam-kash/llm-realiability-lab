import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Embeddings } from "@langchain/core/embeddings";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export let vectorStore: MemoryVectorStore;

class LocalEmbeddings extends Embeddings {
  private embedText(text: string): number[] {
    const vector = new Array<number>(32).fill(0);

    for (let index = 0; index < text.length; index += 1) {
      const bucket = index % vector.length;
      vector[bucket] = (vector[bucket] ?? 0) + text.charCodeAt(index);
    }

    const magnitude = Math.hypot(...vector) || 1;
    return vector.map((value) => value / magnitude);
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return documents.map((document) => this.embedText(document));
  }

  async embedQuery(document: string): Promise<number[]> {
    return this.embedText(document);
  }
}

export const loadData = async () => {
  const text = `
  RAG stands for Retrieval-Augmented Generation.
  It improves LLM accuracy by retrieving external knowledge.
  It reduces hallucinations.
  `;

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 200,
    chunkOverlap: 50,
  });

  const docs = await splitter.createDocuments([text]);

  const embeddings = new LocalEmbeddings({});

  vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

  console.log("Data ingested");
};
