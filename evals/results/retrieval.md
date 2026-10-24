# Retrieval eval results

Run 2026-10-24T15:23:37.307Z · embeddings: gemini-embedding-001 (768 dims) · top-5 chunks per query · 55 questions (35 easy, 20 hard) × 6 personas × 3 chunk sets

- **Doc Hit@k / MRR:** a case is scored only when at least one relevant document is readable by that persona.
- **Answer in top 3 chunks:** the exact answer string appears in one of the first three chunks (hard questions only).
- **Words sent to model:** average words in the top-5 chunks, a proxy for prompt cost and latency.
- **Leaked results:** returned documents the persona may not read, checked against an independent TypeScript copy of the access rule.
- **Unfiltered would leak:** cases that would have surfaced an unreadable document if the permission filter were removed.

## All questions

| Chunk set | Scored cases | Doc Hit@1 | Doc Hit@3 | MRR | Answer in top 3 chunks | Words sent to model | Leaked results | Unfiltered would leak (cases) |
|---|---|---|---|---|---|---|---|---|
| small (best) | 214 | 98.6% | 100.0% | 0.993 | 100.0% | 356 | 0 | 172 of 330 |
| medium | 214 | 92.5% | 98.6% | 0.959 | 95.7% | 616 | 0 | 185 of 330 |
| full | 214 | 92.5% | 97.7% | 0.953 | 92.8% | 712 | 0 | 200 of 330 |

## Hard questions only (paraphrases, near-duplicates, facts buried in long documents)

| Chunk set | Scored cases | Doc Hit@1 | Doc Hit@3 | MRR | Answer in top 3 chunks | Words sent to model | Leaked results | Unfiltered would leak (cases) |
|---|---|---|---|---|---|---|---|---|
| small (best) | 71 | 95.8% | 100.0% | 0.979 | 100.0% | 357 | 0 | 61 of 120 |
| medium | 71 | 84.5% | 95.8% | 0.912 | 95.7% | 648 | 0 | 64 of 120 |
| full | 71 | 84.5% | 93.0% | 0.894 | 92.8% | 763 | 0 | 69 of 120 |

## By persona (small chunks, all questions)

| Persona | Scored cases | Doc Hit@3 | Answer in top 3 | Leaked results | Unfiltered would leak (cases) |
|---|---|---|---|---|---|
| Jane Doe (FinanceDirector, L4) | 35 | 100.0% | 100.0% | 0 | 36 of 55 |
| Alex Rivera (DevOpsEngineer, L3) | 35 | 100.0% | 100.0% | 0 | 30 of 55 |
| Sarah Chen (EnterpriseAdmin, L4) | 38 | 100.0% | 100.0% | 0 | 30 of 55 |
| Binny Lee (SuperAdmin, L6) | 36 | 100.0% | 100.0% | 0 | 28 of 55 |
| Neil Wright (Intern, L1) | 15 | 100.0% | 100.0% | 0 | 48 of 55 |
| Jay Seal (SystemAdmin, L6) | 55 | 100.0% | 100.0% | 0 | 0 of 55 |

## Misses (small chunks)

None.
