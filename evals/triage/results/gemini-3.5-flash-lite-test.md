# Triage eval: gemini-3.5-flash-lite, test split

Run 2026-11-01 · 80 of 80 tickets scored · median latency 970 ms

| Metric | Relay AI | Keyword baseline |
| --- | --- | --- |
| Category accuracy | **98.8%** | 71.3% |
| Priority, exact | 66.3% | 47.5% (always "medium") |
| Priority, within one level | 100.0% | 97.5% |

## Confidence threshold

Tickets at or above the threshold are applied automatically; the rest go to a person.
Lowest threshold with ≥ 95% accuracy on auto-applied tickets: **0.5**.

| Threshold | Auto-applied | Accuracy when auto-applied |
| --- | --- | --- |
| 0.5 | 100.0% (80) | 98.8% |
| 0.6 | 100.0% (80) | 98.8% |
| 0.7 | 100.0% (80) | 98.8% |
| 0.75 | 100.0% (80) | 98.8% |
| 0.8 | 100.0% (80) | 98.8% |
| 0.85 | 100.0% (80) | 98.8% |
| 0.9 | 98.8% (79) | 98.7% |
| 0.95 | 95.0% (76) | 98.7% |

## Category accuracy by ticket type

| Type | Tickets | Accuracy |
| --- | --- | --- |
| ambiguous | 11 | 90.9% |
| multi-issue | 4 | 100.0% |
| plain | 56 | 100.0% |
| taglish | 9 | 88.9% |
| vague | 3 | 100.0% |

## Confusion (rows: correct category, columns: predicted)

| | pos | inventory | accounting | billing | payroll |
| --- | --- | --- | --- | --- | --- |
| **pos** | 18 | 0 | 0 | 0 | 0 |
| **inventory** | 0 | 16 | 0 | 0 | 0 |
| **accounting** | 0 | 0 | 15 | 0 | 1 |
| **billing** | 0 | 0 | 0 | 16 | 0 |
| **payroll** | 0 | 0 | 0 | 0 | 14 |

## Misses

- `accounting-06` Hindi ma-generate yung BIR 1601-C: predicted **payroll** (0.95), The system fails to generate the BIR 1601-C tax return with the deadline tomorrow, halting statutory compliance.
