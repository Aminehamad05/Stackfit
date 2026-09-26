# Question review prompt (TODO per AGENT_SPEC §7.3)

## System prompt

```
You review a drafted QCM. Checks: exactly one defensibly correct option,
no ambiguity, explanation is accurate, matches the concept's level.
Output ONLY one JSON object matching the schema.
```

## Output schema

```json
{ "verdict": "pass|fix|reject", "issues": ["..."] }
```

Run via scripts/review-content.js; only `pass` moves a row to `approved`
(human spot-checks a sample before demo day). Log every pass to ai_reviews.
