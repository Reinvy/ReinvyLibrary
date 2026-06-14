---
title: "Logging and Monitoring in Express JS"
description: "This material covers how to implement logging and monitoring in your Express.js applications. You will learn to move away from simple console.log() statements a"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Logging and Monitoring in Express JS

## Summary

This material covers how to implement logging and monitoring in your Express.js applications. You will learn to move away from simple `console.log()` statements and implement structured HTTP request logging with Morgan and application-level logging with Winston to maintain and debug your applications effectively.

## Target Audience

- **Target Audience:** Backend developers who want to make their applications easier to debug and monitor in production.
- **Level:** Intermediate.

## Prerequisites

- Basic understanding of Express.js routing and middleware.
- Familiarity with debugging JavaScript applications.
- Understanding of the differences between development and production environments.

## Learning Objectives

After completing this material, you will be able to:

- Understand the limitations of using `console.log()` in production.
- Implement HTTP request logging using the Morgan middleware.
- Set up structured application logging using Winston.
- Differentiate between log levels (info, error, debug, etc.) and direct logs to different destinations (console, files).

## Context and Motivation

When building an Express app on your local machine, `console.log()` seems sufficient for debugging. However, when your application is deployed to production, standard console output can be easily lost, hard to search, and lacks critical context (like timestamps or severity levels). If your app crashes or a user reports an error, you need a systematic way to trace what happened.

Proper logging provides a historical record of your application's behavior. By combining an HTTP request logger (to track incoming traffic) with an application logger (to track business logic and errors), you can quickly diagnose issues, monitor performance, and understand user behavior.

## Core Content

### 1. The Problem with `console.log()`

`console.log()` is synchronous in some environments, lacks categorization (everything is just standard output), and doesn't format data consistently. In a production environment, you need:

- **Log Levels:** Distinguishing between an informational message, a warning, and a critical error.
- **Timestamps:** Knowing exactly when an event occurred.
- **Transports:** Sending logs to different places, such as a file, a database, or an external monitoring service.

### 2. HTTP Request Logging with Morgan

Morgan is an HTTP request logger middleware for Node.js. It automatically logs details about incoming requests, such as the HTTP method, URL, status code, and response time.

To use Morgan, install it via npm: `npm install morgan`.

```javascript
const express = require('express');
const morgan = require('morgan');
const app = express();

// Use the 'dev' format for development environments
// It color-codes the output for readability
app.use(morgan('dev'));

// For production, you might want a more comprehensive format like 'combined'
// app.use(morgan('combined'));
```

### 3. Application Logging with Winston

Winston is a versatile logging library for Node.js. It allows you to create structured logs (usually in JSON format) and route them to multiple destinations (transports).

To use Winston, install it: `npm install winston`.

```javascript
const winston = require('winston');

// Configure the logger
const logger = winston.createLogger({
  level: 'info', // Default log level
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// If we're not in production, also log to the console with simpler formatting
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Example usage
logger.info('Application started successfully.');
logger.error('Database connection failed.');
```

### 4. Combining Morgan and Winston

You can configure Morgan to send its HTTP request logs through Winston, ensuring all your application logs are centralized and formatted consistently.

```javascript
const morganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      // Configure Morgan to use Winston's info-level logging
      write: (message) => logger.info(message.trim()),
    },
  }
);

app.use(morganMiddleware);
```

## Code Examples

Imagine running a large hotel:

- **Morgan is the Front Desk Logbook:** It records every person who walks in, what room they asked for, and how long it took the receptionist to hand them a key.
- **Winston is the Internal Management System:** It records what happens behind the scenes. If a pipe bursts on the 4th floor (`logger.error()`), or if the kitchen successfully received a new shipment of ingredients (`logger.info()`), Winston records it with the exact time and severity.

Relying only on `console.log()` is like the hotel staff just shouting these updates into the hallway—eventually, the important messages will get lost in the noise.

## Key Insights

- **Structure is Key:** In production, logging in JSON format is highly recommended. It allows log aggregation tools (like Datadog, ELK stack, or Splunk) to easily parse and search your logs.
- **Don't Log Sensitive Data:** Be extremely careful not to log user passwords, API keys, or personally identifiable information (PII). Always sanitize logs if necessary.
- **Log Levels Matter:** Use `error` for system failures that require attention, `warn` for expected but undesirable situations, `info` for general lifecycle events, and `debug` for detailed tracing during development.

## Conclusion

- `console.log()` is not sufficient for production environments.
- Use **Morgan** to log incoming HTTP requests automatically.
- Use **Winston** to create structured, leveled application logs and save them to files or external services.
- Combining Morgan and Winston centralizes all your application logging.

## Next Steps

- [Deploying Express JS Applications to Production](Deploying%20Express%20JS%20Applications%20to%20Production.md)
- [Express JS Security Best Practices](Express%20JS%20Security%20Best%20Practices.md)
