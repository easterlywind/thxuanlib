
import { Book, User, BorrowRecord } from "@/types";

// Mock Books
export const MOCK_BOOKS: Book[] = [
  {
    id: "1",
    isbn: "9780123456789",
    title: "Lập Trình C++",
    author: "Nguyễn Văn A",
    publishYear: 2020,
    category: "Công nghệ thông tin",
    publisher: "NXB Giáo Dục",
    quantity: 5,
    availableQuantity: 3,
    coverImage: "https://picsum.photos/seed/book1/200/300"
  },
  {
    id: "2",
    isbn: "9780123456790",
    title: "Toán Học Cao Cấp",
    author: "Trần Thị B",
    publishYear: 2019,
    category: "Toán học",
    publisher: "NXB Đại học Quốc Gia",
    quantity: 8,
    availableQuantity: 5,
    coverImage: "https://picsum.photos/seed/book2/200/300"
  },
  {
    id: "3",
    isbn: "9780123456791",
    title: "Vật Lý Đại Cương",
    author: "Lê Văn C",
    publishYear: 2021,
    category: "Vật lý",
    publisher: "NXB Giáo Dục",
    quantity: 6,
    availableQuantity: 4,
    coverImage: "https://picsum.photos/seed/book3/200/300"
  },
  {
    id: "4",
    isbn: "9780123456792",
    title: "Hóa Học Cơ Bản",
    author: "Phạm Thị D",
    publishYear: 2018,
    category: "Hóa học",
    publisher: "NXB Khoa học và Kỹ thuật",
    quantity: 7,
    availableQuantity: 7,
    coverImage: "https://picsum.photos/seed/book4/200/300"
  },
  {
    id: "5",
    isbn: "9780123456793",
    title: "Lịch Sử Việt Nam",
    author: "Hoàng Văn E",
    publishYear: 2022,
    category: "Lịch sử",
    publisher: "NXB Chính Trị Quốc Gia",
    quantity: 10,
    availableQuantity: 8,
    coverImage: "https://picsum.photos/seed/book5/200/300"
  }
];

// Mock Users (besides the authentication ones)
export const MOCK_USERS: User[] = [
  {
    id: "1",
    username: "librarian",
    fullName: "Thủ Thư Thanh Xuân",
    role: "librarian",
  },
  {
    id: "2",
    username: "student1",
    fullName: "Nguyễn Văn A",
    role: "student",
    borrowedBooks: ["1", "3"],
    isBlocked: false
  },
  {
    id: "3",
    username: "student2",
    fullName: "Trần Thị B",
    role: "student",
    borrowedBooks: ["2"],
    isBlocked: false
  },
  {
    id: "4",
    username: "student3",
    fullName: "Lê Văn C",
    role: "student",
    borrowedBooks: [],
    isBlocked: true,
    blockReason: "Trả sách quá hạn"
  }
];

// Mock Borrow Records
export const MOCK_BORROW_RECORDS: BorrowRecord[] = [
  {
    id: "1",
    bookId: "1",
    userId: "2", // Nguyễn Văn A
    borrowDate: "2025-03-15T00:00:00.000Z",
    dueDate: "2025-04-15T00:00:00.000Z",
    status: "borrowed"
  },
  {
    id: "2",
    bookId: "2",
    userId: "3", // Trần Thị B
    borrowDate: "2025-03-20T00:00:00.000Z",
    dueDate: "2025-04-20T00:00:00.000Z",
    status: "borrowed"
  },
  {
    id: "3",
    bookId: "3",
    userId: "2", // Nguyễn Văn A
    borrowDate: "2025-03-10T00:00:00.000Z",
    dueDate: "2025-04-10T00:00:00.000Z",
    status: "borrowed"
  },
  {
    id: "4",
    bookId: "5",
    userId: "4", // Lê Văn C
    borrowDate: "2025-02-15T00:00:00.000Z",
    dueDate: "2025-03-15T00:00:00.000Z",
    returnDate: "2025-03-25T00:00:00.000Z", // 10 days late
    status: "returned"
  }
];
