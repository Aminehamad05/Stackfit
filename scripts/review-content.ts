// scripts/review-content.ts — LLM critiques drafts -> ai_reviewed / flagged + ai_reviews rows.
// *** AI LAYER DISABLED *** — exits with a message until apps/api/src/ai/ is re-enabled.
// Re-enable path: implement AiProvider, set AI_ENABLED=true, review drafts via
// LLM_MODEL_REVIEW and write ai_reviews rows. See AGENT_SPEC §7.3.
import 'dotenv/config';

console.log('[review-content] SKIPPED — AI layer is disabled (AI_ENABLED != true).');
console.log('  Nothing was written. Re-enable via apps/api/src/ai/ + AI_ENABLED=true.');
process.exit(0);
