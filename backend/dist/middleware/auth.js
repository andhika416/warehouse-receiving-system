import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from './errorHandler.js';
export function authenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or malformed Authorization header');
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = {
            id: decoded.sub,
            username: decoded.username,
            role: decoded.role,
        };
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new UnauthorizedError('Access token has expired');
        }
        throw new UnauthorizedError('Invalid access token');
    }
}
export function requireRole(...allowedRoles) {
    return (req, _res, next) => {
        if (!req.user) {
            throw new UnauthorizedError('Authentication required');
        }
        if (!allowedRoles.includes(req.user.role)) {
            throw new ForbiddenError(`Forbidden: Role '${req.user.role}' is not authorized to perform this operation. Required: [${allowedRoles.join(', ')}]`);
        }
        next();
    };
}
