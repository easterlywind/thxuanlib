import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { booksApi, usersApi, borrowRecordsApi } from '@/services/apiService';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { 
  BarChart, 
  PieChart, 
  Bar, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, 
  BookOpen, 
  Users as UsersIcon, 
  Download, 
  AlertTriangle, 
  FileText 
} from 'lucide-react';
import { Book, User, BorrowRecord } from '@/types';
import { toast } from 'sonner';

enum ReportType {
  BOOKS_SUMMARY = 'books-summary',
  BORROW_STATUS = 'borrow-status',
  USER_ACCOUNTS = 'user-accounts',
}

const Reports = () => {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState<ReportType>(ReportType.BOOKS_SUMMARY);
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
        toast.error('Không thể tải dữ liệu báo cáo');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate book statistics
  const totalBooks = books.reduce((sum, book) => sum + book.quantity, 0);
  const availableBooks = books.reduce((sum, book) => sum + book.availableQuantity, 0);
  const borrowedBooks = totalBooks - availableBooks;

  // Calculate categories data for charts
  const categoriesData = books.reduce((acc, book) => {
    if (!acc[book.category]) {
      acc[book.category] = {
        category: book.category,
        totalCount: 0,
        availableCount: 0,
        borrowedCount: 0,
      };
    }
    acc[book.category].totalCount += book.quantity;
    acc[book.category].availableCount += book.availableQuantity;
    acc[book.category].borrowedCount += (book.quantity - book.availableQuantity);
    return acc;
  }, {} as Record<string, { category: string; totalCount: number; availableCount: number; borrowedCount: number; }>);

  const categoriesChartData = Object.values(categoriesData);

  // Calculate borrow status
  const borrowedRecords = borrowRecords.filter(record => record.status === 'borrowed');
  const returnedRecords = borrowRecords.filter(record => record.status === 'returned');
  const overdueRecords = borrowRecords.filter(record => {
    // Tìm cả sách có trạng thái "overdue" và sách có trạng thái "borrowed" nhưng quá hạn
    if (record.status === 'overdue') return true;
    
    const dueDate = new Date(record.dueDate);
    const today = new Date();
    return record.status === 'borrowed' && dueDate < today;
  });

  // Ensure we're counting active borrow records correctly
  const totalBorrowedCount = borrowRecords.filter(record => 
    record.status === 'borrowed' || record.status === 'overdue'
  ).length;
  const overdueBorrowCount = overdueRecords.length;
  const returnedBorrowCount = returnedRecords.length;
  const normalBorrowCount = returnedBorrowCount + overdueBorrowCount;

  const borrowStatusData = [
    { name: 'Đang mượn', value: normalBorrowCount },
    { name: 'Quá hạn', value: overdueBorrowCount },
    { name: 'Đã trả', value: returnedBorrowCount },
  ];

  // User accounts stats
  const totalStudents = users.filter(u => u.role === 'student').length;
  const activeStudents = users.filter(u => u.role === 'student' && !u.isBlocked).length;
  const blockedStudents = users.filter(u => u.role === 'student' && u.isBlocked).length;

  const userAccountsData = [
    { name: 'Đang hoạt động', value: activeStudents },
    { name: 'Bị khóa', value: blockedStudents },
  ];

  const handleExportReport = () => {
    try {
      let data: any[] = [];
      let filename = '';
      let sheetName = '';

      switch (activeReport) {
        case ReportType.BOOKS_SUMMARY:
          // Create data for books report
          data = books.map(book => ({
            'ID': book.id,
            'Tựa sách': book.title,
            'Tác giả': book.author,
            'Danh mục': book.category,
            'ISBN': book.isbn,
            'Số lượng': book.quantity,
            'Còn lại': book.availableQuantity,
            'Đang mượn': book.quantity - book.availableQuantity
          }));
          filename = 'bao-cao-sach.xlsx';
          sheetName = 'Báo cáo sách';
          break;

        case ReportType.BORROW_STATUS:
          // Enhance borrowRecords with book and user info
          data = borrowRecords.map(record => {
            const book = books.find(b => b.id === record.bookId);
            const borrowUser = users.find(u => u.id === record.userId);
            return {
              'ID': record.id,
              'Sách': book?.title || 'Không rõ',
              'ISBN': book?.isbn || 'Không rõ',
              'Độc giả': borrowUser?.fullName || 'Không rõ',
              'Ngày mượn': record.borrowDate,
              'Hạn trả': record.dueDate,
              'Ngày trả': record.returnDate || '-',
              'Trạng thái': record.status === 'returned' ? 'Đã trả' : 
                (new Date(record.dueDate) < new Date() ? 'Quá hạn' : 'Đang mượn')
            };
          });
          filename = 'bao-cao-muon-tra.xlsx';
          sheetName = 'Báo cáo mượn trả';
          break;

        case ReportType.USER_ACCOUNTS:
          data = users.filter(u => u.role === 'student').map(user => ({
            'ID': user.id,
            'Họ và tên': user.fullName,
            'Username': user.username,
            'Trạng thái': user.isBlocked ? 'Bị khóa' : 'Đang hoạt động',
            'Lý do khóa': user.blockReason || '-'
          }));
          filename = 'bao-cao-tai-khoan.xlsx';
          sheetName = 'Báo cáo tài khoản';
          break;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, filename);

      toast.success('Xuất báo cáo thành công');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Lỗi khi xuất báo cáo');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Đang tải dữ liệu báo cáo...</p>
      </div>
    );
  }

  if (!isLibrarian) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertTriangle size={48} className="text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold">Truy cập bị từ chối</h1>
        <p className="text-gray-500 mt-2">Bạn không có quyền xem báo cáo hệ thống.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center text-center space-y-4 pb-6 border-b">
        <BarChart3 size={48} className="text-library-primary" />
        <h1 className="text-3xl font-bold">Báo cáo thống kê</h1>
        <p className="text-gray-500 max-w-lg">
          Xem thống kê và dữ liệu về sách, tài khoản và tình trạng mượn trả
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={activeReport === ReportType.BOOKS_SUMMARY ? "default" : "outline"} 
            onClick={() => setActiveReport(ReportType.BOOKS_SUMMARY)}
            className={activeReport === ReportType.BOOKS_SUMMARY ? "bg-library-primary" : ""}
          >
            <BookOpen size={18} className="mr-2" />
            Sách
          </Button>
          <Button 
            variant={activeReport === ReportType.BORROW_STATUS ? "default" : "outline"} 
            onClick={() => setActiveReport(ReportType.BORROW_STATUS)}
            className={activeReport === ReportType.BORROW_STATUS ? "bg-library-primary" : ""}
          >
            <BookOpen size={18} className="mr-2" />
            Mượn/Trả
          </Button>
          <Button 
            variant={activeReport === ReportType.USER_ACCOUNTS ? "default" : "outline"} 
            onClick={() => setActiveReport(ReportType.USER_ACCOUNTS)}
            className={activeReport === ReportType.USER_ACCOUNTS ? "bg-library-primary" : ""}
          >
            <UsersIcon size={18} className="mr-2" />
            Tài khoản
          </Button>
        </div>

        {activeReport === ReportType.BOOKS_SUMMARY && (
          <Card>
            <CardHeader>
              <CardTitle>Thống kê sách</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Tổng số sách</p>
                        <p className="text-2xl font-bold">{totalBooks}</p>
                      </div>
                      <BookOpen size={36} className="text-library-primary" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Còn lại</p>
                        <p className="text-2xl font-bold">{availableBooks}</p>
                      </div>
                      <BookOpen size={36} className="text-green-300" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Đang mượn</p>
                        <p className="text-2xl font-bold">{borrowedBooks}</p>
                      </div>
                      <BookOpen size={36} className="text-orange-300" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Phân loại theo danh mục</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoriesChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="category" 
                          angle={-45} 
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => {
                            const displayName = name === 'totalCount' 
                              ? 'Tổng số' 
                              : name === 'availableCount' 
                                ? 'Còn lại' 
                                : 'Đang mượn';
                            return [value, displayName];
                          }}
                        />
                        <Legend 
                          formatter={(value) => {
                            return value === 'totalCount' 
                              ? 'Tổng số' 
                              : value === 'availableCount' 
                                ? 'Còn lại' 
                                : 'Đang mượn';
                          }}
                        />
                        <Bar dataKey="totalCount" fill="#8884d8" name="totalCount" />
                        <Bar dataKey="availableCount" fill="#82ca9d" name="availableCount" />
                        <Bar dataKey="borrowedCount" fill="#ffc658" name="borrowedCount" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Danh sách sách ít còn lại</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên sách</TableHead>
                          <TableHead className="text-center">Còn lại/Tổng</TableHead>
                          <TableHead className="text-right">Tỷ lệ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {books.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                              Chưa có dữ liệu sách
                            </TableCell>
                          </TableRow>
                        ) : (
                          [...books]
                            .filter(book => book.quantity > 0) // Only books with quantity > 0
                            .sort((a, b) => (a.availableQuantity / a.quantity) - (b.availableQuantity / b.quantity))
                            .slice(0, 5)
                            .map((book) => (
                              <TableRow key={book.id}>
                                <TableCell>{book.title}</TableCell>
                                <TableCell className="text-center">
                                  {book.availableQuantity}/{book.quantity}
                                </TableCell>
                                <TableCell className="text-right">
                                  {((book.availableQuantity / book.quantity) * 100).toFixed(0)}%
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" onClick={handleExportReport} className="ml-auto">
                <FileText size={16} className="mr-2" />
                Xuất báo cáo
              </Button>
            </CardFooter>
          </Card>
        )}

        {activeReport === ReportType.BORROW_STATUS && (
          <Card>
            <CardHeader>
              <CardTitle>Thống kê mượn trả</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Đang mượn</p>
                        <p className="text-2xl font-bold">{normalBorrowCount}</p>
                      </div>
                      <BookOpen size={36} className="text-library-primary" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Quá hạn</p>
                        <p className="text-2xl font-bold">{overdueBorrowCount}</p>
                      </div>
                      <AlertTriangle size={36} className="text-amber-300" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Đã trả</p>
                        <p className="text-2xl font-bold">{returnedBorrowCount}</p>
                      </div>
                      <BookOpen size={36} className="text-green-300" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Biểu đồ trạng thái mượn trả</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={borrowStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#4f46e5" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#10b981" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Sách quá hạn</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên sách</TableHead>
                          <TableHead>Người mượn</TableHead>
                          <TableHead className="text-right">Quá hạn (ngày)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overdueRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                              Không có sách nào quá hạn
                            </TableCell>
                          </TableRow>
                        ) : (
                          overdueRecords.slice(0, 5).map((record) => {
                            const book = books.find(b => b.id === record.bookId);
                            const borrowUser = users.find(u => u.id === record.userId);
                            const daysOverdue = Math.ceil(
                              (new Date().getTime() - new Date(record.dueDate).getTime()) / (1000 * 3600 * 24)
                            );
                            
                            return (
                              <TableRow key={record.id}>
                                <TableCell>{book?.title || 'Không rõ'}</TableCell>
                                <TableCell>{borrowUser?.fullName || 'Không rõ'}</TableCell>
                                <TableCell className="text-right text-red-500">
                                  {daysOverdue} ngày
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" onClick={handleExportReport} className="ml-auto">
                <FileText size={16} className="mr-2" />
                Xuất báo cáo
              </Button>
            </CardFooter>
          </Card>
        )}

        {activeReport === ReportType.USER_ACCOUNTS && (
          <Card>
            <CardHeader>
              <CardTitle>Thống kê tài khoản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Đang hoạt động</p>
                        <p className="text-2xl font-bold">{activeStudents}</p>
                      </div>
                      <UsersIcon size={36} className="text-green-300" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Bị khóa</p>
                        <p className="text-2xl font-bold">{blockedStudents}</p>
                      </div>
                      <UsersIcon size={36} className="text-red-300" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Biểu đồ trạng thái tài khoản</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={userAccountsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#00C49F" />
                          <Cell fill="#FF8042" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Tài khoản bị khóa</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Họ tên</TableHead>
                          <TableHead className="text-right">Lý do</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {blockedStudents === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                              Không có tài khoản nào bị khóa
                            </TableCell>
                          </TableRow>
                        ) : (
                          users.filter(u => u.role === 'student' && u.isBlocked).map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.id}</TableCell>
                              <TableCell>{user.fullName}</TableCell>
                              <TableCell className="text-right">
                                {user.blockReason || "Trả sách quá hạn"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" onClick={handleExportReport} className="ml-auto">
                <FileText size={16} className="mr-2" />
                Xuất báo cáo
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Reports;
