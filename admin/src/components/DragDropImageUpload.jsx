import React, { useState, useRef } from 'react';

export default function DragDropImageUpload({ onFileSelect, required, label, recommendedSize, editing }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let targetWidth = img.width;
        let targetHeight = img.height;

        if (recommendedSize) {
          const match = recommendedSize.match(/(\d+)x(\d+)/);
          if (match) {
            targetWidth = parseInt(match[1], 10);
            targetHeight = parseInt(match[2], 10);
          }
        }

        // PREVENT UPSCALING: If original image is smaller than target, keep original dimensions
        if (img.width < targetWidth && img.height < targetHeight) {
          targetWidth = img.width;
          targetHeight = img.height;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        // Clear background with white (prevents black background for transparent PNGs converted to JPEG/WebP)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Calculate scaling to fit without trimming (object-fit: contain logic)
        const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const offsetX = (targetWidth - drawWidth) / 2;
        const offsetY = (targetHeight - drawHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // Export as WebP instead of AVIF. WebP is universally supported. AVIF falls back to massive PNGs!
        canvas.toBlob((blob) => {
          if (!blob) return;
          
          const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          const convertedFile = new File([blob], newFileName, { type: 'image/webp' });
          
          setFileName(newFileName);
          onFileSelect(convertedFile);
          setPreview(URL.createObjectURL(convertedFile));
        }, 'image/webp', 0.85);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handlePaste = (e) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      processFile(e.clipboardData.files[0]);
      e.preventDefault();
    } else {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          processFile(blob);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const triggerSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    setFileName("");
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="form-group drag-drop-container">
      {label && (
        <label>
          {label}
          {recommendedSize && <span style={{ color: '#666', fontSize: '13px', marginLeft: '6px' }}>(Recommended: {recommendedSize})</span>}
          {editing && <span style={{ color: '#666', fontSize: '13px', marginLeft: '6px' }}>(Leave blank to keep current)</span>}
        </label>
      )}
      
      <div 
        className={`drag-drop-zone ${isDragging ? 'dragging' : ''} ${preview ? 'has-preview' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerSelect}
        onPaste={handlePaste}
        tabIndex="0"
      >
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleChange} 
          required={required && !editing && !preview}
          style={{ display: 'none' }}
        />
        
        {preview ? (
          <div className="drag-drop-preview">
            <img src={preview} alt="Upload preview" />
            <div className="drag-drop-overlay">
              <span>{fileName}</span>
              <button type="button" className="remove-btn" onClick={handleRemove}>Change Image</button>
            </div>
          </div>
        ) : (
          <div className="drag-drop-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ccc', marginBottom: '12px' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <p className="primary-text">Drag & drop, click, or paste an image</p>
            <p className="secondary-text">or click to browse from your computer</p>
          </div>
        )}
      </div>
    </div>
  );
}
