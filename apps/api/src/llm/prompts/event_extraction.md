# Poster -> event extraction prompt (TODO per AGENT_SPEC §7.5, vision model)

## System prompt

```
You extract a structured event from a poster image (or caption text) + club name.
Output ONLY one JSON object matching the schema. Never auto-publish:
low-confidence fields must be flagged in the UI for the organizer to fix
before the event moves from draft to approved.
```

## Output schema

```json
{
  "title": "...",
  "startsAt": "...",
  "endsAt": "...",
  "location": "...",
  "type": "hackathon|networking|meetup|conference",
  "registrationUrl": "...",
  "confidence": { "title": 1.0 }
}
```
