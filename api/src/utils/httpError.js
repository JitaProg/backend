// QUÈ FA: crea un error amb un codi HTTP (statusCode) i un codi intern (code).
// AMB QUÈ CONNECTA: el fan servir els serveis (per exemple userService) i el rep
// el middleware errorHandler, que construeix la resposta JSON final.
const createError = (statusCode, code, message) => {
    const error = new Error(message);
    error.statusCode = statusCode; // Codi HTTP: 400, 401, 403, 422...
    error.code = code;             // Codi propi: INVALID_CREDENTIALS, UNAUTHORIZED...
    return error;
};

module.exports = { createError };
