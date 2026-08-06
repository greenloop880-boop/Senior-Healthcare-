import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { uploadToR2, deleteFromR2 } from '../config/r2Client';
import DragDropImageUpload from '../components/DragDropImageUpload';

export default function HeroBannersManager() {
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  
  const [formData, setFormData] = useState({ title: '', subtitle: '', link: '', bg_gradient: '' });
  const [desktopImageFile, setDesktopImageFile] = useState(null);
  const [mobileImageFile, setMobileImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('hero_banners').select('*').order('id');
    if (data) setBanners(data);
    setIsLoading(false);
  };

  const handleOpenModal = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({ title: banner.title || '', subtitle: banner.subtitle || '', link: banner.link || '', bg_gradient: banner.bg_gradient || '' });
    } else {
      setEditingBanner(null);
      setFormData({ title: '', subtitle: '', link: '', bg_gradient: '' });
    }
    setDesktopImageFile(null);
    setMobileImageFile(null);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const handleDelete = async (banner) => {
    if (window.confirm('Delete this banner?')) {
      await supabase.from('hero_banners').delete().eq('id', banner.id);
      if (banner.image_url) await deleteFromR2(banner.image_url);
      if (banner.mobile_image_url) await deleteFromR2(banner.mobile_image_url);
      fetchData();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      let desktopUrl = editingBanner ? editingBanner.image_url : '';
      let mobileUrl = editingBanner ? editingBanner.mobile_image_url : '';
      
      if (desktopImageFile) {
        if (editingBanner && editingBanner.image_url && editingBanner.image_url.includes('pub-')) await deleteFromR2(editingBanner.image_url);
        desktopUrl = await uploadToR2(desktopImageFile, 'hero');
      }
      if (mobileImageFile) {
        if (editingBanner && editingBanner.mobile_image_url && editingBanner.mobile_image_url.includes('pub-')) await deleteFromR2(editingBanner.mobile_image_url);
        mobileUrl = await uploadToR2(mobileImageFile, 'hero');
      }

      const payload = {
        title: formData.title, subtitle: formData.subtitle, link: formData.link, bg_gradient: formData.bg_gradient,
        image_url: desktopUrl, mobile_image_url: mobileUrl
      };

      if (editingBanner) {
        const { error } = await supabase.from('hero_banners').update(payload).eq('id', editingBanner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hero_banners').insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false); 
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error saving: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Hero Banners Manager</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()}>Add New Banner</button>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr><th>Desktop Image</th><th>Mobile Image</th><th>Title</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {banners.map(b => (
                <tr key={b.id}>
                  <td><img src={b.image_url} alt={b.title} style={{ width: '100px' }} /></td>
                  <td><img src={b.mobile_image_url} alt={b.title} style={{ width: '40px' }} /></td>
                  <td>{b.title || 'No Title'}</td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => handleOpenModal(b)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDelete(b)}>Delete</button>
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
            <h3 style={{ marginBottom: '20px' }}>{editingBanner ? 'Edit Banner' : 'Add Banner'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group"><label>Title</label><input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
              <div className="form-group"><label>Subtitle</label><input value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} /></div>
              <div className="form-group"><label>Link URL</label><input value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} /></div>
              <div className="form-group"><label>Background Gradient</label><input value={formData.bg_gradient} onChange={e => setFormData({...formData, bg_gradient: e.target.value})} placeholder="e.g. linear-gradient(...)" /></div>
              
              <DragDropImageUpload 
                onFileSelect={setDesktopImageFile} 
                required={!editingBanner} 
                label="Desktop Image" 
                recommendedSize="1920x800 px" 
                editing={!!editingBanner}
                existingImage={editingBanner ? editingBanner.image_url : null} 
              />
              <DragDropImageUpload 
                onFileSelect={setMobileImageFile} 
                required={!editingBanner} 
                label="Mobile Image" 
                recommendedSize="800x1000 px" 
                editing={!!editingBanner}
                existingImage={editingBanner ? editingBanner.mobile_image_url : null} 
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
