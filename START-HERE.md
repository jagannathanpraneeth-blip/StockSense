# Finish setup, then test

If you already have StockSense running, stop it and make a private backup first.
Copy the contents of this `StockSense` folder into your existing project. Replace
source files; preserve your `.git`, `backend/.env`, inventory database and sessions.
Do not run seed or reset against your existing data.

Open PowerShell in the project folder:

```powershell
npm run install:all
npm run db:upgrade
npm run verify
npm run dev
```

Open http://localhost:5173. Use your existing manager login. The upgrade keeps
existing users and inventory. Cancel/recreate old draft adjustments because they
lack the new stock-version snapshot.

For a fresh installation and manager creation, follow README.md instead.

## Your final manual check

1. Login: Dashboard opens; refreshing keeps the selected page.
2. Products: search/filter, create/edit, duplicate SKU rejection, stock breakdown.
3. Settings: Warehouses and Locations tabs; create a second location.
4. New product at zero stock: receive 100 into A, transfer 30 to B, deliver 20
   from B (picking → packing → validation), adjust B to a physical count of 8.
5. Verify A=70, B=8; ledger shows +100, -30, +30, -20, -2 with correct operators.
6. Try shipping more than available: no balances or ledger entries should change.
7. Create an adjustment, move stock, then validate the old count: it must be rejected.
8. Staff can prepare documents but cannot validate stock changes. Manager can.
9. Filter Dashboard and Move History. Resize to phone width, open/close the menu
   and modal, and inspect table scrolling. Check the browser console.
10. Restart the backend: data persists. Logout: protected data is inaccessible.

`npm run verify` builds both apps and runs isolated API and React DOM interaction
tests. It never resets your working database. DOM tests do not verify visual layout.

## Submission

Record the workflow above with fresh demo records and explain the actual database
transactions, version checks and ledger. Do not display credentials or environment
files. Review the source diff and commit/push from your local Git checkout.
The ZIP does not automatically update GitHub or create a public deployment.

For hosting, use one persistent Node/Docker instance behind HTTPS. See README.md.
External email reset requires your SMTP credentials and a delivered-email check.
