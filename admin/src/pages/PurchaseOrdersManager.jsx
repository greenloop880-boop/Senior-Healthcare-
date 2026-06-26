import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { supplierService } from '../services/supplierService';
import { inventoryService } from '../services/inventoryService';

export default function PurchaseOrdersManager() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null); // For GRN or details
  const [isGrnOpen, setIsGrnOpen] = useState(false);

  const { data: pos, isLoading } = useQuery({
    queryKey: ['purchase_orders'],
    queryFn: () => purchaseOrderService.getPurchaseOrders()
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.getSuppliers()
  });

  const { data: products } = useQuery({
    queryKey: ['po_products'],
    queryFn: () => purchaseOrderService.getProductsWithSkus()
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryService.getWarehouses()
  });

  const handleIssue = async (poId) => {
    if (window.confirm('Issue this PO to the supplier? It can no longer be edited.')) {
      try {
        await purchaseOrderService.updatePOStatus(poId, 'ISSUED');
        queryClient.invalidateQueries(['purchase_orders']);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleOpenGRN = (po) => {
    setSelectedPO(po);
    setIsGrnOpen(true);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Purchase Orders</h2>
        <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>+ Create PO</button>
      </div>

      {isLoading ? <p>Loading POs...</p> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO ID</th>
                <th>Supplier</th>
                <th>Expected Date</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pos?.map(po => {
                const isDraft = po.status === 'DRAFT';
                const isIssued = po.status === 'ISSUED';
                return (
                  <tr key={po.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{po.id.substring(0,8).toUpperCase()}</td>
                    <td style={{ fontWeight: '600' }}>{po.vendors?.name}</td>
                    <td>{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '-'}</td>
                    <td style={{ fontWeight: 'bold' }}>{formatCurrency(po.total_amount)}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: isDraft ? '#f1f5f9' : (isIssued ? '#dbeafe' : (po.status === 'RECEIVED' ? '#dcfce3' : '#fef3c7')),
                        color: isDraft ? '#475569' : (isIssued ? '#1e40af' : (po.status === 'RECEIVED' ? '#16a34a' : '#d97706'))
                      }}>
                        {po.status}
                      </span>
                    </td>
                    <td>
                      {isDraft && <button className="btn-secondary" onClick={() => handleIssue(po.id)}>Issue PO</button>}
                      {(isIssued || po.status === 'PARTIALLY_RECEIVED') && (
                        <button className="btn-primary" onClick={() => handleOpenGRN(po)}>Receive Goods (GRN)</button>
                      )}
                      {po.status === 'RECEIVED' && <span style={{ fontSize: '12px', color: '#64748b' }}>Completed</span>}
                    </td>
                  </tr>
                );
              })}
              {pos?.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No Purchase Orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isCreateOpen && (
        <CreatePOWizard 
          suppliers={suppliers} 
          products={products} 
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(['purchase_orders']);
            setIsCreateOpen(false);
          }}
        />
      )}

      {isGrnOpen && selectedPO && (
        <GRNModal 
          po={selectedPO}
          warehouses={warehouses}
          onClose={() => setIsGrnOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(['purchase_orders']);
            // Invalidating inventory so the dashboard updates
            queryClient.invalidateQueries(['inventory_list']);
            setIsGrnOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// CREATE PO WIZARD
// ==========================================
function CreatePOWizard({ suppliers, products, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    vendor_id: '',
    expected_delivery_date: '',
    items: [] // { sku_id, quantity_ordered, unit_cost, _skuCode, _prodName }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [tempQty, setTempQty] = useState(10);
  const [tempCost, setTempCost] = useState(0);

  const selectedProduct = products?.find(p => p.id === selectedProductId);

  const handleAddItem = () => {
    if (!selectedSkuId) return;
    const sku = selectedProduct.skus.find(s => s.id === selectedSkuId);
    if (!sku) return;

    // Check if already added
    if (formData.items.some(i => i.sku_id === selectedSkuId)) {
      alert('SKU already added to PO. Adjust quantity instead.');
      return;
    }

    setFormData({
      ...formData,
      items: [...formData.items, {
        sku_id: sku.id,
        quantity_ordered: Number(tempQty),
        unit_cost: Number(tempCost),
        _skuCode: sku.sku_code,
        _prodName: selectedProduct.name
      }]
    });
    
    // Reset temp inputs
    setSelectedSkuId('');
    setTempQty(10);
    setTempCost(0);
  };

  const handleSavePO = async () => {
    if (!formData.vendor_id) return alert('Select a supplier');
    if (formData.items.length === 0) return alert('Add at least one item');
    
    setIsSaving(true);
    try {
      await purchaseOrderService.createPO({
        vendor_id: formData.vendor_id,
        expected_delivery_date: formData.expected_delivery_date || null,
        items: formData.items
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalPoValue = formData.items.reduce((sum, i) => sum + (i.quantity_ordered * i.unit_cost), 0);

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-content" style={{ width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: '24px' }}>Create Purchase Order</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div className="form-group">
            <label>Supplier / Vendor</label>
            <select required value={formData.vendor_id} onChange={e => setFormData({...formData, vendor_id: e.target.value})}>
              <option value="">Select Supplier...</option>
              {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Expected Delivery Date</label>
            <input type="date" value={formData.expected_delivery_date} onChange={e => setFormData({...formData, expected_delivery_date: e.target.value})} />
          </div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0' }}>Add SKUs to Order</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '12px' }}>Product</label>
              <select value={selectedProductId} onChange={e => { setSelectedProductId(e.target.value); setSelectedSkuId(''); }}>
                <option value="">Select Product...</option>
                {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '12px' }}>SKU Variant</label>
              <select value={selectedSkuId} onChange={e => {
                const sku = selectedProduct?.skus.find(s => s.id === e.target.value);
                setSelectedSkuId(e.target.value);
                if (sku) setTempCost(sku.average_cost || 0);
              }} disabled={!selectedProductId}>
                <option value="">Select SKU...</option>
                {selectedProduct?.skus.map(s => <option key={s.id} value={s.id}>{s.sku_code}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '12px' }}>Order Qty</label>
              <input type="number" min="1" value={tempQty} onChange={e => setTempQty(e.target.value)} disabled={!selectedSkuId} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '12px' }}>Unit Cost (₹)</label>
              <input type="number" min="0" value={tempCost} onChange={e => setTempCost(e.target.value)} disabled={!selectedSkuId} />
            </div>
            <button className="btn-secondary" style={{ padding: '8px 16px' }} onClick={handleAddItem} disabled={!selectedSkuId}>Add</button>
          </div>
        </div>

        <h4 style={{ marginBottom: '12px' }}>Purchase Order Items</h4>
        <table className="data-table" style={{ marginBottom: '24px' }}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Cost</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {formData.items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{item._skuCode}</td>
                <td>{item._prodName}</td>
                <td>{item.quantity_ordered}</td>
                <td>₹{item.unit_cost}</td>
                <td style={{ fontWeight: 'bold' }}>₹{item.quantity_ordered * item.unit_cost}</td>
                <td>
                  <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => {
                    setFormData({...formData, items: formData.items.filter((_, i) => i !== idx)});
                  }}>Remove</button>
                </td>
              </tr>
            ))}
            {formData.items.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>No items added yet.</td></tr>
            )}
            {formData.items.length > 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>Total PO Value:</td>
                <td colSpan="2" style={{ fontWeight: 'bold', fontSize: '16px', color: '#0f172a' }}>₹{totalPoValue}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="form-actions" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSavePO} disabled={isSaving || formData.items.length === 0}>
            {isSaving ? 'Creating...' : 'Save as Draft PO'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ==========================================
// GOODS RECEIPT NOTE (GRN) MODAL
// ==========================================
function GRNModal({ po, warehouses, onClose, onSuccess }) {
  const [isSaving, setIsSaving] = useState(false);
  const [warehouseId, setWarehouseId] = useState(warehouses?.[0]?.id || '');
  
  // Initialize GRN state with quantities left to receive
  const [grnItems, setGrnItems] = useState(() => {
    return po.purchase_order_items.map(item => {
      const left = item.quantity_ordered - (item.quantity_received || 0);
      return {
        poi_id: item.id,
        sku_id: item.sku_id,
        _skuCode: item.skus?.sku_code,
        _prodName: item.skus?.products?.name,
        ordered: item.quantity_ordered,
        previously_received: item.quantity_received || 0,
        quantity_to_receive: left > 0 ? left : 0, // Default to remaining
        unit_cost: item.unit_cost
      };
    }).filter(item => item.ordered > item.previously_received); // Only show pending items
  });

  const handleReceive = async () => {
    if (!warehouseId) return alert("Select a warehouse to receive goods into.");
    
    // Ensure no negative receives
    if (grnItems.some(i => i.quantity_to_receive < 0)) return alert("Cannot receive negative quantities.");
    
    const receivingAnything = grnItems.some(i => i.quantity_to_receive > 0);
    if (!receivingAnything) return alert("You must receive at least 1 unit to process GRN.");

    setIsSaving(true);
    try {
      await purchaseOrderService.receiveGoods(po.id, warehouseId, grnItems);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-content" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: '8px' }}>Goods Receipt Note (GRN)</h3>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>PO Reference: {po.id.substring(0,8).toUpperCase()} | Supplier: {po.vendors?.name}</p>

        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label>Receiving Warehouse</label>
          <select required value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
            <option value="">Select Warehouse...</option>
            {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '6px', marginBottom: '24px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#166534' }}>
            <strong>Note:</strong> Receiving goods here will instantly generate a PURCHASE transaction in the inventory ledger and update stock levels across the system. The Moving Average Cost will also be automatically recalculated.
          </p>
        </div>

        <table className="data-table" style={{ marginBottom: '32px' }}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Ordered</th>
              <th>Previously Rcvd</th>
              <th>Receiving Now</th>
            </tr>
          </thead>
          <tbody>
            {grnItems.map((item, idx) => (
              <tr key={idx}>
                <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{item._skuCode}</td>
                <td>{item._prodName}</td>
                <td>{item.ordered}</td>
                <td style={{ color: '#16a34a' }}>{item.previously_received}</td>
                <td>
                  <input 
                    type="number" 
                    min="0"
                    max={item.ordered - item.previously_received} 
                    value={item.quantity_to_receive} 
                    onChange={e => {
                      const newItems = [...grnItems];
                      newItems[idx].quantity_to_receive = Number(e.target.value);
                      setGrnItems(newItems);
                    }}
                    style={{ width: '80px', padding: '4px 8px' }}
                  />
                </td>
              </tr>
            ))}
            {grnItems.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '16px' }}>All items for this PO have already been received.</td></tr>
            )}
          </tbody>
        </table>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleReceive} disabled={isSaving || grnItems.length === 0}>
            {isSaving ? 'Processing GRN...' : 'Confirm Goods Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}
