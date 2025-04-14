import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, borrowRecordsApi, booksApi } from '@/services/apiService';
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
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Users as UsersIcon, 
  Search, 
  User, 
  BookOpen, 
  AlertTriangle, 
  LockOpen, 
  Lock 
} from 'lucide-react';
import { User as UserType, BorrowRecord, Book } from '@/types';

enum DialogTypes {
  NONE,
  USER_DETAILS,
  BORROWED_BOOKS,
  UNLOCK_ACCOUNT
}

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogType, setDialogType] = useState<DialogTypes>(DialogTypes.NONE);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [userBorrowRecords, setUserBorrowRecords] = useState<BorrowRecord[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [allUsers, allBorrowRecords, allBooks] = await Promise.all([
          usersApi.getAll(),
          borrowRecordsApi.getAll(),
          booksApi.getAll()
        ]);
        setUsers(allUsers.filter(u => u.role === 'student'));
        setBorrowRecords(allBorrowRecords);
        setBooks(allBooks);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Không thể tải dữ liệu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const isLibrarian = currentUser?.role === 'librarian';

  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id.includes(searchQuery)
  );

  const openUserDetailsDialog = (user: UserType) => {
    setSelectedUser(user);
    
    // Find user's borrow records - include both borrowed and returned records
    const records = borrowRecords.filter(record => 
      record.userId === user.id &&
      (record.status === 'borrowed' || record.status === 'overdue')
    );
    
    setUserBorrowRecords(records);
    setDialogType(DialogTypes.USER_DETAILS);
  };

  const openBorrowedBooksDialog = (user: UserType) => {
    setSelectedUser(user);
    
    // Find user's borrow records - including for blocked users
    const records = borrowRecords.filter(record => 
      record.userId === user.id &&
      (record.status === 'borrowed' || record.status === 'overdue')
    );
    
    setUserBorrowRecords(records);
    setDialogType(DialogTypes.BORROWED_BOOKS);
  };

  const openUnlockAccountDialog = (user: UserType) => {
    setSelectedUser(user);
    
    // Find user's borrow records - get current unreturned books
    const records = borrowRecords.filter(record => 
      record.userId === user.id &&
      (record.status === 'borrowed' || record.status === 'overdue')
    );
    
    setUserBorrowRecords(records);
    setDialogType(DialogTypes.UNLOCK_ACCOUNT);
  };

  const unlockUserAccount = async () => {
    if (!selectedUser) return;
    
    try {
      // Call API to unblock user
      await usersApi.blockUser(selectedUser.id, false);
      
      // Update local state
      const updatedUsers = users.map(user => 
        user.id === selectedUser.id ? { ...user, isBlocked: false, blockReason: undefined } : user
      );
      
      setUsers(updatedUsers);
      toast.success(`Đã mở khóa tài khoản cho ${selectedUser.fullName}`);
      closeDialog();
    } catch (error) {
      console.error('Error unlocking user:', error);
      toast.error('Không thể mở khóa tài khoản. Vui lòng thử lại sau.');
    }
  };

  const closeDialog = () => {
    setDialogType(DialogTypes.NONE);
    setSelectedUser(null);
    setUserBorrowRecords([]);
  };

  if (!isLibrarian) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Quyền truy cập bị từ chối</h2>
            <p className="text-gray-500 mb-4">
              Chức năng này chỉ dành cho thủ thư
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center text-center space-y-4 pb-6 border-b">
        <UsersIcon size={48} className="text-library-primary" />
        <h1 className="text-3xl font-bold">Quản lý tài khoản</h1>
        <p className="text-gray-500 max-w-lg">
          Xem và quản lý tài khoản của độc giả, xem sách đang mượn và mở khóa tài khoản
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Tìm kiếm độc giả..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2">
          <span className="bg-green-100 text-green-800 py-1 px-2 rounded text-xs flex items-center">
            <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></span>
            <span>{users.filter(u => !u.isBlocked).length} đang hoạt động</span>
          </span>
          
          <span className="bg-red-100 text-red-800 py-1 px-2 rounded text-xs flex items-center">
            <span className="h-2 w-2 rounded-full bg-red-500 mr-1.5"></span>
            <span>{users.filter(u => u.isBlocked).length} bị khóa</span>
          </span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Tên đăng nhập</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Không tìm thấy độc giả nào
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.id}</TableCell>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      {user.isBlocked ? (
                        <Badge variant="destructive" className="flex items-center w-fit">
                          <Lock size={12} className="mr-1" />
                          Bị khóa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-800 hover:bg-green-50 flex items-center w-fit">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1"></div>
                          Đang hoạt động
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openUserDetailsDialog(user)}
                          className="flex items-center"
                        >
                          <User size={16} className="mr-1" />
                          <span>Chi tiết</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openBorrowedBooksDialog(user)}
                          className="flex items-center ml-2"
                        >
                          <BookOpen size={16} className="mr-1" />
                          <span>Sách mượn</span>
                        </Button>
                        {user.isBlocked ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openUnlockAccountDialog(user)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 flex items-center ml-2"
                          >
                            <LockOpen size={16} className="mr-1" />
                            <span>Mở khóa</span>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={dialogType === DialogTypes.USER_DETAILS} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thông tin độc giả</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-shrink-0 h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center">
                  <User size={32} className="text-blue-500" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-medium text-lg">{selectedUser.fullName}</h3>
                  <p className="text-gray-500 text-sm">ID: {selectedUser.id}</p>
                  {selectedUser.isBlocked ? (
                    <Badge variant="destructive" className="mt-1">
                      <span>Tài khoản bị khóa</span>
                    </Badge>
                  ) : null}
                </div>
              </div>
              
              <div className="border rounded-md divide-y">
                <div className="flex py-2 px-3">
                  <span className="w-1/3 text-gray-500 text-sm">Tên đăng nhập</span>
                  <span className="flex-1 font-medium text-sm">{selectedUser.username}</span>
                </div>
                <div className="flex py-2 px-3">
                  <span className="w-1/3 text-gray-500 text-sm">Loại tài khoản</span>
                  <span className="flex-1 font-medium text-sm">Độc giả</span>
                </div>
                <div className="flex py-2 px-3">
                  <span className="w-1/3 text-gray-500 text-sm">Trạng thái</span>
                  <span className="flex-1 font-medium text-sm">
                    {selectedUser.isBlocked ? <span>Bị khóa</span> : <span>Đang hoạt động</span>}
                  </span>
                </div>
                {selectedUser.isBlocked ? (
                  <div className="flex py-2 px-3">
                    <span className="w-1/3 text-gray-500 text-sm">Lý do khóa</span>
                    <span className="flex-1 font-medium text-sm">
                      {selectedUser.blockReason || "Quá hạn trả sách"}
                    </span>
                  </div>
                ) : null}
                <div className="flex py-2 px-3">
                  <span className="w-1/3 text-gray-500 text-sm">Sách đang mượn</span>
                  <span className="flex-1 font-medium text-sm">
                    {userBorrowRecords.length}
                  </span>
                </div>
              </div>
              
              {userBorrowRecords.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Sách đang mượn</h4>
                  <div className="space-y-2">
                    {userBorrowRecords.map((record) => {
                      const book = books.find(b => b.id === record.bookId);
                      if (!book) return null;
                      
                      const dueDate = new Date(record.dueDate);
                      const today = new Date();
                      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <div key={record.id} className="flex items-center space-x-2 text-sm bg-blue-50 p-2 rounded">
                          <BookOpen size={16} className="text-blue-500" />
                          <span className="font-medium">{book.title}</span>
                          {daysLeft > 0 ? (
                            <span className="text-green-600 text-xs ml-auto">
                              Còn {daysLeft} ngày
                            </span>
                          ) : (
                            <span className="text-red-600 text-xs ml-auto">
                              Quá hạn {Math.abs(daysLeft)} ngày
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Borrowed Books Dialog */}
      <Dialog open={dialogType === DialogTypes.BORROWED_BOOKS} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sách đang mượn</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                <User size={20} className="text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium">{selectedUser?.fullName}</h3>
                <p className="text-sm text-gray-500">ID: {selectedUser?.id}</p>
              </div>
            </div>
            
            {userBorrowRecords.length > 0 ? (
              <div className="space-y-3">
                {userBorrowRecords.map((record) => {
                  const book = books.find(b => b.id === record.bookId);
                  if (!book) return null;
                  
                  const dueDate = new Date(record.dueDate);
                  const today = new Date();
                  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <Card key={record.id}>
                      <CardContent className="p-3">
                        <div className="flex space-x-3">
                          <div className="w-14 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                            {book.coverImage ? (
                              <img 
                                src={book.coverImage} 
                                alt={book.title} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen size={16} className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{book.title}</h4>
                            <p className="text-xs text-gray-500">
                              {book.author}
                            </p>
                            <div className="text-xs mt-1">
                              <div>
                                <span className="text-gray-500">Mượn: </span>
                                {new Date(record.borrowDate).toLocaleDateString('vi-VN')}
                              </div>
                              <div>
                                <span className="text-gray-500">Hạn trả: </span>
                                {new Date(record.dueDate).toLocaleDateString('vi-VN')}
                                {daysLeft > 0 ? (
                                  <span className="text-green-500 ml-1">
                                    ({daysLeft} ngày còn lại)
                                  </span>
                                ) : (
                                  <span className="text-red-500 ml-1">
                                    (Quá hạn {Math.abs(daysLeft)} ngày)
                                  </span>
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
            ) : (
              <div className="text-center py-8 text-gray-500">
                Độc giả chưa mượn sách nào
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unlock Account Dialog */}
      <Dialog open={dialogType === DialogTypes.UNLOCK_ACCOUNT} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mở khóa tài khoản</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <LockOpen size={24} className="text-green-600" />
              </div>
              <h3 className="font-medium">Mở khóa tài khoản cho {selectedUser?.fullName}</h3>
            </div>
            
            <div className="bg-green-50 p-3 rounded-md mb-4">
              <p className="text-sm text-green-800">
                Sau khi mở khóa, độc giả sẽ có thể tiếp tục mượn sách. 
                Vui lòng đảm bảo độc giả đã chấp hành hình phạt (nếu có).
              </p>
            </div>
            
            <div className="text-sm mb-4">
              <p>Lý do khóa: {selectedUser?.blockReason || "Quá hạn trả sách"}</p>
              <p>Số sách chưa trả: {userBorrowRecords.length}</p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={closeDialog}
              className="mr-2"
            >
              Hủy
            </Button>
            <Button 
              onClick={unlockUserAccount}
              className="bg-green-600 hover:bg-green-700"
            >
              <LockOpen size={16} className="mr-2" />
              Xác nhận mở khóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
