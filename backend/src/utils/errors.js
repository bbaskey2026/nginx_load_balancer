class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
    }
}

class NotFoundError extends AppError {
    constructor(message = "Resource not found") { super(message, 404); }
}

class ValidationError extends AppError {
    constructor(message = "Invalid input") { super(message, 400); }
}

class ConflictError extends AppError {
    constructor(message = "Conflict") { super(message, 409); }
}

module.exports = { AppError, NotFoundError, ValidationError, ConflictError };
