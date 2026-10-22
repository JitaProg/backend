const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = err.message || 'Error intern del servidor';
    let details = [];

    // Error de duplicado en MongoDB (E11000 - unique index)
    if (err.code === 11000) {
        statusCode = 409;
        code = 'DUPLICATE_ERROR';
        const field = Object.keys(err.keyValue)[0];
        message = `El camp '${field}' amb el valor '${err.keyValue[field]}' ja existeix.`;
        details = [{ field, message: 'Ja està en ús' }];
    }

    // Error de validación de Mongoose
    if (err.name === 'ValidationError') {
        statusCode = 422;
        code = 'VALIDATION_ERROR';
        message = 'Les dades proporcionades no són vàlides';
        details = Object.keys(err.errors).map(field => ({
            field,
            message: err.errors[field].message
        }));
    }

    // Error de CastError (ID de MongoDB con formato inválido)
    if (err.name === 'CastError') {
        statusCode = 400;
        code = 'INVALID_ID';
        message = 'L\'identificador proporcionat no té un format vàlid';
    }

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(details.length > 0 && { details })
        }
    });
};

module.exports = errorHandler;