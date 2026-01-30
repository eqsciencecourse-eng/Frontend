'use client';

import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';

// Define our own props interface to strictly control what we accept
// and avoid conflicting with Recharts' types if they are problematic.
interface SafeResponsiveContainerProps {
    children: React.ReactNode;
    width?: string | number;
    height?: string | number;
    minHeight?: string | number;
    minWidth?: string | number;
    aspect?: number;
    debounce?: number;
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
}

/**
 * SafeResponsiveContainer
 * 
 * A robust wrapper that replaces Recharts' ResponsiveContainer.
 * 
 * CORE FIX FOR "LANES" / "PENDINGLANES" ERRORS:
 * 1. ZERO layout reflows during React's commit phase.
 * 2. Dimensions are updated via setTimeout(..., 100) to strictly decouple 
 *    the measurement from the render cycle.
 * 3. Prevents "ResizeObserver loop limit exceeded" by using a passive listener.
 */
export const SafeResponsiveContainer = ({
    children,
    width = '100%',
    height = '100%',
    minHeight,
    minWidth,
    id,
    className,
    style: propStyle,
    debounce = 100, // Default debounce to prevent rapid firing
    ...props
}: SafeResponsiveContainerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Use useLayoutEffect to attach observer early, but update state late
    useLayoutEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            // Clear any pending update
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // DECOUPLE: Update state in the next tick (or after debounce)
            // This ensures we are NOT in the middle of a React commit/layout phase.
            timeoutRef.current = setTimeout(() => {
                // Pre-check if component is still mounted usually handled by closure cleanup, 
                // but explicit ref check is safer if debounce > 0
                if (!containerRef.current) return;

                const { width, height } = entry.contentRect;

                // Only update if dimensions have materially changed
                setDimensions(prev => {
                    if (prev &&
                        Math.abs(prev.width - width) < 2 &&
                        Math.abs(prev.height - height) < 2) {
                        return prev;
                    }
                    return { width, height };
                });
            }, debounce);
        });

        observer.observe(element);

        return () => {
            observer.disconnect();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [debounce]);

    const containerStyle: React.CSSProperties = {
        width: width as string | number,
        height: height as string | number,
        minWidth: minWidth as string | number,
        minHeight: minHeight as string | number,
        ...propStyle
    };

    return (
        <div ref={containerRef} style={containerStyle} className={className} id={id}>
            {dimensions && dimensions.width > 0 && dimensions.height > 0 ? (
                // Clone the child and inject calculated dimensions
                React.Children.map(children, (child) => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child as React.ReactElement<any>, {
                            width: dimensions.width,
                            height: dimensions.height,
                        });
                    }
                    return child;
                })
            ) : (
                <div style={{ width: '100%', height: '100%', minHeight: 200 }} />
            )}
        </div>
    );
};
