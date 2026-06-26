import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierService } from '../services/supplierService';

export default function SuppliersManager() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const defaultForm = {
    name: '',
    contact_info: {
      email: '',
      phone: '',
      gstin: '',
      pan: '',
      address: '',
      lead_time_days: 7
    }
  };
  const [formData, setFormData] = useState(defaultForm);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.getSuppliers()
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supplierService.deleteSupplier(id),
    onSuccess: () => queryClient.invalidateQueries(['suppliers'])
  });

  const handleOpenNew = () => {
    setFormData(defaultForm);
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleEdit = (supplier) => {
    setFormData({
      name: supplier.name,
      contact_info: { ...defaultForm.contact_info, ...(supplier.contact_info || {}) }
    });
    setEditingSupplier(supplier.id);
    setIsModalOpen(true);
  };

  const handleDelete = (supplier) => {
    if (window.confirm(`Delete supplier ${supplier.name}?`)) {
      deleteMutation.mutate(supplier.id);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingSupplier) {
        await supplierService.updateSupplier(editingSupplier, formData);
      } else {
        await supplierService.createSupplier(formData);
      }
      queryClient.invalidateQueries(['suppliers']);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Suppliers (Vendors)</h2>
        <button className="btn-primary" onClick={handleOpenNew}>+ Add Supplier</button>
      </div>

      {isLoading ? <p>Loading suppliers...</p> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>GSTIN</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Lead Time (Days)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers?.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: '600' }}>{s.name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{s.contact_info?.gstin || '-'}</td>
                  <td>{s.contact_info?.email || '-'}</td>
                  <td>{s.contact_info?.phone || '-'}</td>
                  <td>{s.contact_info?.lead_time_days || '-'}</td>
                  <td>
                    <button className="btn-secondary" style={{ marginRight: '8px' }} onClick={() => handleEdit(s)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDelete(s)}>Delete</button>
                  </td>
                </tr>
              ))}
              {suppliers?.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No suppliers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h3 style={{ marginBottom: '16px' }}>{editingSupplier ? 'Edit Supplier' : 'New Supplier'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Supplier Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Acme Pharmaceuticals" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>GSTIN</label>
                  <input value={formData.contact_info.gstin} onChange={e => setFormData({...formData, contact_info: {...formData.contact_info, gstin: e.target.value}})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>PAN Number</label>
                  <input value={formData.contact_info.pan} onChange={e => setFormData({...formData, contact_info: {...formData.contact_info, pan: e.target.value}})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Email Address</label>
                  <input type="email" value={formData.contact_info.email} onChange={e => setFormData({...formData, contact_info: {...formData.contact_info, email: e.target.value}})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Phone Number</label>
                  <input value={formData.contact_info.phone} onChange={e => setFormData({...formData, contact_info: {...formData.contact_info, phone: e.target.value}})} />
                </div>
              </div>

              <div className="form-group">
                <label>Expected Lead Time (Days)</label>
                <input type="number" min="0" value={formData.contact_info.lead_time_days} onChange={e => setFormData({...formData, contact_info: {...formData.contact_info, lead_time_days: e.target.value}})} />
              </div>

              <div className="form-group">
                <label>Billing / Warehouse Address</label>
                <textarea rows="3" value={formData.contact_info.address} onChange={e => setFormData({...formData, contact_info: {...formData.contact_info, address: e.target.value}})} />
              </div>

              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
