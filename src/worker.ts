import { Worker, Job } from 'bullmq';
import { executeCode } from './executor';
import { JobPayload } from './types';
import prisma from './db';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const connection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

const worker = new Worker<JobPayload>(
    'code-execution',
    async (job: Job<JobPayload>) => {
        const { submissionId, code, language } = job.data;

        console.log(`[worker] Processing job ${job.id} — ${language} submission ${submissionId}`);

        const result = await executeCode(submissionId, code, language);

        try {
            await prisma.submission.update({
                where: { id: submissionId },
                data: {
                    status: 'GRADED',
                    testResults: {
                        stdout: result.stdout,
                        stderr: result.stderr,
                        exitCode: result.exitCode,
                        timedOut: result.timedOut,
                    },
                },
            });
            console.log(`[worker] Job ${job.id} saved to DB`);

            await supabase.channel(`submission-${submissionId}`)
              .send({
                type: 'broadcast',
                event: 'graded',
                payload: { submissionId, ...result },
              });

            console.log(`[worker] Job ${job.id} broadcast sent`);
        } catch (dbErr) {
            console.error(`[worker] DB update failed:`, dbErr);
        }

        return result;
    },
    {
        connection,
        concurrency: 5,
    }
);

worker.on('completed', (job) => {
    console.log(`[worker] ✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.error(`[worker] ❌ Job ${job?.id} failed:`, err.message);
    console.error(err.stack);
});

console.log('[worker] Listening for jobs on queue: code-execution');

import './server';