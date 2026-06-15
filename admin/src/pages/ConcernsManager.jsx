import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { uploadToR2, deleteFromR2 } from '../config/r2Client';
import DragDropImageUpload from '../components/DragDropImageUpload';

export default function ConcernsManager() {
  const [concerns, setConcerns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConcern, setEditingConcern] = useState(null);
  
  const [formData, setFormData] = useState({ title: '', link: '' });
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('concerns').select('*').order('title');
    if (data) setConcerns(data);
    setIsLoading(false);
  };

  const handleOpenModal = (concern = null) => {
    if (concern) {
      setEditingConcern(concern);
      setFormData({ title: concern.title, link: concern.link || '' });
    } else {
      setEditingConcern(null);
      setFormData({ title: '', link: '' });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (concern) => {
    if (window.confirm(`Are you sure you want to delete ${concern.title}?`)) {
      const { error } = await supabase.from('concerns').delete().eq('title', concern.title);
      if (error) {
        console.error("Error deleting concern:", error);
        alert("Failed to delete concern: " + error.message);
        return;
      }
      if (concern.image_url) {
        await deleteFromR2(concern.image_url);
      }
      fetchData();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    let imageUrl = editingConcern ? editingConcern.image_url : '';
    
    if (imageFile) {
      if (editingConcern && editingConcern.image_url) {
        await deleteFromR2(editingConcern.image_url);
      }
      imageUrl = await uploadToR2(imageFile, 'concerns');
    }

    const payload = {
      title: formData.title,
      link: formData.link,
      image_url: imageUrl,
    };

    let result;
    if (editingConcern) {
      result = await supabase.from('concerns').update(payload).eq('title', editingConcern.title);
    } else {
      result = await supabase.from('concerns').insert([payload]);
    }

    if (result.error) {
      console.error("Error saving concern:", result.error);
      alert("Failed to save concern: " + result.error.message);
      setIsSaving(false);
    } else {
      setIsModalOpen(false);
      setIsSaving(false);
      fetchData();
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Concerns Manager</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()}>Add New Concern</button>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {concerns.map(c => (
                <tr key={c.title}>
                  <td><img src={c.image_url} alt={c.title} /></td>
                  <td>{c.title}</td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => handleOpenModal(c)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDelete(c)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '20px' }}>{editingConcern ? 'Edit Concern' : 'Add Concern'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} disabled={editingConcern} />
                {editingConcern && <small style={{color: 'gray'}}>Title cannot be changed.</small>}
              </div>
              <div className="form-group">
                <label>Link (e.g. /concern-name)</label>
                <input value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} />
              </div>
              <DragDropImageUpload 
                onFileSelect={setImageFile} 
                required={!editingConcern} 
                label="Image" 
                recommendedSize="400x400 px" 
                editing={editingConcern ? editingConcern.image_url : null} 
              />
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
