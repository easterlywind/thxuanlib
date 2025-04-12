
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-3xl font-bold mb-2">404</h1>
          <p className="text-xl text-gray-600 mb-6">Trang không tồn tại</p>
          <Button 
            onClick={() => window.location.href = '/'}
            className="bg-library-primary"
          >
            Quay về trang chủ
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
