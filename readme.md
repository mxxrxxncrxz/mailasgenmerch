
# Maila's General Merchandise — Inventory & POS Prototype

## Included
- Responsive dashboard
- Inventory table based on RECORDS(1).xlsx / INVENTORY sheet
- 20% markup pricing rule from the workbook
- Add/edit products
- Sales/POS cart
- Automatic stock deduction after completed sale
- Low-stock alerts
- Transaction history
- Printable receipts
- Login screen
- Extracted workbook logo
- Local browser persistence for a working demo
- Supabase/PostgreSQL schema for central multi-device storage

## Demo
Open `index.html` in a modern browser.
Login:
Username: `admin`
Password: `admin123`

The workbook currently contains an INVENTORY template with 75 product rows, but the item names, SRP, and quantities are blank/zero. Those rows are preserved as the source structure; the website lets you add the actual products.

## Multi-device database
A browser-only website cannot synchronize inventory between different devices. The included `schema.sql` is the database layer for Supabase/PostgreSQL. To make the same inventory appear on every device:
1. Create a Supabase project.
2. Run `schema.sql` in its SQL editor.
3. Add Supabase authentication/users.
4. Replace the localStorage adapter in `app.js` with Supabase reads/writes.
5. Host the folder on a web host.

For a production deployment, use authenticated RLS policies, not the permissive demo policies in `schema.sql`.

## Design source
The Excel workbook uses the Office "Red Violet" theme. The prototype uses the corresponding palette:
#E32D91, #C830CC, #4EA6DC, #4775E7, #8971E1, #D54773 and dark text #454551.
