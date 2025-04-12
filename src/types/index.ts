
export type UserRole = "librarian" | "student";

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  borrowedBooks?: string[]; // Array of book IDs
  isBlocked?: boolean;
  blockReason?: string;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publishYear: number;
  category: string;
  publisher: string;
  quantity: number;
  availableQuantity: number;
  coverImage?: string;
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  userId: string;
  borrowDate: string; // ISO date string
  dueDate: string; // ISO date string
  returnDate?: string; // ISO date string
  status: "borrowed" | "returned" | "overdue" | "reserved";
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  date: string; // ISO date string
  read: boolean;
  type: "return_reminder" | "book_available" | "overdue" | "system";
}
