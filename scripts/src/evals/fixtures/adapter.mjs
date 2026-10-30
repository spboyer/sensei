// Protocol fixture only: no model or host is invoked.
let input = '';
for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
const mode = process.argv[2];
if (mode === 'timeout') await new Promise((resolve) => setTimeout(resolve, 10_000));
if (mode === 'failure') {
  console.error('fixture command failure');
  process.exit(7);
}
if (mode === 'malformed') {
  console.log('not json');
  process.exit(0);
}
if (mode === 'overflow') {
  console.log('x'.repeat(2 * 1024 * 1024));
  process.exit(0);
}
const invoked = Boolean(request.skill) && request.caseId === 'trigger';
const response = {
  version: 1,
  requestId: request.requestId,
  caseId: request.caseId,
  repetition: request.repetition,
  variant: mode === 'mismatch' ? 'wrong' : request.variant,
  activation: {
    invoked: mode === 'unobservable' ? null : mode === 'wrong-routing' ? !invoked : invoked,
    evidence: { source: 'fixture://synthetic-trace', excerpt: `Fixture ${request.requestId}: invoked=${invoked}` },
    reason: 'Fixture host cannot expose activation'
  },
  output: mode === 'quality-failure' || (mode === 'baseline-failure' && request.variant === 'baseline')
    ? 'incorrect result' : 'Fixture task completed',
  tokens: 0
};
if (mode === 'missing-evidence') delete response.activation.evidence;
if (mode === 'missing-negative-evidence' && !invoked) delete response.activation.evidence;
if (mode === 'empty-evidence') response.activation.evidence.excerpt = ' ';
if (mode === 'missing-output') delete response.output;
if (mode === 'invalid-tokens') response.tokens = -1;
if (mode === 'no-tokens') delete response.tokens;
if (mode === 'invalid-activation') response.activation.invoked = 'true';
if (mode === 'null-without-reason') {
  response.activation.invoked = null;
  delete response.activation.reason;
}
if (mode === 'baseline-mismatch' && request.variant === 'baseline') response.requestId = 'stale-request';
console.log(JSON.stringify(response));
