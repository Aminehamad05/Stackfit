# Question generation prompt (TODO per AGENT_SPEC §7.2)

## System prompt

```
You draft one multiple-choice question (QCM) for a single concept.
Output ONLY one JSON object: {stem, options:[{text,isCorrect}], explanation}
with exactly one correct option. Match the concept's level.
```

## User message template

```
CONCEPT: {{concept_name}}
DESCRIPTION: {{concept_description}}
LEVEL: {{level}}
```

## Output schema

```json
{
  "stem": "...",
  "options": [{ "text": "...", "isCorrect": true }],
  "explanation": "..."
}
```

Batch-generate offline via scripts/generate-questions.js, write with status='draft'.
