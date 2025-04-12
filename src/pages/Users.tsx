
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi } from '@/services/apiService';
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
import { User as UserType, BorrowRecord } from '@/types';
import { MOCK_USERS, MOCK_BORROW_RECORDS, MOCK_BOOKS } from '@/mock/data';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await usersApi.getAll();
        setUsers(allUsers.filter(u => u.role === 'student'));
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Không thể tải danh sách độc giả');
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
    
    // Find user's borrow records
    const records = MOCK_BORROW_RECORDS.filter(record => 
      record.userId === user.id &&
      record.status === 'borrowed'
    );
    setUserBorrowRecords(records);
    
    setDialogType(DialogTypes.USER_DETAILS);
  };

  const openBorrowedBooksDialog = (user: UserType) => {
    setSelectedUser(user);
    
    // Find user's borrow records
    const records = MOCK_BORROW_RECORDS.filter(record => 
      record.userId === user.id &&
      record.status === 'borrowed'
    );
    setUserBorrowRecords(records);
    
    setDialogType(DialogTypes.BORROWED_BOOKS);
  };

  const openUnlockAccountDialog = (user: UserType) => {
    setSelectedUser(user);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Quản lý tài khoản độc giả</h1>
          <p className="text-gray-500">Xem thông tin và mở khóa tài khoản độc giả</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Danh sách độc giả</CardTitle>
          <CardDescription>
            Hiển thị {filteredUsers.length} độc giả
          </CardDescription>
          <div className="flex mt-2">
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                placeholder="Tìm kiếm theo tên, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit">
                <Search size={18} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Tên đăng nhập</TableHead>
                  <TableHead className="text-center">Sách đang mượn</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                      Không tìm thấy độc giả nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const borrowedCount = MOCK_BORROW_RECORDS.filter(
                      record => record.userId === user.id && record.status === 'borrowed'
                    ).length;
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <User size={16} className="mr-2 text-gray-400" />
                            {user.fullName}
                          </div>
                        </TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell className="text-center">
                          {borrowedCount > 0 ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => openBorrowedBooksDialog(user)}
                            >
                              {borrowedCount} sách
                            </Button>
                          ) : (
                            <span className="text-gray-500">0 sách</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {user.isBlocked ? (
                            <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">
                              <Lock size={12} className="mr-1" />
                              Bị khóa
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                              <LockOpen size={12} className="mr-1" />
                              Hoạt động
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openUserDetailsDialog(user)}
                            >
                              Chi tiết
                            </Button>
                            {user.isBlocked && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-green-600 hover:text-green-800"
                                onClick={() => openUnlockAccountDialog(user)}
                              >
                                <LockOpen size={14} className="mr-1" />
                                Mở khóa
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={dialogType === DialogTypes.USER_DETAILS} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thông tin độc giả</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex flex-col items-center mb-4">
              <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                <User size={40} className="text-gray-400" />
              </div>
              <h3 className="font-bold text-lg">{selectedUser?.fullName}</h3>
              <p className="text-sm text-gray-500">ID: {selectedUser?.id}</p>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 border-b pb-2">
                <div className="text-sm text-gray-500">Tên đăng nhập</div>
                <div className="text-sm font-medium text-right">{selectedUser?.username}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 border-b pb-2">
                <div className="text-sm text-gray-500">Trạng thái</div>
                <div className="text-right">
                  {selectedUser?.isBlocked ? (
                    <span className="text-sm text-red-500 font-medium">Bị khóa</span>
                  ) : (
                    <span className="text-sm text-green-500 font-medium">Hoạt động</span>
                  )}
                </div>
              </div>
              
              {selectedUser?.isBlocked && selectedUser.blockReason && (
                <div className="grid grid-cols-2 gap-2 border-b pb-2">
                  <div className="text-sm text-gray-500">Lý do khóa</div>
                  <div className="text-sm font-medium text-right">
                    {selectedUser.blockReason}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2 border-b pb-2">
                <div className="text-sm text-gray-500">Số sách đang mượn</div>
                <div className="text-sm font-medium text-right">
                  {userBorrowRecords.length} sách
                </div>
              </div>
            </div>
            
            {userBorrowRecords.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-2">Sách đang mượn:</h4>
                <div className="space-y-2">
                  {userBorrowRecords.map(record => {
                    const book = MOCK_BOOKS.find(b => b.id === record.bookId);
                    return (
                      <div key={record.id} className="text-sm p-2 border rounded-md">
                        <div className="font-medium">{book?.title}</div>
                        <div className="text-gray-500 text-xs mt-1">
                          Mượn: {new Date(record.borrowDate).toLocaleDateString('vi-VN')} | 
                          Hạn trả: {new Date(record.dueDate).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {selectedUser?.isBlocked && (
              <div className="mt-4">
                <Button 
                  onClick={() => openUnlockAccountDialog(selectedUser)}
                  className="w-full"
                >
                  <LockOpen size={16} className="mr-2" />
                  Mở khóa tài khoản
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Borrowed Books Dialog */}
      <Dialog open={dialogType === DialogTypes.BORROWED_BOOKS} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sách đang mượn</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4">
              <h3 className="font-medium">Độc giả: {selectedUser?.fullName}</h3>
              <p className="text-sm text-gray-500">
                {userBorrowRecords.length} sách đang mượn
              </p>
            </div>
            
            {userBorrowRecords.length > 0 ? (
              <div className="space-y-3">
                {userBorrowRecords.map(record => {
                  const book = MOCK_BOOKS.find(b => b.id === record.bookId);
                  if (!book) return null;
                  
                  const dueDate = new Date(record.dueDate);
                  const today = new Date();
                  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <Card key={record.id}>
                      <CardContent className="p-3">
                        <div className="flex">
                          <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden mr-3 flex-shrink-0">
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
