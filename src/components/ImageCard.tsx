'use client';

import React, { useState } from 'react';
import {
  GripVertical,
  RotateCw,
  Crop,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import { ImageItem } from '@/types';

interface ImageCardProps {
  item: ImageItem;
  index: number;
  total: number;
  onMove: (fromIndex: number, toIndex: number) => void;
  onEdit: (item: ImageItem, index: number) => void;
  onQuickRotate: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isDragging?: boolean;
}

export default function ImageCard({
  item,
  index,
  total,
  onMove,
  onEdit,
  onQuickRotate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: ImageCardProps) {
  const [targetPage, setTargetPage] = useState<string>('');
  const [showJumpInput, setShowJumpInput] = useState(false);

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(targetPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= total) {
      onMove(index, pageNum - 1);
      setShowJumpInput(false);
      setTargetPage('');
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      className={`group relative bg-white rounded-xl border transition-all duration-200 flex flex-col overflow-hidden shadow-sm hover:shadow-md ${
        isDragging
          ? 'opacity-40 border-dashed border-indigo-400 scale-95'
          : 'border-slate-200 hover:border-indigo-300'
      }`}
    >
      {/* Top Header with Page Badge and Quick Actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <div
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-0.5 rounded"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Page Badge */}
          {showJumpInput ? (
            <form onSubmit={handleJumpPage} className="flex items-center gap-1">
              <span className="text-xs text-slate-500">To:</span>
              <input
                type="number"
                min="1"
                max={total}
                autoFocus
                value={targetPage}
                onChange={(e) => setTargetPage(e.target.value)}
                onBlur={() => setShowJumpInput(false)}
                className="w-12 px-1.5 py-0.5 text-xs border border-indigo-400 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="#"
              />
            </form>
          ) : (
            <button
              onClick={() => {
                setShowJumpInput(true);
                setTargetPage(String(index + 1));
              }}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
              title="Click to jump to another page #"
            >
              Page {index + 1}
            </button>
          )}
        </div>

        {/* Reordering Chevron Buttons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
            className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:hover:text-slate-400 transition rounded"
            title="Move left (previous page)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMove(index, index + 1)}
            disabled={index === total - 1}
            className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:hover:text-slate-400 transition rounded"
            title="Move right (next page)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image Preview Container */}
      <div
        onClick={() => onEdit(item, index)}
        className="relative aspect-[3/4] bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer group/img"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.processedUrl || item.originalUrl}
          alt={item.name}
          className="w-full h-full object-contain p-2 transition-transform duration-200 group-hover/img:scale-105"
        />

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-indigo-900/30 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center gap-2 text-white text-xs font-semibold backdrop-blur-[1px]">
          <Maximize2 className="w-4 h-4" />
          <span>Click to Edit / Crop</span>
        </div>

        {/* Rotation indicator if rotated */}
        {item.rotation > 0 && (
          <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
            {item.rotation}°
          </span>
        )}
      </div>

      {/* Footer Info and Tool Buttons */}
      <div className="p-2.5 flex items-center justify-between gap-1 border-t border-slate-100 bg-white">
        <span
          className="text-xs text-slate-500 truncate max-w-[110px]"
          title={item.name}
        >
          {item.name}
        </span>

        <div className="flex items-center gap-1">
          {/* Quick rotate button */}
          <button
            onClick={() => onQuickRotate(item.id)}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            title="Quick rotate 90° clockwise"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Edit / Crop modal button */}
          <button
            onClick={() => onEdit(item, index)}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            title="Open editor (Crop, Rotate, Filters)"
          >
            <Crop className="w-3.5 h-3.5" />
          </button>

          {/* Delete button */}
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Remove image"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

