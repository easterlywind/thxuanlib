
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
import { MOCK_BOOKS, MOCK_USERS, MOCK_BORROW_RECORDS } from '@/mock/data';
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
  const categoriesData = MOCK_BOOKS.reduce((acc, book) => {
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
  const borrowedRecords = MOCK_BORROW_RECORDS.filter(record => record.status === 'borrowed');
  const returnedRecords = MOCK_BORROW_RECORDS.filter(record => record.status === 'returned');
  const overdueRecords = MOCK_BORROW_RECORDS.filter(record => {
    const dueDate = new Date(record.dueDate);
    const today = new Date();
    return record.status === 'borrowed' && dueDate < today;
  });

  const borrowStatusData = [
    { name: 'Đang mượn', value: borrowedRecords.length - overdueRecords.length },
    { name: 'Quá hạn', value: overdueRecords.length },
    { name: 'Đã trả', value: returnedRecords.length },
  ];

  // User accounts stats
  const totalStudents = MOCK_USERS.filter(u => u.role === 'student').length;
  const activeStudents = MOCK_USERS.filter(u => u.role === 'student' && !u.isBlocked).length;
  const blockedStudents = MOCK_USERS.filter(u => u.role === 'student' && u.isBlocked).length;

  const userAccountsData = [
    { name: 'Đang hoạt động', value: activeStudents },
    { name: 'Bị khóa', value: blockedStudents },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const handleExportReport = () => {
    try {
      let data: any[] = [];
      let fileName = '';

      switch (activeReport) {
        case ReportType.BOOKS_SUMMARY:
          data = books.map(book => ({
            'Mã ISBN': book.isbn,
            'Tiêu đề': book.title,
            'Tác giả': book.author,
            'Thể loại': book.category,
            'Năm xuất bản': book.publishYear,
            'Nhà xuất bản': book.publisher,
            'Tổng số lượng': book.quantity,
            'Số lượng khả dụng': book.availableQuantity,
            'Số lượng đang mượn': book.quantity - book.availableQuantity
          }));
          fileName = 'bao-cao-sach.xlsx';
          break;

        case ReportType.BORROW_STATUS:
          data = borrowRecords.map(record => {
            const book = books.find(b => b.id === record.bookId);
            const user = users.find(u => u.id === record.userId);
            return {
              'Mã sách': record.bookId,
              'Tên sách': book?.title || '',
              'Mã độc giả': record.userId,
              'Tên độc giả': user?.fullName || '',
              'Ngày mượn': new Date(record.borrowDate).toLocaleDateString('vi-VN'),
              'Hạn trả': new Date(record.dueDate).toLocaleDateString('vi-VN'),
              'Ngày trả': record.returnDate ? new Date(record.returnDate).toLocaleDateString('vi-VN') : '',
              'Trạng thái': record.status === 'borrowed' ? 'Đang mượn' : 'Đã trả'
            };
          });
          fileName = 'bao-cao-muon-tra.xlsx';
          break;

        case ReportType.USER_ACCOUNTS:
          data = users
            .filter(user => user.role === 'student')
            .map(user => ({
              'Mã độc giả': user.id,
              'Họ tên': user.fullName,
              'Tên đăng nhập': user.username,
              'Trạng thái': user.isBlocked ? 'Bị khóa' : 'Đang hoạt động',
              'Lý do khóa': user.blockReason || ''
            }));
          fileName = 'bao-cao-doc-gia.xlsx';
          break;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, fileName);

      toast.success('Báo cáo đã được tải xuống');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Không thể xuất báo cáo. Vui lòng thử lại sau.');
    }
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
          <h1 className="text-2xl font-bold">Báo cáo & Thống kê</h1>
          <p className="text-gray-500">Xem báo cáo hoạt động của thư viện</p>
        </div>
        
        <Button onClick={handleExportReport} variant="outline">
          <Download size={16} className="mr-2" />
          Xuất báo cáo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className={`cursor-pointer ${activeReport === ReportType.BOOKS_SUMMARY ? 'ring-2 ring-library-primary' : ''}`}
          onClick={() => setActiveReport(ReportType.BOOKS_SUMMARY)}>
          <CardContent className="pt-6 flex items-center">
            <BookOpen size={20} className="mr-4 text-library-primary" />
            <div>
              <h3 className="font-medium">Báo cáo số lượng sách</h3>
              <p className="text-sm text-gray-500">
                Tổng số sách, sách theo thể loại, sách đang được mượn
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer ${activeReport === ReportType.BORROW_STATUS ? 'ring-2 ring-library-primary' : ''}`}
          onClick={() => setActiveReport(ReportType.BORROW_STATUS)}>
          <CardContent className="pt-6 flex items-center">
            <BarChart3 size={20} className="mr-4 text-library-primary" />
            <div>
              <h3 className="font-medium">Báo cáo tình trạng mượn/trả sách</h3>
              <p className="text-sm text-gray-500">
                Số sách đã mượn, đã trả, quá hạn
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`cursor-pointer ${activeReport === ReportType.USER_ACCOUNTS ? 'ring-2 ring-library-primary' : ''}`}
          onClick={() => setActiveReport(ReportType.USER_ACCOUNTS)}>
          <CardContent className="pt-6 flex items-center">
            <UsersIcon size={20} className="mr-4 text-library-primary" />
            <div>
              <h3 className="font-medium">Báo cáo tài khoản độc giả</h3>
              <p className="text-sm text-gray-500">
                Tài khoản đang hoạt động, tài khoản bị khóa
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        {activeReport === ReportType.BOOKS_SUMMARY && (
          <Card>
            <CardHeader>
              <CardTitle>Báo cáo số lượng sách</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Tổng số sách</p>
                        <p className="text-2xl font-bold">{totalBooks}</p>
                      </div>
                      <BookOpen size={36} className="text-gray-300" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Sách có sẵn</p>
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
                        <p className="text-sm text-gray-500">Sách đang mượn</p>
                        <p className="text-2xl font-bold">{borrowedBooks}</p>
                      </div>
                      <BookOpen size={36} className="text-blue-300" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <h3 className="text-lg font-medium mb-4">Số lượng sách theo thể loại</h3>
              
              <div className="h-96 w-full mb-6">
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
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalCount" name="Tổng số" fill="#0088FE" />
                    <Bar dataKey="availableCount" name="Có sẵn" fill="#00C49F" />
                    <Bar dataKey="borrowedCount" name="Đang mượn" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <h3 className="text-lg font-medium mb-4">Chi tiết theo từng thể loại</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thể loại</TableHead>
                      <TableHead className="text-right">Tổng số</TableHead>
                      <TableHead className="text-right">Có sẵn</TableHead>
                      <TableHead className="text-right">Đang mượn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoriesChartData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right">{item.totalCount}</TableCell>
                        <TableCell className="text-right">{item.availableCount}</TableCell>
                        <TableCell className="text-right">{item.borrowedCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
              <CardTitle>Báo cáo tình trạng mượn/trả sách</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Sách đang mượn</p>
                        <p className="text-2xl font-bold">{borrowedRecords.length}</p>
                      </div>
                      <BookOpen size={36} className="text-blue-300" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Sách đã trả</p>
                        <p className="text-2xl font-bold">{returnedRecords.length}</p>
                      </div>
                      <BookOpen size={36} className="text-green-300" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Sách quá hạn</p>
                        <p className="text-2xl font-bold">{overdueRecords.length}</p>
                      </div>
                      <BookOpen size={36} className="text-red-300" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Biểu đồ tình trạng mượn/trả sách</h3>
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
                          {borrowStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
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
                          <TableHead>ID</TableHead>
                          <TableHead>Tên sách</TableHead>
                          <TableHead>Độc giả</TableHead>
                          <TableHead className="text-right">Quá hạn (ngày)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overdueRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                              Không có sách nào quá hạn
                            </TableCell>
                          </TableRow>
                        ) : (
                          overdueRecords.slice(0, 5).map((record) => {
                            const book = MOCK_BOOKS.find(b => b.id === record.bookId);
                            const borrower = MOCK_USERS.find(u => u.id === record.userId);
                            const dueDate = new Date(record.dueDate);
                            const today = new Date();
                            const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                            
                            return (
                              <TableRow key={record.id}>
                                <TableCell>{record.id}</TableCell>
                                <TableCell>{book?.title}</TableCell>
                                <TableCell>{borrower?.fullName}</TableCell>
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
              <CardTitle>Báo cáo tài khoản độc giả</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Tổng số độc giả</p>
                        <p className="text-2xl font-bold">{totalStudents}</p>
                      </div>
                      <UsersIcon size={36} className="text-gray-300" />
                    </div>
                  </CardContent>
                </Card>
                
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
                          MOCK_USERS.filter(u => u.role === 'student' && u.isBlocked).map((user) => (
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
