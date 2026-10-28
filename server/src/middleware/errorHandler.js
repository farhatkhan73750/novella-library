export const notFound = (req, res) => {
  res.status(404).json({ message: "Route not found" });
};

// Express recognises an error handler by its FOUR parameters
export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const code = Number(err.statusCode || err.status);
  let statusCode = code >= 400 && code < 600 ? code : 500;
  let message = err.message || "Something went wrong";

  // Mongoose validation failed (missing field, bad enum value, ...)
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }

  // Bad value for a field type (for example an invalid id)
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid value provided";
  }

  // Malformed JSON body
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON in request body";
  }

  // Body larger than the limit
  if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large";
  }

  // Duplicate key (for example an email that already exists)
  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate value";
  }

  // Server faults: log the details here, and hide them from the client in production
  if (statusCode >= 500) {
    console.error(err.stack);
    if (process.env.NODE_ENV === "production") {
      message = "Something went wrong";
    }
  }

  res.status(statusCode).json({ message });
};