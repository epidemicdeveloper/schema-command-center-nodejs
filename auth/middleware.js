/**
 * Authentication Middleware
 * Protects routes and checks user roles.
 */

const { db } = require('./database');

/**
 * Require authenticated session
 */
function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        // API requests get JSON response
        if (req.path.startsWith('/api/') || req.xhr || req.headers.accept === 'application/json') {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Page requests redirect to login
        return res.redirect('/login');
    }

    // Verify user still exists in database
    const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
        req.session.destroy();
        return res.redirect('/login');
    }

    // Attach user to request
    req.user = user;
    next();
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin };