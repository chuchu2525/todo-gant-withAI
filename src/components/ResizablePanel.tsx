import React, { useState, useRef, useEffect } from 'react';

interface ResizablePanelProps {
  children: React.ReactNode;
  direction: 'horizontal' | 'vertical';
  initialSize: number; // Percentage (0-100)
  minSize?: number; // Minimum size in pixels
  maxSize?: number; // Maximum size in pixels
  onResize?: (newSize: number) => void;
  className?: string;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  direction,
  initialSize,
  minSize = 300,
  maxSize = 80,
  onResize,
  className = ''
}) => {
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    startSize.current = size;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerSize = direction === 'horizontal' ? containerRect.width : containerRect.height;
    const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPos - startPos.current;
    const deltaPercentage = (delta / containerSize) * 100;
    
    let newSize = startSize.current + deltaPercentage;
    
    // Apply constraints
    const minSizePercentage = (minSize / containerSize) * 100;
    const maxSizePercentage = maxSize;
    
    newSize = Math.max(minSizePercentage, Math.min(maxSizePercentage, newSize));
    
    setSize(newSize);
    onResize?.(newSize);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  const panelStyle = {
    [direction === 'horizontal' ? 'width' : 'height']: `${size}%`,
    minWidth: direction === 'horizontal' ? `${minSize}px` : undefined,
    minHeight: direction === 'vertical' ? `${minSize}px` : undefined,
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={panelStyle}
    >
      {children}
      
      {/* Resize Handle */}
      <div
        className={`absolute bg-slate-600 hover:bg-slate-500 transition-colors duration-200 cursor-${direction === 'horizontal' ? 'col' : 'row'}-resize z-10
          ${direction === 'horizontal' 
            ? 'right-0 top-0 w-1 h-full hover:w-2' 
            : 'bottom-0 left-0 w-full h-1 hover:h-2'
          }
          ${isDragging ? 'bg-sky-500' : ''}
        `}
        onMouseDown={handleMouseDown}
        style={{
          [direction === 'horizontal' ? 'right' : 'bottom']: '-2px',
        }}
      >
        {/* Visual indicator */}
        <div
          className={`absolute bg-slate-400 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200
            ${direction === 'horizontal' 
              ? 'left-1/2 top-1/2 w-1 h-8 -translate-x-1/2 -translate-y-1/2' 
              : 'left-1/2 top-1/2 w-8 h-1 -translate-x-1/2 -translate-y-1/2'
            }
            ${isDragging ? 'opacity-100 bg-sky-400' : ''}
          `}
        />
      </div>
    </div>
  );
};