
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Users, 
  BookCopy, 
  Search, 
  BarChart3, 
  User, 
  LogOut,
  Bell,
  BookMarked,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Notification } from '@/types';
import { notificationsApi } from '@/services/apiService';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activePath, setActivePath] = useState('/');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const path = location.pathname;
    const mainPath = path === "/" ? "/" : `/${path.split('/')[1]}`;
    setActivePath(mainPath);
  }, [location]);

  // Fetch user notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (user?.id) {
        try {
          const userNotifications = await notificationsApi.getUserNotifications(user.id);
          setNotifications(userNotifications);
          const unread = userNotifications.filter(notification => !notification.read).length;
          setUnreadCount(unread);
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      }
    };

    fetchNotifications();
    
    // Set up interval to check for new notifications every 5 minutes
    const intervalId = setInterval(fetchNotifications, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Đăng xuất thành công');
  };

  const handleTabChange = (value: string) => {
    navigate(value);
  };

  const isLibrarian = user?.role === 'librarian';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-library-primary text-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <BookOpen size={28} />
          <h1 className="text-xl font-bold">Thư viện THPT Thanh Xuân</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-white relative">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thông báo</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {notifications.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {notifications.map((notification) => {
                      const isUnread = !notification.read;
                      let icon;
                      
                      // Select icon based on notification type
                      switch (notification.type) {
                        case 'return_reminder':
                          icon = <Calendar className="text-yellow-500" size={18} />;
                          break;
                        case 'book_available':
                          icon = <BookMarked className="text-green-500" size={18} />;
                          break;
                        case 'overdue':
                          icon = <Calendar className="text-red-500" size={18} />;
                          break;
                        default:
                          icon = <Bell className="text-blue-500" size={18} />;
                      }
                      
                      return (
                        <div 
                          key={notification.id} 
                          className={`p-3 border rounded-md ${isUnread ? 'bg-blue-50' : ''}`}
                          onClick={async () => {
                            if (!notification.read) {
                              try {
                                await notificationsApi.markAsRead(notification.id);
                                setNotifications(prev => prev.map(n => 
                                  n.id === notification.id ? {...n, read: true} : n
                                ));
                                setUnreadCount(prev => Math.max(0, prev - 1));
                              } catch (error) {
                                console.error('Error marking notification as read:', error);
                              }
                            }
                          }}
                        >
                          <div className="flex items-start">
                            <div className="mr-2 mt-1">{icon}</div>
                            <div>
                              <p className="font-medium">{notification.title}</p>
                              <p className="text-sm text-gray-500">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(notification.date).toLocaleString('vi-VN')}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Bell className="mx-auto mb-2" size={24} />
                    <p>Không có thông báo mới</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-white flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-library-accent text-white">
                    {user?.fullName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline">{user?.fullName}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thông tin tài khoản</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <div className="flex flex-col items-center space-y-2 mb-6">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-library-primary text-white text-2xl">
                      {user?.fullName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-lg">{user?.fullName}</p>
                  <p className="text-sm text-gray-500">
                    {user?.role === 'librarian' ? 'Thủ thư' : 'Học sinh'}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mb-2"
                  onClick={() => navigate('/account')}
                >
                  <User size={16} className="mr-2" />
                  Quản lý tài khoản
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full text-red-500 hover:text-red-600"
                  onClick={handleLogout}
                >
                  <LogOut size={16} className="mr-2" />
                  Đăng xuất
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Tabs value={activePath} className="bg-white border-b" onValueChange={handleTabChange}>
        <TabsList className="h-14 w-full flex justify-around">
          {isLibrarian && (
            <TabsTrigger value="/" className="flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Trang chủ</span>
            </TabsTrigger>
          )}
          
          {isLibrarian && (
            <TabsTrigger value="/books" className="flex items-center">
              <BookCopy className="mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Quản lý sách</span>
            </TabsTrigger>
          )}
          
          <TabsTrigger value="/search" className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">Tra cứu sách</span>
          </TabsTrigger>

          {isLibrarian && (
            <>
              <TabsTrigger value="/borrow" className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                <span className="hidden sm:inline">Mượn/Trả sách</span>
              </TabsTrigger>
              
              <TabsTrigger value="/users" className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                <span className="hidden sm:inline">QL Tài khoản</span>
              </TabsTrigger>
              
              <TabsTrigger value="/reports" className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                <span className="hidden sm:inline">Báo cáo</span>
              </TabsTrigger>
            </>
          )}
          
          <TabsTrigger value="/account" className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">Tài khoản</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      <main className="flex-1 p-4">
        {children}
      </main>
      
      <footer className="bg-gray-100 text-center py-4 text-sm text-gray-500">
        © 2025 Hệ thống quản lý thư viện THPT Thanh Xuân
      </footer>
    </div>
  );
};

export default MainLayout;
