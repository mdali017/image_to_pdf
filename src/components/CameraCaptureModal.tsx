'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  SwitchCamera,
  Zap,
  ZapOff,
  Check,
  RotateCcw,
  CircleAlert,
  Focus,
  Aperture,
  ImagePlus,
  Shield,
  Sun,
} from 'lucide-react';
import {
  calculateSharpness,
  getBlurStatus,
  getBlurMessage,
  BlurStatus,
} from '@/utils/blurDetection';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string, fileName: string) => void;
}

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const analyzeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // Blur detection state
  const [blurStatus, setBlurStatus] = useState<BlurStatus>('very-blurry');
  const [sharpnessScore, setSharpnessScore] = useState(0);

  // Captured photo for review
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [captureCount, setCaptureCount] = useState(0);

  // Flash animation
  const [showFlash, setShowFlash] = useState(false);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setIsInitializing(true);
      setCameraError(null);

      // Stop any previous stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      setHasTorch(capabilities?.torch === true || false);

      setIsInitializing(false);
    } catch (err: any) {
      setIsInitializing(false);
      if (err.name === 'NotAllowedError') {
        setCameraError(
          'Camera permission denied. Please allow camera access in your browser settings.'
        );
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(`Camera error: ${err.message}`);
      }
    }
  }, [facingMode]);

  // Analyze sharpness at regular intervals
  const startBlurAnalysis = useCallback(() => {
    if (analyzeIntervalRef.current) {
      clearInterval(analyzeIntervalRef.current);
    }

    analyzeIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.paused) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Use a small canvas for performance
      canvas.width = 320;
      canvas.height = 240;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const score = calculateSharpness(canvas);
      setSharpnessScore(Math.round(score));
      setBlurStatus(getBlurStatus(score));
    }, 400); // Analyze every 400ms
  }, []);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
      return () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (analyzeIntervalRef.current) {
          clearInterval(analyzeIntervalRef.current);
          analyzeIntervalRef.current = null;
        }
      };
    }
  }, [isOpen, startCamera]);

  // Start blur analysis when camera is ready
  useEffect(() => {
    if (!isInitializing && !cameraError && isOpen) {
      startBlurAnalysis();
    }
    return () => {
      if (analyzeIntervalRef.current) {
        clearInterval(analyzeIntervalRef.current);
        analyzeIntervalRef.current = null;
      }
    };
  }, [isInitializing, cameraError, isOpen, startBlurAnalysis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (analyzeIntervalRef.current) {
        clearInterval(analyzeIntervalRef.current);
      }
    };
  }, []);

  // Toggle torch/flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
      setTorchOn(!torchOn);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Switch front/back camera
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture photo
  const handleCapture = () => {
    if (!videoRef.current) return;

    // Block capture if too blurry
    if (blurStatus === 'very-blurry') {
      return; // Don't capture
    }

    const video = videoRef.current;
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;

    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.92);

    // Flash effect
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    setCapturedPhoto(dataUrl);
  };

  // Accept captured photo
  const handleAccept = () => {
    if (!capturedPhoto) return;
    const count = captureCount + 1;
    setCaptureCount(count);
    const fileName = `camera-photo-${count}-${Date.now()}.jpg`;
    onCapture(capturedPhoto, fileName);
    setCapturedPhoto(null); // Go back to camera for next shot
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  // Close and cleanup
  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCapturedPhoto(null);
    setCaptureCount(0);
    onClose();
  };

  if (!isOpen) return null;

  // Status color based on blur level
  const statusColor =
    blurStatus === 'sharp'
      ? 'text-emerald-400'
      : blurStatus === 'acceptable'
        ? 'text-green-400'
        : blurStatus === 'blurry'
          ? 'text-yellow-400'
          : 'text-red-400';

  const statusBorderColor =
    blurStatus === 'sharp'
      ? 'border-emerald-400'
      : blurStatus === 'acceptable'
        ? 'border-green-400'
        : blurStatus === 'blurry'
          ? 'border-yellow-400'
          : 'border-red-400';

  const canCapture = blurStatus !== 'very-blurry';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Hidden canvas for blur analysis */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
        <button
          onClick={handleClose}
          className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-white text-sm">
            Document Camera
          </span>
          {captureCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
              {captureCount} captured
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full transition ${
                torchOn
                  ? 'text-yellow-400 bg-yellow-400/20'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle flashlight"
            >
              {torchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}
          <button
            onClick={switchCamera}
            className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition"
            title="Switch camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {/* Camera Error State */}
        {cameraError && (
          <div className="text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <CircleAlert className="w-8 h-8" />
            </div>
            <p className="text-white/80 text-sm max-w-xs mx-auto">{cameraError}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {isInitializing && !cameraError && (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin mx-auto" />
            <p className="text-white/60 text-sm">Starting camera...</p>
          </div>
        )}

        {/* Captured Photo Review */}
        {capturedPhoto && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedPhoto}
              alt="Captured"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}

        {/* Live Camera Feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${capturedPhoto ? 'hidden' : ''}`}
        />

        {/* Flash Effect */}
        {showFlash && (
          <div className="absolute inset-0 bg-white z-30 animate-pulse" />
        )}

        {/* ===== GUIDE FRAME OVERLAY ===== */}
        {!capturedPhoto && !cameraError && !isInitializing && (
          <>
            {/* Dark overlay with transparent center (document frame) */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top dark strip */}
              <div className="absolute top-0 left-0 right-0 h-[12%] bg-black/50" />
              {/* Bottom dark strip */}
              <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-black/50" />
              {/* Left dark strip */}
              <div className="absolute top-[12%] left-0 w-[6%] bottom-[12%] bg-black/50" />
              {/* Right dark strip */}
              <div className="absolute top-[12%] right-0 w-[6%] bottom-[12%] bg-black/50" />
            </div>

            {/* Corner Brackets (the beautiful guide frame) */}
            <div className="absolute inset-0 pointer-events-none" style={{ padding: '12% 6%' }}>
              <div className="relative w-full h-full">
                {/* Top-Left Corner */}
                <div className={`absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] rounded-tl-lg ${statusBorderColor} transition-colors duration-300`} />
                {/* Top-Right Corner */}
                <div className={`absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] rounded-tr-lg ${statusBorderColor} transition-colors duration-300`} />
                {/* Bottom-Left Corner */}
                <div className={`absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] rounded-bl-lg ${statusBorderColor} transition-colors duration-300`} />
                {/* Bottom-Right Corner */}
                <div className={`absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] rounded-br-lg ${statusBorderColor} transition-colors duration-300`} />

                {/* Mid-edge tick marks for alignment guidance */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 border-t-[2px] ${statusBorderColor} opacity-50 transition-colors duration-300`} />
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 border-b-[2px] ${statusBorderColor} opacity-50 transition-colors duration-300`} />
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 border-l-[2px] ${statusBorderColor} opacity-50 transition-colors duration-300`} />
                <div className={`absolute right-0 top-1/2 -translate-y-1/2 h-8 border-r-[2px] ${statusBorderColor} opacity-50 transition-colors duration-300`} />

                {/* Center crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Focus className={`w-8 h-8 ${statusColor} opacity-40 transition-colors duration-300`} />
                </div>
              </div>
            </div>

            {/* Blur Status Indicator (top overlay) */}
            <div className="absolute top-[14%] left-1/2 -translate-x-1/2 z-10">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md text-xs font-semibold shadow-lg transition-all duration-300 ${
                blurStatus === 'sharp' || blurStatus === 'acceptable'
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30'
                  : blurStatus === 'blurry'
                    ? 'bg-yellow-900/60 text-yellow-300 border border-yellow-500/30'
                    : 'bg-red-900/60 text-red-300 border border-red-500/30 animate-pulse'
              }`}>
                {blurStatus === 'sharp' || blurStatus === 'acceptable' ? (
                  <Shield className="w-3.5 h-3.5" />
                ) : blurStatus === 'blurry' ? (
                  <Sun className="w-3.5 h-3.5" />
                ) : (
                  <CircleAlert className="w-3.5 h-3.5" />
                )}
                <span>{getBlurMessage(blurStatus)}</span>
              </div>
            </div>

            {/* Guide Text at bottom of frame area */}
            <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 z-10">
              <p className="text-white/50 text-[11px] text-center font-medium tracking-wide">
                Align your document within the frame
              </p>
            </div>
          </>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="relative z-10 bg-black/80 backdrop-blur-sm px-4 py-5 pb-8 sm:pb-5">
        {capturedPhoto ? (
          /* Review Controls */
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handleRetake}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition">
                <RotateCcw className="w-6 h-6 text-white" />
              </div>
              <span className="text-white/60 text-[11px] font-medium">Retake</span>
            </button>

            <button
              onClick={handleAccept}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 border-4 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-600/30 transition active:scale-95">
                <Check className="w-8 h-8 text-white" />
              </div>
              <span className="text-emerald-400 text-[11px] font-semibold">Use Photo</span>
            </button>

            <button
              onClick={() => {
                handleAccept();
                // Will go back to camera automatically for next shot
              }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition">
                <ImagePlus className="w-6 h-6 text-white" />
              </div>
              <span className="text-white/60 text-[11px] font-medium">Use & Next</span>
            </button>
          </div>
        ) : (
          /* Capture Controls */
          <div className="flex items-center justify-center gap-8">
            {/* Done button (if any captured) */}
            <div className="w-14 flex justify-center">
              {captureCount > 0 && (
                <button
                  onClick={handleClose}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center transition hover:bg-emerald-600/30">
                    <Check className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-emerald-400 text-[10px] font-semibold">Done</span>
                </button>
              )}
            </div>

            {/* Main Capture Button */}
            <button
              onClick={handleCapture}
              disabled={!canCapture || isInitializing || !!cameraError}
              className="group relative"
              title={canCapture ? 'Capture photo' : 'Image too blurry to capture'}
            >
              {/* Outer ring */}
              <div
                className={`w-[76px] h-[76px] rounded-full border-[4px] flex items-center justify-center transition-all duration-300 ${
                  canCapture
                    ? 'border-white hover:border-emerald-400'
                    : 'border-red-500/50 opacity-60'
                }`}
              >
                {/* Inner circle */}
                <div
                  className={`w-[62px] h-[62px] rounded-full transition-all duration-150 ${
                    canCapture
                      ? 'bg-white group-hover:bg-emerald-50 group-active:scale-90 group-active:bg-emerald-200'
                      : 'bg-red-900/40'
                  }`}
                >
                  {!canCapture && (
                    <div className="w-full h-full flex items-center justify-center">
                      <CircleAlert className="w-6 h-6 text-red-400" />
                    </div>
                  )}
                </div>
              </div>
            </button>

            {/* Sharpness meter */}
            <div className="w-14 flex flex-col items-center gap-1">
              <Aperture className={`w-5 h-5 ${statusColor} transition-colors`} />
              <div className="w-10 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    blurStatus === 'sharp' || blurStatus === 'acceptable'
                      ? 'bg-emerald-500'
                      : blurStatus === 'blurry'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, sharpnessScore / 1.2)}%` }}
                />
              </div>
              <span className="text-white/40 text-[10px] font-mono">{sharpnessScore}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

