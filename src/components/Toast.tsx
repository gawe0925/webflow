import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const bgColors = {
    error: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200',
    info: 'bg-blue-50 border-blue-200'
  };

  const textColors = {
    error: 'text-red-800',
    success: 'text-green-800',
    info: 'text-blue-800'
  };

  return (
    <div
      className={`
        fixed top-20 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-5 py-4 rounded-xl border shadow-2xl
        flex items-center gap-3 min-w-[320px] max-w-md
        transition-all duration-300 transform
        ${bgColors[type]}
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}
    >
      {icons[type]}
      <p className={`flex-1 text-sm font-semibold ${textColors[type]}`}>{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="p-1 hover:bg-black/5 rounded-lg transition-colors"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}