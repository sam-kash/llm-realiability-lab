import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 25,
  duration: '60s',
};

export default function () {
  const payload = JSON.stringify({
    question: "What is RAG?"
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  http.post('http://localhost:3000/evaluate', payload, params);

  sleep(1);
}