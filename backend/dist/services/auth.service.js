import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../middleware/errorHandler.js';
export class AuthService {
    static async login(username, password) {
        const res = await query('SELECT id, username, password_hash, role, created_at FROM users WHERE username = $1', [username]);
        if (res.rowCount === 0) {
            throw new UnauthorizedError('Invalid username or password');
        }
        const user = res.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid username or password');
        }
        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role,
        };
        const accessToken = jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: env.JWT_EXPIRES_IN,
        });
        const refreshToken = jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
            expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
        });
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                createdAt: user.created_at,
            },
        };
    }
    static async refreshToken(token) {
        try {
            const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET);
            const payload = {
                sub: decoded.sub,
                username: decoded.username,
                role: decoded.role,
            };
            const newAccessToken = jwt.sign(payload, env.JWT_SECRET, {
                expiresIn: env.JWT_EXPIRES_IN,
            });
            return { accessToken: newAccessToken };
        }
        catch {
            throw new UnauthorizedError('Invalid or expired refresh token');
        }
    }
    static async getMe(userId) {
        const res = await query('SELECT id, username, role, created_at, updated_at FROM users WHERE id = $1', [userId]);
        if (res.rowCount === 0) {
            throw new UnauthorizedError('User not found');
        }
        return res.rows[0];
    }
}
