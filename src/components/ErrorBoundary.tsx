import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onGoHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'حدث خطأ غير متوقع أثناء عرض هذه الصفحة.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('UI ErrorBoundary caught error:', error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="max-w-xl mx-auto my-10 p-6 sm:p-8 rounded-3xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 shadow-sm text-center space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">
            تعذر تحميل هذا القسم مؤقتاً
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            واجه التطبيق عطلاً فنياً بسيطاً أثناء عرض الصفحة. بياناتك محفوظة، ويمكنك إعادة المحاولة بلطف أو العودة للرئيسية.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة المحاولة</span>
            </button>
            {this.props.onGoHome && (
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, message: '' });
                  this.props.onGoHome?.();
                }}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>العودة للرئيسية</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
