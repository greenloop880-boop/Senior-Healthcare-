import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { uploadToR2, deleteFromR2 } from '../config/r2Client';
import DragDropImageUpload from '../components/DragDropImageUpload';

export default function CategoriesManager() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [formData, setFormData] = useState({ title: '', link: '' });
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('categories').select('*').order('title');
    if (data) setCategories(data);
    setIsLoading(false);
  };

  const handleOpenModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({ title: cat.title, link: cat.link || '' });
    } else {
      setEditingCategory(null);
      setFormData({ title: '', link: '' });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (cat) => {
    if (window.confirm(`Are you sure you want to delete ${cat.title}?`)) {
      const { error } = await supabase.from('categories').delete().eq('title', cat.title);
      if (error) {
        console.error("Error deleting category:", error);
        alert("Failed to delete category: " + error.message);
        return;
      }
      if (cat.image_url) {
        await deleteFromR2(cat.image_url);
      }
      fetchData();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    let imageUrl = editingCategory ? editingCategory.image_url : '';
    
    if (imageFile) {
      if (editingCategory && editingCategory.image_url) {
        await deleteFromR2(editingCategory.image_url);
      }
      imageUrl = await uploadToR2(imageFile, 'categories');
    }

    const payload = {
      title: formData.title,
      link: formData.link,
      image_url: imageUrl,
    };

    let result;
    if (editingCategory) {
      result = await supabase.from('categories').update(payload).eq('title', editingCategory.title);
    } else {
      result = await supabase.from('categories').insert([payload]);
    }

    if (result.error) {
      console.error("Error saving category:", result.error);
      alert("Failed to save category: " + result.error.message);
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
        <h2>Categories Manager</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()}>Add New Category</button>
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
              {categories.map(cat => (
                <tr key={cat.title}>
                  <td><img src={cat.image_url} alt={cat.title} /></td>
                  <td>{cat.title}</td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => handleOpenModal(cat)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDelete(cat)}>Delete</button>
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
            <h3 style={{ marginBottom: '20px' }}>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} disabled={editingCategory} />
                {editingCategory && <small style={{color: 'gray'}}>Category title cannot be changed.</small>}
              </div>
              <div className="form-group">
                <label>Link (e.g. /category-name)</label>
                <input value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} />
              </div>
              <DragDropImageUpload 
                onFileSelect={setImageFile} 
                required={!editingCategory} 
                label="Image" 
                recommendedSize="400x400 px" 
                editing={editingCategory ? editingCategory.image_url : null} 
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
