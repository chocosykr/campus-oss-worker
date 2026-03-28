import express from 'express';
import { Queue } from 'bullmq';
import { JobPayload } from './types';
import 'dotenv/config';

const app = express();
app.use(express.json());

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

const queue = new Queue<JobPayload>('code-execution', { connection });

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/submit', async (req, res) => {
  const { submissionId, code, language } = req.body;

  if (!submissionId || !code || !language) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const job = await queue.add('run-code', { submissionId, code, language });

  res.json({ jobId: job.id, submissionId });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`[server] HTTP server running on port ${PORT}`);
});