
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

-- Create notifications table
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  date DATETIME NOT NULL,
  `read` BOOLEAN DEFAULT FALSE,
  type ENUM('return_reminder', 'book_available', 'overdue', 'system') NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Create book reservations table for managing book reservation queue
CREATE TABLE book_reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookId INT NOT NULL,
  userId INT NOT NULL,
  reservationDate DATETIME NOT NULL,
  dueDate DATETIME NOT NULL, -- Ngày hết hạn đặt trước
  priority INT NOT NULL, -- Lower number means higher priority in queue
  status ENUM('pending', 'fulfilled', 'cancelled') NOT NULL DEFAULT 'pending',
  notificationSent BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bookId) REFERENCES books(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Create user_borrowed_books table for tracking currently borrowed books
CREATE TABLE user_borrowed_books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  bookId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (bookId) REFERENCES books(id),
  UNIQUE KEY unique_user_book (userId, bookId)
);

-- Indexes for better performance
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_borrow_records_status ON borrow_records(status);
CREATE INDEX idx_notifications_userId ON notifications(userId);
CREATE INDEX idx_book_reservations_status ON book_reservations(status);
CREATE INDEX idx_book_reservations_bookId ON book_reservations(bookId);
CREATE INDEX idx_book_reservations_userId ON book_reservations(userId);
CREATE INDEX idx_user_borrowed_books_userId ON user_borrowed_books(userId);
CREATE INDEX idx_user_borrowed_books_bookId ON user_borrowed_books(bookId);
