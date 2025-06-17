const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Thiết lập ghi log
const logFile = fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' });
const log = (message) => { // Hàm ghi log
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;
  console.log(logMessage);
  logFile.write(logMessage);
};
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'; // Default to Vite's development server port

// Tạo thư mục uploads nếu chưa tồn tại
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: frontendUrl,
  credentials: true
})); // Cấu hình CORS cho môi trường production
app.use(express.json()); // Phân tích dữ liệu JSON trong yêu cầu

// Hàm chuyển định dạng ngày sang MySQL
const formatDate = (dateString) => { // Định dạng ngày
  const date = new Date(dateString);
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'))); // Cung cấp file tĩnh từ thư mục uploads

// Cấu hình multer để tải ảnh
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'))
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)) // Tên file dựa trên thời gian
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});
app.use((req, res, next) => { // Ghi log yêu cầu
  log(`${req.method} ${req.url} - Body: ${JSON.stringify(req.body)}`);
  next();
});

// Kết nối CSDL với pool
const pool = mysql.createPool({ // Thiết lập kết nối MySQL
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'library_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Kiểm tra kết nối CSDL
app.get('/api/test', async (req, res) => { // Kiểm tra kết nối
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.json({ message: 'Database connection successful!' });
  } catch (error) {
    log(`Database connection failed: ${error.message}`);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Đăng nhập
app.post('/api/auth/login', async (req, res) => { // Xác thực người dùng
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    log(`Login attempt: ${username}`);
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]); // Tìm người dùng
    
    if (users.length === 0) {
      log(`Login failed: User ${username} not found`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    const passwordValid = password === user.password; // Kiểm tra mật khẩu
    log(`Password valid: ${passwordValid}`);
    
    if (!passwordValid) {
      log(`Login failed: Invalid password for user ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (user.isBlocked) { // Kiểm tra tài khoản bị khóa
      log(`Login failed: User ${username} account is blocked`);
      return res.status(403).json({ 
        error: 'Account is blocked', 
        reason: user.blockReason || 'Contact librarian for more information' 
      });
    }
    
    const { password: _, ...userWithoutPassword } = user; 
    
    log(`User ${username} logged in successfully`);
    res.json({ 
      success: true, 
      user: userWithoutPassword 
    });
  } catch (error) {
    log(`Login error: ${error.message}`);
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Quản lý sách
app.get('/api/books', async (req, res) => { // Lấy danh sách sách
  try {
    const [rows] = await pool.query('SELECT * FROM books');
    res.json(rows);
  } catch (error) {
    log(`Error fetching books: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.post('/api/books', async (req, res) => { // Thêm sách mới
  try {
    const { isbn, title, author, publishYear, category, publisher, quantity, coverImage } = req.body;
    const [result] = await pool.query(
      'INSERT INTO books (isbn, title, author, publishYear, category, publisher, quantity, availableQuantity, coverImage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [isbn, title, author, publishYear, category, publisher, quantity, quantity, coverImage]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    log(`Error adding book: ${error.message}`);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

app.put('/api/books/:id', async (req, res) => { // Cập nhật sách
  try {
    const updateFields = [];
    const values = [];
    
    Object.entries(req.body).forEach(([key, value]) => { // Tạo truy vấn động
      updateFields.push(`${key} = ?`);
      values.push(value);
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.params.id);
    
    const query = `UPDATE books SET ${updateFields.join(', ')} WHERE id = ?`;
    log(`Update book query: ${query}, values: ${JSON.stringify(values)}`);
    
    await pool.query(query, values);
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    log(`Error updating book: ${error.message}`);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

app.delete('/api/books/:id', async (req, res) => { // Xóa sách
  try {
    await pool.query('DELETE FROM books WHERE id = ?', [req.params.id]);
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    log(`Error deleting book: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Quản lý người dùng
app.get('/api/users', async (req, res) => { // Lấy danh sách người dùng
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (error) {
    log(`Error fetching users: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:id', async (req, res) => { // Lấy thông tin người dùng theo ID
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.put('/api/users/:id/block', async (req, res) => { // Khóa/mở khóa người dùng
  try {
    const { isBlocked, blockReason } = req.body;
    await pool.query(
      'UPDATE users SET isBlocked = ?, blockReason = ? WHERE id = ?',
      [isBlocked, blockReason, req.params.id]
    );
    res.json({ id: req.params.id, isBlocked, blockReason });
  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Quản lý mượn sách
app.get('/api/borrow-records', async (req, res) => { // Lấy danh sách mượn sách
  try {
    const [rows] = await pool.query('SELECT * FROM borrow_records');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching borrow records:', error);
    res.status(500).json({ error: 'Failed to fetch borrow records' });
  }
});

app.post('/api/borrow-records', async (req, res) => { // Tạo bản ghi mượn sách
  try {
    const { bookId, userId, borrowDate, dueDate, status } = req.body;
    
    const connection = await pool.getConnection();
    await connection.beginTransaction(); // Bắt đầu giao dịch
    
    try {
      const formattedBorrowDate = formatDate(borrowDate);
      const formattedDueDate = formatDate(dueDate);
      
      log(`Formatted borrow date: ${formattedBorrowDate}, due date: ${formattedDueDate}`);
      
      const [result] = await connection.query(
        'INSERT INTO borrow_records (bookId, userId, borrowDate, dueDate, status) VALUES (?, ?, ?, ?, ?)',
        [bookId, userId, formattedBorrowDate, formattedDueDate, status]
      );
      
      await connection.query(
        'UPDATE books SET availableQuantity = availableQuantity - 1 WHERE id = ?', // Giảm số lượng sách
        [bookId]
      );
      
      try {
        await connection.query(
          'INSERT INTO user_borrowed_books (userId, bookId) VALUES (?, ?)', // Cập nhật sách người dùng mượn
          [userId, bookId]
        );
      } catch (tableError) {
        log(`Warning: Could not update user_borrowed_books: ${tableError.message}`);
      }
      
      await connection.commit(); // Xác nhận giao dịch
      res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
      await connection.rollback(); // Hủy giao dịch nếu lỗi
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating borrow record:', error);
    log(`Error details: ${error.message}`);
    log(`Stack trace: ${error.stack}`);
    res.status(500).json({ error: `Failed to create borrow record: ${error.message}` });
  }
});

app.put('/api/borrow-records/:id/return', async (req, res) => { // Trả sách
  try {
    const { returnDate } = req.body;
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const [records] = await connection.query(
        'SELECT * FROM borrow_records WHERE id = ?', // Lấy bản ghi mượn
        [req.params.id]
      );
      
      if (records.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Borrow record not found' });
      }
      
      const record = records[0];
      
      const formattedReturnDate = formatDate(returnDate);
      log(`Formatted return date: ${formattedReturnDate}`);
      
      await connection.query(
        'UPDATE borrow_records SET returnDate = ?, status = "returned" WHERE id = ?', // Cập nhật trạng thái trả
        [formattedReturnDate, req.params.id]
      );
      
      await connection.query(
        'UPDATE books SET availableQuantity = availableQuantity + 1 WHERE id = ?', // Tăng số lượng sách
        [record.bookId]
      );
      
      await connection.query(
        'DELETE FROM user_borrowed_books WHERE userId = ? AND bookId = ?', // Xóa bản ghi mượn
        [record.userId, record.bookId]
      );
      
      await connection.commit();
      res.json({ id: req.params.id, returnDate, status: 'returned' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).json({ error: 'Failed to return book' });
  }
});

// Tải ảnh
app.post('/api/upload', upload.single('image'), (req, res) => { // Tải ảnh bìa sách
  log('Upload request received');
  log(`Files: ${JSON.stringify(req.files)}`);
  log(`File: ${JSON.stringify(req.file)}`);
  if (!req.file) {
    log('No file in request');
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  log(`Image URL: ${imageUrl}`);
  res.json({ imageUrl });
});

// Đổi mật khẩu
app.put('/api/users/:id/change-password', async (req, res) => { // Đổi mật khẩu người dùng
  try {
    const { currentPassword, newPassword } = req.body;
    log(`Attempting password change for user: ${req.params.id}`);
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?', // Lấy thông tin người dùng
      [req.params.id]
    );
    
    if (users.length === 0) {
      log(`User not found: ${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    log(`Found user: ${user.username}`);
    
    const isPasswordValid = currentPassword === user.password; // Kiểm tra mật khẩu hiện tại
    log(`Password valid: ${isPasswordValid}`);
    
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    const [result] = await pool.query(
      'UPDATE users SET password = ? WHERE id = ?', // Cập nhật mật khẩu mới
      [newPassword, req.params.id]
    );
    
    log(`Update result: ${JSON.stringify(result)}`);
    
    if (result.affectedRows === 0) {
      throw new Error('Password update failed - no rows affected');
    }
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    log(`Error changing password: ${error.message}`);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Kiểm tra sách đang mượn
app.get('/api/borrows/check/:id', async (req, res) => { // Kiểm tra sách có đang được mượn
  try {
    const [records] = await pool.query(
      'SELECT COUNT(*) as count FROM borrow_records WHERE bookId = ? AND status = "borrowed"',
      [req.params.id]
    );
    res.json({ isBorrowed: records[0].count > 0 });
  } catch (error) {
    console.error('Error checking borrow status:', error);
    res.status(500).json({ error: 'Failed to check borrow status' });
  }
});

// Quản lý đặt trước sách
app.get('/api/reservations', async (req, res) => { // Lấy danh sách đặt trước
  try {
    const [rows] = await pool.query('SELECT * FROM book_reservations');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

app.post('/api/reservations', async (req, res) => { // Tạo đặt trước sách
  try {
    const { bookId, userId, reservationDate, dueDate, priority, status, notificationSent } = req.body;
    
    const formatDateLocal = (dateString) => { // Định dạng ngày
      const date = new Date(dateString);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };
    
    const formattedReservationDate = formatDateLocal(reservationDate);
    const formattedDueDate = dueDate ? formatDateLocal(dueDate) : null;
    
    const [result] = await pool.query(
      'INSERT INTO book_reservations (bookId, userId, reservationDate, dueDate, priority, status, notificationSent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [bookId, userId, formattedReservationDate, formattedDueDate, priority, status, notificationSent ? 1 : 0]
    );
    
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

app.get('/api/reservations/user/:userId', async (req, res) => { // Lấy đặt trước của người dùng
  try {
    const [rows] = await pool.query(
      'SELECT * FROM book_reservations WHERE userId = ?',
      [req.params.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching user reservations:', error);
    res.status(500).json({ error: 'Failed to fetch user reservations' });
  }
});

app.get('/api/reservations/book/:bookId', async (req, res) => { // Lấy đặt trước của sách
  try {
    const [rows] = await pool.query(
      'SELECT * FROM book_reservations WHERE bookId = ?',
      [req.params.bookId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching book reservations:', error);
    res.status(500).json({ error: 'Failed to fetch book reservations' });
  }
});

app.put('/api/reservations/:id', async (req, res) => { // Cập nhật đặt trước
  try {
    const { status, notificationSent, priority } = req.body;
    const updates = [];
    const values = [];
    
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    
    if (notificationSent !== undefined) {
      updates.push('notificationSent = ?');
      values.push(notificationSent ? 1 : 0);
    }
    
    if (priority !== undefined) {
      updates.push('priority = ?');
      values.push(priority);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.params.id);
    
    const [result] = await pool.query(
      `UPDATE book_reservations SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    const [rows] = await pool.query('SELECT * FROM book_reservations WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

app.delete('/api/reservations/:id', async (req, res) => { // Hủy đặt trước
  try {
    const [result] = await pool.query('DELETE FROM book_reservations WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    res.json({ message: 'Reservation cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

// Quản lý thông báo
app.get('/api/notifications', async (req, res) => { // Lấy danh sách thông báo
  try {
    const [rows] = await pool.query('SELECT * FROM notifications');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.get('/api/notifications/user/:userId', async (req, res) => { // Lấy thông báo của người dùng
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE userId = ? ORDER BY date DESC',
      [req.params.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({ error: 'Failed to fetch user notifications' });
  }
});

app.post('/api/notifications', async (req, res) => { // Tạo thông báo mới
  try {
    const { userId, title, message, date, read, type } = req.body;
    const formattedDate = formatDate(date);
    
    const [result] = await pool.query(
      'INSERT INTO notifications (userId, title, message, date, `read`, type) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, title, message, formattedDate, read ? 1 : 0, type]
    );
    
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => { // Đánh dấu thông báo đã đọc
  try {
    const [result] = await pool.query(
      'UPDATE notifications SET `read` = 1 WHERE id = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ id: req.params.id, read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

app.delete('/api/notifications/:id', async (req, res) => { // Xóa thông báo
  try {
    const [result] = await pool.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Kiểm tra sách quá hạn
const checkOverdueBooks = async () => { // Kiểm tra sách quá hạn và khóa tài khoản
  try {
    log('Checking for overdue books...');
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const currentDate = new Date();
      const formattedCurrentDate = formatDate(currentDate);
      
      const [overdueRecords1] = await connection.query(
        'SELECT * FROM borrow_records WHERE status = "borrowed" AND dueDate < ? AND returnDate IS NULL',
        [formattedCurrentDate]
      ); // Tìm sách quá hạn chưa trả
      
      const [overdueRecords2] = await connection.query(
        'SELECT br.* FROM borrow_records br ' +
        'LEFT JOIN users u ON br.userId = u.id ' +
        'WHERE br.status = "overdue" AND br.returnDate IS NULL AND (u.isBlocked IS NULL OR u.isBlocked = 0)'
      ); // Tìm sách đã đánh dấu quá hạn
      
      const overdueRecords = [...overdueRecords1, ...overdueRecords2];
      
      log(`Found ${overdueRecords.length} overdue books (${overdueRecords1.length} newly overdue, ${overdueRecords2.length} already marked overdue)`);
      
      if (overdueRecords.length > 0) {
        log(`Overdue records details: ${JSON.stringify(overdueRecords)}`);
      }
      
      for (const record of overdueRecords) {
        if (record.status !== 'overdue') {
          await connection.query(
            'UPDATE borrow_records SET status = "overdue" WHERE id = ?', // Đánh dấu sách quá hạn
            [record.id]
          );
          log(`Updated status to overdue for record ID: ${record.id}`);
        }
        
        try {
          const [existingRecords] = await connection.query(
            'SELECT * FROM user_borrowed_books WHERE userId = ? AND bookId = ?',
            [record.userId, record.bookId]
          );
          
          if (existingRecords.length === 0) {
            log(`Adding missing user_borrowed_books record for userId: ${record.userId}, bookId: ${record.bookId}`);
            await connection.query(
              'INSERT INTO user_borrowed_books (userId, bookId) VALUES (?, ?)', // Thêm bản ghi mượn
              [record.userId, record.bookId]
            );
          }
        } catch (userBorrowedBooksError) {
          log(`Warning: Could not update user_borrowed_books: ${userBorrowedBooksError.message}`);
        }
        
        await connection.query(
          'UPDATE users SET isBlocked = TRUE, blockReason = ? WHERE id = ?', // Khóa tài khoản người dùng
          [`Account locked due to overdue book (ID: ${record.bookId})`, record.userId]
        );
        log(`Blocked user account with ID: ${record.userId}`);
        
        try {
          const [existingNotifications] = await connection.query(
            'SELECT * FROM notifications WHERE userId = ? AND type = "overdue" AND `read` = 0 LIMIT 1',
            [record.userId]
          );
          
          if (existingNotifications.length === 0) {
            await connection.query(
              'INSERT INTO notifications (userId, title, message, date, `read`, type) VALUES (?, ?, ?, ?, ?, ?)',
              [
                record.userId, 
                'Sách quá hạn - Tài khoản bị khóa', 
                `Tài khoản của bạn đã bị khóa do sách mượn quá hạn. Vui lòng trả sách và liên hệ thủ thư để mở khóa tài khoản.`, 
                formattedCurrentDate, 
                0, 
                'overdue'
              ]
            ); // Tạo thông báo quá hạn
            log(`Created notification for user ID: ${record.userId}`);
          }
        } catch (notificationError) {
          log(`Warning: Could not create notification: ${notificationError.message}`);
        }
      }
      
      await connection.commit();
      log('Overdue book check completed');
      return overdueRecords.length;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    log(`Error checking overdue books: ${error.message}`);
    log(`Stack trace: ${error.stack}`);
    return 0;
  }
};


// Khởi động server
app.listen(PORT, () => { // Chạy server
  log(`Server running on port ${PORT}`);
});