
# Library Management System

This is a library management system for Thanh Xuan High School with features for book management, borrowing/returning books, student management, and reporting.

## Features

- Authentication system with role-based access control
- Book management (add, edit, delete books)
- QR code scanning for student identification
- Borrowing and returning books
- Book search and filtering
- User management (block/unblock students)
- Notifications for due dates and available books
- Reports and statistics

## Getting Started

### Prerequisites

- Node.js (v16+)
- MySQL (v8+)

### Database Setup

1. Create a MySQL database:

```bash
mysql -u root -p < server/database/schema.sql
mysql -u root -p < server/database/seed.sql
```

2. Configure your database connection in the `.env` file:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=library_management
PORT=5000
```

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/library-management-system.git
cd library-management-system
```

2. Install dependencies:

```bash
npm install
```

3. Start the backend server:

```bash
node server/server.js
```

4. Start the frontend development server:

```bash
npm run dev
```

5. Access the application at http://localhost:8080

## Login Credentials

### Librarian
- Username: librarian
- Password: password123

### Students
- Username: student1
- Password: password123

- Username: student2
- Password: password123

## Project Structure

- `/src` - Frontend React application
  - `/components` - Reusable UI components
  - `/contexts` - React contexts for state management
  - `/hooks` - Custom React hooks
  - `/pages` - Application pages
  - `/services` - API service layer
  - `/types` - TypeScript type definitions
  - `/mock` - Mock data for development
- `/server` - Backend Express server
  - `/database` - Database schema and seed files
