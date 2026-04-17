/**
 * Epidemic Marketing Schema Command Center — Secure Server
 * Express server with session-based authentication, user management,
 * and security hardening.
 */

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');
const { db, initDatabase } = require('./auth/database');
const authRoutes = require('./auth/routes');
const { requireAuth, requireAdmin } = require('./auth/middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');

// ─── Security Headers ───────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fonts.googleapis.com", "https://sites.super.myninja.ai"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https:"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
        }
    },
    crossOriginEmbedderPolicy: false,
}));

// ─── Body Parsing & Cookies ─────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Rate Limiting ──────────────────────────────────────────────────
// Global rate limit
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(globalLimiter);

// Strict rate limit for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 login attempts per 15 minutes
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false }
});

// ─── Session Configuration ──────────────────────────────────────────
app.use(session({
    secret: SESSION_SECRET,
    name: 'schema_session',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
}));

// ─── CSRF Token Generation ──────────────────────────────────────────
app.use((req, res, next) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    next();
});

// CSRF validation for state-changing requests (POST, PUT, DELETE)
function csrfProtection(req, res, next) {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        // Skip CSRF for login (initial authentication)
        if (req.path === '/auth/login') {
            return next();
        }
        const token = req.headers['x-csrf-token'] || req.body._csrf;
        if (!token || token !== req.session.csrfToken) {
            return res.status(403).json({ error: 'Invalid CSRF token' });
        }
    }
    next();
}

// ─── Login Page (public) ────────────────────────────────────────────
app.get('/login', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'auth', 'login.html'));
});

// Login page assets
app.get('/login.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth', 'login.css'));
});

// ─── Auth API Routes ────────────────────────────────────────────────
app.use('/auth', loginLimiter, authRoutes);

// ─── Setup Check (redirects to setup if no users exist) ─────────────
app.get('/setup', (req, res) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count > 0) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'auth', 'setup.html'));
});

// ─── Protected App Routes ───────────────────────────────────────────
// Check if setup is needed
app.use((req, res, next) => {
    if (req.path === '/login' || req.path === '/login.css' || req.path.startsWith('/auth') || req.path === '/setup') {
        return next();
    }
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
        return res.redirect('/setup');
    }
    next();
});

// Apply CSRF to all protected routes
app.use(csrfProtection);

// API to get CSRF token (must be authenticated)
app.get('/api/csrf-token', requireAuth, (req, res) => {
    res.json({ csrfToken: req.session.csrfToken });
});

// User management API (admin only)
app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
    const users = db.prepare('SELECT id, username, role, created_at, last_login FROM users ORDER BY created_at DESC').all();
    res.json({ users });
});

app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const bcrypt = require('bcryptjs');
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
    if (existing) {
        return res.status(409).json({ error: 'Username already exists' });
    }
    
    const hash = bcrypt.hashSync(password, 12);
    const userRole = role === 'admin' ? 'admin' : 'user';
    
    try {
        db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username.toLowerCase(), hash, userRole);
        res.json({ success: true, message: `User "${username}" created successfully` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
    const userId = parseInt(req.params.id);
    
    // Prevent deleting yourself
    if (userId === req.session.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ success: true, message: 'User deleted' });
});

app.put('/api/users/:id/password', requireAuth, requireAdmin, (req, res) => {
    const userId = parseInt(req.params.id);
    const { password } = req.body;
    
    if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(password, 12);
    
    const result = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
    if (result.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, message: 'Password updated' });
});

// Change own password (any authenticated user)
app.put('/api/account/password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    
    const bcrypt = require('bcryptjs');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hash = bcrypt.hashSync(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.session.userId);
    
    res.json({ success: true, message: 'Password changed successfully' });
});

// Current user info
app.get('/api/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(req.session.userId);
    res.json({ user, csrfToken: req.session.csrfToken });
});

// ─── Serve Protected Static Files ───────────────────────────────────
app.use(requireAuth, express.static(path.join(__dirname, 'public')));

// Catch-all: redirect unauthenticated to login
app.use((req, res) => {
    if (req.session && req.session.userId) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.redirect('/login');
    }
});

// ─── Initialize & Start ─────────────────────────────────────────────
initDatabase();

app.listen(PORT, '0.0.0.0', () => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log(`\n🔒 Schema Command Center running on http://localhost:${PORT}`);
    if (userCount.count === 0) {
        console.log(`\n⚠️  No users found. Visit http://localhost:${PORT}/setup to create the admin account.\n`);
    } else {
        console.log(`   ${userCount.count} user(s) registered. Login required.\n`);
    }
});