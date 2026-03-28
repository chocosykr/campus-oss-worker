import { executeCode } from './executor';

async function main() {
  console.log('Testing JavaScript...');
  const result = await executeCode('test-001', `console.log('hello from sandbox')`, 'javascript');
  console.log(result);
}

main();