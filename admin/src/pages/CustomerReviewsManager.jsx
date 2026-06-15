import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { uploadToR2, deleteFromR2 } from '../config/r2Client';
import DragDropImageUpload from '../components/DragDropImageUpload';

export default function CustomerReviewsManager() {
  const [reviews, setReviews] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  
  const [formData, setFormData] = useState({ title: '', text: '', author: '', stars: 5 });
  const [bgImageFile, setBgImageFile] = useState(null);
  const [iconImageFile, setIconImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('customer_reviews').select('*').order('id');
    if (data) setReviews(data);
    setIsLoading(false);
  };

  const handleOpenModal = (review = null) => {
    if (review) {
      setEditingReview(review);
      setFormData({ title: review.title, text: review.text, author: review.author, stars: review.stars });
    } else {
      setEditingReview(null);
      setFormData({ title: '', text: '', author: '', stars: 5 });
    }
    setBgImageFile(null);
    setIconImageFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (review) => {
    if (window.confirm('Delete this review?')) {
      await supabase.from('customer_reviews').delete().eq('id', review.id);
      if (review.bg_image_url) await deleteFromR2(review.bg_image_url);
      if (review.product_icon_url) await deleteFromR2(review.product_icon_url);
      fetchData();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    let bgUrl = editingReview ? editingReview.bg_image_url : '';
    let iconUrl = editingReview ? editingReview.product_icon_url : '';
    
    if (bgImageFile) {
      if (editingReview && editingReview.bg_image_url) await deleteFromR2(editingReview.bg_image_url);
      bgUrl = await uploadToR2(bgImageFile, 'reviews');
    }
    if (iconImageFile) {
      if (editingReview && editingReview.product_icon_url) await deleteFromR2(editingReview.product_icon_url);
      iconUrl = await uploadToR2(iconImageFile, 'reviews');
    }

    const payload = { ...formData, bg_image_url: bgUrl, product_icon_url: iconUrl };

    if (editingReview) await supabase.from('customer_reviews').update(payload).eq('id', editingReview.id);
    else await supabase.from('customer_reviews').insert([payload]);

    setIsModalOpen(false); setIsSaving(false); fetchData();
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2>Customer Reviews Manager</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Search by author or title..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none', minWidth: '250px' }}
          />
          <button className="btn-primary" onClick={() => handleOpenModal()}>Add New Review</button>
        </div>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr><th>Portrait</th><th>Author</th><th>Title</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {reviews.filter(r => {
                if (!searchQuery) return true;
                const term = searchQuery.toLowerCase();
                return (r.author && r.author.toLowerCase().includes(term)) ||
                       (r.title && r.title.toLowerCase().includes(term));
              }).map(r => (
                <tr key={r.id}>
                  <td><img src={r.bg_image_url} alt={r.author} style={{ height: '60px', borderRadius: '4px' }} /></td>
                  <td>{r.author}</td>
                  <td>{r.title}</td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => handleOpenModal(r)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDelete(r)}>Delete</button>
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
            <h3 style={{ marginBottom: '20px' }}>{editingReview ? 'Edit Review' : 'Add Review'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group"><label>Title</label><input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
              <div className="form-group"><label>Author Name</label><input required value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} /></div>
              <div className="form-group"><label>Review Text</label><textarea required rows="4" value={formData.text} onChange={e => setFormData({...formData, text: e.target.value})} /></div>
              <div className="form-group"><label>Stars (1-5)</label><input type="number" min="1" max="5" required value={formData.stars} onChange={e => setFormData({...formData, stars: Number(e.target.value)})} /></div>
              
              <DragDropImageUpload 
                onFileSelect={setBgImageFile} 
                required={!editingReview} 
                label="Portrait Background" 
                recommendedSize="600x800 px" 
                editing={editingReview ? editingReview.bg_image_url : null} 
              />
              <DragDropImageUpload 
                onFileSelect={setIconImageFile} 
                required={!editingReview} 
                label="Product Icon" 
                recommendedSize="200x200 px" 
                editing={editingReview ? editingReview.product_icon_url : null} 
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
