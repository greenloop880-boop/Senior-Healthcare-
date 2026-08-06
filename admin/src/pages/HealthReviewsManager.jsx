import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { uploadToR2, deleteFromR2 } from '../config/r2Client';
import DragDropImageUpload from '../components/DragDropImageUpload';

export default function HealthReviewsManager() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  
  const [formData, setFormData] = useState({ title: '', description: '', tag: '', link: '', quiz_id: '' });
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('health_reviews').select('*').order('id');
    if (data) setReviews(data);
    setIsLoading(false);
  };

  const handleOpenModal = (review = null) => {
    if (review) {
      setEditingReview(review);
      setFormData({ title: review.title || '', description: review.description || '', tag: review.tag || '', link: review.link || '', quiz_id: review.quiz_id || '' });
    } else {
      setEditingReview(null);
      setFormData({ title: '', description: '', tag: '', link: '', quiz_id: '' });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (review) => {
    if (window.confirm('Delete this health review?')) {
      await supabase.from('health_reviews').delete().eq('id', review.id);
      if (review.image_url) await deleteFromR2(review.image_url);
      fetchData();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    let imgUrl = editingReview ? editingReview.image_url : '';
    
    if (imageFile) {
      if (editingReview && editingReview.image_url) await deleteFromR2(editingReview.image_url);
      imgUrl = await uploadToR2(imageFile, 'health');
    }

    const payload = { ...formData, image_url: imgUrl };

    if (editingReview) await supabase.from('health_reviews').update(payload).eq('id', editingReview.id);
    else await supabase.from('health_reviews').insert([payload]);

    setIsModalOpen(false); setIsSaving(false); fetchData();
  };

  return (
    <div>
      <div className="page-header">
        <h2>Health Reviews Manager</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()}>Add New Assessment</button>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr><th>Image</th><th>Title</th><th>Tag</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r.id}>
                  <td><img src={r.image_url} alt={r.title} /></td>
                  <td>{r.title}</td>
                  <td>{r.tag}</td>
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
            <h3 style={{ marginBottom: '20px' }}>{editingReview ? 'Edit Assessment' : 'Add Assessment'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group"><label>Title</label><input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
              <div className="form-group"><label>Tag</label><input required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} /></div>
              <div className="form-group"><label>Description</label><textarea required rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
              <div className="form-group"><label>Link</label><input required value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} /></div>
              <div className="form-group"><label>Quiz ID</label><input required value={formData.quiz_id} onChange={e => setFormData({...formData, quiz_id: e.target.value})} /></div>
              
              <DragDropImageUpload 
                onFileSelect={setImageFile} 
                required={!editingReview} 
                label="Image" 
                recommendedSize="800x800 px" 
                editing={editingReview ? editingReview.image_url : null} 
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
