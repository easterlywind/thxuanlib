import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Search as SearchIcon, Edit, Trash2 } from 'lucide-react';
import { Book } from '@/types';
import { booksApi } from '@/services/apiService';
import { toast } from 'sonner';

const Search = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const isLibrarian = user?.role === 'librarian';

  useEffect(() => {
    // Load all books on component mount
    const fetchBooks = async () => {
      try {
        setIsLoading(true);
        const books = await booksApi.getAll();
        setAllBooks(books);
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(books.map(book => book.category)));
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('Failed to fetch books:', error);
        toast.error('Failed to load books');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const handleSearch = () => {
    const term = searchTerm.toLowerCase().trim();
    
    if (!term && searchCategory === 'all') {
      setSearchResults(allBooks);
      setHasSearched(true);
      return;
    }
    
    let results = [...allBooks];
    
    // Filter by category if not "all"
    if (searchCategory !== 'all') {
      results = results.filter(book => book.category === searchCategory);
    }
    
    // Filter by search term
    if (term) {
      results = results.filter(book => 
        book.title.toLowerCase().includes(term) ||
        book.author.toLowerCase().includes(term) ||
        book.isbn.includes(term)
      );
    }
    
    setSearchResults(results);
    setHasSearched(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleEdit = (book: Book) => {
    // In a real application, this would navigate to a book edit page
    // or open a dialog to edit the book
    console.log('Edit book:', book);
  };

  const handleDelete = async (book: Book) => {
    if (!isLibrarian || !book.id) return;
    
    try {
      await booksApi.delete(book.id);
      // Remove the book from the search results
      setSearchResults(prev => prev.filter(b => b.id !== book.id));
      // Also remove from allBooks
      setAllBooks(prev => prev.filter(b => b.id !== book.id));
      toast.success(`"${book.title}" has been deleted.`);
    } catch (error) {
      console.error('Failed to delete book:', error);
      toast.error('Failed to delete book.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tra cứu sách</h1>
        <p className="text-gray-500">Tìm kiếm sách theo tên, tác giả, mã ISBN, hoặc thể loại</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="space-y-2">
                <Label htmlFor="search">Tìm kiếm</Label>
                <Input
                  id="search"
                  placeholder="Nhập tên sách, tác giả hoặc ISBN"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyUp={handleKeyPress}
                />
              </div>
            </div>
            
            <div>
              <div className="space-y-2">
                <Label htmlFor="category">Thể loại</Label>
                <Select
                  value={searchCategory}
                  onValueChange={setSearchCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn thể loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả thể loại</SelectItem>
                    {categories.map((category, index) => (
                      <SelectItem key={index} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleSearch} 
            className="mt-4 bg-library-primary w-full md:w-auto"
            disabled={isLoading}
          >
            <SearchIcon size={18} className="mr-2" />
            {isLoading ? 'Loading...' : 'Tìm kiếm'}
          </Button>
        </CardContent>
      </Card>

      {hasSearched && (
        <div>
          <h2 className="text-xl font-bold mb-4">
            Kết quả tìm kiếm
            <span className="text-gray-500 text-base font-normal ml-2">
              ({searchResults.length} sách)
            </span>
          </h2>

          <div className="space-y-4">
            {searchResults.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Không tìm thấy sách phù hợp</p>
              </div>
            ) : (
              searchResults.map((book) => (
                <Card key={book.id}>
                  <CardContent className="p-4">
                    <div className="flex">
                      <div className="w-20 h-28 bg-gray-200 rounded overflow-hidden mr-4 flex-shrink-0">
                        {book.coverImage ? (
                          <img 
                            src={book.coverImage} 
                            alt={book.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen size={24} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h3 className="font-medium">{book.title}</h3>
                          
                          {isLibrarian && (
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEdit(book)}
                              >
                                <Edit size={16} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDelete(book)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-500">
                          Tác giả: {book.author}
                        </p>
                        <p className="text-sm text-gray-500">
                          Nhà xuất bản: {book.publisher} ({book.publishYear})
                        </p>
                        <p className="text-sm text-gray-500">
                          Thể loại: {book.category}
                        </p>
                        <p className="text-sm text-gray-500">
                          ISBN: {book.isbn}
                        </p>
                        <div className="mt-2 flex justify-between items-center">
                          <span className={`text-sm px-2 py-1 rounded ${
                            book.availableQuantity > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {book.availableQuantity > 0 
                              ? `Có sẵn: ${book.availableQuantity}/${book.quantity}` 
                              : 'Hết sách'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
