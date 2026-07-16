'use client';

import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Move, Check } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCrop: (croppedFile: File) => void;
}

export default function ImageCropperModal({ isOpen, imageSrc, onClose, onCrop }: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [imgUrl, setImgUrl] = useState('');
  const [fitWidth, setFitWidth] = useState(0);
  const [fitHeight, setFitHeight] = useState(0);

  useEffect(() => {
    if (imageSrc) {
      setImgUrl(imageSrc);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    }
  }, [imageSrc]);

  useEffect(() => {
    if (imgUrl) {
      const img = new Image();
      img.src = imgUrl;
      img.onload = () => {
        const natW = img.naturalWidth;
        const natH = img.naturalHeight;
        // Fit image inside the 300x300 UI preview box
        const ratio = Math.min(300 / natW, 300 / natH);
        setFitWidth(natW * ratio);
        setFitHeight(natH * ratio);
      };
    }
  }, [imgUrl]);

  if (!isOpen || !imgUrl) return null;

  const handleCropAndSave = () => {
    const imgElement = document.getElementById('cropper-target-img') as HTMLImageElement;
    if (!imgElement || !fitWidth || !fitHeight) return;

    const natW = imgElement.naturalWidth;
    
    // Calculate scale multiplier based on the image's original natural resolution to preserve 100% quality
    // We set a minimum multiplier of 4 to keep even low-resolution uploads crisp on high-DPI screens.
    const scaleMultiplier = Math.max(4, natW / fitWidth);

    const canvasSize = 200 * scaleMultiplier;
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enable high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear canvas - transparent background by default
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    const dw = fitWidth * zoom * scaleMultiplier;
    const dh = fitHeight * zoom * scaleMultiplier;
    
    // dx and dy coordinates scaled up to the high-resolution canvas size
    const dx = ((300 - (fitWidth * zoom)) / 2 + offsetX - 50) * scaleMultiplier;
    const dy = ((300 - (fitHeight * zoom)) / 2 + offsetY - 50) * scaleMultiplier;

    ctx.drawImage(imgElement, dx, dy, dw, dh);

    // Convert canvas to blob as PNG to preserve transparent outer margins and high fidelity
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'cropped_avatar.png', { type: 'image/png' });
          onCrop(croppedFile);
        }
      },
      'image/png',
      1.0
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in text-left">
      <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-6 shadow-2xl relative">
        <button 
          onClick={onClose} 
          className="absolute right-4 top-4 text-slate-500 hover:bg-slate-105 p-1 rounded-lg transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-1">
          <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">Adjust & Crop Image</h3>
          <p className="text-[10px] text-slate-400">Zoom and align the photo to fit perfectly inside the profile circular avatar frame.</p>
        </div>

        {/* Circular Crop Frame Window - Exactly 300x300 px */}
        <div className="relative w-[300px] h-[300px] mx-auto bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border select-none relative">
          <div className="absolute h-[200px] w-[200px] rounded-full border-2 border-primary border-dashed z-20 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
          
          <img
            id="cropper-target-img"
            src={imgUrl}
            alt="Source avatar preview"
            style={{
              width: fitWidth ? `${fitWidth}px` : 'auto',
              height: fitHeight ? `${fitHeight}px` : 'auto',
              transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
              transition: 'transform 0.05s ease-out',
            }}
            className="object-contain pointer-events-none max-h-none max-w-none shrink-0"
          />
        </div>

        {/* Adjustments Panel Sliders */}
        <div className="space-y-4 text-xs font-bold text-slate-650 dark:text-slate-350">
          
          {/* Zoom Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
              <span className="flex items-center space-x-1">
                <ZoomOut className="h-3.5 w-3.5" />
                <span>Zoom Scale</span>
              </span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="4"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Horizontal Position X Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
              <span className="flex items-center space-x-1">
                <Move className="h-3.5 w-3.5" />
                <span>Move X (Horizontal)</span>
              </span>
              <span>{offsetX}px</span>
            </div>
            <input
              type="range"
              min="-150"
              max="150"
              step="1"
              value={offsetX}
              onChange={(e) => setOffsetX(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Vertical Position Y Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
              <span className="flex items-center space-x-1">
                <Move className="h-3.5 w-3.5 rotate-90" />
                <span>Move Y (Vertical)</span>
              </span>
              <span>{offsetY}px</span>
            </div>
            <input
              type="range"
              min="-150"
              max="150"
              step="1"
              value={offsetY}
              onChange={(e) => setOffsetY(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        {/* Actions Button */}
        <button
          onClick={handleCropAndSave}
          className="w-full py-3 bg-primary hover:bg-primary/95 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5"
        >
          <Check className="h-4 w-4" />
          <span>Apply Cropped Avatar</span>
        </button>
      </div>
    </div>
  );
}
