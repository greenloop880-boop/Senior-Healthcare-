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

    // Pass the file exactly as it is without any canvas modifications
    setFileName(file.name);
    onFileSelect(file);
    setPreview(URL.createObjectURL(file));
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
            {recommendedSize && <p style={{ color: '#0056b3', fontSize: '13px', marginTop: '8px', fontWeight: '500' }}>Recommended Size: {recommendedSize}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
