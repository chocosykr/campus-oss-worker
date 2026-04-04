import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { executeTestSuite } from './executor';
import { JobPayload, Language } from './types';
import prisma from './db';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const connection = process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
    };

const worker = new Worker<JobPayload>(
    'code-execution',
    async (job: Job<JobPayload>) => {
        const { submissionId } = job.data;

        console.log(`[worker] Processing job ${job.id} for submission ${submissionId}`);

        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: {
                assignment: {
                    include: { testCases: true }
                }
            }
        });

        if (!submission || !submission.assignment) {
            console.error(`[worker] Error: Submission or Assignment ${submissionId} not found.`);
            return;
        }

        try {
            // FIX line 38: Ensure arguments match the function signature without trailing dots/commas
            const gradingResult = await executeTestSuite(
                submission.id,
                submission.code,
                submission.language as Language,
                submission.assignment.testCases
            );

            await prisma.submission.update({
                where: { id: submissionId },
                data: {
                    status: 'GRADED',
                    testResults: gradingResult as any, 
                },
            });

            console.log(`[worker] Job ${job.id} graded: ${gradingResult.passed}/${gradingResult.total} passed`);
            
            return gradingResult;

        } catch (err: any) { // FIX line 55: Type 'err' as 'any' or check type
            console.error(`[worker] Grading failed for ${submissionId}:`, err);
            
            await prisma.submission.update({
                where: { id: submissionId },
                data: { 
                    status: 'REJECTED',
                    testResults: { error: err instanceof Error ? err.message : String(err) } as any
                },
            });

            throw err; 
        }
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
    console.error(`[worker] ❌ Job ${job?.id} failed:`, err instanceof Error ? err.message : 'Unknown error');
});

console.log('[worker] Listening for jobs on queue: code-execution');

import './server';