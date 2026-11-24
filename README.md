# FlowerShop

A portfolio e-commerce prototype built with a vanilla HTML/CSS/JavaScript
frontend and an Express/MySQL API. It supports account registration, login,
catalog browsing, a client-side cart, and authenticated order creation.

This is a learning project, not a production payment system. Checkout records
an order in MySQL; it does not charge a payment method.

## Security improvements

- database credentials and the JWT signing secret come from a gitignored `.env`
- the API refuses to start when required configuration is missing or weak
- browser access is limited to an explicit CORS allowlist
- authentication endpoints are rate-limited
- security headers are applied with Helmet
- request bodies, account fields, product IDs, and quantities are validated
- order prices and status are calculated on the server from database values
- order and cart writes use one database transaction
- JWT verification is restricted to the expected algorithm

If any real password or signing key was used in an earlier commit, replace it
at the provider/database before deploying. Removing a value from the latest
file does not invalidate a credential that was already exposed.

## Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js 18+, Express
- Data: MySQL
- Authentication: bcrypt and JWT
- Tests: Node's built-in test runner

## Local setup

1. Create the backend configuration:

   ```bash
   cp flower-backend/.env.example flower-backend/.env
   ```

2. Replace every `replace-with-...` value with a local credential. Use a
   dedicated MySQL user with access only to this project's database.

3. Install and verify the backend:

   ```bash
   cd flower-backend
   npm ci
   npm run check
   npm test
   npm start
   ```

4. Serve the repository root from another terminal:

   ```bash
   python3 -m http.server 5500
   ```

5. Open `http://localhost:5500`.

The backend expects an existing MySQL schema containing `users`, `categories`,
`products`, `orders`, and `cart` tables compatible with the queries in
`flower-backend/server.js`. The original project does not yet include database
migrations or seed data; adding them is a recommended next step.

## API overview

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check database connectivity |
| `POST` | `/register` | Create an account |
| `POST` | `/login` | Authenticate and receive a JWT |
| `GET` | `/categories` | List product categories |
| `GET` | `/products/:category_id` | List products in a category |
| `POST` | `/create-order` | Create an authenticated order |

`POST /create-order` accepts product IDs and quantities only. Prices are read
from MySQL by the backend and are never trusted from the browser payload.

## Remaining work

- add versioned database migrations and seed data
- add integration tests against a disposable MySQL instance
- move the frontend API base URL into runtime configuration
- replace browser alerts with accessible status messages
