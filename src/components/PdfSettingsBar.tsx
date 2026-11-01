'use client';

import React from 'react';
import {
  FileText,
  SlidersHorizontal,
  Download,
  Plus,
  Trash2,
  FileCheck,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { PdfSettings, PageSizeOption, OrientationOption, MarginOption, QualityOption } from '@/types';

interface PdfSettingsBarProps {
  settings: PdfSettings;
  onChangeSettings: (newSettings: PdfSettings) => void;
  totalImages: number;
  onGenerate: () => void;
  isGenerating: boolean;
  onAddMore: () => void;
  onClearAll: () => void;
}

export default function PdfSettingsBar({
  settings,
  onChangeSettings,
  totalImages,
  onGenerate,
  isGenerating,
  onAddMore,
  onClearAll,
}: PdfSettingsBarProps) {
  const updateSetting = <K extends keyof PdfSettings>(key: K, value: PdfSettings[K]) => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Settings Group */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Page Size */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Page Size
            </label>
            <select
              value={settings.pageSize}
              onChange={(e) => updateSetting('pageSize', e.target.value as PageSizeOption)}
              className="px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="a4">A4 (Standard)</option>
              <option value="letter">Letter (US)</option>
              <option value="legal">Legal</option>
              <option value="fit">Fit to Image</option>
            </select>
          </div>

          {/* Orientation */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Orientation
            </label>
            <select
              value={settings.orientation}
              onChange={(e) => updateSetting('orientation', e.target.value as OrientationOption)}
              className="px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="auto">Auto (Smart Match)</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>

          {/* Margins */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Margin
            </label>
            <select
              value={settings.margin}
              onChange={(e) => updateSetting('margin', e.target.value as MarginOption)}
              className="px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="none">No Margin (Full Bleed)</option>
              <option value="small">Small Margin</option>
              <option value="normal">Normal Margin</option>
            </select>
          </div>

          {/* Quality */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Quality / Size
            </label>
            <select
              value={settings.quality}
              onChange={(e) => updateSetting('quality', e.target.value as QualityOption)}
              className="px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="high">High Quality</option>
              <option value="medium">Balanced (Recommended)</option>
              <option value="low">Small File Size</option>
            </select>
          </div>

          {/* File Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              File Name
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={settings.fileName}
                onChange={(e) => updateSetting('fileName', e.target.value)}
                placeholder="document"
                className="w-36 sm:w-44 px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-l-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="px-2 py-1.5 text-xs bg-slate-200 text-slate-600 rounded-r-lg font-mono">
                .pdf
              </span>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 justify-end">
          <button
            onClick={onAddMore}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition"
            title="Add more photos"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add More</span>
          </button>

          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
            title="Clear all images"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear All</span>
          </button>

          {/* Big Generate PDF Button */}
          <button
            onClick={onGenerate}
            disabled={isGenerating || totalImages === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-indigo-600/25 transition active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Generate PDF ({totalImages})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

