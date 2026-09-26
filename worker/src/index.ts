// worker/ — content-factory jobs run here (outside the request path).
// Per AGENT_SPEC §2 the compose `worker` service reuses the API image and runs
// scripts/*.ts via tsx. AI-backed jobs (generate/review) are disabled stubs
// until apps/api/src/ai/ is re-enabled.
import 'dotenv/config';

console.log('[worker] use scripts/*.ts via tsx — see README');
