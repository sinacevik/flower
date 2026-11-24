const assert = require('node:assert/strict');
const { after, test } = require('node:test');

process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test-user';
process.env.DB_PASSWORD = 'test-password';
process.env.DB_NAME = 'test-database';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';

const { normalizeOrderProducts, pool } = require('./server');

after(async () => {
  await pool.end();
});

test('normalizes product IDs and quantities', () => {
  assert.deepEqual(
    normalizeOrderProducts([{ product_id: '4', quantity: '2' }]),
    [{ productId: 4, quantity: 2 }]
  );
});

test('combines duplicate product quantities', () => {
  assert.deepEqual(
    normalizeOrderProducts([
      { product_id: 4, quantity: 2 },
      { product_id: 4, quantity: 3 },
    ]),
    [{ productId: 4, quantity: 5 }]
  );
});

test('rejects empty orders', () => {
  assert.throws(() => normalizeOrderProducts([]), /between 1 and 50 products/);
});

test('rejects invalid product IDs', () => {
  assert.throws(
    () => normalizeOrderProducts([{ product_id: 0, quantity: 1 }]),
    /valid product_id/
  );
});

test('rejects invalid and excessive quantities', () => {
  assert.throws(
    () => normalizeOrderProducts([{ product_id: 1, quantity: 0 }]),
    /integer between 1 and 99/
  );
  assert.throws(
    () =>
      normalizeOrderProducts([
        { product_id: 1, quantity: 60 },
        { product_id: 1, quantity: 40 },
      ]),
    /cannot exceed 99/
  );
});
