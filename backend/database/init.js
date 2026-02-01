const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Database instance
let db = null;
let dbReady = false;

// Path to database file
const dbDir = path.join(__dirname);
const dbPath = path.join(dbDir, 'college.db');

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      branch TEXT,
      year TEXT,
      bio TEXT,
      profile_photo TEXT,
      is_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      profile_completed INTEGER DEFAULT 0,
      is_online INTEGER DEFAULT 0,
      last_seen TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('pending', 'accepted')) DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(requester_id, receiver_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      image TEXT,
      media_type TEXT DEFAULT 'image',
      original_post_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (original_post_id) REFERENCES posts(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Workshops table
  db.run(`
    CREATE TABLE IF NOT EXISTS workshops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      instructor_id INTEGER NOT NULL,
      scheduled_at TEXT NOT NULL,
      duration INTEGER DEFAULT 60,
      max_participants INTEGER DEFAULT 50,
      status TEXT DEFAULT 'scheduled',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Workshop participants
  db.run(`
    CREATE TABLE IF NOT EXISTS workshop_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workshop_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at TEXT DEFAULT (datetime('now')),
      attended INTEGER DEFAULT 0,
      FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(workshop_id, user_id)
    )
  `);

  // Badges table
  db.run(`
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT
    )
  `);

  // User badges
  db.run(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_id INTEGER NOT NULL,
      workshop_id INTEGER,
      awarded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
      FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE SET NULL,
      UNIQUE(user_id, badge_id, workshop_id)
    )
  `);

  // Seed default badges
  db.run(`INSERT OR IGNORE INTO badges (name, description, icon) VALUES ('Workshop Attendee', 'Attended a workshop session', '🎓')`);
  db.run(`INSERT OR IGNORE INTO badges (name, description, icon) VALUES ('Active Participant', 'Actively participated in discussions', '🔥')`);
  db.run(`INSERT OR IGNORE INTO badges (name, description, icon) VALUES ('Merit Badge', 'Recognized for outstanding contribution', '🥇')`);

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_connections_receiver ON connections(receiver_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_workshops_status ON workshops(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_workshop_participants ON workshop_participants(workshop_id)');

  saveDatabase();
  dbReady = true;
  console.log('Database initialized successfully');
}

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Helper functions to provide better-sqlite3 like API
function prepare(sql) {
  return {
    run: (...params) => {
      db.run(sql, params);
      // Get last insert rowid IMMEDIATELY after run, before any other operation
      const lastId = getLastInsertRowid();
      const changes = db.getRowsModified();
      saveDatabase();
      return {
        changes: changes,
        lastInsertRowid: lastId
      };
    },
    get: (...params) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },
    all: (...params) => {
      const results = [];
      const stmt = db.prepare(sql);
      stmt.bind(params);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    }
  };
}

function getLastInsertRowid() {
  try {
    const stmt = db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    return result.id || 0;
  } catch (e) {
    console.error('Error getting last insert rowid:', e);
    return 0;
  }
}

function exec(sql) {
  db.run(sql);
  saveDatabase();
}

// Wait for database to be ready
function waitForDb() {
  return new Promise((resolve) => {
    const check = () => {
      if (dbReady) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

// Initialize and export
initDatabase().catch(console.error);

module.exports = {
  prepare,
  exec,
  waitForDb,
  getDb: () => db,
  saveDatabase
};
