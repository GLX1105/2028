const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    user TEXT NOT NULL,
    date TEXT NOT NULL,
    totalAmount REAL DEFAULT 0,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS report_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    user TEXT NOT NULL,
    date TEXT NOT NULL,
    totalAmount REAL DEFAULT 0,
    timestamp TEXT NOT NULL
  );
`);

console.log('数据库表创建成功');
db.close();
