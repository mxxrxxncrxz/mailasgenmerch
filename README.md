# Maila's General Merchandise — Supabase Multi-Device Inventory & POS

This version is connected to the supplied Supabase project and no longer uses browser localStorage as the inventory database.

## Included
- Responsive dashboard
- Cloud-synchronized inventory
- 20% markup pricing rule
- Add/edit products
- Sales/POS cart
- Atomic database-backed stock deduction
- Low-stock alerts
- Central transaction history
- Printable receipts
- Supabase email/password authentication
- Live refresh when products/transactions change
- Existing Maila's logo and Red Violet design

## Supabase setup

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Create a new query.
4. Paste the complete contents of `schema.sql`.
5. Run it.
6. Go to **Authentication → Users**.
7. Create your first staff/admin user, or use the website's **Create account** button if email confirmation is configured to permit it.
8. Open the website and sign in using that Supabase Auth email/password.

The frontend is configured for:
`https://cgtjmwnbfqtbvwqbbupk.supabase.co`

The browser uses the Supabase **publishable** key. Never put a `sb_secret_...` or `service_role` key in this website.

## Netlify deployment

Upload the contents of this folder to your Netlify site, replacing the old `index.html`, `app.js`, `schema.sql`, `README.md`, and other matching files. Keep `styles.css`, `data.json`, and `assets/` from this package.

If Netlify deploys from a Git repository, commit these files and push them to the branch connected to Netlify.

## Important

Run `schema.sql` before using the new site. The site expects the `products`, `transactions`, and `transaction_items` tables plus the `complete_sale` PostgreSQL function.

The existing Excel workbook had an inventory template with blank/zero product fields, so this package does not invent product records. Add your actual inventory through the Inventory page or import it separately.

For production role management, add a staff/profile table and narrower RLS policies rather than allowing every authenticated user to edit every product.
