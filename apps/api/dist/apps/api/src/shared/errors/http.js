export class AppError extends Error {
    statusCode;
    code;
    constructor(code, message, statusCode = 400) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
    }
}
export class ValidationError extends AppError {
    constructor(message) {
        super('VALIDATION_ERROR', message, 400);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized.') {
        super('UNAUTHORIZED', message, 401);
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden.') {
        super('FORBIDDEN', message, 403);
    }
}
export class NotFoundError extends AppError {
    constructor(code, message) {
        super(code, message, 404);
    }
}
export class ConflictError extends AppError {
    constructor(code, message) {
        super(code, message, 409);
    }
}
