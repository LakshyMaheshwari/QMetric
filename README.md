# QMetric

QMetric is a full-stack academic and institutional workflow platform built for managing paper submission, evaluation, reviewer workflows, college administration, and administrative oversight. The system supports role-based access for students, teachers, reviewers, college admins, and super admins.

## Overview

The project is split into two main parts:

- Frontend: React application with Tailwind styling, animated UI components, and dashboard-based user flows.
- Backend: Express.js API connected to MongoDB, with authentication, authorization, file uploads, notifications, and role-driven logic.

This repository is designed for universities, research programs, and academic institutions that need to manage paper records, approvals, and evaluation flows in one place.

## Features

- User registration and authentication
- Role-based dashboards for:
  - Student
  - Teacher
  - Reviewer
  - Admin
  - Super Admin
- College registration and management
- Paper upload and retrieval workflows
- Reviewer-based evaluation flows
- Admin and college-admin monitoring tools
- Cloudinary-powered file storage
- Email and notification integration
- CSRF and rate limiting protections
- Redis support for multi-instance rate limiting
- Swagger API documentation

## Tech Stack

### Frontend
- React 18
- React Router
- Tailwind CSS
- Framer Motion
- Axios
- Recharts
- Cloudflare Turnstile integration

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- bcrypt password hashing
- Redis (optional)
- Cloudinary
- Nodemailer
- Helmet, CORS, and rate limiting middleware
- Swagger/OpenAPI docs

## Project Structure

```text
QMetric/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── Model/
│   ├── routes/
│   ├── scripts/
│   ├── tests/
│   ├── utils/
│   ├── .env.example
│   ├── index.js
│   ├── package.json
│   └── README.md
├── frontend/
│   └── Aceternity-UI-React/
│       ├── public/
│       ├── src/
│       ├── .env.example
│       ├── package.json
│       └── README.md
├── README.md
├── package.json
├── playwright.config.ts
└── tests/
```

## Prerequisites

Before you start, make sure you have the following installed:

- Node.js 18 or later
- npm
- MongoDB instance or MongoDB Atlas connection
- Optional: Redis for rate-limit scaling

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/LakshyMaheshwari/QMetric.git
cd QMetric
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend/Aceternity-UI-React
npm install
```

### 4. Configure environment variables

Create your backend environment file:

```bash
cd backend
cp .env.example .env
```

Then update the values in `.env` with your own secrets and connection details.

For the frontend, create an environment file:

```bash
cd ../frontend/Aceternity-UI-React
cp .env.example .env
```

Make sure `REACT_APP_API_URL` points to your backend server, usually:

```env
REACT_APP_API_URL=http://localhost:5000
```

## Environment Variables

### Backend
The backend expects variables such as:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/qmetric
ACCESS_TOKEN_SECRET=your_secret_here
CSRF_SECRET=your_csrf_secret_here
ADMIN_SECRET_KEY=your_admin_secret_here
TURNSTILE_SECRET_KEY=your_turnstile_secret
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
FRONTEND_URL=http://localhost:3000
```

See [backend/.env.example](backend/.env.example) for the full reference.

### Frontend
The frontend configuration includes:

```env
REACT_APP_TURNSTILE_SITE_KEY=your_site_key
REACT_APP_API_URL=http://localhost:5000
```

See [frontend/Aceternity-UI-React/.env.example](frontend/Aceternity-UI-React/.env.example).

## Running the Project

### Start the backend

```bash
cd backend
npm run dev
```

The API will run on the configured backend port (default: `5000`).

### Start the frontend

```bash
cd frontend/Aceternity-UI-React
npm start
```

The frontend will usually run on `http://localhost:3000`.

## Useful Backend Scripts

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

The backend includes Swagger docs and exposes the API documentation UI at:

```text
http://localhost:5000/api-docs
```

This is useful for exploring the available endpoints and payloads during development.

## Deployment Notes

- Set production environment variables in the hosting platform instead of relying on local `.env` files.
- Use a secure MongoDB connection string in production.
- Configure `FRONTEND_URL` and CORS allowed origins properly.
- Enable Redis if running multiple app instances behind a load balancer.
- Keep JWT and admin secrets strong and environment-managed.

## Security Highlights

- Passwords are hashed using bcrypt.
- JWT-based role-aware authentication is used across the app.
- CSRF protection is enabled for state-changing routes.
- Rate limiting is used for login and high-risk operations.
- Helmet is configured to improve HTTP security headers.
- Cloudflare Turnstile is integrated for bot protection.

## Contributing

Contributions are welcome. To contribute:

1. Fork the project.
2. Create a feature branch.
3. Make your changes.
4. Run relevant tests and validate the work.
5. Open a pull request with a clear summary.

## License

This project currently does not declare a public license in the repository metadata. Please confirm the licensing terms with the project owner before reusing or distributing it commercially.

## Notes

This repository is intended for academic workflow automation and research management. The application structure supports multiple institutional roles and operational flows, which makes it suitable for higher-education or research-focused deployments.
