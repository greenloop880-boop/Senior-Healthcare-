import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { uploadToR2, deleteFromR2 } from '../config/r2Client';

export default function CommunityVideosManager() {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  
  const [formData, setFormData] = useState({ id: '', title: '', overlay_text: '', youtube_id: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('community_videos').select('*');
    if (data) setVideos(data);
    setIsLoading(false);
  };

  const handleOpenModal = (vid = null) => {
    if (vid) {
      setEditingVideo(vid);
      setFormData({ id: vid.id, title: vid.title, overlay_text: vid.overlay_text, youtube_id: vid.youtube_id });
    } else {
      setEditingVideo(null);
      setFormData({ id: '', title: '', overlay_text: '', youtube_id: '' });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (vid) => {
    if (window.confirm('Delete this video?')) {
      await supabase.from('community_videos').delete().eq('id', vid.id);
      fetchData();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Extract ID if a full YouTube URL was pasted
    let finalYoutubeId = formData.youtube_id;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = formData.youtube_id.match(regExp);
    if (match && match[2].length === 11) {
      finalYoutubeId = match[2];
    }

    const payload = { ...formData, youtube_id: finalYoutubeId, bg_image_url: '', product_img_url: '' };

    if (editingVideo) {
      await supabase.from('community_videos').update(payload).eq('id', editingVideo.id);
    } else {
      payload.id = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await supabase.from('community_videos').insert([payload]);
    }

    setIsModalOpen(false); setIsSaving(false); fetchData();
  };

  return (
    <div>
      <div className="page-header">
        <h2>Featured Videos Manager</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()}>Add New Video</button>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr><th>YouTube ID</th><th>Author Name</th><th>Quote Text</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {videos.map(v => (
                <tr key={v.id}>
                  <td>{v.youtube_id}</td>
                  <td>{v.title}</td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.overlay_text}</td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => handleOpenModal(v)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDelete(v)}>Delete</button>
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
            <h3 style={{ marginBottom: '20px' }}>{editingVideo ? 'Edit Featured Video' : 'Add Featured Video'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group"><label>Author Name</label><input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Retire in Peace" /></div>
              <div className="form-group"><label>Quote / Review Text</label><textarea required rows="3" value={formData.overlay_text} onChange={e => setFormData({...formData, overlay_text: e.target.value})} placeholder="e.g. Experience a walkthrough of..." /></div>
              <div className="form-group"><label>YouTube Link (or ID)</label><input required value={formData.youtube_id} onChange={e => setFormData({...formData, youtube_id: e.target.value})} placeholder="e.g. https://youtu.be/Vb1sV6sW5c8" /></div>
              
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
