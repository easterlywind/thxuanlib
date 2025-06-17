import React, { useRef, useState, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRScanner = ({ onScan, onClose }: QRScannerProps): JSX.Element => {
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const requestRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  const initCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API không được hỗ trợ trên trình duyệt này');
      }

      // Request camera permissions and get stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video metadata to load
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
          }
        });

        // Initialize canvas context
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            throw new Error('Không thể khởi tạo canvas context');
          }
          canvasCtxRef.current = ctx;
        }

        // Start video playback
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập camera.');
      }
      onClose();
    }
  }, [onClose]);

  const scan = useCallback(() => {
    if (!scanning || !videoRef.current || !canvasRef.current || !canvasCtxRef.current) {
      return;
    }

    try {
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const context = canvasCtxRef.current;

        // Set canvas dimensions to match video
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        // Draw current video frame
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        // Get image data for QR code scanning
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        // Try to find QR code in image
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          console.log('Found QR code:', code.data);
          
          // Stop scanning
          setScanning(false);
          setCameraReady(false);

          // Stop video stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          // Cancel animation frame
          if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
          }
          
          // Call onScan callback with the data FIRST
          onScan(code.data);
          
          // Process the data with parent component first, then close
          setTimeout(() => {
            onClose();
          }, 800);
          
          return;
        }
      }

      // Continue scanning
      if (scanning) {
        requestRef.current = requestAnimationFrame(scan);
      }
    } catch (error) {
      console.error('Error processing frame:', error);
      toast.error('Lỗi khi xử lý hình ảnh');
    }
  }, [scanning, onScan, onClose]);

  const startScanning = useCallback(async () => {
    if (!cameraReady) {
      await initCamera();
    }
    setScanning(true);
  }, [cameraReady, initCamera]);

  const cleanup = useCallback(() => {
    setScanning(false);

    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }

    onClose();
  }, [onClose]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (scanning && cameraReady) {
      requestRef.current = requestAnimationFrame(scan);
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [scanning, cameraReady, scan]);

  return (
    <div className="flex flex-col items-center">
      <p id="qr-scanner-desc" className="text-sm text-gray-500 mb-4">
        Đưa mã QR vào khung hình để quét. Đảm bảo mã QR nằm trong vùng quét và đủ ánh sáng.
      </p>
      <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          style={{ display: scanning || cameraReady ? 'block' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: 'none' }}
        />
        {!scanning && !cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            Nhấn nút bên dưới để bắt đầu quét
          </div>
        )}
      </div>
      <Button
        onClick={startScanning}
        disabled={scanning}
        className="mt-4"
      >
        {scanning ? 'Đang quét...' : 'Bắt đầu quét'}
      </Button>
    </div>
  );
};

export default QRScanner;