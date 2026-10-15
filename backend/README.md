# QMetric Backend

This directory contains the backend API for the QMetric platform. It is built with Node.js and Express and handles authentication, role-based access, paper management, admin workflows, notifications, and secure file processing.

## Overview

The backend exposes a REST API that powers the frontend application and manages the core academic workflow for the system. It supports multiple user roles and college-level administration, including teacher, reviewer, student, college admin, admin, and super admin flows.

## Features

- JWT-based authentication and authorization
- Role-aware access control
- College and user management endpoints
- Paper submission, retrieval, and review logic
- Admin and super-admin tools
- Notification and email integration
- Cloudinary file uploads
- Redis support for rate limiting in multi-instance deployments
- Swagger/OpenAPI API documentation
- CSRF protection and security hardening

## Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- bcrypt
- JWT
- Cloudinary
- Redis
- Swagger JSdoc
- Helmet, CORS, rate-limit
- Nodemailer

## Project Structure

```text
backend/
├── config/
├── controllers/
├── middleware/
├── Model/
├── routes/
├── scripts/
├── tests/
├── utils/
├── .env.example
├── index.js
├── jest.config.js
├── package.json
├── README.md
├── seed.js
├── seedSuperAdmin.js
└── postman/
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB instance
- Optional Redis server
- Cloudinary account
- SMTP credentials if you want email notifications enabled

## Installation

```bash
cd backend
npm install
```

## Environment Variables

Copy the sample file and configure your environment:

```bash
cp .env.example .env
```

Required variables include:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/qmetric
ACCESS_TOKEN_SECRET=your_jwt_secret
CSRF_SECRET=your_csrf_secret
ADMIN_SECRET_KEY=your_admin_secret
TURNSTILE_SECRET_KEY=your_turnstile_secret
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
FRONTEND_URL=http://localhost:3000
```

Optional variables:

```env
REDIS_URL=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
ENABLE_DEV_AUTH=false
```

See [./.env.example](.env.example) for the full configuration reference.

## Running the API

### Development mode

```bash
npm run dev
```

### Production mode

```bash
npm start
```

By default, the backend runs on:

```text
http://localhost:5000
```

## Useful Scripts

```bash
npm run dev
npm run start
npm run seed
npm run seed:demo
npm run test
npm run test:coverage
npm run reconcile
npm run export:postman
```

## API Documentation

The backend exposes Swagger docs at:

```text
http://localhost:5000/api-docs
```

You can also export or inspect the OpenAPI document through the backend utilities included in the project.

## Security Notes

- Passwords are hashed using bcrypt.
- JWT tokens are used for session management.
- CSRF protection is applied to state-changing routes.
- Rate limiting helps reduce abuse and brute-force attempts.
- Helmet adds protective HTTP headers.
- Sensitive secrets must be supplied via environment variables, not committed to source control.

## Deployment Guidance

When deploying to a hosting provider such as Render, Railway, or Fly.io:

- Set environment variables using the platform dashboard.
- Do not rely on local `.env` files in production.
- Ensure `NODE_ENV` is set to `production`.
- Configure `FRONTEND_URL` and CORS origins correctly.
- If running multiple app instances, configure Redis for distributed rate limiting.

## Notes

This backend is designed around a higher-education, paper-review workflow and supports multi-role academic administration. It is suitable for institutions managing student submissions, reviewer decisions, and administrative coordination.
