# Retrieval eval results

Run 2026-10-24T16:55:41.863Z · embeddings: gemini-embedding-001 (768 dims) · top-5 chunks per query · 60 questions (40 easy, 20 hard) × 6 personas × 3 chunk sets

- **Doc Hit@k / MRR:** a case is scored only when at least one relevant document is readable by that persona.
- **Answer in top 3 chunks:** the exact answer string appears in one of the first three chunks (hard questions only).
- **Words sent to model:** average words in the top-5 chunks, a proxy for prompt cost and latency.
- **Leaked results:** returned documents the persona may not read, checked against an independent TypeScript copy of the access rule.
- **Unfiltered would leak:** cases that would have surfaced an unreadable document if the permission filter were removed.

## All questions

| Chunk set | Scored cases | Doc Hit@1 | Doc Hit@3 | MRR | Answer in top 3 chunks | Words sent to model | Leaked results | Unfiltered would leak (cases) |
|---|---|---|---|---|---|---|---|---|
| small (best) | 232 | 98.7% | 100.0% | 0.994 | 100.0% | 356 | 0 | 187 of 360 |
| medium | 232 | 93.1% | 98.7% | 0.962 | 95.7% | 614 | 0 | 204 of 360 |
| full | 232 | 92.2% | 97.8% | 0.951 | 92.8% | 710 | 0 | 220 of 360 |

## Hard questions only (paraphrases, near-duplicates, facts buried in long documents)

| Chunk set | Scored cases | Doc Hit@1 | Doc Hit@3 | MRR | Answer in top 3 chunks | Words sent to model | Leaked results | Unfiltered would leak (cases) |
|---|---|---|---|---|---|---|---|---|
| small (best) | 71 | 95.8% | 100.0% | 0.979 | 100.0% | 357 | 0 | 61 of 120 |
| medium | 71 | 84.5% | 95.8% | 0.912 | 95.7% | 648 | 0 | 64 of 120 |
| full | 71 | 84.5% | 93.0% | 0.894 | 92.8% | 763 | 0 | 69 of 120 |

## By persona (small chunks, all questions)

| Persona | Scored cases | Doc Hit@3 | Answer in top 3 | Leaked results | Unfiltered would leak (cases) |
|---|---|---|---|---|---|
| Jane Doe (FinanceDirector, L4) | 39 | 100.0% | 100.0% | 0 | 38 of 60 |
| Alex Rivera (DevOpsEngineer, L3) | 37 | 100.0% | 100.0% | 0 | 33 of 60 |
| Sarah Chen (EnterpriseAdmin, L4) | 41 | 100.0% | 100.0% | 0 | 33 of 60 |
| Binny Lee (SuperAdmin, L6) | 38 | 100.0% | 100.0% | 0 | 31 of 60 |
| Neil Wright (Intern, L1) | 17 | 100.0% | 100.0% | 0 | 52 of 60 |
| Jay Seal (SystemAdmin, L6) | 60 | 100.0% | 100.0% | 0 | 0 of 60 |

## Misses (small chunks)

None.
