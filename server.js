const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 数据库初始化
const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    card_id INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id)
  );

  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active',
    expire_days INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

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

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ========= 内置分类数据 =========
const DEFAULT_CONFIG = {
  zodiac: {
    鼠: ["07","19","31","43"],
    牛: ["06","18","30","42"],
    虎: ["05","17","29","41"],
    兔: ["04","16","28","40"],
    龙: ["03","15","27","39"],
    蛇: ["02","14","26","38"],
    马: ["01","13","25","37","49"],
    羊: ["12","24","36","48"],
    猴: ["11","23","35","47"],
    鸡: ["10","22","34","46"],
    狗: ["09","21","33","45"],
    猪: ["08","20","32","44"]
  },
  shengxiaoAttr: {
    家禽: ["牛","马","羊","鸡","狗","猪"],
    野兽: ["鼠","虎","兔","龙","蛇","猴"],
    吉美: ["兔","龙","蛇","马","羊","鸡"],
    凶丑: ["鼠","牛","虎","猴","狗","猪"],
    阴性: ["鼠","龙","蛇","马","狗","猪"],
    阳性: ["牛","虎","兔","羊","猴","鸡"],
    天肖: ["兔","马","猴","猪","牛","龙"],
    地肖: ["蛇","羊","鸡","狗","鼠","虎"],
    单笔: ["鼠","龙","马","蛇","鸡","猪"],
    双笔: ["虎","猴","狗","兔","羊","牛"],
    白边: ["鼠","牛","虎","鸡","狗","猪"]
  },
  wuxing: {
    金: ["04","05","12","13","26","27","34","35","42","43"],
    木: ["08","09","16","17","24","25","38","39","46","47"],
    水: ["01","14","15","22","23","30","31","44","45"],
    火: ["02","03","10","11","18","19","32","33","40","41","48","49"],
    土: ["06","07","20","21","28","29","36","37"]
  },
  bose: {
    红波: ["01","02","07","08","12","13","18","19","23","24","29","30","34","35","40","45","46"],
    蓝波: ["03","04","09","10","14","15","20","25","26","31","36","37","41","42","47","48"],
    绿波: ["05","06","11","16","17","21","22","27","28","32","33","38","39","43","44","49"]
  },
  banbo: {
    红双: ["02","08","12","18","24","30","34","40","46"],
    红单: ["01","07","13","19","23","29","35","45"],
    蓝双: ["04","10","14","20","26","36","42","48"],
    蓝单: ["03","09","15","25","31","37","41","47"],
    绿双: ["06","16","22","28","32","38","44"],
    绿单: ["05","11","17","21","27","33","39","43","49"]
  },
  danshuang: {
    单数: ["01","03","05","07","09","11","13","15","17","19","21","23","25","27","29","31","33","35","37","39","41","43","45","47","49"],
    双数: ["02","04","06","08","10","12","14","16","18","20","22","24","26","28","30","32","34","36","38","40","42","44","46","48"]
  },
  weishu: {},
  daxiaodanshuang: {
    大单: ["25","27","29","31","33","35","37","39","41","43","45","47","49"],
    大双: ["26","28","30","32","34","36","38","40","42","44","46","48"],
    小单: ["01","03","05","07","09","11","13","15","17","19","21","23"],
    小双: ["02","04","06","08","10","12","14","16","18","20","22","24"]
  },
  daxiao: {
    小: ["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24"],
    大: ["25","26","27","28","29","30","31","32","33","34","35","36","37","38","39","40","41","42","43","44","45","46","47","48","49"]
  },
  heshu: {
    "01合": ["01","10"],
    "02合": ["02","11","20"],
    "03合": ["03","12","21","30"],
    "04合": ["04","13","22","31","40"],
    "05合": ["05","14","23","32","41"],
    "06合": ["06","15","24","33","42"],
    "07合": ["07","16","25","34","43"],
    "08合": ["08","17","26","35","44"],
    "09合": ["09","18","27","36","45"],
    "10合": ["19","28","37","46"],
    "11合": ["29","38","47"],
    "12合": ["39","48"],
    "13合": ["49"]
  },
  toushu: {
    "0头": ["01","02","03","04","05","06","07","08","09"],
    "1头": ["10","11","12","13","14","15","16","17","18","19"],
    "2头": ["20","21","22","23","24","25","26","27","28","29"],
    "3头": ["30","31","32","33","34","35","36","37","38","39"],
    "4头": ["40","41","42","43","44","45","46","47","48","49"]
  },
  menshu: {
    "1门": ["01","02","03","04","05","06","07","08","09"],
    "2门": ["10","11","12","13","14","15","16","17","18"],
    "3门": ["19","20","21","22","23","24","25","26","27"],
    "4门": ["28","29","30","31","32","33","34","35","36","37"],
    "5门": ["38","39","40","41","42","43","44","45","46","47","48","49"]
  },
  duanwei: {
    "1段": ["01","02","03","04","05","06","07"],
    "2段": ["08","09","10","11","12","13","14"],
    "3段": ["15","16","17","18","19","20","21"],
    "4段": ["22","23","24","25","26","27","28"],
    "5段": ["29","30","31","32","33","34","35"],
    "6段": ["36","37","38","39","40","41","42"],
    "7段": ["43","44","45","46","47","48","49"]
  },
  hedahexiao: {
    合小: ["01","02","03","04","05","06","10","11","12","13","14","15","20","21","22","23","24","30","31","32","33","40","41","42"],
    合大: ["07","08","09","16","17","18","19","25","26","27","28","29","34","35","36","37","38","39","43","44","45","46","47","48","49"]
  },
  weidaweixiao: {
    尾小: ["01","02","03","04","10","11","12","13","14","20","21","22","23","24","30","31","32","33","34","40","41","42","43","44"],
    尾大: ["05","06","07","08","09","15","16","17","18","19","25","26","27","28","29","35","36","37","38","39","45","46","47","48","49"]
  },
  hewei: {
    "0合尾": ["19","28","37","46"],
    "1合尾": ["01","10","29","38","47"],
    "2合尾": ["02","11","20","39","48"],
    "3合尾": ["03","12","21","30","49"],
    "4合尾": ["04","13","22","31","40"],
    "5合尾": ["05","14","23","32","41"],
    "6合尾": ["06","15","24","33","42"],
    "7合尾": ["07","16","25","34","43"],
    "8合尾": ["08","17","26","35","44"],
    "9合尾": ["09","18","27","36","45"]
  },
  heshudanshuang: {
    合数单: ["01","03","05","07","09","10","12","14","16","18","21","23","25","27","29","30","32","34","36","38","41","43","45","47","49"],
    合数双: ["02","04","06","08","11","13","15","17","19","20","22","24","26","28","31","33","35","37","39","40","42","44","46","48"]
  },
  toushuDanshuang: {
    "0头单": ["01","03","05","07","09"],
    "0头双": ["02","04","06","08"],
    "1头单": ["11","13","15","17","19"],
    "1头双": ["10","12","14","16","18"],
    "2头单": ["21","23","25","27","29"],
    "2头双": ["20","22","24","26","28"],
    "3头单": ["31","33","35","37","39"],
    "3头双": ["30","32","34","36","38"],
    "4头单": ["41","43","45","47","49"],
    "4头双": ["40","42","44","46","48"]
  }
};

// 动态生成尾数
for (let i = 0; i <= 9; i++) {
  const key = i + '尾';
  DEFAULT_CONFIG.weishu[key] = [];
  for (let j = 1; j <= 49; j++) {
    const num = j.toString().padStart(2, '0');
    if (num.endsWith(i.toString())) DEFAULT_CONFIG.weishu[key].push(num);
  }
}

let currentConfig = { ...DEFAULT_CONFIG };

function mergeConfig(custom) {
  if (!custom) return DEFAULT_CONFIG;
  const merged = { ...DEFAULT_CONFIG };
  if (custom.weishu) merged.weishu = { ...DEFAULT_CONFIG.weishu, ...custom.weishu };
  // 可添加更多自定义分类合并（如生肖属性等），当前简单处理
  return merged;
}

// 获取所有有效分类名
function getAllValidCategories(config) {
  const s = new Set();
  for (const key in config.zodiac) s.add(key);
  for (const key in config.shengxiaoAttr) s.add(key);
  for (const key in config.wuxing) s.add(key);
  for (const key in config.bose) s.add(key);
  for (const key in config.banbo) s.add(key);
  for (const key in config.danshuang) s.add(key);
  for (const key in config.weishu) s.add(key);
  for (const key in config.daxiaodanshuang) s.add(key);
  for (const key in config.daxiao) s.add(key);
  for (const key in config.heshu) s.add(key);
  for (const key in config.toushu) s.add(key);
  for (const key in config.menshu) s.add(key);
  for (const key in config.duanwei) s.add(key);
  for (const key in config.hedahexiao) s.add(key);
  for (const key in config.weidaweixiao) s.add(key);
  for (const key in config.hewei) s.add(key);
  for (const key in config.heshudanshuang) s.add(key);
  for (const key in config.toushuDanshuang) s.add(key);
  return s;
}

// 根据分类名获取号码列表
function getNumberListForCategory(cat, config) {
  const nums = [];
  if (config.shengxiaoAttr[cat]) {
    config.shengxiaoAttr[cat].forEach(z => {
      if (config.zodiac[z]) nums.push(...config.zodiac[z].map(n => n.padStart(2, '0')));
    });
  }
  const sources = [
    config.wuxing, config.bose, config.banbo, config.danshuang,
    config.weishu, config.daxiaodanshuang, config.daxiao, config.heshu,
    config.toushu, config.menshu, config.duanwei, config.hedahexiao,
    config.weidaweixiao, config.hewei, config.heshudanshuang,
    config.toushuDanshuang, config.zodiac
  ];
  for (const src of sources) {
    if (src && src[cat]) nums.push(...src[cat].map(n => n.padStart(2, '0')));
  }
  return [...new Set(nums)];
}

// 解析一行订单
function parseLine(line, config) {
  const m = line.match(/([\u4e00-\u9fa5\d\-]+)\s+各数\s+(\d+)/);
  if (!m) return { numbers: [], zodiacs: [], amount: 0 };
  const cont = m[1];
  const amt = parseInt(m[2]) || 0;
  const items = cont.split('-').map(i => i.trim()).filter(i => i);
  const nums = new Set();
  const zods = new Set();
  items.forEach(item => {
    if (/^\d+$/.test(item)) {
      nums.add(item.padStart(2, '0'));
    } else if (config.shengxiaoAttr[item]) {
      config.shengxiaoAttr[item].forEach(z => zods.add(z));
    } else if (config.zodiac[item]) {
      zods.add(item);
    } else {
      const n = getNumberListForCategory(item, config);
      if (n.length) n.forEach(num => nums.add(num));
    }
  });
  return { numbers: [...nums], zodiacs: [...zods], amount: amt };
}
// ========= 认证中间件 =========
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: '令牌无效' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

// ========= 用户认证 API =========
app.post('/api/auth/admin', (req, res) => {
  const { password } = req.body;
  if (password === "150408") {
    const token = jwt.sign({ username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, role: 'admin' });
  }
  res.status(401).json({ error: '管理员密码错误' });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, cardCode } = req.body;
  if (!username || !password || !cardCode) return res.status(400).json({ error: '请填写完整信息' });

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) return res.status(400).json({ error: '用户名已存在' });

  const card = db.prepare('SELECT * FROM cards WHERE code = ? AND status = ?').get(cardCode, 'active');
  if (!card) return res.status(400).json({ error: '卡密无效或已使用' });

  // 卡密自验证
  const now = Date.now();
  const parts = cardCode.split('-');
  if (parts.length !== 3) return res.status(400).json({ error: '卡密格式错误' });
  const createTime = parseInt(parts[0], 36);
  const expireMs = parseInt(parts[1], 36);
  if (isNaN(createTime) || isNaN(expireMs)) return res.status(400).json({ error: '卡密无效' });
  if (now > createTime + expireMs) {
    db.prepare('UPDATE cards SET status = ? WHERE id = ?').run('expired', card.id);
    return res.status(400).json({ error: '卡密已过期' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const timestamp = new Date().toISOString();
  const insertUser = db.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)');
  const userResult = insertUser.run(username, passwordHash, timestamp);

  db.prepare('UPDATE cards SET status = ?, user_id = ? WHERE id = ?').run('used', userResult.lastInsertRowid, card.id);
  db.prepare('UPDATE users SET card_id = ? WHERE id = ?').run(card.id, userResult.lastInsertRowid);

  res.json({ success: true, message: '注册成功' });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, username: user.username, role: user.role });
});

// ========= 卡密管理（管理员） =========
app.post('/api/cards/generate', authenticateToken, requireAdmin, (req, res) => {
  const { expireDays } = req.body;
  if (!expireDays || expireDays < 1) return res.status(400).json({ error: '有效期至少1天' });

  const now = Date.now();
  const expireMs = expireDays * 86400000;
  const raw = `${now}-${expireMs}-XK9mP2wQ7vL5`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  const code = `${now.toString(36).toUpperCase()}-${expireMs.toString(36).toUpperCase()}-${Math.abs(hash).toString(16).toUpperCase().padStart(4, '0')}`;

  const stmt = db.prepare('INSERT INTO cards (code, status, expire_days, created_at) VALUES (?, ?, ?, ?)');
  stmt.run(code, 'active', expireDays, new Date().toISOString());

  res.json({ success: true, code });
});

app.get('/api/cards', authenticateToken, requireAdmin, (req, res) => {
  const cards = db.prepare(`
    SELECT cards.*, users.username 
    FROM cards 
    LEFT JOIN users ON cards.user_id = users.id 
    ORDER BY cards.created_at DESC
  `).all();
  res.json(cards);
});

app.post('/api/cards/:id/disable', authenticateToken, requireAdmin, (req, res) => {
  db.prepare('UPDATE cards SET status = ? WHERE id = ?').run('disabled', req.params.id);
  res.json({ success: true });
});

// ========= 订单 API =========
app.get('/api/orders', authenticateToken, (req, res) => {
  const { date } = req.query;
  let rows;
  if (req.user.role === 'admin') {
    rows = date ? db.prepare('SELECT * FROM orders WHERE date = ?').all(date) : db.prepare('SELECT * FROM orders').all();
  } else {
    rows = date ? db.prepare('SELECT * FROM orders WHERE date = ? AND user = ?').all(date, req.user.username) : db.prepare('SELECT * FROM orders WHERE user = ?').all(req.user.username);
  }
  res.json(rows);
});

app.post('/api/orders', authenticateToken, (req, res) => {
  const { content, date, totalAmount } = req.body;
  const user = req.user.username;
  const timestamp = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO orders (content, user, date, totalAmount, timestamp) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(content, user, date, totalAmount || 0, timestamp);
  res.json({ success: true, id: result.lastInsertRowid });
});

app.delete('/api/orders/:id', authenticateToken, (req, res) => {
  const order = db.prepare('SELECT user FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (req.user.role !== 'admin' && order.user !== req.user.username) {
    return res.status(403).json({ error: '无权删除' });
  }
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/orders/batch-delete', authenticateToken, (req, res) => {
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: '请选择订单' });
  const placeholders = ids.map(() => '?').join(',');
  const orders = db.prepare(`SELECT id, user FROM orders WHERE id IN (${placeholders})`).all(...ids);
  for (const order of orders) {
    if (req.user.role !== 'admin' && order.user !== req.user.username) {
      return res.status(403).json({ error: '无权删除' });
    }
  }
  const transaction = db.transaction(() => {
    const del = db.prepare('DELETE FROM orders WHERE id = ?');
    ids.forEach(id => del.run(id));
  });
  transaction();
  res.json({ success: true });
});

// 上报订单 API
app.get('/api/report-orders', authenticateToken, (req, res) => {
  const { date } = req.query;
  let rows;
  if (req.user.role === 'admin') {
    rows = date ? db.prepare('SELECT * FROM report_orders WHERE date = ?').all(date) : db.prepare('SELECT * FROM report_orders').all();
  } else {
    rows = date ? db.prepare('SELECT * FROM report_orders WHERE date = ? AND user = ?').all(date, req.user.username) : db.prepare('SELECT * FROM report_orders WHERE user = ?').all(req.user.username);
  }
  res.json(rows);
});

app.post('/api/report-orders', authenticateToken, (req, res) => {
  const { content, date, totalAmount } = req.body;
  const user = req.user.username;
  const timestamp = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO report_orders (content, user, date, totalAmount, timestamp) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(content, user, date, totalAmount || 0, timestamp);
  res.json({ success: true, id: result.lastInsertRowid });
});

app.delete('/api/report-orders/:id', authenticateToken, (req, res) => {
  const order = db.prepare('SELECT user FROM report_orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (req.user.role !== 'admin' && order.user !== req.user.username) {
    return res.status(403).json({ error: '无权删除' });
  }
  db.prepare('DELETE FROM report_orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/report-orders/batch-delete', authenticateToken, (req, res) => {
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: '请选择订单' });
  const placeholders = ids.map(() => '?').join(',');
  const orders = db.prepare(`SELECT id, user FROM report_orders WHERE id IN (${placeholders})`).all(...ids);
  for (const order of orders) {
    if (req.user.role !== 'admin' && order.user !== req.user.username) {
      return res.status(403).json({ error: '无权删除' });
    }
  }
  const transaction = db.transaction(() => {
    const del = db.prepare('DELETE FROM report_orders WHERE id = ?');
    ids.forEach(id => del.run(id));
  });
  transaction();
  res.json({ success: true });
});

// ========= 风险计算 =========
app.post('/api/calculate', authenticateToken, (req, res) => {
  try {
    const { date, config: customConfig, rebateRate = 4, multiple = 47 } = req.body;
    const config = mergeConfig(customConfig);

    let orders, reportOrders;
    if (req.user.role === 'admin') {
      orders = date ? db.prepare('SELECT * FROM orders WHERE date = ?').all(date) : db.prepare('SELECT * FROM orders').all();
      reportOrders = date ? db.prepare('SELECT * FROM report_orders WHERE date = ?').all(date) : db.prepare('SELECT * FROM report_orders').all();
    } else {
      orders = date ? db.prepare('SELECT * FROM orders WHERE date = ? AND user = ?').all(date, req.user.username) : db.prepare('SELECT * FROM orders WHERE user = ?').all(req.user.username);
      reportOrders = date ? db.prepare('SELECT * FROM report_orders WHERE date = ? AND user = ?').all(date, req.user.username) : db.prepare('SELECT * FROM report_orders WHERE user = ?').all(req.user.username);
    }

    const betData = {};
    for (const order of orders) {
      const lines = order.content.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const { numbers, zodiacs, amount } = parseLine(line, config);
        numbers.forEach(num => { betData[num] = (betData[num] || 0) + amount; });
        zodiacs.forEach(z => {
          (config.zodiac[z] || []).forEach(n => {
            const num = n.padStart(2, '0');
            betData[num] = (betData[num] || 0) + amount;
          });
        });
      }
    }
    for (const order of reportOrders) {
      const lines = order.content.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const { numbers, zodiacs, amount } = parseLine(line, config);
        numbers.forEach(num => { betData[num] = (betData[num] || 0) - amount; });
        zodiacs.forEach(z => {
          (config.zodiac[z] || []).forEach(n => {
            const num = n.padStart(2, '0');
            betData[num] = (betData[num] || 0) - amount;
          });
        });
      }
    }

    const list = [];
    for (let i = 1; i <= 49; i++) {
      const num = i.toString().padStart(2, '0');
      list.push({ num, bet: betData[num] || 0 });
    }
    list.sort((a, b) => b.bet - a.bet);
    const totalBet = list.reduce((s, i) => s + i.bet, 0);
    const rebate = (totalBet * rebateRate / 100).toFixed(2);
    const result = list.map((item, idx) => ({
      num: item.num,
      bet: item.bet,
      risk: Math.round(totalBet - item.bet * multiple - parseFloat(rebate)),
      rank: idx + 1
    }));

    res.json({ list: result, totalBet, totalRebate: rebate });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 更新配置（前端可传自定义分类）
app.post('/api/config', authenticateToken, (req, res) => {
  currentConfig = mergeConfig(req.body);
  res.json({ success: true });
});

app.get('/api/config', authenticateToken, (req, res) => {
  res.json(currentConfig);
});

// 前端页面
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
