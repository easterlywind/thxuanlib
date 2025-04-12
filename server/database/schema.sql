
-- Drop database if exists
DROP DATABASE IF EXISTS library_management;

-- Create database
CREATE DATABASE library_management;
USE library_management;

-- Create books table
CREATE TABLE books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  isbn VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  publishYear INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  publisher VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  availableQuantity INT NOT NULL DEFAULT 1,
  coverImage VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  fullName VARCHAR(100) NOT NULL,
  role ENUM('librarian', 'student') NOT NULL,
  isBlocked BOOLEAN DEFAULT FALSE,
  blockReason VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create borrow records table
CREATE TABLE borrow_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookId INT NOT NULL,
  userId INT NOT NULL,
  borrowDate DATETIME NOT NULL,
  dueDate DATETIME NOT NULL,
  returnDate DATETIME,
  status ENUM('borrowed', 'returned', 'overdue', 'reserved') NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bookId) REFERENCES books(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Create user_borrowed_books junction table
CREATE TABLE user_borrowed_books (
  userId INT NOT NULL,
  bookId INT NOT NULL,
  PRIMARY KEY (userId, bookId),
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (bookId) REFERENCES books(id)
);

-- Create notifications table
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  date DATETIME NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  type ENUM('return_reminder', 'book_available', 'overdue', 'system') NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Indexes for better performance
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_borrow_records_status ON borrow_records(status);
CREATE INDEX idx_notifications_userId ON notifications(userId);
