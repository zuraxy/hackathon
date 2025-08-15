# Hackathon Backend

This is the backend API for the Hackercup 2025 project.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
2. Navigate to the backend directory:
   ```
   cd hackathon/backend
   ```
3. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```
4. Set up your environment variables:
   - Copy `.env.example` to `.env` (if applicable)
   - Update the variables in `.env` file

### Running the Server

For development:
```
npm run dev
```
or
```
yarn dev
```

For production:
```
npm start
```
or
```
yarn start
```

## API Endpoints

### Examples

- GET `/api/examples` - Get all examples
- GET `/api/examples/:id` - Get example by ID
- POST `/api/examples` - Create new example
- PUT `/api/examples/:id` - Update example
- DELETE `/api/examples/:id` - Delete example

## Project Structure

```
/backend
  ├── config/           # Configuration files
  ├── controllers/      # Route controllers
  ├── middleware/       # Custom middleware
  ├── models/           # Database models
  ├── routes/           # API routes
  ├── app.js            # Express app setup
  ├── server.js         # Server entry point
  └── package.json      # Dependencies
```
