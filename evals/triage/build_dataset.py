# Builds dataset.jsonl from the tickets below. Edit the tickets here, then run:
#   python evals/triage/build_dataset.py
# Gold labels follow evals/triage/README.md: category = the team that has to fix it,
# priority = the business impact described (not the customer's tone).
# The split is stratified: tickets are ordered by (tags, priority, category) and every third one goes to dev
# (prompt tuning, threshold); the rest are the held-out test split, scored once for the README.
import json
from pathlib import Path

A, T, V, M = "ambiguous", "taglish", "vague", "multi-issue"

TICKETS = {
    "pos": [
        ("Card terminal declines every transaction since this morning", "All three registers show 'host unreachable' when customers tap or insert a card. We're asking everyone to pay cash and some are walking out.", "high", []),
        ("How do I void an item after the bill is printed?", "A customer changed their mind on one item after the cashier printed the bill. What's the right way to void just that line?", "low", []),
        ("Hindi lumalabas yung resibo sa counter 2", "Simula kahapon hindi na nagpi-print ng resibo sa counter 2. Okay naman yung counter 1. Na-restart na namin pero ganun pa rin.", "high", [T]),
        ("Senior discount not removing VAT at checkout", "When the cashier applies the senior citizen discount at checkout, the 20% comes off but the VAT is still charged. Customers are noticing the total is too high.", "medium", [A]),
        ("Set up a Buy 1 Take 1 promo for the weekend", "We want a Buy 1 Take 1 on iced coffee from Friday to Sunday. Can you show us how to set it up?", "low", []),
        ("POS freezes on the login screen at every branch", "Since 7am no branch can log in to the POS. The spinner never stops. We can't ring up any sales at all.", "urgent", []),
        ("Shift report total doesn't match the cash drawer", "The end-of-shift report says ₱48,200 in cash sales but the drawer count is ₱46,950. It happened on two shifts this week.", "medium", [A]),
        ("Pano mag-reprint ng official receipt?", "May customer na humihingi ng kopya ng OR niya kahapon. Paano po mag-reprint?", "low", [T]),
        ("Yung system po sa counter", "Yung system po namin ayaw gumana ng maayos sa counter, pa-check naman po.", "medium", [T, V]),
        ("New cashier login for a part-timer", "We hired a part-time cashier for the holidays. Please create a login with cashier access only.", "low", []),
        ("Checkout rings up the old price after a price change", "We updated the POS price list on Monday but the scanner at checkout still charges the old price for about 30 items.", "high", [A]),
        ("Customer display shows garbled text", "The pole display facing the customer shows random symbols instead of the item name and price. Sales still go through.", "medium", []),
        ("Offline sales didn't sync after the internet came back", "We had no internet for 3 hours yesterday. The POS kept working offline but those sales never showed up in today's reports.", "high", []),
        ("Loyalty points not credited after purchase", "Members show their card at checkout but the points don't appear in their account afterwards.", "medium", []),
        ("Gift card balance shows zero", "A customer has a ₱1,000 gift card they haven't used, but the POS says the balance is ₱0.", "medium", []),
        ("Can't split a payment between cash and GCash", "A customer wanted to pay half cash and half GCash, but the POS only lets us choose one payment method.", "medium", []),
        ("Receipt footer still shows our old TIN", "We registered a new TIN last month but the printed receipts still show the old one at the bottom.", "medium", [A]),
        ("POS takes 30 seconds per transaction at lunch", "From 11am to 2pm every sale takes around 30 seconds to complete. Lines are getting very long.", "high", []),
        ("Can we add a tip line on receipts?", "Some customers want to leave a tip. Is it possible to add a tip line on the printed receipt?", "low", []),
        ("Refund button is greyed out for supervisors", "Our supervisor account used to be able to do refunds but now the button is greyed out.", "medium", []),
        ("Cash drawer won't open and receipts won't print", "At register 1 the cash drawer stays shut after a sale, and the receipt printer also stopped printing. Register 2 is fine.", "high", [M]),
        ("GCash QR payments not showing at the counter", "Customers scan our QR and pay, but the payment never appears on the POS, so the cashier can't confirm the sale.", "high", []),
        ("Paki-ayos po, nadoble yung charge sa card", "Isang beses lang nag-tap yung customer pero dalawang beses siyang na-charge sa card. Galit na siya.", "high", [T]),
        ("Is there a training mode for new cashiers?", "We'd like new cashiers to practice without recording real sales. Is there a training mode?", "low", []),
    ],
    "inventory": [
        ("Negative stock for rice after receiving", "We received 50 sacks of rice this morning but the system now shows -12 on hand.", "medium", []),
        ("How do I set a reorder point per item?", "We want the system to remind us when certain items run low. Where do I set a reorder point?", "low", []),
        ("Branch transfer stuck 'in transit' for 3 days", "We sent 20 boxes of canned goods to Branch 2 on Monday. Branch 2 already received them but the transfer still says in transit.", "medium", []),
        ("Supplier delivery recorded twice", "One delivery from our softdrinks supplier shows up twice in the receiving log, so stock is doubled.", "medium", []),
        ("Can we track expiry dates for dairy?", "We'd like to see expiry dates for milk and cheese so we can sell older stock first.", "low", []),
        ("Kulang yung stock sa system kumpara sa bilang", "Nag-physical count kami kahapon. Mas marami yung nasa system kaysa sa actual na bilang sa bodega, mga 40 items.", "medium", [T]),
        ("Can't create a new item: 'SKU already exists'", "Adding a new product gives 'SKU already exists', but no item with that SKU shows up in search.", "medium", []),
        ("Price changes in the item master don't reach the branches", "We changed prices in the item master on Monday. The main branch has the new prices but the other branches still sell at the old ones.", "high", [A]),
        ("Warehouse app crashes when scanning pallets", "The receiving app closes every time we scan a pallet barcode. Deliveries are piling up at the dock.", "high", []),
        ("Stock levels don't go down after sales", "Items sold at the counter today still show the same quantity on hand. Yesterday it was working.", "high", [A]),
        ("Need a stock movement report for last quarter", "Our auditor asked for a report of all stock movements from July to September. How do I get it?", "low", [A]),
        ("Same problem with the warehouse numbers", "The numbers are off again for the warehouse, same as last month. Please check.", "medium", [V]),
        ("Bulk item upload fails at row 212", "We're uploading 500 new items from a spreadsheet and it stops at row 212 with 'invalid value'.", "medium", []),
        ("Box to piece conversion is wrong", "We receive noodles by the box of 24 but the system adds 12 pieces per box to stock.", "medium", []),
        ("Purchase order won't convert to receiving", "When the delivery arrives, the 'Receive' button on the purchase order does nothing.", "medium", []),
        ("Pa-check po ng stock ng Branch 3, zero lahat", "Lahat ng items sa Branch 3 naging zero ang stock ngayong umaga. Hindi kami makapagbenta dahil ayaw tanggapin ng system.", "high", [T]),
        ("Supplier return doesn't reduce stock", "We returned 10 damaged cartons to the supplier but the stock count didn't go down.", "medium", []),
        ("Low-stock report lists discontinued items", "The low-stock report keeps showing items we stopped carrying. Can we hide them?", "low", []),
        ("Lot numbers for pharmacy items", "We're adding a small pharmacy section. Can inventory track lot numbers per item?", "low", []),
        ("Count sheet printout is missing new items", "The printed stock count sheet doesn't include items we added this month.", "low", []),
        ("Transfers not arriving and transfer cost shows zero", "Two transfers to Branch 4 never arrived in their stock, and the transfer cost on both shows ₱0.", "medium", [M]),
        ("Cycle count is locked and can't be finished", "We started the monthly cycle count but it's locked at 80% and nobody can edit or submit it.", "high", []),
        ("Alert for items that haven't sold in 60 days", "Could we get a list or an alert for items with no sales in 60 days so we can mark them down?", "low", []),
        ("Mali yung expiry date na na-encode sa delivery", "Na-encode namin yung expiry na 2025 imbes na 2027 sa delivery kahapon. Paano itatama?", "medium", [T]),
    ],
    "accounting": [
        ("Trial balance doesn't balance after closing", "After we closed September, debits and credits on the trial balance are off by ₱12,340.", "high", []),
        ("How do I record a petty cash replenishment?", "We replenish petty cash every Friday. What's the right entry to use in the system?", "low", []),
        ("BDO bank feed stopped importing", "Our BDO transactions haven't imported since Tuesday, so we can't reconcile this week.", "medium", []),
        ("Need 2307 certificates for our suppliers", "Several suppliers are asking for their BIR 2307 certificates for Q3. Where can I print them?", "low", []),
        ("Sales invoices computing VAT at 10%", "Since this morning new sales invoices compute VAT at 10% instead of 12%. We've already sent some to clients.", "high", []),
        ("Hindi ma-generate yung BIR 1601-C", "Error pag gina-generate namin yung 1601-C para sa October. Bukas na yung deadline.", "high", [T, A]),
        ("Daily sales posting creates duplicate journal entries", "The automatic posting of daily POS sales to the ledger created every journal entry twice for the 14th.", "medium", [A]),
        ("Invoice emailed with the wrong due date", "Invoices emailed to customers show a due date 7 days earlier than the terms on their account.", "medium", []),
        ("Can't close the month: 'open documents'", "Month-end close fails with 'open documents exist' but the list of open documents is empty.", "high", []),
        ("Expense claims stuck in approval", "Claims submitted last week are stuck at 'pending approval' even after the manager approved them.", "medium", []),
        ("Paano mag-export ng income statement sa Excel?", "Kailangan ng boss namin yung income statement in Excel. Paano po i-export?", "low", [T]),
        ("Receivables aging report is wrong", "The AR aging shows invoices as 90+ days overdue that were paid last month.", "medium", []),
        ("Credit memo not applied to the invoice", "We issued a credit memo to a customer, but the invoice balance didn't change.", "medium", []),
        ("Read-only GL access for our external auditor", "Our auditor starts next week. Can you set up read-only access to the general ledger for them?", "low", []),
        ("Depreciation ran twice this month", "The monthly depreciation for fixed assets posted two times in October.", "medium", []),
        ("Yung financial report parang mali", "Yung financial report namin parang mali, hindi tugma sa bank. Pa-check po.", "medium", [T, V]),
        ("Inventory value on the balance sheet doesn't match", "The inventory amount on the balance sheet is ₱80,000 higher than the stock valuation report.", "medium", [A]),
        ("Printed checks are misaligned", "The amount and payee print about 1cm too low on our check stock, so the checks can't be used.", "medium", []),
        ("USD invoice exchange rate is stuck", "Invoices in US dollars still use last month's exchange rate even after we updated it.", "medium", []),
        ("Withholding tax not deducted on supplier payment", "When we pay suppliers, the expanded withholding tax isn't being deducted anymore.", "medium", []),
        ("Locked out and the bank reconciliation is wrong", "Our accountant is locked out of the accounting module, and the bank reconciliation she did yesterday shows the wrong ending balance.", "medium", [M]),
        ("Invoice series jumped from 1520 to 1600", "Our sales invoice numbers jumped from 1520 straight to 1600. We need the series to be continuous.", "medium", []),
        ("Water bill collections not posting to the ledger", "Collections from the billing system haven't reached the general ledger since the 1st, so our cash account is understated.", "high", [A]),
        ("Is there a year-end closing checklist?", "First time doing year-end in the system. Is there a checklist of what to run?", "low", []),
    ],
    "billing": [
        ("Zone 2 bills show zero consumption", "All 800 bills for Zone 2 this month show 0 cubic meters even though readings were taken.", "high", []),
        ("How do I change the billing cycle date?", "We want to move our billing cycle from the 1st to the 5th of the month. Where is this set?", "low", []),
        ("Meter readers' devices won't sync", "The handheld devices used by our meter readers fail to upload readings with a sync error.", "high", []),
        ("Late penalty charged even though they paid on time", "Several customers paid before the due date but still got a late payment penalty on their new bill.", "medium", []),
        ("Senior discount missing on residential water bills", "Qualified senior citizen accounts are not getting their discount on this month's water bills.", "medium", [A]),
        ("Hindi pumapasok yung bayad sa GCash sa account", "Nagbayad yung mga customer sa GCash pero hindi pumapasok sa account nila sa billing. Dumadami na tawag.", "high", [T, A]),
        ("Disconnection list includes paid accounts", "Today's disconnection list has accounts that already paid in full. Our crew goes out at 1pm.", "high", []),
        ("Add a new water rate for commercial accounts", "The board approved a new commercial rate starting next month. Can you show us how to add it?", "low", []),
        ("All bills printed with the wrong due date", "This month's bills show the due date as the 5th instead of the 20th for every account.", "high", []),
        ("New meter starts from the old meter's reading", "We replaced a customer's meter but the system uses the old meter's last reading as the start, so the bill is huge.", "medium", []),
        ("Customer portal shows an old balance", "Customers checking online see last month's balance instead of the current one.", "medium", []),
        ("Bill batch printing stuck at 40%", "Printing this month's statements stops at 40% every time. We can't send out the rest.", "high", []),
        ("Reconnection fee isn't showing on the bill", "Accounts we reconnected last week don't show the reconnection fee on their new bill.", "medium", []),
        ("Reklamo sa bill ng isang barangay", "May reklamo mga customer sa isang barangay, ang taas daw ng bill nila. Pa-check po.", "medium", [T, V]),
        ("How does average billing work for broken meters?", "Some meters are defective. How do we bill those accounts using average consumption?", "low", []),
        ("Bank's bulk payment file gets rejected", "The file of payments from our partner bank gets rejected on upload with 'invalid format'.", "medium", []),
        ("SMS bill reminders sent twice", "Customers are getting two identical SMS reminders for the same bill.", "low", []),
        ("Transfer an account to the new house owner", "A house was sold and the new owner wants the water account in their name. What's the process?", "low", []),
        ("Reading typo billed 900 cubic meters", "A reader typed 900 instead of 9 for one account and the bill was generated. How do we fix it?", "medium", []),
        ("Can't generate bills at all", "Generating this month's bills fails with an error for every zone. Billing day is today.", "urgent", []),
        ("Wrong tariff and a missing meter reading", "One commercial account was billed on the residential tariff, and its meter reading for this month is blank.", "medium", [M]),
        ("Yesterday's collections report is missing", "The payment center collections report for yesterday is empty, but we collected around ₱150,000.", "medium", [A]),
        ("Wrong label for the concessionaire fee on bills", "The bill says 'Franchise fee' but it should say 'Concessionaire fee'.", "low", []),
        ("Bayad na pero naka-disconnect pa rin", "Nagbayad na kahapon yung customer pero naka-disconnect pa rin sa system kaya hindi ma-reconnect.", "high", [T]),
    ],
    "payroll": [
        ("Overtime not computed for night shift", "Night shift staff did overtime last cutoff but their OT pay is zero. Payroll is released on Friday.", "high", []),
        ("How do employees file leave on the portal?", "New staff are asking how to file a leave request online. Can you share the steps?", "low", []),
        ("PhilHealth contribution still on the old rate", "The current payroll run deducts PhilHealth at last year's rate.", "high", []),
        ("Biometric attendance not syncing", "Time-ins from our biometric device haven't appeared in attendance since Monday.", "medium", []),
        ("13th month pay leaves out allowances", "The 13th month computation doesn't include the regular allowance that's part of their basic pay.", "medium", []),
        ("Blanko lahat ng payslip pag dinownload", "Lahat ng empleyado nagrereklamo, blanko yung PDF ng payslip pag dinownload nila.", "high", [T]),
        ("Payroll run fails, salaries are due today", "The payroll run stops with an error at the computation step. Salaries have to be released today.", "urgent", []),
        ("New hire missing from payroll", "An employee who started on the 1st isn't included in this cutoff's payroll.", "high", []),
        ("Pag-IBIG loan deduction continues after it's paid", "An employee finished paying their Pag-IBIG loan in August but it's still being deducted.", "medium", []),
        ("Leave balance shows negative", "Some employees show -2 vacation leave days even though they haven't used any this year.", "medium", []),
        ("Export the payroll register in BDO's format", "BDO needs our payroll file in their upload format to credit salaries. Can the system export it?", "medium", [A]),
        ("How do we process final pay for a resigned employee?", "An employee resigned effective the 15th. What are the steps for their final pay?", "low", []),
        ("Where is the night differential rate set?", "We need to change our night differential from 10% to 15%. Where is that configured?", "low", []),
        ("Holiday pay not applied for November 1", "Staff who worked on November 1 didn't get holiday pay in this payroll.", "high", []),
        ("Withholding tax wrong after a salary raise", "After a raise this month, two employees' withholding tax on compensation is lower than expected.", "medium", [A]),
        ("Can we add a salary loan feature?", "Employees keep asking for company salary loans. Can the system handle loan requests and deductions?", "low", []),
        ("Kulang daw sahod ngayong cutoff", "Ang daming nagrereklamo na kulang ang sahod nila ngayong cutoff.", "high", [T, V]),
        ("DTR shows absent but the employee was at work", "One employee's DTR shows absent on three days when they were present and timed in.", "medium", []),
        ("Payslip emails not sent and wrong department shown", "Payslip emails didn't go out this cutoff, and the payslips that were downloaded show the wrong department.", "medium", [M]),
        ("Add a rice subsidy allowance type", "We'd like to give a monthly rice subsidy. How do we add it as a new allowance?", "low", []),
        ("SSS R3 file rejected", "The SSS R3 contribution file we exported was rejected by SSS for an invalid format.", "medium", []),
        ("Undertime deducted twice", "Employees with undertime had it deducted twice this cutoff.", "medium", []),
        ("Changed rest day still marked absent", "We moved an employee's rest day to Wednesday, but the system marks them absent every Wednesday.", "medium", []),
        ("Sales commission from POS sales", "Our sales staff earn 2% commission on their POS sales. Can payroll compute it from the sales data?", "medium", [A]),
    ],
}


def main():
    rows = []
    for category, tickets in TICKETS.items():
        assert len(tickets) == 24, (category, len(tickets))
        for i, (subject, description, priority, tags) in enumerate(tickets):
            rows.append({
                "id": f"{category}-{i + 1:02d}",
                "split": "test",
                "category": category,
                "priority": priority,
                "tags": tags,
                "subject": subject,
                "description": description,
            })
    order = ["low", "medium", "high", "urgent"]
    ranked = sorted(rows, key=lambda r: (sorted(r["tags"]), order.index(r["priority"]), r["category"], r["id"]))
    for n, r in enumerate(ranked):
        if n % 3 == 1:
            r["split"] = "dev"
    out = Path(__file__).with_name("dataset.jsonl")
    out.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")
    print(f"{len(rows)} tickets, {sum(r['split'] == 'dev' for r in rows)} dev / {sum(r['split'] == 'test' for r in rows)} test -> {out}")


if __name__ == "__main__":
    main()
