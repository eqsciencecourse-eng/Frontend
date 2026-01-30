'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
                    <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
                        <div className="mx-auto h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            We apologize for the inconvenience. The application has encountered an unexpected error.
                        </p>
                        <div className="bg-gray-100 dark:bg-slate-900 p-4 rounded text-left mb-6 overflow-auto max-h-40">
                            <code className="text-xs text-red-500 font-mono">
                                {this.state.error?.toString()}
                            </code>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="outline"
                                onClick={() => window.location.reload()}
                            >
                                Reload Page
                            </Button>
                            <Button
                                onClick={() => this.setState({ hasError: false, error: null })}
                            >
                                Try Again
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
