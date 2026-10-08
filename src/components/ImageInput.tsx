import React, { useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon, ClipboardPaste } from 'lucide-react';

interface ImageInputProps {
  onImagesSelected: (images: { base64: string; mimeType: string }[]) => void;
  isLoading: boolean;
}

export default function ImageInput({ onImagesSelected, isLoading }: ImageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  const processFiles = async (files: File[]) => {
    const imagePromises = files.map(file => {
      return new Promise<{ base64: string; mimeType: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          const base64Data = base64.split(',')[1];
          resolve({ base64: base64Data, mimeType: file.type });
        };
        reader.readAsDataURL(file);
      });
    });

    const results = await Promise.all(imagePromises);
    onImagesSelected(results);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) files.push(blob);
      }
    }
    if (files.length > 0) processFiles(files);
  }, [onImagesSelected]);

  return (
    <div 
      onPaste={handlePaste}
      className="w-full"
    >
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center gap-4
          ${isLoading ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'bg-white border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30'}
        `}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*"
          multiple
          disabled={isLoading}
        />
        
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
          <Upload size={32} />
        </div>
        
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">
            {isLoading ? 'Đang phân tích các ảnh...' : 'Tải lên nhiều ảnh hoặc Dán ảnh SGK Hóa học'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Hỗ trợ chọn nhiều file JPG, PNG. Nhấn Ctrl+V để dán.
          </p>
        </div>

        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">
            <ImageIcon size={14} />
            <span>Upload</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">
            <ClipboardPaste size={14} />
            <span>Paste</span>
          </div>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-indigo-600 font-medium animate-pulse">AI đang làm việc...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
