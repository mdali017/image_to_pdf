'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileImage,
  ArrowUpDown,
  Trash2,
  Plus,
  ShieldCheck,
  Zap,
  Smartphone,
  Sparkles,
  FileDown,
  RotateCw,
  Sliders,
  CheckCircle,
} from 'lucide-react';
import { ImageItem, PdfSettings } from '@/types';
import ImageCard from '@/components/ImageCard';
import ImageEditorModal from '@/components/ImageEditorModal';
import PdfSettingsBar from '@/components/PdfSettingsBar';
import { generatePdf, downloadBlob } from '@/utils/pdfGenerator';

export default function Home() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [settings, setSettings] = useState<PdfSettings>({
    pageSize: 'a4',
    orientation: 'auto',
    margin: 'none',
    quality: 'medium',
    fileName: 'document',
  });

  // Editor Modal state
  const [editingImage, setEditingImage] = useState<ImageItem | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle files selection
  const handleFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((file) =>
      file.type.startsWith('image/')
    );

    if (validFiles.length === 0) return;

    const newItems: ImageItem[] = validFiles.map((file) => {
      const url = URL.createObjectURL(file);
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        originalUrl: url,
        processedUrl: url,
        width: 0,
        height: 0,
        rotation: 0,
        brightness: 100,
        contrast: 100,
        filter: 'none',
      };
    });

    setImages((prev) => [...prev, ...newItems]);
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Reorder images
  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    setImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  };

  // Drag & drop handlers for reordering items
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropItem = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    handleMove(draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  // Quick 90 deg rotate right on a card
  const handleQuickRotate = (id: string) => {
    setImages((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const nextRotation = ((item.rotation || 0) + 90) % 360;

        // Render to canvas to update processedUrl
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = item.originalUrl;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const is90or270 = nextRotation === 90 || nextRotation === 270;
          canvas.width = is90or270 ? img.naturalHeight : img.naturalWidth;
          canvas.height = is90or270 ? img.naturalWidth : img.naturalHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((nextRotation * Math.PI) / 180);
          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

          const updatedUrl = canvas.toDataURL('image/jpeg', 0.95);
          setImages((current) =>
            current.map((curr) =>
              curr.id === id
                ? {
                    ...curr,
                    rotation: nextRotation,
                    processedUrl: updatedUrl,
                  }
                : curr
            )
          );
        };

        return { ...item, rotation: nextRotation };
      })
    );
  };

  // Delete single image
  const handleDeleteImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.originalUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.originalUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  // Reverse image order
  const handleReverseOrder = () => {
    setImages((prev) => [...prev].reverse());
  };

  // Sort by filename
  const handleSortByName = () => {
    setImages((prev) =>
      [...prev].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )
    );
  };

  // Clear all images
  const handleClearAll = () => {
    if (images.length === 0) return;
    if (confirm('Are you sure you want to remove all images?')) {
      images.forEach((i) => {
        if (i.originalUrl.startsWith('blob:')) URL.revokeObjectURL(i.originalUrl);
      });
      setImages([]);
    }
  };

  // Open editor modal
  const handleOpenEditor = (item: ImageItem, index: number) => {
    setEditingImage(item);
    setEditingIndex(index);
  };

  // Save changes from editor modal
  const handleSaveEditor = (updatedItem: ImageItem) => {
    setImages((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
    setEditingImage(updatedItem);
  };

  // Navigate through images inside editor
  const handleNavigateEditor = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < images.length) {
      setEditingIndex(newIndex);
      setEditingImage(images[newIndex]);
    }
  };

  // Generate PDF
  const handleGeneratePdf = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);
    setProgress({ current: 0, total: images.length });

    try {
      const blob = await generatePdf(images, settings, (current, total) => {
        setProgress({ current, total });
      });

      setGeneratedPdfBlob(blob);
      setShowSuccessModal(true);

      // Trigger direct download
      const filename = settings.fileName.trim() || 'document';
      downloadBlob(blob, filename);
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Failed to generate PDF. Please check that images are valid.');
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Main App Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-2">
                Image to PDF
                <span className="hidden sm:inline-block text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                  Client-Side Pro
                </span>
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Convert 30-40+ photos into high quality PDF with Crop, Rotate & Page Reorder
              </p>
            </div>
          </div>

          {/* Quick Badges / Header CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            {images.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <FileImage className="w-3.5 h-3.5" />
                {images.length} {images.length === 1 ? 'Page' : 'Pages'}
              </span>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>{images.length === 0 ? 'Upload Images' : 'Add Photos'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* If no images uploaded yet -> Hero Upload Zone */}
        {images.length === 0 ? (
          <div className="max-w-3xl mx-auto mt-6 sm:mt-12 space-y-6">
            {/* Big Drag and Drop Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropFiles}
              onClick={() => fileInputRef.current?.click()}
              className="group relative border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/20 rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-200 shadow-sm hover:shadow-lg flex flex-col items-center justify-center gap-4"
            >
              <div className="w-20 h-20 rounded-2xl bg-indigo-50 group-hover:scale-110 group-hover:bg-indigo-100/80 text-indigo-600 flex items-center justify-center transition-all duration-200 shadow-inner">
                <UploadCloud className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                  Select or Drag & Drop Images Here
                </h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Easily upload 30 to 40+ photos at once from your phone or laptop. Supports JPG,
                  PNG, WebP & GIF.
                </p>
              </div>

              <button
                type="button"
                className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition"
              >
                <Plus className="w-4 h-4" />
                Browse 30-40 Images
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">100% Private & Safe</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Images never leave your phone or laptop. All processing runs locally in browser.
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">Lightning Fast</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Zero upload waiting time. Convert 40 large camera photos into PDF in seconds.
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">Phone & Laptop Ready</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Touch drag-and-drop reordering, interactive image crop & 90° rotation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* When Images are uploaded */
          <div className="space-y-5">
            {/* Top Toolbar: Settings & PDF Actions */}
            <PdfSettingsBar
              settings={settings}
              onChangeSettings={setSettings}
              totalImages={images.length}
              onGenerate={handleGeneratePdf}
              isGenerating={isGenerating}
              onAddMore={() => fileInputRef.current?.click()}
              onClearAll={handleClearAll}
            />

            {/* Quick Action Utilities: Reverse, Sort, Instructions */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Pages ({images.length}):
                </span>
                <span className="text-xs text-slate-400">
                  Drag cards or use arrows / page numbers to arrange page order
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReverseOrder}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                  title="Reverse page order (e.g. last image becomes page 1)"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reverse Order</span>
                </button>

                <button
                  onClick={handleSortByName}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                  title="Sort images by filename alphabetically"
                >
                  <span>Sort A-Z</span>
                </button>
              </div>
            </div>

            {/* Responsive Grid of Images */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {images.map((item, index) => (
                <ImageCard
                  key={item.id}
                  item={item}
                  index={index}
                  total={images.length}
                  onMove={handleMove}
                  onEdit={handleOpenEditor}
                  onQuickRotate={handleQuickRotate}
                  onDelete={handleDeleteImage}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDropItem}
                  isDragging={draggedIndex === index}
                />
              ))}

              {/* Add More Card at end of grid */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group aspect-[3/4] border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/20 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 text-slate-400 hover:text-indigo-600 shadow-2xs"
              >
                <div className="p-3 rounded-full bg-slate-100 group-hover:bg-indigo-100 group-hover:scale-110 transition">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold">Add More</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Progress Overlay Modal during PDF Generation */}
      {isGenerating && progress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto animate-pulse">
              <FileDown className="w-6 h-6 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-lg">Generating Your PDF</h3>
              <p className="text-xs text-slate-500">
                Compiling page {progress.current} of {progress.total}...
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-200"
                style={{
                  width: `${Math.round((progress.current / progress.total) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Success Modal after download */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-xl">PDF Generated Successfully!</h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Your PDF with {images.length} pages has been downloaded to your device.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {generatedPdfBlob && (
                <button
                  onClick={() => {
                    const filename = settings.fileName.trim() || 'document';
                    downloadBlob(generatedPdfBlob, filename);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  <FileDown className="w-4 h-4" /> Download Again
                </button>
              )}

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop & Rotate Editor Modal */}
      <ImageEditorModal
        image={editingImage}
        currentIndex={editingIndex}
        totalImages={images.length}
        isOpen={editingIndex !== -1 && editingImage !== null}
        onClose={() => {
          setEditingImage(null);
          setEditingIndex(-1);
        }}
        onSave={handleSaveEditor}
        onNavigate={handleNavigateEditor}
      />
    </div>
  );
}
