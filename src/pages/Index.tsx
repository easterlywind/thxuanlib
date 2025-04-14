import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Users, 
  BookCopy, 
  Search, 
  QrCode, 
  BarChart3 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { booksApi, usersApi, borrowRecordsApi } from '@/services/apiService';
import { toast } from 'sonner';
import { Book, User, BorrowRecord } from '@/types';

const Index = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const isLibrarian = user?.role === 'librarian';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [booksData, usersData, borrowRecordsData] = await Promise.all([
          booksApi.getAll(),
          usersApi.getAll(),
          borrowRecordsApi.getAll()
        ]);
        setBooks(booksData);
        setUsers(usersData);
        setBorrowRecords(borrowRecordsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Không thể tải dữ liệu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate simple statistics - only needed for librarian view
  const totalBooks = books.reduce((sum, book) => sum + book.quantity, 0);
  const availableBooks = books.reduce((sum, book) => sum + book.availableQuantity, 0);
  const totalBorrowedBooks = totalBooks - availableBooks;
  const totalStudents = users.filter(u => u.role === 'student').length;
  const totalActiveStudents = users.filter(u => u.role === 'student' && !u.isBlocked).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center text-center space-y-4 pb-6 border-b">
        <BookOpen size={48} className="text-library-primary" />
        <h1 className="text-3xl font-bold">Thư viện THPT Thanh Xuân</h1>
        <p className="text-gray-500 max-w-lg">
          Hệ thống quản lý thư viện giúp việc mượn trả sách trở nên dễ dàng và hiệu quả thông qua QR code.
        </p>
      </div>

      {/* Quick Stats */}
      {isLoading ? (
        <div className="text-center py-8">
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Tổng số sách</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBooks}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Sách đang được mượn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBorrowedBooks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Độc giả</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudents}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Độc giả đang hoạt động</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActiveStudents}</div>
            </CardContent>
          </Card>
        </div>
      )}


    </div>
  );
};

export default Index;
