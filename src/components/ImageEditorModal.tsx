'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop as CropIcon,
  Check,
  X,
  RotateCcw as ResetIcon,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { ImageItem } from '@/types';

interface ImageEditorModalProps {
  image: ImageItem | null;
  currentIndex: number;
  totalImages: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: ImageItem) => void;
  onNavigate?: (index: number) => void;
}

type AspectRatioPreset = 'free' | '1:1' | 'a4-portrait' | 'a4-landscape' | '4:3' | '16:9';
type FilterType = 'none' | 'grayscale' | 'bw' | 'contrast';

export default function ImageEditorModal({
  image,
  currentIndex,
  totalImages,
  isOpen,
  onClose,
  onSave,
  onNavigate,
}: ImageEditorModalProps) {
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [filter, setFilter] = useState<FilterType>('none');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>('free');

  // Crop box coordinates in percentage (0 to 100) relative to current rotated image view
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });

  const [isDraggingCrop, setIsDraggingCrop] = useState<string | null>(null); // 'move', 'nw', 'ne', 'sw', 'se'
  const [dragStart, setDragStart] = useState<{ x: number; y: number; box: typeof cropBox }>({
    x: 0,
    y: 0,
    box: { x: 0, y: 0, width: 100, height: 100 },
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'crop' | 'rotate' | 'adjust'>('crop');

  // Load state when current image changes
  useEffect(() => {
    if (image) {
      setRotation(image.rotation || 0);
      setFlipH(image.flipHorizontal || false);
      setFlipV(image.flipVertical || false);
      setBrightness(image.brightness ?? 100);
      setContrast(image.contrast ?? 100);
      setFilter(image.filter || 'none');
      setCropBox({ x: 0, y: 0, width: 100, height: 100 });
      setAspectRatio('free');
    }
  }, [image]);

  if (!isOpen || !image) return null;

  const handleRotate = (angleDelta: number) => {
    setRotation((prev) => (prev + angleDelta + 360) % 360);
    // Reset crop on rotate to keep boundaries clean
    setCropBox({ x: 0, y: 0, width: 100, height: 100 });
  };

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setFilter('none');
    setAspectRatio('free');
    setCropBox({ x: 0, y: 0, width: 100, height: 100 });
  };

  const setPresetRatio = (ratio: AspectRatioPreset) => {
    setAspectRatio(ratio);
    if (ratio === 'free') {
      return;
    }

    let targetRatio = 1; // width / height
    if (ratio === '1:1') targetRatio = 1;
    if (ratio === 'a4-portrait') targetRatio = 1 / 1.4142;
    if (ratio === 'a4-landscape') targetRatio = 1.4142;
    if (ratio === '4:3') targetRatio = 4 / 3;
    if (ratio === '16:9') targetRatio = 16 / 9;

    let w = 80;
    let h = w / targetRatio;
    if (h > 90) {
      h = 90;
      w = h * targetRatio;
    }
    const x = Math.max(0, (100 - w) / 2);
    const y = Math.max(0, (100 - h) / 2);
    setCropBox({ x, y, width: w, height: h });
  };

  // Mouse & Touch handling for crop box
  const handlePointerDown = (handle: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingCrop(handle);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      box: { ...cropBox },
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingCrop || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    let { x, y, width, height } = dragStart.box;

    if (isDraggingCrop === 'move') {
      let newX = Math.max(0, Math.min(100 - width, x + deltaX));
      let newY = Math.max(0, Math.min(100 - height, y + deltaY));
      setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
    } else if (isDraggingCrop === 'se') {
      let newW = Math.max(15, Math.min(100 - x, width + deltaX));
      let newH = Math.max(15, Math.min(100 - y, height + deltaY));
      setCropBox((prev) => ({ ...prev, width: newW, height: newH }));
    } else if (isDraggingCrop === 'sw') {
      let newW = Math.max(15, Math.min(x + width, width - deltaX));
      let newX = Math.max(0, Math.min(x + width - 15, x + deltaX));
      let newH = Math.max(15, Math.min(100 - y, height + deltaY));
      setCropBox((prev) => ({ ...prev, x: newX, width: newW, height: newH }));
    } else if (isDraggingCrop === 'ne') {
      let newW = Math.max(15, Math.min(100 - x, width + deltaX));
      let newH = Math.max(15, Math.min(y + height, height - deltaY));
      let newY = Math.max(0, Math.min(y + height - 15, y + deltaY));
      setCropBox((prev) => ({ ...prev, y: newY, width: newW, height: newH }));
    } else if (isDraggingCrop === 'nw') {
      let newW = Math.max(15, Math.min(x + width, width - deltaX));
      let newX = Math.max(0, Math.min(x + width - 15, x + deltaX));
      let newH = Math.max(15, Math.min(y + height, height - deltaY));
      let newY = Math.max(0, Math.min(y + height - 15, y + deltaY));
      setCropBox({ x: newX, y: newY, width: newW, height: newH });
    }
  };

  const handlePointerUp = () => {
    setIsDraggingCrop(null);
  };

  // Render and apply changes to create a new processed image data URL
  const handleApply = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image.originalUrl;
    img.onload = () => {
      // Step 1: Handle rotation and flipping on offscreen canvas
      const rotateCanvas = document.createElement('canvas');
      const is90or270 = rotation === 90 || rotation === 270;
      rotateCanvas.width = is90or270 ? img.naturalHeight : img.naturalWidth;
      rotateCanvas.height = is90or270 ? img.naturalWidth : img.naturalHeight;

      const rCtx = rotateCanvas.getContext('2d');
      if (!rCtx) return;

      rCtx.save();
      rCtx.translate(rotateCanvas.width / 2, rotateCanvas.height / 2);
      rCtx.rotate((rotation * Math.PI) / 180);
      rCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      rCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      rCtx.restore();

      // Step 2: Handle crop
      const finalCanvas = document.createElement('canvas');
      const cropX = (cropBox.x / 100) * rotateCanvas.width;
      const cropY = (cropBox.y / 100) * rotateCanvas.height;
      const cropW = (cropBox.width / 100) * rotateCanvas.width;
      const cropH = (cropBox.height / 100) * rotateCanvas.height;

      finalCanvas.width = Math.max(1, Math.round(cropW));
      finalCanvas.height = Math.max(1, Math.round(cropH));

      const fCtx = finalCanvas.getContext('2d');
      if (!fCtx) return;

      // Apply brightness & contrast filters
      let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
      if (filter === 'grayscale') {
        filterString += ' grayscale(100%)';
      }
      fCtx.filter = filterString;

      fCtx.drawImage(
        rotateCanvas,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        finalCanvas.width,
        finalCanvas.height
      );

      // Handle pure black & white (document mode) via ImageData
      if (filter === 'bw') {
        const imgData = fCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Binarize threshold (128)
          const bwVal = v >= 128 ? 255 : 0;
          data[i] = bwVal;
          data[i + 1] = bwVal;
          data[i + 2] = bwVal;
        }
        fCtx.putImageData(imgData, 0, 0);
      }

      const newProcessedUrl = finalCanvas.toDataURL('image/jpeg', 0.95);

      onSave({
        ...image,
        processedUrl: newProcessedUrl,
        width: finalCanvas.width,
        height: finalCanvas.height,
        rotation,
        flipHorizontal: flipH,
        flipVertical: flipV,
        brightness,
        contrast,
        filter,
      });

      onClose();
    };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="relative flex flex-col w-full max-w-5xl h-[92vh] max-h-[850px] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm sm:text-base text-slate-100 flex items-center gap-2">
              <CropIcon className="w-5 h-5 text-indigo-400" />
              Edit Image - Page {currentIndex + 1} of {totalImages}
            </span>
            <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 truncate max-w-[200px]">
              {image.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick pagination through images */}
            {onNavigate && totalImages > 1 && (
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <button
                  onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 rounded transition"
                  title="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs px-2 text-slate-300 font-medium">
                  {currentIndex + 1} / {totalImages}
                </span>
                <button
                  onClick={() => onNavigate(Math.min(totalImages - 1, currentIndex + 1))}
                  disabled={currentIndex === totalImages - 1}
                  className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 rounded transition"
                  title="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={handleReset}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              title="Reset changes"
            >
              <ResetIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
              title="Close editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Workspace (Image Preview + Crop Box) */}
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center p-4 overflow-hidden select-none">
          <div
            ref={containerRef}
            className="relative inline-block max-w-full max-h-full transition-transform duration-200"
            style={{
              transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
            }}
          >
            {/* Base Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.originalUrl}
              alt="Edit preview"
              className="max-h-[50vh] sm:max-h-[60vh] max-w-full object-contain rounded shadow-lg pointer-events-none"
              style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%) ${
                  filter === 'grayscale' ? 'grayscale(100%)' : ''
                }`,
              }}
            />

            {/* Interactive Crop Overlay */}
            {activeTab === 'crop' && (
              <div
                className="absolute border-2 border-indigo-500 bg-indigo-500/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] cursor-move"
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.width}%`,
                  height: `${cropBox.height}%`,
                }}
                onPointerDown={(e) => handlePointerDown('move', e)}
              >
                {/* Rule of thirds grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  <div className="border-r border-b border-indigo-400/30" />
                  <div className="border-r border-b border-indigo-400/30" />
                  <div className="border-b border-indigo-400/30" />
                  <div className="border-r border-b border-indigo-400/30" />
                  <div className="border-r border-b border-indigo-400/30" />
                  <div className="border-b border-indigo-400/30" />
                  <div className="border-r border-indigo-400/30" />
                  <div className="border-r border-indigo-400/30" />
                  <div />
                </div>

                {/* Handles */}
                <div
                  className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nw-resize shadow hover:scale-125 transition"
                  onPointerDown={(e) => handlePointerDown('nw', e)}
                />
                <div
                  className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-ne-resize shadow hover:scale-125 transition"
                  onPointerDown={(e) => handlePointerDown('ne', e)}
                />
                <div
                  className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-sw-resize shadow hover:scale-125 transition"
                  onPointerDown={(e) => handlePointerDown('sw', e)}
                />
                <div
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-se-resize shadow hover:scale-125 transition"
                  onPointerDown={(e) => handlePointerDown('se', e)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Toolbar & Tabs */}
        <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4">
          {/* Tab selector */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              onClick={() => setActiveTab('crop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'crop'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <CropIcon className="w-4 h-4" /> Crop & Aspect Ratio
            </button>
            <button
              onClick={() => setActiveTab('rotate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'rotate'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <RotateCw className="w-4 h-4" /> Rotate & Flip
            </button>
            <button
              onClick={() => setActiveTab('adjust')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'adjust'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Sliders className="w-4 h-4" /> Filters & Lighting
            </button>
          </div>

          {/* Sub Toolbar Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 min-h-[50px]">
            {/* Tab: Crop Presets */}
            {activeTab === 'crop' && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs text-slate-400 mr-1">Presets:</span>
                {(
                  [
                    { id: 'free', label: 'Free' },
                    { id: '1:1', label: '1:1 Square' },
                    { id: 'a4-portrait', label: 'A4 Portrait' },
                    { id: 'a4-landscape', label: 'A4 Landscape' },
                    { id: '4:3', label: '4:3' },
                    { id: '16:9', label: '16:9' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setPresetRatio(preset.id)}
                    className={`px-2.5 py-1 rounded text-xs transition ${
                      aspectRatio === preset.id
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-transparent'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Rotate & Flip */}
            {activeTab === 'rotate' && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleRotate(-90)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700"
                >
                  <RotateCcw className="w-4 h-4" /> Rotate Left (-90°)
                </button>
                <button
                  onClick={() => handleRotate(90)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700"
                >
                  <RotateCw className="w-4 h-4" /> Rotate Right (+90°)
                </button>
                <button
                  onClick={() => setFlipH((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    flipH
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <FlipHorizontal className="w-4 h-4" /> Flip Horizontal
                </button>
                <button
                  onClick={() => setFlipV((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    flipV
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <FlipVertical className="w-4 h-4" /> Flip Vertical
                </button>
                <span className="text-xs text-indigo-400 font-semibold ml-2">
                  Current: {rotation}°
                </span>
              </div>
            )}

            {/* Tab: Filters & Lighting */}
            {activeTab === 'adjust' && (
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Filter buttons */}
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      { id: 'none', label: 'Normal' },
                      { id: 'bw', label: 'Doc B&W' },
                      { id: 'grayscale', label: 'Grayscale' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`px-2.5 py-1 rounded text-xs transition ${
                        filter === f.id
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Brightness slider */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Brightness</span>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-20 accent-indigo-500"
                  />
                </div>

                {/* Contrast slider */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Contrast</span>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-20 accent-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons: Cancel & Apply */}
            <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end pt-2 sm:pt-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/30 transition"
              >
                <Check className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

