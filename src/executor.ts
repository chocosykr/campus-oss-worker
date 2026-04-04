import { exec } from 'child_process';
import { writeFile, mkdir, rm } from 'fs/promises';
import { promisify } from 'util';
import path from 'path';
import { Language, TestCase, GradeResult } from './types';

const execAsync = promisify(exec);

const IMAGE_MAP: Record<Language, string> = {
  javascript: 'code-runner-js',
  python: 'code-runner-py',
  java: 'code-runner-java',
  cpp: 'code-runner-cpp',
};

// Filename must be specific for Java
const FILE_NAME: Record<Language, string> = {
  javascript: 'solution.js',
  python: 'solution.py',
  java: 'Solution.java',
  cpp: 'solution.cpp',
};

export async function executeTestSuite(
  submissionId: string,
  code: string,
  language: Language,
  testCases: TestCase[]
): Promise<GradeResult> {
  const filename = FILE_NAME[language];
  const image = IMAGE_MAP[language];
  
  const tmpDir = path.join('/tmp', `submission-${submissionId}`);
  await mkdir(tmpDir, { recursive: true });
  
  const codePath = path.join(tmpDir, filename);
  const inputPath = path.join(tmpDir, 'input.txt');

  await writeFile(codePath, code);

  // 1. Pre-Execution Setup (Compilation)
  let runCmd = '';
  try {
    if (language === 'cpp') {
        // Compile once
        await execAsync(`docker run --rm --network none --memory 256m --cpus 0.5 -v ${tmpDir}:/app ${image} g++ /app/solution.cpp -o /app/solution`);
        runCmd = '/app/solution';
    } else if (language === 'java') {
        // Compile once
       await execAsync(`docker run --rm --network none --memory 256m --cpus 0.5 -v ${tmpDir}:/app ${image} javac /app/Solution.java`);
        runCmd = 'java -cp /app Solution';
    } else if (language === 'javascript') {
        runCmd = 'node /app/solution.js';
    } else if (language === 'python') {
        runCmd = 'python3 /app/solution.py';
    }
  } catch (compileErr: any) {
      await rm(tmpDir, { recursive: true, force: true });
      return {
          total: testCases.length,
          passed: 0,
          failed: testCases.length,
          details: testCases.map(tc => ({
              testCaseId: tc.id,
              passed: false,
              actualOutput: '',
              expectedOutput: tc.expectedOutput,
              error: `Compilation Error: ${compileErr.stderr || compileErr.message}`,
              hidden: tc.hidden
          }))
      };
  }

  const details = [];
  let passedCount = 0;

  // 2. Loop through test cases
  for (const tc of testCases) {
    try {
      await writeFile(inputPath, tc.input);

      const command = `docker run --rm -i \
        --network none \
        --memory 256m \
        --cpus 0.5 \
        -v ${tmpDir}:/app \
        ${image} \
        /bin/sh -c "${runCmd} < /app/input.txt"`;

      const { stdout } = await execAsync(command, { timeout: 5000 });

      const actualOutput = stdout.trim();
      const expectedOutput = tc.expectedOutput.trim();
      const passed = actualOutput === expectedOutput;

      if (passed) passedCount++;

      details.push({
        testCaseId: tc.id,
        passed,
        actualOutput,
        expectedOutput: tc.expectedOutput,
        hidden: tc.hidden
      });

    } catch (err: any) {
      details.push({
        testCaseId: tc.id,
        passed: false,
        actualOutput: '',
        expectedOutput: tc.expectedOutput,
        error: err.killed ? "Time Limit Exceeded" : (err.stderr || err.message),
        hidden: tc.hidden
      });
    }
  }

  // 3. Final Cleanup
  await rm(tmpDir, { recursive: true, force: true }).catch(() => {});

  return {
    total: testCases.length,
    passed: passedCount,
    failed: testCases.length - passedCount,
    details
  };
}