// scripts/generate-questions.ts — LLM drafts QCMs per concept -> status='draft'.
// *** AI LAYER DISABLED *** — exits with a message until apps/api/src/ai/ is re-enabled.
// Re-enable path: implement AiProvider, set AI_ENABLED=true, batch-generate via
// LLM_MODEL_REVIEW into questions(status='draft'). See AGENT_SPEC §7.2.
import 'dotenv/config';

console.log('[generate-questions] SKIPPED — AI layer is disabled (AI_ENABLED != true).');
console.log('  Nothing was written. Re-enable via apps/api/src/ai/ + AI_ENABLED=true.');
process.exit(0);
