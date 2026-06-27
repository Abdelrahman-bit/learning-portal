'use client';

import { X, ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ReactNode, useEffect } from 'react';

interface ZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function ZoomModal({ isOpen, onClose, children }: ZoomModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full h-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur transition-colors"
        >
          <X size={24} />
        </button>

        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={8}
          centerOnInit={true}
        >
          {({ zoomIn, zoomOut, resetTransform, centerView }) => (
            <>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/10 p-2 rounded-full backdrop-blur text-white shadow-xl border border-white/20">
                <button 
                  onClick={() => zoomIn()} 
                  className="p-3 hover:bg-white/20 rounded-full transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={20} />
                </button>
                <button 
                  onClick={() => zoomOut()} 
                  className="p-3 hover:bg-white/20 rounded-full transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={20} />
                </button>
                <div className="w-[1px] h-6 bg-white/30 mx-1" />
                <button 
                  onClick={() => resetTransform()} 
                  className="p-3 hover:bg-white/20 rounded-full transition-colors"
                  title="Reset"
                >
                  <RotateCcw size={20} />
                </button>
                <button 
                  onClick={() => centerView()} 
                  className="p-3 hover:bg-white/20 rounded-full transition-colors"
                  title="Center"
                >
                  <Maximize size={20} />
                </button>
              </div>

              <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl cursor-grab active:cursor-grabbing">
                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                  <div className="max-w-[90vw] max-h-[90vh]">
                    {children}
                  </div>
                </TransformComponent>
              </div>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
}
