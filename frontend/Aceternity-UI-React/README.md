# QMetric Frontend

This directory contains the React frontend for the QMetric platform. It provides the web experience for users to register, log in, upload papers, review results, and access role-based dashboards for students, teachers, reviewers, admins, and super admins.

## Overview

The frontend is built with React and styled using Tailwind CSS. It uses a role-aware dashboard structure, animated UI components, and a modular component architecture to present academic, administrative, and review workflows clearly to end users.

## Features

- Landing and registration flows
- Login and authentication experience
- Role-based dashboard navigation
- Paper upload and result views
- College registration screens
- User profile management
- Admin and super-admin management panels
- Animated UI components and dashboard elements
- Cloudflare Turnstile integration for bot protection

## Tech Stack

- React 18
- React Router
- Tailwind CSS
- Framer Motion
- Axios
- Recharts
- Lucide and Heroicons
- React Hook Form + Zod validation
- Cloudflare Turnstile

## Project Structure

```text
frontend/Aceternity-UI-React/
├── public/
├── src/
│   ├── api/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── schemas/
│   ├── utils/
│   ├── App.css
│   ├── App.js
│   ├── index.css
│   └── index.js
├── .env.example
├── package.json
├── README.md
├── tailwind.config.js
├── postcss.config.js
```

## Prerequisites

- Node.js 18+
- npm
- A running QMetric backend instance

## Installation

```bash
cd frontend/Aceternity-UI-React
npm install
```

## Environment Variables

Copy the environment example file and fill in your values:

```bash
cp .env.example .env
```

Example:

```env
REACT_APP_TURNSTILE_SITE_KEY=your_site_key
REACT_APP_API_URL=http://localhost:5000
```

## Running the Frontend

### Development mode

```bash
npm start
```

This will start the app at:

```text
http://localhost:3000
```

### Production build

```bash
npm run build
```

## Available Scripts

```bash
npm start
npm run build
npm test
npm run eject
```

## Frontend Workflow

The UI is designed around the core academic platform actions:

- user registration and login
- profile access
- paper upload and retrieval
- review dashboards
- college management
- super-admin controls

## API Connectivity

The app calls the backend through `REACT_APP_API_URL` configured in the frontend environment. During local development, this should usually point to:

```env
REACT_APP_API_URL=http://localhost:5000
```

## Notes

This frontend is built for a modern academic platform and emphasizes usability, dashboard clarity, and role-specific workflows. It is intended to work alongside the backend API in this repository and supports both development and production deployment patterns.


