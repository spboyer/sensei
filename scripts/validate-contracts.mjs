import { spawnSync } from 'node:child_process';

const contracts = process.argv.slice(2);
const env = { ...process.env };
delete env.NODE_TEST_CONTEXT;

if (contracts.length === 0) {
  console.error('Specify at least one Node test contract.');
  process.exitCode = 1;
}

for (const contract of contracts) {
  console.log(`Validating contract: ${contract}`);
  // Direct execution avoids the synthetic passing file wrapper from --test.
  const result = spawnSync(process.execPath, ['--test-reporter=tap', contract], {
    encoding: 'utf8',
    env,
  });
  if (result.error) {
    throw new Error(`Could not run test contract ${contract}`, { cause: result.error });
  }
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) {
    console.error(`Test contract failed: ${contract} (exit ${result.status}, signal ${result.signal})`);
    process.exitCode = 1;
    break;
  }
  if (!/^# pass [1-9]\d*$/m.test(result.stdout)) {
    console.error(`No passing tests registered in ${contract}; add runnable node:test cases.`);
    process.exitCode = 1;
    break;
  }
}
