import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../services/categoryService';
import DragDropImageUpload from '../components/DragDropImageUpload';
import { uploadToR2, deleteFromR2 } from '../config/r2Client';

export default function CategoriesManager() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', slug: '', is_active: true, image_url: '' });
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: categories, isLoading, isError, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories()
  });

  const createMutation = useMutation({
    mutationFn: categoryService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setIsModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, category }) => categoryService.updateCategory(id, category),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setIsModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: categoryService.deleteCategory,
    onSuccess: () => queryClient.invalidateQueries(['categories'])
  });

  const handleOpenModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({ name: cat.name, slug: cat.slug, is_active: cat.is_active, image_url: cat.image_url || '' });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', slug: '', is_active: true, image_url: '' });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      let imageUrl = editingCategory ? editingCategory.image_url : '';
      
      if (imageFile) {
        if (editingCategory && editingCategory.image_url) {
          await deleteFromR2(editingCategory.image_url);
        }
        imageUrl = await uploadToR2(imageFile, 'categories');
      }

      const payload = { ...formData, image_url: imageUrl };

      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, category: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save category: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (window.confirm(`Are you sure you want to delete ${cat.name}?`)) {
      if (cat.image_url) {
        await deleteFromR2(cat.image_url);
      }
      deleteMutation.mutate(cat.id);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Categories Manager</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()}>Add New Category</button>
      </div>

      {isLoading ? <p>Loading categories...</p> : isError ? (
        <div style={{ padding: '20px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px' }}>
          <strong>Error loading categories:</strong> {error?.message}
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Category Name</th>
                <th>URL Slug</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories?.map(cat => (
                <tr key={cat.id}>
                  <td>
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: '#e5e7eb' }} />
                    )}
                  </td>
                  <td style={{ fontWeight: '500' }}>{cat.name}</td>
                  <td style={{ fontFamily: 'monospace', color: '#6b7280' }}>/{cat.slug}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold',
                      backgroundColor: cat.is_active ? '#d1fae5' : '#fee2e2',
                      color: cat.is_active ? '#059669' : '#dc2626'
                    }}>
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
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
          <div className="modal-content" style={{ position: 'relative' }}>
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
            >
              ✕
            </button>
            <h3 style={{ marginBottom: '20px' }}>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Category Name</label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={e => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setFormData({...formData, name, slug: editingCategory ? formData.slug : slug});
                  }} 
                  placeholder="e.g. Health Monitors"
                />
              </div>
              <div className="form-group">
                <label>URL Slug (Unique ID)</label>
                <input 
                  required 
                  value={formData.slug} 
                  onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} 
                  placeholder="e.g. health-monitors"
                  disabled={editingCategory != null}
                />
                {editingCategory && <small style={{color: 'gray'}}>Slugs cannot be changed after creation to preserve SEO.</small>}
              </div>

              <DragDropImageUpload 
                onFileSelect={setImageFile} 
                required={!editingCategory && !formData.image_url} 
                label="Category Banner Image" 
                recommendedSize="400x400 px" 
                editing={formData.image_url} 
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
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
