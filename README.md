# Tillo: stock & billing demo by StackGlint

A point-of-sale and inventory app for a fictional corner store. Sample data, saved in the browser.

## Features
- **Sell:** photo product grid, search or type a SKU and press Enter, discounts, Card / Cash / QR / Pay later,
  change calculator, park and resume sales, animated receipt with a QR code and print.
- **Shelf:** live stock "tanks", how many days each item will last at the current pace, low / out / expiring filters,
  product drawer with a 14-day sales chart, price editing and stock receiving, auto-generated reorder list.
- **Reports (live dashboard):** today vs yesterday, this week vs last week, this month vs last month, always compared
  at the same point in time. Revenue, profit, bills, average bill and items sold with up/down changes, a comparison chart
  with hover, categories, top products, payment mix and "needs attention" alerts.
- **Daily goal + celebration:** set a goal; confetti and a toast when today's sales pass it.
- **Live mode:** adds a simulated sale every 15 seconds so the dashboard moves (demo only, can be switched off).
- **Tabs:** customer credit book with limits, overdue tracking, part or full payments, a ready-to-copy reminder message,
  activity timeline and new customers.
- **Ask Tillo:** quick answers about sales, stock, best sellers, busy hours, profit and tabs
  (demo uses rule-based answers; the real version can connect to an AI model).
- **Quick command (Ctrl K):** `sell 3 eggs`, `restock milk 24`, `low`, `go reports`, `ask`.
- Currency switch ($ / Rs, illustrative rate), works on phone, tablet and desktop.

## Run locally
npm install
npm run dev        # http://localhost:3000

## Deploy (GitHub Pages)
Push to `main`. In Settings → Pages, set Source to "GitHub Actions", then re-run the workflow if the first run failed.

Photos: Unsplash (Unsplash License).
