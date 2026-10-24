export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode, code, details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
export class BadRequestError extends AppError {
    constructor(message = 'Bad request', details) {
        super(message, 400, 'BAD_REQUEST', details);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', details) {
        super(message, 401, 'UNAUTHORIZED', details);
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden: Insufficient permissions', details) {
        super(message, 403, 'FORBIDDEN', details);
    }
}
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found', details) {
        super(message, 404, 'NOT_FOUND', details);
    }
}
export class ConflictError extends AppError {
    constructor(message = 'Conflict with existing resource state', details) {
        super(message, 409, 'CONFLICT', details);
    }
}
export class UnprocessableEntityError extends AppError {
    constructor(message = 'Validation failed', details) {
        super(message, 422, 'UNPROCESSABLE_ENTITY', details);
    }
}
export function errorHandler(err, _req, res, _next) {
    // Known custom Application Errors
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
            ...(err.details ? err.details : {}),
        });
        return;
    }
    // PostgreSQL Check Constraint Violations
    if (err.code === '23514') {
        if (err.constraint === 'chk_strict_no_over_receiving') {
            res.status(422).json({
                success: false,
                message: 'Over-receiving forbidden: received_quantity cannot exceed expected_quantity.',
                code: 'OVER_RECEIVING_FORBIDDEN',
            });
            return;
        }
        if (err.constraint === 'chk_inventories_quantity_non_negative') {
            res.status(422).json({
                success: false,
                message: 'Database check constraint violation: inventory quantity cannot be negative.',
                code: 'NEGATIVE_INVENTORY_FORBIDDEN',
            });
            return;
        }
    }
    // PostgreSQL Unique Key Constraint Violations
    if (err.code === '23505') {
        res.status(409).json({
            success: false,
            message: 'A duplicate record already exists with the given unique identifier.',
            code: 'DUPLICATE_RESOURCE',
            detail: err.detail,
        });
        return;
    }
    // PostgreSQL Foreign Key Violations
    if (err.code === '23503') {
        res.status(400).json({
            success: false,
            message: 'Referenced foreign key entity does not exist.',
            code: 'FOREIGN_KEY_VIOLATION',
            detail: err.detail,
        });
        return;
    }
    console.error('[UNHANDLED_ERROR]', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error occurred.',
        code: 'INTERNAL_SERVER_ERROR',
    });
}
