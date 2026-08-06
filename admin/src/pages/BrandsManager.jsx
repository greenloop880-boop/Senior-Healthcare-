import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { brandService } from '../services/brandService';
import DragDropImageUpload from '../components/DragDropImageUpload';
import { uploadToR2, deleteFromR2 } from '../config/r2Client';

export default function BrandsManager() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({ name: '', brand_code: '', slug: '', is_active: true, logo: '' });
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: brands, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandService.getBrands()
  });

  const createMutation = useMutation({
    mutationFn: brandService.createBrand,
    onSuccess: () => {
      queryClient.invalidateQueries(['brands']);
      setIsModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, brand }) => brandService.updateBrand(id, brand),
    onSuccess: () => {
      queryClient.invalidateQueries(['brands']);
      setIsModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: brandService.deleteBrand,
    onSuccess: () => queryClient.invalidateQueries(['brands'])
  });

  const handleOpenModal = (b = null) => {
    if (b) {
      setEditingBrand(b);
      setFormData({ name: b.name, brand_code: b.brand_code, slug: b.slug, is_active: b.is_active, logo: b.logo || '' });
    } else {
      setEditingBrand(null);
      setFormData({ name: '', brand_code: '', slug: '', is_active: true, logo: '' });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      let logoUrl = editingBrand ? editingBrand.logo : '';
      
      if (imageFile) {
        if (editingBrand && editingBrand.logo) {
          await deleteFromR2(editingBrand.logo);
        }
        logoUrl = await uploadToR2(imageFile, 'brands');
      }

      const payload = { ...formData, logo: logoUrl };

      if (editingBrand) {
        await updateMutation.mutateAsync({ id: editingBrand.id, brand: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save brand: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (b) => {
    if (window.confirm(`Are you sure you want to delete ${b.name}?`)) {
      // It's a soft delete, so we don't necessarily delete the image from R2 immediately
      deleteMutation.mutate(b.id);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Brands Manager</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()}>Add New Brand</button>
      </div>

      {isLoading ? <p>Loading brands...</p> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Logo</th>
                <th>Brand Name</th>
                <th>Brand Code</th>
                <th>URL Slug</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands?.map(b => (
                <tr key={b.id}>
                  <td>
                    {b.logo ? (
                      <img src={b.logo} alt={b.name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: '#e5e7eb' }} />
                    )}
                  </td>
                  <td style={{ fontWeight: '500' }}>{b.name}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{b.brand_code}</td>
                  <td style={{ fontFamily: 'monospace', color: '#6b7280' }}>/{b.slug}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold',
                      backgroundColor: b.is_active ? '#d1fae5' : '#fee2e2',
                      color: b.is_active ? '#059669' : '#dc2626'
                    }}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => handleOpenModal(b)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDelete(b)}>Delete</button>
                  </td>
                </tr>
              ))}
              {brands?.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No brands found.</td>
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
            >
              ✕
            </button>
            <h3 style={{ marginBottom: '20px' }}>{editingBrand ? 'Edit Brand' : 'Add Brand'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Brand Name</label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={e => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);
                    setFormData({...formData, name, slug: editingBrand ? formData.slug : slug, brand_code: editingBrand ? formData.brand_code : code});
                  }} 
                  placeholder="e.g. Senior Anandam"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Brand Code</label>
                  <input 
                    required 
                    value={formData.brand_code} 
                    onChange={e => setFormData({...formData, brand_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5)})} 
                    placeholder="e.g. SA"
                    maxLength={5}
                  />
                  <small style={{color: 'gray'}}>Used for SKU generation (e.g., SA-...). 2-5 uppercase letters.</small>
                </div>
                <div className="form-group">
                  <label>URL Slug (Unique ID)</label>
                  <input 
                    required 
                    value={formData.slug} 
                    onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} 
                    placeholder="e.g. senior-anandam"
                    disabled={editingBrand != null}
                  />
                </div>
              </div>

              <DragDropImageUpload 
                onFileSelect={setImageFile} 
                required={!editingBrand && !formData.logo} 
                label="Brand Logo" 
                recommendedSize="400x400 px" 
                editing={formData.logo} 
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
                  {isSaving ? 'Saving...' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
