# Deploying Express JS Applications to Production

## Ringkasan Singkat

This material covers the essential steps and best practices for deploying an Express.js application to a production environment. You will learn about environment variables, process managers like PM2, reverse proxies like Nginx, and essential pre-deployment checks to ensure a reliable and scalable backend.

## Untuk Siapa Materi Ini

- **Target Audience:** Intermediate web developers preparing to take their Express.js applications live.
- **Level:** Intermediate to Advanced.

## Prasyarat

- Solid understanding of Express.js core concepts (routing, middleware).
- Familiarity with the terminal and basic Linux commands.
- Knowledge of Express security best practices (e.g., Helmet, Rate Limiting).
- Have read [Express JS Security Best Practices](Express%20JS%20Security%20Best%20Practices.md).

## Tujuan Belajar

After completing this material, you will be able to:

- Prepare an Express.js application for a production environment.
- Understand the role of environment variables in configuration.
- Keep the application running continuously using PM2.
- Configure a reverse proxy (like Nginx) in front of the Express server.
- Identify common pitfalls during the deployment process.

## Konteks dan Motivasi

Developing an Express.js application locally is straightforward: you write code and run `npm start` or `nodemon`. However, running an app in production is entirely different. In production, your app needs to handle high traffic, recover automatically from crashes, serve over secure connections (HTTPS), and hide server details from the public.

Deploying blindly without understanding process management and reverse proxies often leads to downtime and unhandled exceptions that crash the server permanently. This tutorial bridges the gap between local development and a robust production setup.

## Materi Inti

### 1. Preparing the Code for Production

Before deploying, make sure your code is production-ready:

- **Set `NODE_ENV`:** Always run your application with `NODE_ENV=production`. Express and many middleware packages optimize their performance and reduce logging when this environment variable is set.
- **Remove Development Dependencies:** Run `npm ci --production` on the server to install only the necessary packages, reducing the build size and potential vulnerabilities.
- **Implement Security Middleware:** Ensure you are using packages like `helmet` and `express-rate-limit`.

### 2. Managing Environment Variables

Hardcoding sensitive information (database URIs, API keys) is a severe security risk. Use environment variables. In development, you might use a `.env` file with the `dotenv` package. In production, these variables should be injected directly into the server's environment or managed by your deployment platform (e.g., AWS Secrets Manager, Heroku Config Vars).

### 3. Keeping the App Alive with PM2

Running `node app.js` in production is dangerous. If the application crashes due to an unhandled error, it goes down until you manually restart it. PM2 is a production process manager for Node.js applications with a built-in load balancer.

To use PM2:

```bash
# Install PM2 globally on your server
npm install pm2 -g

# Start your application
pm2 start app.js --name "my-express-app"

# Ensure PM2 restarts on server reboot
pm2 startup
pm2 save
```

PM2 will automatically restart your application if it crashes, providing high availability.

### 4. Setting up a Reverse Proxy (Nginx)

Express is not designed to be a front-facing web server handling SSL/TLS or serving static files at a massive scale. A Reverse Proxy like Nginx or HAProxy sits in front of your Express app. It listens on port 80 (HTTP) or 443 (HTTPS) and forwards requests to your Express app running on a local port (e.g., 3000).

A basic Nginx configuration for an Express app:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Contoh / Ilustrasi

Imagine your Express application is a master chef in a restaurant:

- **Local Development (`node app.js`):** The chef is cooking and also serving the food directly to the customer. This works for one or two customers.
- **PM2:** The restaurant manager. If the chef accidentally cuts their finger and stops working (a crash), the manager immediately brings in a replacement chef so the kitchen keeps running.
- **Nginx (Reverse Proxy):** The waiters and the host at the front door. They handle the crowd, check reservations, serve the bread (static files), and only pass the complex orders (API requests) back to the chef.

## Insight Penting

- **Never Run Node.js on Port 80 as Root:** Running an Express app on port 80 usually requires root privileges, which is a major security risk. Run Express as a non-root user on a higher port (like 3000) and use Nginx on port 80 to proxy the traffic.
- **Cluster Mode:** Node.js is single-threaded. To utilize multi-core processors, you can use PM2's cluster mode (`pm2 start app.js -i max`), which spawns multiple instances of your app to handle more concurrent requests.
- **Logging:** PM2 handles log rotation, which prevents your server's disk from filling up with massive log files over time.

## Ringkasan Akhir

- Set `NODE_ENV=production` to optimize Express.
- Never hardcode secrets; always use Environment Variables.
- Use a process manager like PM2 to automatically restart the app on crashes.
- Place a reverse proxy like Nginx in front of Express to handle load balancing, SSL, and static files safely.

## Langkah Belajar Berikutnya

- Learn how to set up CI/CD pipelines (e.g., GitHub Actions) to automate deployments.
- Explore containerization with Docker to deploy your Express application consistently across any environment.

## Metadata

- Level: Intermediate
- Topik utama: Express.js, Backend Development, Deployment
- Topik terkait: PM2, Nginx, Production
- Kata kunci: express deployment, pm2, reverse proxy, nginx, node environment
- Estimasi waktu baca: 10 - 15 minutes
