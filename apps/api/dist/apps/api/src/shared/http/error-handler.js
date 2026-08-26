import { AppError } from '../errors/http.js';
export function setupErrorHandler(app) {
    app.setErrorHandler((error, request, reply) => {
        if (error instanceof AppError) {
            reply.status(error.statusCode).send({
                error: {
                    code: error.code,
                    message: error.message,
                },
            });
            return;
        }
        if (error.validation) {
            reply.status(400).send({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Request validation failed.',
                },
            });
            return;
        }
        if (error.statusCode === 401) {
            reply.status(401).send({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Unauthorized.',
                },
            });
            return;
        }
        app.log.error(error);
        reply.status(500).send({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred.',
            },
        });
    });
}
