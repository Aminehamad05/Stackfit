# questions.json — data to collect

`questions.json` is the ONLY seed file with no data. Everything else is fixed and validated.
Target: **3 QCMs per concept × 56 concepts = 168 questions** (minimum viable: 2 per concept = 112).

## Row format (exact keys — matches `questions` + `question_options` tables)
```json
[
  {
    "concept_slug": "pandas-data-cleaning",
    "stem": "Which pandas call drops rows with any missing value?",
    "difficulty": "beginner",
    "explanation": "dropna() removes rows containing NaN by default (how='any').",
    "source": "human",
    "status": "approved",
    "options": [
      {
        "text": "df.dropna()",
        "is_correct": true
      },
      {
        "text": "df.fillna(0)",
        "is_correct": false
      },
      {
        "text": "df.isnull()",
        "is_correct": false
      },
      {
        "text": "df.groupby('col')",
        "is_correct": false
      }
    ]
  }
]
```

## Rules (enforced by DB + loader — rows violating these are rejected)
- `difficulty` ∈ beginner | intermediate | advanced (use the concept's own level unless the question is clearly harder/easier).
- `options`: exactly 4 entries, **exactly one** `is_correct: true` (partial unique index `one_correct_option` rejects the row otherwise).
- `stem` + `explanation` non-empty; explanation must justify WHY the correct option is right (shown to users after answering).
- `source`: `human` for hand-written, `ai` for model-drafted (anything `ai` should be human-reviewed before `approved`).
- No ambiguous stems, no "all of the above", no two defensibly-correct options (mirrors `review_question.md`).

## Checklist by field (tick as you fill them — 3 per concept)
### cloud-engineering (14 concepts → 42 questions)
- [ ] `cicd-automation` (intermediate) — q1 / q2 / q3
- [ ] `cloud-concepts` (beginner) — q1 / q2 / q3
- [ ] `cloud-core-services` (intermediate) — q1 / q2 / q3
- [ ] `cloud-cost-reliability` (advanced) — q1 / q2 / q3
- [ ] `cloud-networking-security` (intermediate) — q1 / q2 / q3
- [ ] `cloud-security-practices` (advanced) — q1 / q2 / q3
- [ ] `configuration-automation` (advanced) — q1 / q2 / q3
- [ ] `containers-docker` (intermediate) — q1 / q2 / q3
- [ ] `infrastructure-as-code` (intermediate) — q1 / q2 / q3
- [ ] `kubernetes-basics` (advanced) — q1 / q2 / q3
- [ ] `linux-cli` (beginner) — q1 / q2 / q3
- [ ] `networking-fundamentals` (beginner) — q1 / q2 / q3
- [ ] `observability-monitoring` (intermediate) — q1 / q2 / q3
- [ ] `production-cloud-project` (advanced) — q1 / q2 / q3

### data (14 concepts → 42 questions)
- [ ] `advanced-sql-analytics` (advanced) — q1 / q2 / q3
- [ ] `business-metrics-kpis` (intermediate) — q1 / q2 / q3
- [ ] `dashboard-bi` (intermediate) — q1 / q2 / q3
- [ ] `data-modeling-bi` (intermediate) — q1 / q2 / q3
- [ ] `data-storytelling` (intermediate) — q1 / q2 / q3
- [ ] `data-types-quality` (beginner) — q1 / q2 / q3
- [ ] `data-visualization` (intermediate) — q1 / q2 / q3
- [ ] `descriptive-statistics` (beginner) — q1 / q2 / q3
- [ ] `end-to-end-data-analysis` (advanced) — q1 / q2 / q3
- [ ] `exploratory-data-analysis` (intermediate) — q1 / q2 / q3
- [ ] `pandas-data-cleaning` (beginner) — q1 / q2 / q3
- [ ] `probability-inference` (intermediate) — q1 / q2 / q3
- [ ] `python-data-basics` (beginner) — q1 / q2 / q3
- [ ] `sql-data-querying` (beginner) — q1 / q2 / q3

### full-stack-dev (14 concepts → 42 questions)
- [ ] `authentication-authorization` (intermediate) — q1 / q2 / q3
- [ ] `deployment-web-apps` (advanced) — q1 / q2 / q3
- [ ] `dom-browser-apis` (beginner) — q1 / q2 / q3
- [ ] `git-github-workflow` (beginner) — q1 / q2 / q3
- [ ] `html-css-foundations` (beginner) — q1 / q2 / q3
- [ ] `http-rest-apis` (intermediate) — q1 / q2 / q3
- [ ] `javascript-fundamentals` (beginner) — q1 / q2 / q3
- [ ] `node-express-backend` (intermediate) — q1 / q2 / q3
- [ ] `production-full-stack-integration` (advanced) — q1 / q2 / q3
- [ ] `react-frontend` (intermediate) — q1 / q2 / q3
- [ ] `relational-databases-sql` (intermediate) — q1 / q2 / q3
- [ ] `responsive-accessible-web` (beginner) — q1 / q2 / q3
- [ ] `testing-web-applications` (intermediate) — q1 / q2 / q3
- [ ] `typescript-basics` (intermediate) — q1 / q2 / q3

### machine-learning (14 concepts → 42 questions)
- [ ] `classification-models` (intermediate) — q1 / q2 / q3
- [ ] `data-preparation-ml` (intermediate) — q1 / q2 / q3
- [ ] `linear-algebra-for-ml` (beginner) — q1 / q2 / q3
- [ ] `linear-regression` (intermediate) — q1 / q2 / q3
- [ ] `ml-pipelines` (advanced) — q1 / q2 / q3
- [ ] `ml-project-delivery` (advanced) — q1 / q2 / q3
- [ ] `model-evaluation` (intermediate) — q1 / q2 / q3
- [ ] `neural-network-foundations` (advanced) — q1 / q2 / q3
- [ ] `numpy-data-arrays` (beginner) — q1 / q2 / q3
- [ ] `probability-statistics-for-ml` (beginner) — q1 / q2 / q3
- [ ] `python-for-ml` (beginner) — q1 / q2 / q3
- [ ] `pytorch-deep-learning` (advanced) — q1 / q2 / q3
- [ ] `tree-ensemble-models` (intermediate) — q1 / q2 / q3
- [ ] `unsupervised-learning` (intermediate) — q1 / q2 / q3

