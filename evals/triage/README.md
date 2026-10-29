# Triage eval

Measures how well Relay AI picks a ticket's **category** and **priority**, and sets the confidence threshold above which Relay applies the prediction without a person.

```bash
npm run eval:triage                          # dev split: tune the prompt and threshold here
npm run eval:triage -- --limit 5             # quick smoke run
npm run eval:triage -- --test --confirm-test # held-out test split: run once, for the README
```

Runs use the same `classifyTicket` function as production (`src/lib/ai/triage.ts`). Results are saved after every ticket in `results/<model>-<split>.json`, so a run stopped by the free-tier quota resumes where it left off. Each run writes a report to `results/<model>-<split>.md`.

## Dataset

`dataset.jsonl` has 120 tickets, 24 per category, generated from `build_dataset.py` (edit the tickets there, then run `python evals/triage/build_dataset.py`). None of the 26 demo tickets are included.

- **Split:** tickets are ordered by tags, priority and category, and every third one goes to `dev` (40); the other 80 are the held-out `test` split. Prompt changes and the threshold are decided on dev only; test is scored once at the end so the number isn't tuned to it.
- **Tags** mark the hard cases, so accuracy can be reported for each:
  - `ambiguous`: plausibly belongs to two teams (for example a senior discount exists in both POS and Utility Billing)
  - `taglish`: written in Filipino or Taglish
  - `vague`: little detail about what's wrong
  - `multi-issue`: more than one problem in one ticket

## Labelling guide

**Category is the team that has to make the fix**, not where the customer noticed the symptom.

| Category | Owns |
| --- | --- |
| `pos` | Registers, checkout, receipts and receipt printers, card/QR payments at the counter, cashier accounts, promos, loyalty, refunds |
| `inventory` | Item master and item sync across branches, stock levels, receiving, transfers, counts, units of measure, expiry/lot tracking |
| `accounting` | Invoices, ledger and journal postings (including postings coming from POS or billing), bank feeds and reconciliation, BIR tax reports, AR/AP, month and year-end close |
| `billing` | Meter readings, bill generation and printing, tariffs, penalties, disconnection and reconnection, posting customer payments to water accounts |
| `payroll` | Payslips, attendance and DTR, leave, overtime and holiday pay, government contributions, payroll bank files, 13th month |

Tie-breakers used for the `ambiguous` tickets:
- A wrong price at checkout after a POS price-list change is `pos`; prices not reaching branches from the item master is `inventory`.
- Sales not reducing stock is `inventory` (the stock deduction is wrong, the sale itself went through).
- Anything about how amounts post to the general ledger is `accounting`, even when the source is POS or billing.
- Customer payments not reaching a water account is `billing`, even when paid through GCash.
- Tax withheld from salaries is `payroll`; BIR returns generated from the accounting module (such as 1601-C) are `accounting`.

**Priority is the business impact described**, using the same rubric customers see on the new-ticket form (`PRIORITY_HINT` in `src/lib/labels.ts`):

| Priority | Meaning | Examples |
| --- | --- | --- |
| `low` | Question or small request | How-to questions, new logins, feature requests |
| `medium` | Something isn't working right | A wrong figure, a report off, one feature broken with a workaround |
| `high` | Blocking part of our work | One register or branch down, customers charged wrongly, a deadline or payroll at risk |
| `urgent` | We can't operate | No sales anywhere, bills can't be generated at all, salaries can't be released today |

The customer's tone ("ASAP", "urgent po") doesn't change the label; the impact does.
