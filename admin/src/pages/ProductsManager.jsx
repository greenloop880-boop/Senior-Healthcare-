import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import DragDropImageUpload from '../components/DragDropImageUpload';
import ProductWizard from '../components/ProductWizard';
import { uploadToR2, deleteFromR2 } from '../config/r2Client';

export default function ProductsManager() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingProductId, setEditingProductId] = useState(null);

  // Queries
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getProducts()
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories()
  });

  const { data: concerns } = useQuery({
    queryKey: ['concerns'],
    queryFn: () => productService.getConcerns()
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productService.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries(['products'])
  });




  const handleOpenModal = () => {
    setEditingProductId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (prod) => {
    setEditingProductId(prod);
    setIsModalOpen(true);
  };

  const handleWizardSuccess = () => {
    queryClient.invalidateQueries(['products']);
    setIsModalOpen(false);
  };

  const handleDelete = (prod) => {
    if (window.confirm(`Are you sure you want to delete ${prod.name}?`)) {
      deleteMutation.mutate(prod.id);
    }
  };

  // Filter products
  const filteredProducts = products?.filter(p => {
    if (filterCategory && p.category_id !== filterCategory) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2>Products & SKUs Manager</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
          />
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
          >
            <option value="">All Categories</option>
            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn-primary" onClick={handleOpenModal}>Add New Product</button>
        </div>
      </div>

      {productsLoading ? <p>Loading products...</p> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>SKU Count</th>
                <th>Total Stock</th>
                <th>Selling Price Range</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts?.map(p => {
                const skuCount = p.skus?.length || 0;
                
                // Calculate aggregate stock across all SKUs and Warehouses
                const totalStock = p.skus?.reduce((sum, sku) => {
                  return sum + (sku.inventory?.reduce((invSum, inv) => invSum + inv.quantity_available, 0) || 0);
                }, 0) || 0;

                // Calculate Price Range
                const prices = p.skus?.map(s => Number(s.selling_price)) || [];
                const minPrice = prices.length ? Math.min(...prices) : 0;
                const maxPrice = prices.length ? Math.max(...prices) : 0;
                const priceDisplay = minPrice === maxPrice ? formatCurrency(minPrice) : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;

                return (
                  <tr key={p.id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: '#e5e7eb' }} />
                      )}
                      <span style={{ fontWeight: '500' }}>{p.name}</span>
                    </td>
                    <td>{p.categories?.name || 'Uncategorized'}</td>
                    <td>{skuCount} Variants</td>
                    <td style={{ fontWeight: 'bold', color: totalStock < 10 ? '#dc2626' : '#111827' }}>
                      {totalStock} units
                    </td>
                    <td>{priceDisplay}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold',
                        backgroundColor: p.is_active ? '#d1fae5' : '#fee2e2',
                        color: p.is_active ? '#059669' : '#dc2626'
                      }}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-secondary" style={{ marginRight: '8px', padding: '6px 12px', fontSize: '12px' }} onClick={() => handleEdit(p)}>Edit</button>
                      <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDelete(p)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts?.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                    No products found. Add your first product!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* WIZARD OVERLAY */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100 }}>
          <div className="modal-content" style={{ width: '90%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', padding: 0, backgroundColor: 'transparent' }}>
            <ProductWizard 
              onCancel={() => setIsModalOpen(false)}
              onSuccess={handleWizardSuccess}
              editingProduct={editingProductId}
            />
          </div>
        </div>
      )}
    </div>
  );
}
