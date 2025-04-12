
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { toast } from 'sonner';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  AlertTriangle,
  Check
} from 'lucide-react';
import { Book } from '@/types';
import axios from 'axios';

type DialogType = 'add' | 'edit' | 'delete' | null;

const Books = () => {
  // Fetch books on component mount
  React.useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/books');
        setBooks(response.data);
      } catch (error) {
        console.error('Error fetching books:', error);
        toast.error('Không thể tải danh sách sách. Vui lòng thử lại sau.');
      }
    };
    fetchBooks();
  }, []);
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState<Partial<Book & { imageFile?: File }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLibrarian = user?.role === 'librarian';

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.isbn.includes(searchQuery)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    
    if (name === 'coverImage' && files && files[0]) {
      console.log('Selected file:', files[0]);
      setFormData(prev => ({
        ...prev,
        imageFile: files[0]
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'publishYear' || name === 'quantity' ? 
        parseInt(value, 10) : value
    }));
  };

  const openDialog = (type: DialogType, book?: Book) => {
    setDialogType(type);
    if (book && (type === 'edit' || type === 'delete')) {
      setSelectedBook(book);
      setFormData(book);
    } else {
      setFormData({});
    }
  };

  const closeDialog = () => {
    setDialogType(null);
    setSelectedBook(null);
    setFormData({});
  };

  const handleAddBook = async () => {
    setIsSubmitting(true);
    
    // Validate form data
    const requiredFields = ['isbn', 'title', 'author', 'publishYear', 'category', 'publisher', 'quantity'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      toast.error('Vui lòng điền đầy đủ thông tin sách');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Upload image if selected
      let coverImage = formData.coverImage;
      if (formData.imageFile) {
        const formDataWithImage = new FormData();
        formDataWithImage.append('image', formData.imageFile);
        const uploadResponse = await axios.post('http://localhost:5000/api/upload', formDataWithImage);
        coverImage = uploadResponse.data.imageUrl;
      }

      // Add book
      const response = await axios.post('http://localhost:5000/api/books', {
        isbn: formData.isbn,
        title: formData.title,
        author: formData.author,
        publishYear: formData.publishYear,
        category: formData.category,
        publisher: formData.publisher,
        quantity: formData.quantity,
        coverImage
      });

      setBooks(prev => [...prev, response.data]);
      toast.success(`Đã thêm sách "${formData.title}"`);
      closeDialog();
    } catch (error) {
      console.error('Error adding book:', error);
      toast.error('Không thể thêm sách. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBook = async () => {
    if (!selectedBook) return;
    setIsSubmitting(true);
    
    // Validate form data
    const requiredFields = ['isbn', 'title', 'author', 'publishYear', 'category', 'publisher', 'quantity'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      toast.error('Vui lòng điền đầy đủ thông tin sách');
      setIsSubmitting(false);
      return;
    }

    try {
      // Upload image if selected
      let coverImage = formData.coverImage;
      if (formData.imageFile) {
        const formDataWithImage = new FormData();
        formDataWithImage.append('image', formData.imageFile);
        const uploadResponse = await axios.post('http://localhost:5000/api/upload', formDataWithImage);
        coverImage = uploadResponse.data.imageUrl;
      }

      // Update book
      const response = await axios.put(`http://localhost:5000/api/books/${selectedBook.id}`, {
        isbn: formData.isbn,
        title: formData.title,
        author: formData.author,
        publishYear: formData.publishYear,
        category: formData.category,
        publisher: formData.publisher,
        quantity: formData.quantity,
        coverImage: coverImage || selectedBook.coverImage
      });

      setBooks(prev =>
        prev.map(book => book.id === selectedBook.id ? response.data : book)
      );
      toast.success(`Đã cập nhật sách "${formData.title}"`);
      closeDialog();
    } catch (error) {
      console.error('Error updating book:', error);
      toast.error('Không thể cập nhật sách. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!selectedBook) return;
    setIsSubmitting(true);
    
    try {
      // Check if book is being borrowed
      const borrowResponse = await axios.get(`http://localhost:5000/api/borrows/check/${selectedBook.id}`);
      const isBorrowed = borrowResponse.data.isBorrowed;
      
      if (isBorrowed) {
        toast.error('Không thể xóa sách đang được mượn');
        setIsSubmitting(false);
        return;
      }

      await axios.delete(`http://localhost:5000/api/books/${selectedBook.id}`);
      setBooks(prev => prev.filter(book => book.id !== selectedBook.id));
      toast.success('Xóa sách thành công');
      closeDialog();
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Không thể xóa sách. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-2xl font-bold">Quản lý sách</h1>
          <p className="text-gray-500">Thêm, sửa, xóa thông tin sách trong thư viện</p>
        </div>
        <Button onClick={() => openDialog('add')} className="bg-library-primary">
          <Plus size={16} className="mr-2" />
          Thêm sách
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Danh sách sách</CardTitle>
          <CardDescription>
            Hiển thị {filteredBooks.length} sách trong thư viện
          </CardDescription>
          <div className="flex mt-2">
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                placeholder="Tìm kiếm theo tên, tác giả, ISBN..."
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
                  <TableHead className="w-[50px]">ID</TableHead>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Tác giả</TableHead>
                  <TableHead>Thể loại</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead className="text-right">Có sẵn</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                      Không tìm thấy sách nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBooks.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell>{book.id}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <div className="w-8 h-10 bg-gray-200 rounded overflow-hidden mr-2 flex-shrink-0">
                            {book.coverImage ? (
                              <img 
                                src={book.coverImage} 
                                alt={book.title} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen size={14} className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          {book.title}
                        </div>
                      </TableCell>
                      <TableCell>{book.author}</TableCell>
                      <TableCell>{book.category}</TableCell>
                      <TableCell className="text-right">{book.quantity}</TableCell>
                      <TableCell className="text-right">{book.availableQuantity}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openDialog('edit', book)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openDialog('delete', book)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Book Dialog */}
      <Dialog open={dialogType === 'add'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm sách mới</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="isbn">Mã ISBN</Label>
                <Input
                  id="isbn"
                  name="isbn"
                  placeholder="Nhập mã ISBN"
                  value={formData.isbn || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publishYear">Năm xuất bản</Label>
                <Input
                  id="publishYear"
                  name="publishYear"
                  type="number"
                  placeholder="Năm xuất bản"
                  value={formData.publishYear || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề</Label>
              <Input
                id="title"
                name="title"
                placeholder="Nhập tiêu đề sách"
                value={formData.title || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Tác giả</Label>
              <Input
                id="author"
                name="author"
                placeholder="Nhập tên tác giả"
                value={formData.author || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Thể loại</Label>
                <Input
                  id="category"
                  name="category"
                  placeholder="Thể loại sách"
                  value={formData.category || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publisher">Nhà xuất bản</Label>
                <Input
                  id="publisher"
                  name="publisher"
                  placeholder="Nhà xuất bản"
                  value={formData.publisher || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Số lượng</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                placeholder="Số lượng sách"
                value={formData.quantity || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverImage">Ảnh bìa sách</Label>
              <Input
                id="coverImage"
                name="coverImage"
                type="file"
                accept="image/*"
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button 
              disabled={isSubmitting}
              onClick={handleAddBook}
              className="bg-library-primary"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Thêm sách'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Book Dialog */}
      <Dialog open={dialogType === 'edit'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa thông tin sách</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="isbn">Mã ISBN</Label>
                <Input
                  id="isbn"
                  name="isbn"
                  placeholder="Nhập mã ISBN"
                  value={formData.isbn || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publishYear">Năm xuất bản</Label>
                <Input
                  id="publishYear"
                  name="publishYear"
                  type="number"
                  placeholder="Năm xuất bản"
                  value={formData.publishYear || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề</Label>
              <Input
                id="title"
                name="title"
                placeholder="Nhập tiêu đề sách"
                value={formData.title || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Tác giả</Label>
              <Input
                id="author"
                name="author"
                placeholder="Nhập tên tác giả"
                value={formData.author || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Thể loại</Label>
                <Input
                  id="category"
                  name="category"
                  placeholder="Thể loại sách"
                  value={formData.category || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publisher">Nhà xuất bản</Label>
                <Input
                  id="publisher"
                  name="publisher"
                  placeholder="Nhà xuất bản"
                  value={formData.publisher || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Số lượng</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                placeholder="Số lượng sách"
                value={formData.quantity || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverImage">Ảnh bìa sách</Label>
              <Input
                id="coverImage"
                name="coverImage"
                type="file"
                accept="image/*"
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button 
              disabled={isSubmitting}
              onClick={handleEditBook}
              className="bg-library-primary"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Book Dialog */}
      <Dialog open={dialogType === 'delete'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa sách</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                {selectedBook?.coverImage ? (
                  <img 
                    src={selectedBook.coverImage} 
                    alt={selectedBook.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={20} className="text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-medium">{selectedBook?.title}</h3>
                <p className="text-sm text-gray-500">
                  Tác giả: {selectedBook?.author}
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 p-3 rounded-md mt-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
                <p className="text-sm text-yellow-800">
                  Bạn có chắc chắn muốn xóa sách này khỏi thư viện? 
                  Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button 
              variant="destructive"
              disabled={isSubmitting}
              onClick={handleDeleteBook}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xóa sách'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Books;
