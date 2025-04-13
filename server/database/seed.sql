
    USE library_management;

    -- Insert sample books
    INSERT INTO books (isbn, title, author, publishYear, category, publisher, quantity, availableQuantity, coverImage) VALUES
    ('9780123456789', 'Lập Trình C++', 'Nguyễn Văn A', 2020, 'Công nghệ thông tin', 'NXB Giáo Dục', 5, 3, 'https://picsum.photos/seed/book1/200/300'),
    ('9780123456790', 'Toán Học Cao Cấp', 'Trần Thị B', 2019, 'Toán học', 'NXB Đại học Quốc Gia', 8, 5, 'https://picsum.photos/seed/book2/200/300'),
    ('9780123456791', 'Vật Lý Đại Cương', 'Lê Văn C', 2021, 'Vật lý', 'NXB Giáo Dục', 6, 4, 'https://picsum.photos/seed/book3/200/300'),
    ('9780123456792', 'Hóa Học Cơ Bản', 'Phạm Thị D', 2018, 'Hóa học', 'NXB Khoa học và Kỹ thuật', 7, 7, 'https://picsum.photos/seed/book4/200/300'),
    ('9780123456793', 'Lịch Sử Việt Nam', 'Hoàng Văn E', 2022, 'Lịch sử', 'NXB Chính Trị Quốc Gia', 10, 8, 'https://picsum.photos/seed/book5/200/300');

    -- Insert sample users (password is 'password123' for all users)
    INSERT INTO users (username, password, fullName, role, isBlocked, blockReason) VALUES
    ('librarian', 'password123', 'Thủ Thư Thanh Xuân', 'librarian', FALSE, NULL),
    ('student1', 'password123', 'Nguyễn Văn A', 'student', FALSE, NULL),
    ('student2', 'password123', 'Trần Thị B', 'student', FALSE, NULL),
    ('student3', 'password123', 'Lê Văn C', 'student', TRUE, 'Trả sách quá hạn');

    -- Insert sample borrow records
    INSERT INTO borrow_records (bookId, userId, borrowDate, dueDate, status) VALUES
    (1, 2, '2025-03-15 00:00:00', '2025-04-15 00:00:00', 'borrowed'),
    (2, 3, '2025-03-20 00:00:00', '2025-04-20 00:00:00', 'borrowed'),
    (3, 2, '2025-03-10 00:00:00', '2025-04-10 00:00:00', 'borrowed');

    -- Insert returned book
    INSERT INTO borrow_records (bookId, userId, borrowDate, dueDate, returnDate, status) VALUES
    (5, 4, '2025-02-15 00:00:00', '2025-03-15 00:00:00', '2025-03-25 00:00:00', 'returned');

    -- Insert sample notifications
    INSERT INTO notifications (userId, title, message, date, read, type) VALUES
    (2, 'Nhắc nhở trả sách', 'Sách "Lập Trình C++" sẽ đến hạn trả vào ngày 15/4/2025. Vui lòng trả sách đúng hạn.', '2025-04-13 10:00:00', FALSE, 'return_reminder'),
    (3, 'Nhắc nhở trả sách', 'Sách "Toán Học Cao Cấp" sẽ đến hạn trả vào ngày 20/4/2025. Vui lòng trả sách đúng hạn.', '2025-04-18 10:00:00', FALSE, 'return_reminder'),
    (4, 'Sách đã có sẵn', 'Sách "Lịch Sử Việt Nam" mà bạn đặt trước đã có sẵn. Vui lòng đến thư viện để mượn trong vòng 2 ngày.', '2025-04-10 15:30:00', FALSE, 'book_available'),
    (2, 'Nhắc nhở trả sách', 'Bạn cần trả sách "Lập Trình C++" trong 2 ngày', '2025-04-13 08:00:00', FALSE, 'return_reminder'),
    (3, 'Nhắc nhở trả sách', 'Bạn cần trả sách "Toán Học Cao Cấp" trong 5 ngày', '2025-04-15 08:00:00', FALSE, 'return_reminder'),
    (4, 'Sách đã có sẵn', 'Sách "Lịch Sử Việt Nam" mà bạn đặt trước đã có sẵn', '2025-03-26 10:00:00', TRUE, 'book_available'),
    (1, 'Cập nhật hệ thống', 'Hệ thống sẽ bảo trì vào 22h ngày 10/4', '2025-04-08 09:00:00', FALSE, 'system');
    
    -- Insert sample book reservations
    INSERT INTO book_reservations (bookId, userId, reservationDate, dueDate, priority, status, notificationSent) VALUES
    (1, 3, '2025-04-01 14:30:00', '2025-04-15 14:30:00', 1, 'pending', FALSE),
    (4, 2, '2025-04-02 09:15:00', '2025-04-16 09:15:00', 1, 'pending', FALSE);
