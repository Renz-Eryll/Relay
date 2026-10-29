# Triage eval: gemini-3.5-flash-lite, dev split

Run 2026-10-29 · 40 of 40 tickets scored · median latency 1034 ms

| Metric | Relay AI | Keyword baseline |
| --- | --- | --- |
| Category accuracy | **100.0%** | 77.5% |
| Priority, exact | 70.0% | 47.5% (always "medium") |
| Priority, within one level | 100.0% | 97.5% |

## Confidence threshold

Tickets at or above the threshold are applied automatically; the rest go to a person.
Lowest threshold with ≥ 95% accuracy on auto-applied tickets: **0.5**.

| Threshold | Auto-applied | Accuracy when auto-applied |
| --- | --- | --- |
| 0.5 | 100.0% (40) | 100.0% |
| 0.6 | 100.0% (40) | 100.0% |
| 0.7 | 100.0% (40) | 100.0% |
| 0.75 | 100.0% (40) | 100.0% |
| 0.8 | 100.0% (40) | 100.0% |
| 0.85 | 100.0% (40) | 100.0% |
| 0.9 | 97.5% (39) | 100.0% |
| 0.95 | 95.0% (38) | 100.0% |

## Category accuracy by ticket type

| Type | Tickets | Accuracy |
| --- | --- | --- |
| ambiguous | 6 | 100.0% |
| multi-issue | 1 | 100.0% |
| plain | 28 | 100.0% |
| taglish | 6 | 100.0% |
| vague | 2 | 100.0% |

## Confusion (rows: correct category, columns: predicted)

| | pos | inventory | accounting | billing | payroll |
| --- | --- | --- | --- | --- | --- |
| **pos** | 6 | 0 | 0 | 0 | 0 |
| **inventory** | 0 | 8 | 0 | 0 | 0 |
| **accounting** | 0 | 0 | 8 | 0 | 0 |
| **billing** | 0 | 0 | 0 | 8 | 0 |
| **payroll** | 0 | 0 | 0 | 0 | 10 |

## Misses

None.
