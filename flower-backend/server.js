require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const path = require('path');

const requiredEnvironmentVariables = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
];
const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
  (name) => !process.env[name]
);

if (missingEnvironmentVariables.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvironmentVariables.join(', ')}`
  );
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters.');
}

const port = Number(process.env.PORT || 3000);
const databasePort = Number(process.env.DB_PORT || 3306);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

if (!Number.isInteger(databasePort) || databasePort < 1 || databasePort > 65535) {
  throw new Error('DB_PORT must be an integer between 1 and 65535.');
}

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: databasePort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
});

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error('CORS origin is not allowed.');
      error.status = 403;
      return callback(error);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '100kb' }));
app.use('/images', express.static(path.join(__dirname, '..', 'images')));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function isValidEmail(value) {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function normalizeOrderProducts(products) {
  if (!Array.isArray(products) || products.length === 0 || products.length > 50) {
    const error = new Error('Order must contain between 1 and 50 products.');
    error.status = 400;
    throw error;
  }

  const quantitiesByProductId = new Map();

  for (const product of products) {
    const productId = Number(product?.product_id);
    const quantity = Number(product?.quantity);

    if (!Number.isInteger(productId) || productId < 1) {
      const error = new Error('Each product must have a valid product_id.');
      error.status = 400;
      throw error;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      const error = new Error('Each quantity must be an integer between 1 and 99.');
      error.status = 400;
      throw error;
    }

    const combinedQuantity = (quantitiesByProductId.get(productId) || 0) + quantity;
    if (combinedQuantity > 99) {
      const error = new Error('Combined quantity for a product cannot exceed 99.');
      error.status = 400;
      throw error;
    }
    quantitiesByProductId.set(productId, combinedQuantity);
  }

  return Array.from(quantitiesByProductId, ([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function authenticateToken(req, res, next) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication is required.' });
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Authentication is required.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

app.get('/', (_req, res) => {
  res.json({ service: 'FlowerShop API', status: 'ok' });
});

app.get('/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

app.post('/register', authLimiter, async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  if (!isNonEmptyString(firstName, 80) || !isNonEmptyString(lastName, 80)) {
    return res.status(400).json({ error: 'First name and last name are required.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'Password must contain between 8 and 72 characters.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.execute(
      'INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)',
      [firstName.trim(), lastName.trim(), email.trim().toLowerCase(), hashedPassword]
    );
    return res.status(201).json({ message: 'Registration completed.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return next(error);
  }
});

app.post('/login', authLimiter, async (req, res, next) => {
  const { email, password } = req.body;

  if (!isValidEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ error: 'A valid email address and password are required.' });
  }

  try {
    const [results] = await pool.execute(
      'SELECT id, firstName, lastName, email, password FROM users WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    );

    const user = results[0];
    const passwordMatches = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    return res.json({
      message: 'Login completed.',
      token,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/categories', async (_req, res, next) => {
  try {
    const [results] = await pool.query('SELECT id, name FROM categories ORDER BY name');
    return res.json(results);
  } catch (error) {
    return next(error);
  }
});

app.get('/products/:category_id', async (req, res, next) => {
  const categoryId = Number(req.params.category_id);
  if (!Number.isInteger(categoryId) || categoryId < 1) {
    return res.status(400).json({ error: 'A valid category ID is required.' });
  }

  try {
    const [results] = await pool.execute(
      'SELECT id, category_id, name, description, price, image FROM products WHERE category_id = ? ORDER BY name',
      [categoryId]
    );
    return res.json(results);
  } catch (error) {
    return next(error);
  }
});

app.post('/create-order', authenticateToken, async (req, res, next) => {
  let requestedProducts;
  try {
    requestedProducts = normalizeOrderProducts(req.body.products);
  } catch (error) {
    return next(error);
  }

  const productIds = requestedProducts.map(({ productId }) => productId);
  const placeholders = productIds.map(() => '?').join(', ');
  let connection;

  try {
    const [databaseProducts] = await pool.execute(
      `SELECT id, price FROM products WHERE id IN (${placeholders})`,
      productIds
    );

    if (databaseProducts.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products do not exist.' });
    }

    const pricesByProductId = new Map(
      databaseProducts.map((product) => [Number(product.id), Number(product.price)])
    );
    const orderLines = requestedProducts.map(({ productId, quantity }) => {
      const unitPrice = pricesByProductId.get(productId);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        const error = new Error('A product has an invalid server-side price.');
        error.status = 500;
        throw error;
      }

      return {
        productId,
        quantity,
        lineTotal: Math.round(unitPrice * quantity * 100) / 100,
      };
    });

    const orderDate = new Date();
    const status = 'pending';
    const orderData = orderLines.map(({ productId, quantity, lineTotal }) => [
      productId,
      quantity,
      lineTotal,
      req.user.id,
      orderDate,
      status,
    ]);
    const cartData = orderLines.map(({ productId, quantity, lineTotal }) => [
      req.user.id,
      productId,
      quantity,
      lineTotal,
    ]);

    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.query(
      'INSERT INTO orders (product_id, quantity, total_price, user_id, order_date, status) VALUES ?',
      [orderData]
    );
    await connection.query(
      'INSERT INTO cart (user_id, product_id, quantity, total_price) VALUES ?',
      [cartData]
    );
    await connection.commit();

    const totalPrice = orderLines.reduce((total, line) => total + line.lineTotal, 0);
    return res.status(201).json({
      message: 'Order created.',
      total_price: Math.round(totalPrice * 100) / 100,
      status,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }
    return next(error);
  } finally {
    connection?.release();
  }
});

app.use((error, _req, res, _next) => {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) {
    console.error('Unhandled server error:', error.message);
  }
  res.status(status).json({
    error: status >= 500 ? 'An unexpected server error occurred.' : error.message,
  });
});

async function start() {
  const connection = await pool.getConnection();
  connection.release();
  app.listen(port, () => {
    console.log(`FlowerShop API is listening on http://localhost:${port}.`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start FlowerShop API:', error.message);
    process.exit(1);
  });
}

module.exports = { app, normalizeOrderProducts, pool };
