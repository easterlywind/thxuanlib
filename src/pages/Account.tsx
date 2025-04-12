
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  User, 
  BookOpen, 
  Key,
  AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';

const Account = () => {
  const { user, logout } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's borrowed books
  useEffect(() => {
    const fetchBorrowedBooks = async () => {
      if (!user) return;
      try {
        const [borrowResponse, booksResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/borrow-records'),
          axios.get('http://localhost:5000/api/books')
        ]);

        const userBorrowRecords = borrowResponse.data.filter(
          record => record.userId === user.id && record.status === 'borrowed'
        );

        const books = booksResponse.data;
        const borrowedBooks = userBorrowRecords.map(record => {
          const book = books.find(b => b.id === record.bookId);
          return {
            ...record,
            bookTitle: book?.title || 'Unknown Book',
            bookAuthor: book?.author || 'Unknown Author',
            bookCover: book?.coverImage
          };
        });

        setBorrowedBooks(borrowedBooks);
      } catch (error) {
        console.error('Error fetching borrowed books:', error);
        toast.error('Không thể tải danh sách sách đã mượn');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBorrowedBooks();
  }, [user]);

  

  const handleLogout = () => {
    logout();
    toast.success('Đã đăng xuất');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Bạn chưa đăng nhập</h2>
            <p className="text-gray-500 mb-4">
              Vui lòng đăng nhập để xem thông tin tài khoản
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Đăng nhập
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tài khoản cá nhân</h1>
        <p className="text-gray-500">Quản lý thông tin và mật khẩu của bạn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center">
              <div className="h-24 w-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <User size={36} className="text-gray-400" />
              </div>
              <h2 className="text-xl font-bold">{user.fullName}</h2>
              <p className="text-gray-500 text-sm mb-4">
                {user.role === 'librarian' ? 'Thủ thư' : 'Độc giả'}
              </p>
              <div className="w-full space-y-3 mt-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setChangePasswordOpen(true)}
                >
                  <Key size={16} className="mr-2" />
                  Đổi mật khẩu
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full text-red-500 hover:text-red-600"
                  onClick={handleLogout}
                >
                  Đăng xuất
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>
                Thông tin chi tiết về tài khoản của bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 border-b pb-2">
                <div className="text-sm text-gray-500">Họ tên</div>
                <div className="text-sm font-medium text-right">{user.fullName}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 border-b pb-2">
                <div className="text-sm text-gray-500">Tên đăng nhập</div>
                <div className="text-sm font-medium text-right">{user.username}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 border-b pb-2">
                <div className="text-sm text-gray-500">Vai trò</div>
                <div className="text-sm font-medium text-right">
                  {user.role === 'librarian' ? 'Thủ thư' : 'Độc giả'}
                </div>
              </div>

              {user.role === 'student' && (
                <div className="grid grid-cols-2 gap-2 border-b pb-2">
                  <div className="text-sm text-gray-500">Sách đang mượn</div>
                  <div className="text-sm font-medium text-right">
                    {borrowedBooks.length} sách
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {user.role === 'student' && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Sách đang mượn</CardTitle>
              <CardDescription>
                Danh sách các sách bạn đang mượn và thời hạn trả
              </CardDescription>
            </CardHeader>
            <CardContent>
              {borrowedBooks.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-gray-500">Bạn chưa mượn sách nào</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {borrowedBooks.map(book => {
                    const borrowDate = new Date(book.borrowDate);
                    const dueDate = new Date(book.dueDate);
                    const today = new Date();
                    const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <Card key={book.id}>
                        <CardContent className="p-4">
                          <div className="flex">
                            <div className="w-16 h-24 bg-gray-200 rounded overflow-hidden mr-4 flex-shrink-0">
                              {book.bookCover ? (
                                <img 
                                  src={book.bookCover} 
                                  alt={book.bookTitle} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen size={20} className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium">{book.bookTitle}</h3>
                              <p className="text-sm text-gray-500">
                                {book.bookAuthor}
                              </p>
                              <div className="mt-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Ngày mượn:</span>{" "}
                                  {borrowDate.toLocaleDateString('vi-VN')}
                                </div>
                                <div>
                                  <span className="text-gray-500">Hạn trả:</span>{" "}
                                  {dueDate.toLocaleDateString('vi-VN')}
                                  {daysLeft > 0 ? (
                                    <span className="text-green-500 ml-2">({daysLeft} ngày còn lại)</span>
                                  ) : (
                                    <span className="text-red-500 ml-2">(Quá hạn {Math.abs(daysLeft)} ngày)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        userId={user.id}
      />
    </div>
  );
};

export default Account;
