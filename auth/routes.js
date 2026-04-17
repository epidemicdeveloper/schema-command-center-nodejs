/**
 * Authentication Routes
 * Handles login, logout, setup, and session management.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('./database');

const router = express.Router();

// Account lockout settings
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MIN = 30;

/**
 * POST /auth/login
 */
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase().trim());

    if (!user) {
        // Generic error to prevent user enumeration
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check if account is locked
    if (user.locked_until) {
        const lockExpiry = new Date(user.locked_until);
        if (lockExpiry > new Date()) {
            const minutesLeft = Math.ceil((lockExpiry - new Date()) / 60000);
            return res.status(423).json({
                error: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`
            });
        } else {
            // Lock expired, reset
            db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
            user.failed_attempts = 0;
            user.locked_until = null;
        }
    }

    // Verify password
    const valid = bcrypt.compareSync(password, user.password_hash);

    if (!valid) {
        const newAttempts = (user.failed_attempts || 0) + 1;

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MIN * 60000).toISOString();
            db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
                .run(newAttempts, lockUntil, user.id);

            // Log the lockout
            db.prepare('INSERT INTO sessions_log (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)')
                .run(user.id, 'account_locked', req.ip, req.headers['user-agent']);

            return res.status(423).json({
                error: `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_DURATION_MIN} minutes.`
            });
        }

        db.prepare('UPDATE users SET failed_attempts = ? WHERE id = ?').run(newAttempts, user.id);

        const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
        return res.status(401).json({
            error: 'Invalid username or password',
            attemptsRemaining: remaining
        });
    }

    // Successful login — reset failed attempts, update last_login
    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?')
        .run(user.id);

    // Log successful login
    db.prepare('INSERT INTO sessions_log (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)')
        .run(user.id, 'login', req.ip, req.headers['user-agent']);

    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.json({
        success: true,
        user: {
            id: user.id,
            username: user.username,
            role: user.role
        }
    });
});

/**
 * POST /auth/logout
 */
router.post('/logout', (req, res) => {
    if (req.session.userId) {
        db.prepare('INSERT INTO sessions_log (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)')
            .run(req.session.userId, 'logout', req.ip, req.headers['user-agent']);
    }
    req.session.destroy((err) => {
        res.clearCookie('schema_session');
        res.json({ success: true });
    });
});

/**
 * GET /auth/check
 * Check if current session is valid
 */
router.get('/check', (req, res) => {
    if (req.session && req.session.userId) {
        const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(req.session.userId);
        if (user) {
            return res.json({ authenticated: true, user });
        }
    }
    res.json({ authenticated: false });
});

/**
 * POST /auth/setup
 * Create the first admin account (only works when no users exist)
 */
router.post('/setup', (req, res) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();

    if (userCount.count > 0) {
        return res.status(403).json({ error: 'Setup already completed. Use login instead.' });
    }

    const { username, password, confirmPassword } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
    }

    const hash = bcrypt.hashSync(password, 12);

    try {
        const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(
            username.toLowerCase().trim(), hash, 'admin'
        );

        // Auto-login the new admin
        req.session.userId = result.lastInsertRowid;
        req.session.username = username.toLowerCase().trim();
        req.session.role = 'admin';

        console.log(`\n🎉 Admin account "${username}" created successfully!\n`);

        res.json({ success: true, message: 'Admin account created. Redirecting...' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create admin account' });
    }
});

module.exports = router;