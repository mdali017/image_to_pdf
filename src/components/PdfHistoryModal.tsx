'use client';

import React, { useState } from 'react';
import {
  History,
  X,
  FileText,
  Download,
  Eye,
  Trash2,
  Calendar,
  Layers,
  HardDrive,
  Search,
  AlertCircle,
} from 'lucide-react';
import { PdfHistoryItem } from '@/types';
import { formatBytes, formatDate } from '@/utils/historyDb';
import { downloadBlob } from '@/utils/pdfGenerator';

interface PdfHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: PdfHistoryItem[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onViewPdf: (item: PdfHistoryItem) => void;
}

export default function PdfHistoryModal({
  isOpen,
  onClose,
  history,
  onDelete,
  onClearAll,
  onViewPdf,
}: PdfHistoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) =>
    item.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-3xl h-[88vh] max-h-[750px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">Generated PDFs</h2>
              <p className="text-xs text-slate-400">
                {history.length} {history.length === 1 ? 'document' : 'documents'} saved locally in browser
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete all saved PDFs from history?')) {
                    onClearAll();
                  }
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                title="Clear all generated PDFs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {history.length > 0 && (
          <div className="p-3 sm:px-5 bg-slate-50 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search PDF by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {history.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-lg">No PDFs Generated Yet</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
                  When you convert your images into a PDF, they will automatically be saved here so you can view, re-download, or delete them anytime.
                </p>
              </div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No PDFs found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            /* History List */
            <div className="space-y-3">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="group relative bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-3 sm:p-4 shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Thumbnail preview */}
                    <div
                      onClick={() => onViewPdf(item)}
                      className="w-12 h-16 sm:w-14 sm:h-18 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center cursor-pointer group-hover:scale-105 transition shadow-2xs"
                    >
                      {item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.thumbnailUrl}
                          alt="First page"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-6 h-6 text-emerald-600" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <h4
                        onClick={() => onViewPdf(item)}
                        className="font-bold text-sm sm:text-base text-slate-800 hover:text-emerald-600 cursor-pointer truncate transition"
                        title={item.fileName}
                      >
                        {item.fileName.endsWith('.pdf') ? item.fileName : `${item.fileName}.pdf`}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {item.pageCount} {item.pageCount === 1 ? 'Page' : 'Pages'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                          {formatBytes(item.fileSize)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                    {/* View / Preview */}
                    <button
                      onClick={() => onViewPdf(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg text-xs font-semibold transition"
                      title="Preview PDF"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    {/* Download */}
                    <button
                      onClick={() => downloadBlob(item.pdfBlob, item.fileName)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${item.fileName}" from history?`)) {
                          onDelete(item.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete from history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        {history.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-emerald-600" />
              All PDFs are stored securely on your device.
            </span>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete all saved PDFs from history?')) {
                  onClearAll();
                }
              }}
              className="sm:hidden text-red-500 font-medium"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

