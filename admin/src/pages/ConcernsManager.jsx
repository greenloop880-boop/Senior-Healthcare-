import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { uploadToR2, deleteFromR2 } from '../config/r2Client';
import DragDropImageUpload from '../components/DragDropImageUpload';

export default function ConcernsManager() {
  const [concerns, setConcerns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConcern, setEditingConcern] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', slug: '', is_active: true });
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('concerns').select('*').order('name');
    if (data) setConcerns(data);
    setIsLoading(false);
  };

  const handleOpenModal = (concern = null) => {
    if (concern) {
      setEditingConcern(concern);
      setFormData({ name: concern.name, slug: concern.slug, is_active: concern.is_active });
    } else {
      setEditingConcern(null);
      setFormData({ name: '', slug: '', is_active: true });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (concern) => {
    if (window.confirm(`Are you sure you want to delete ${concern.name}?`)) {
      if (concern.image_url) {
        await deleteFromR2(concern.image_url);
      }
      const { error } = await supabase.from('concerns').delete().eq('id', concern.id);
      if (error) {
        console.error("Error deleting concern:", error);
        alert("Failed to delete concern: " + error.message);
        return;
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
      name: formData.name,
      slug: formData.slug,
      image_url: imageUrl,
      is_active: formData.is_active
    };

    let result;
    if (editingConcern) {
      result = await supabase.from('concerns').update(payload).eq('id', editingConcern.id);
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Concerns Manager</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()}>Add New Concern</button>
      </div>

      {isLoading ? <p>Loading concerns...</p> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Concern Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {concerns.map(c => (
                <tr key={c.id}>
                  <td>
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: '#e5e7eb' }} />
                    )}
                  </td>
                  <td style={{ fontWeight: '500' }}>{c.name}</td>
                  <td style={{ fontFamily: 'monospace', color: '#6b7280' }}>/{c.slug}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold',
                      backgroundColor: c.is_active ? '#d1fae5' : '#fee2e2',
                      color: c.is_active ? '#059669' : '#dc2626'
                    }}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => handleOpenModal(c)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDelete(c)}>Delete</button>
                  </td>
                </tr>
              ))}
              {concerns.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                    No concerns found. Add your first concern!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ position: 'relative' }}>
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
            >✕</button>
            <h3 style={{ marginBottom: '20px' }}>{editingConcern ? 'Edit Concern' : 'Add Concern'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Concern Name</label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={e => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setFormData({...formData, name, slug: editingConcern ? formData.slug : slug});
                  }} 
                  placeholder="e.g. Joint Pain" 
                />
              </div>
              <div className="form-group">
                <label>URL Slug (Unique ID)</label>
                <input 
                  required 
                  value={formData.slug} 
                  onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} 
                  placeholder="e.g. joint-pain"
                  disabled={editingConcern != null}
                />
                {editingConcern && <small style={{color: 'gray'}}>Slugs cannot be changed after creation to preserve SEO.</small>}
              </div>

              <DragDropImageUpload 
                onFileSelect={setImageFile} 
                required={!editingConcern && !editingConcern?.image_url} 
                label="Concern Image" 
                recommendedSize="400x400 px" 
                editing={editingConcern ? editingConcern.image_url : null} 
              />

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: '#f0f4f8', borderRadius: '6px', marginTop: '16px' }}>
                <input 
                  type="checkbox" 
                  id="is_active" 
                  checked={formData.is_active} 
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })} 
                  style={{ width: '18px', height: '18px' }} 
                />
                <label htmlFor="is_active" style={{ marginBottom: 0, fontWeight: '500', color: '#1a1a4b', cursor: 'pointer' }}>Active on Storefront</label>
              </div>

              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Concern'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
