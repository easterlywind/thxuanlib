
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BookOpen, QrCode, Search, Check, AlertTriangle } from 'lucide-react';
import QRScanner from '@/components/QRScanner';
import { User, Book, BorrowRecord } from '@/types';
import { usersApi, booksApi, borrowRecordsApi } from '@/services/apiService';

enum BorrowReturnMode {
  IDLE,
  SCANNING,
  BOOK_INPUT,
  CONFIRM
}

const BorrowReturn = () => {
  const location = useLocation();
  const scannedData = location.state?.scannedData;
  const { user: librarian } = useAuth();
  const [mode, setMode] = useState<BorrowReturnMode>(BorrowReturnMode.IDLE);

  // Handle scanned data from QR scanner
  useEffect(() => {
    if (scannedData) {
      handleScanQR(scannedData);
    }
  }, [scannedData]); // Run when scanned data changes
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [isReturn, setIsReturn] = useState(false);
  const [bookISBN, setBookISBN] = useState('');
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [userBorrowRecords, setUserBorrowRecords] = useState<(BorrowRecord & { bookTitle?: string })[]>([]);
  const [booksData, setBooksData] = useState<Book[]>([]);

  const handleScanQR = async (data: string) => {
    console.log('Processing QR code data:', data);
    
    if (!data.startsWith('STUDENT:')) {
      toast.error('Mã QR không hợp lệ');
      return;
    }

    const userId = data.split(':')[1];
    console.log('Looking for user with ID:', userId);
    
    try {
      // Get user from API
      const foundUser = await usersApi.getById(userId);
      console.log('Found user:', foundUser);
      
      if (!foundUser) {
        toast.error('Không tìm thấy tài khoản người dùng');
        return;
      }

      if (foundUser.role !== 'student') {
        toast.error('Tài khoản không phải là độc giả');
        return;
      }

      // Get all data we need from API
      const [allBorrowRecords, allBooks] = await Promise.all([
        borrowRecordsApi.getAll(),
        booksApi.getAll()
      ]);
      
      // Save books data for later use
      setBooksData(allBooks);
      
      // Find user's borrow records
      const records = allBorrowRecords.filter(record => 
        record.userId === foundUser.id && 
        record.status === 'borrowed'
      );
      
      // Add book titles to borrow records
      const enhancedRecords = records.map(record => {
        const book = allBooks.find(b => b.id === record.bookId);
        return {
          ...record,
          bookTitle: book?.title
        };
      });
      
      // Update state
      setCurrentUser(foundUser);
      setIsUserBlocked(!!foundUser.isBlocked);
      setUserBorrowRecords(enhancedRecords);
      setIsReturn(records.length > 0);

      // Update UI with a small delay
      setTimeout(() => {
        if (foundUser.isBlocked) {
          toast.error('Tài khoản bị khóa do quá hạn trả sách');
        } else {
          toast.success('Quét mã QR thành công');
        }
        // Force mode update
        setMode(BorrowReturnMode.BOOK_INPUT);
        console.log('UI Mode updated to:', BorrowReturnMode.BOOK_INPUT);
      }, 500);
    } catch (error) {
      console.error('Error processing QR code:', error);
      toast.error('Lỗi khi xử lý mã QR');
    }
  };

  const searchBook = async () => {
    if (!bookISBN) {
      setErrorMessage('Vui lòng nhập mã ISBN của sách');
      return;
    }

    try {
      // Get all books from API
      const allBooks = await booksApi.getAll();
      
      // Case-insensitive search and trim whitespace
      const searchISBN = bookISBN.trim();
      const foundBook = allBooks.find(book => 
        book.isbn.toLowerCase().includes(searchISBN.toLowerCase()) || 
        searchISBN.toLowerCase().includes(book.isbn.toLowerCase())
      );
      
      if (!foundBook) {
        setErrorMessage('Không tìm thấy sách với mã ISBN này');
        setCurrentBook(null);
        return;
      }

      setCurrentBook(foundBook);
      setErrorMessage('');

      // Check if book is already borrowed by this user
      if (isReturn) {
        const isBorrowedByUser = userBorrowRecords.some(
          record => record.bookId === foundBook.id
        );
        
        if (!isBorrowedByUser) {
          setErrorMessage('Độc giả không mượn sách này');
          return;
        }
      } else {
        // Check if book is available for borrowing
        if (foundBook.availableQuantity <= 0) {
          setErrorMessage('Sách này hiện không có sẵn để mượn');
          return;
        }
      }

      // Move to confirm step
      setMode(BorrowReturnMode.CONFIRM);
    } catch (error) {
      console.error('Error searching for book:', error);
      toast.error('Lỗi khi tìm kiếm sách');
    }
  };

  const handleConfirmAction = async () => {
    if (!currentUser || !currentBook) return;

    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + 30); // 30 days borrowing period

    try {
      if (isReturn) {
        // Find record to update
        const recordToUpdate = userBorrowRecords.find(
          record => record.bookId === currentBook.id && record.status === 'borrowed'
        );

        if (recordToUpdate) {
          // Call API to return book
          await borrowRecordsApi.returnBook(recordToUpdate.id, today.toISOString());
          toast.success(`${currentUser.fullName} đã trả sách "${currentBook.title}" thành công`);
        } else {
          toast.error('Không tìm thấy thông tin mượn sách');
        }
      } else {
        // Create new borrow record with exact fields expected by the server
        // Create record with correct type for status field
        const newRecord: Omit<BorrowRecord, 'id'> = {
          bookId: currentBook.id,
          userId: currentUser.id,
          borrowDate: today.toISOString(),
          dueDate: dueDate.toISOString(),
          status: 'borrowed' // This is typed correctly as "borrowed" | "returned" | "overdue" | "reserved"
        };
        
        console.log('Creating borrow record with data:', newRecord);
        
        try {
          // Call API to create borrow record
          const result = await borrowRecordsApi.create(newRecord);
          console.log('Borrow record created successfully:', result);
          toast.success(`${currentUser.fullName} đã mượn sách "${currentBook.title}" thành công`);
        } catch (borrowError) {
          console.error('Detailed borrow error:', borrowError);
          // Try a simplified approach if the table structure is different
          toast.error(`Không thể mượn sách: ${borrowError instanceof Error ? borrowError.message : 'Lỗi không xác định'}`);
          throw borrowError;
        }
      }
      
      // Reset state after successful operation
      resetState();
    } catch (error) {
      console.error('Error during borrow/return action:', error);
      let errorMessage = 'Lỗi khi thực hiện thao tác mượn/trả sách';
      
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      toast.error(errorMessage);
    }

    // Reset state
    resetState();
  };

  const resetState = () => {
    setMode(BorrowReturnMode.IDLE);
    setCurrentUser(null);
    setIsUserBlocked(false);
    setIsReturn(false);
    setBookISBN('');
    setCurrentBook(null);
    setErrorMessage('');
    setUserBorrowRecords([]);
  };

  if (!librarian || librarian.role !== 'librarian') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Quyền truy cập bị từ chối</h2>
            <p className="text-gray-500 mb-4">
              Chức năng này chỉ dành cho thủ thư
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
            >
              Quay lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mượn/Trả sách</h1>
        <p className="text-gray-500">Quét mã QR của độc giả để bắt đầu quá trình mượn hoặc trả sách</p>
      </div>

      {mode === BorrowReturnMode.IDLE && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <Button 
                onClick={() => setMode(BorrowReturnMode.SCANNING)} 
                className="bg-library-primary"
              >
                <QrCode size={18} className="mr-2" />
                Quét mã QR
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === BorrowReturnMode.BOOK_INPUT && currentUser && (
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-medium">Độc giả: {currentUser.fullName}</h3>
                <p className="text-sm text-gray-500">ID: {currentUser.id}</p>
              </div>
              <div>
                <div className={`px-2 py-1 text-xs rounded-full ${isUserBlocked 
                  ? "bg-red-100 text-red-800" 
                  : "bg-green-100 text-green-800"}`}
                >
                  {isUserBlocked ? "Tài khoản bị khóa" : "Tài khoản hoạt động"}
                </div>
              </div>
            </div>

            {!isUserBlocked && (
              <>
                <div className="flex space-x-2">
                  <Button 
                    variant={!isReturn ? "default" : "outline"} 
                    onClick={() => setIsReturn(false)}
                    className={!isReturn ? "bg-library-primary" : ""}
                  >
                    Mượn sách
                  </Button>
                  <Button 
                    variant={isReturn ? "default" : "outline"} 
                    onClick={() => setIsReturn(true)}
                    className={isReturn ? "bg-library-primary" : ""}
                  >
                    Trả sách
                  </Button>
                </div>

                {isReturn && userBorrowRecords.length > 0 && (
                  <div className="border rounded-md p-3">
                    <h4 className="font-medium mb-2">Sách đang mượn:</h4>
                    <ul className="space-y-2">
                      {userBorrowRecords.map(record => (
                        <li key={record.id} className="text-sm flex justify-between">
                          <span>{record.bookTitle || `Sách #${record.bookId}`}</span>
                          <span className="text-gray-500">
                            Hạn trả: {new Date(record.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="isbn">Mã ISBN</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="isbn"
                      placeholder="Nhập mã ISBN của sách"
                      value={bookISBN}
                      onChange={(e) => setBookISBN(e.target.value)}
                    />
                    <Button onClick={searchBook}>
                      <Search size={18} className="mr-2" />
                      Tìm
                    </Button>
                  </div>
                  {errorMessage && (
                    <p className="text-sm text-red-500">{errorMessage}</p>
                  )}
                </div>
              </>
            )}

            {isUserBlocked && (
              <div className="bg-yellow-50 p-4 rounded-md">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                  <div>
                    <h3 className="font-medium text-yellow-800">Tài khoản bị khóa</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Tài khoản đã bị khóa do {currentUser.blockReason || "quá hạn trả sách"}. 
                      Cần mở khóa tài khoản trước khi thực hiện mượn/trả sách.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-3" 
                      onClick={resetState}
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {mode === BorrowReturnMode.CONFIRM && currentBook && (
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-28 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                {currentBook.coverImage ? (
                  <img 
                    src={currentBook.coverImage} 
                    alt={currentBook.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={24} className="text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-medium">{currentBook.title}</h3>
                <p className="text-sm text-gray-500">
                  Tác giả: {currentBook.author}
                </p>
                <p className="text-sm text-gray-500">
                  ISBN: {currentBook.isbn}
                </p>
                {!isReturn && (
                  <p className="text-sm text-gray-500">
                    Còn lại: {currentBook.availableQuantity}/{currentBook.quantity}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <h4 className="font-medium text-blue-800">Xác nhận</h4>
              <p className="text-sm text-blue-700">
                {isReturn 
                  ? `${currentUser?.fullName} sẽ trả sách "${currentBook.title}".`
                  : `${currentUser?.fullName} sẽ mượn sách "${currentBook.title}".`
                }
              </p>
            </div>

            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={resetState}
              >
                Hủy
              </Button>
              <Button 
                className="flex-1 bg-library-primary"
                onClick={handleConfirmAction}
              >
                <Check size={18} className="mr-2" />
                {isReturn ? 'Xác nhận trả sách' : 'Xác nhận mượn sách'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog 
        open={mode === BorrowReturnMode.SCANNING} 
        onOpenChange={(open) => {
          if (!open) {
            console.log('Dialog closing, currentUser:', currentUser);
          }
        }} 
        modal={true}>
        <DialogContent 
          className="sm:max-w-md"
          aria-describedby="qr-scanner-description"
        >
          <DialogHeader>
            <DialogTitle>Quét mã QR</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p id="qr-scanner-description" className="text-sm text-gray-500 mb-4">
              Quét mã QR của độc giả để hiển thị thông tin
            </p>
            <QRScanner 
              onScan={(data) => {
                // Process the scanned data first
                handleScanQR(data);
                // The QRScanner component will handle closing with delay
              }} 
              onClose={() => {
                console.log('Scanner closed, currentUser:', currentUser);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BorrowReturn;
