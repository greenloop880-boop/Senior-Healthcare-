import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../services/inventoryService';

export default function InventoryManager() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSku, setSelectedSku] = useState(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const { data: skus, isLoading } = useQuery({
    queryKey: ['inventory_list'],
    queryFn: () => inventoryService.getInventoryList()
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['inventory_transactions', selectedSku?.id],
    queryFn: () => inventoryService.getSkuTransactions(selectedSku.id),
    enabled: !!selectedSku
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryService.getWarehouses()
  });

  const filteredSkus = skus?.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.sku_code.toLowerCase().includes(q) || 
           s.variant_name?.toLowerCase().includes(q) ||
           s.products?.name.toLowerCase().includes(q);
  });

  // Calculate totals per SKU
  const getTotals = (inventoryArray) => {
    if (!inventoryArray || inventoryArray.length === 0) return { available: 0, reserved: 0, damaged: 0 };
    return inventoryArray.reduce((acc, inv) => ({
      available: acc.available + (inv.quantity_available || 0),
      reserved: acc.reserved + (inv.quantity_reserved || 0),
      damaged: acc.damaged + (inv.damaged_stock || 0)
    }), { available: 0, reserved: 0, damaged: 0 });
  };

  const handleCloseLedger = () => {
    setSelectedSku(null);
    setIsAdjustModalOpen(false);
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Inventory Dashboard</h2>
        <input 
          type="text" 
          placeholder="Search SKU or Product..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)}
          style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '300px' }}
        />
      </div>

      {isLoading ? <p>Loading inventory...</p> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product & Variant</th>
                <th>SKU Code</th>
                <th>Available Stock</th>
                <th>Reserved (Orders)</th>
                <th>Damaged</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSkus?.map(sku => {
                const totals = getTotals(sku.inventory);
                const isLow = totals.available <= (sku.reorder_level || 10);
                const isOos = totals.available <= 0;
                
                return (
                  <tr key={sku.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {sku.products?.image_url ? (
                          <img src={sku.products.image_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: '#e2e8f0' }} />
                        )}
                        <div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{sku.products?.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{sku.variant_name || 'Default'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#475569' }}>{sku.sku_code}</td>
                    <td>
                      <span style={{ fontWeight: 'bold', color: isOos ? '#dc2626' : (isLow ? '#d97706' : '#16a34a') }}>
                        {totals.available} units
                      </span>
                    </td>
                    <td style={{ color: '#64748b' }}>{totals.reserved} units</td>
                    <td style={{ color: totals.damaged > 0 ? '#dc2626' : '#64748b' }}>{totals.damaged} units</td>
                    <td>
                      {isOos ? (
                        <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '12px', fontWeight: 'bold' }}>OUT OF STOCK</span>
                      ) : isLow ? (
                        <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#d97706', fontSize: '12px', fontWeight: 'bold' }}>LOW STOCK</span>
                      ) : (
                        <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#dcfce3', color: '#16a34a', fontSize: '12px', fontWeight: 'bold' }}>IN STOCK</span>
                      )}
                    </td>
                    <td>
                      <button className="btn-secondary" onClick={() => setSelectedSku(sku)}>View Ledger</button>
                    </td>
                  </tr>
                );
              })}
              {filteredSkus?.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>No inventory found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* LEDGER MODAL */}
      {selectedSku && !isAdjustModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '80%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>Inventory Ledger: {selectedSku.sku_code}</h3>
                <div style={{ color: '#64748b', fontSize: '14px' }}>{selectedSku.products?.name} - {selectedSku.variant_name}</div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-primary" onClick={() => setIsAdjustModalOpen(true)}>+ Adjust Stock</button>
                <button type="button" className="btn-secondary" onClick={handleCloseLedger}>Close</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>AVAILABLE</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{getTotals(selectedSku.inventory).available}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>RESERVED (ORDERS)</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>{getTotals(selectedSku.inventory).reserved}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>DAMAGED / LOST</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{getTotals(selectedSku.inventory).damaged}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>REORDER LEVEL</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#475569' }}>{selectedSku.reorder_level || 'N/A'}</div>
              </div>
            </div>

            <h4 style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Transaction History</h4>
            {txLoading ? <p>Loading ledger...</p> : (
              <table className="data-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Reference / Reason</th>
                    <th>Qty Change</th>
                    <th>Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions?.map(tx => {
                    const isPositive = tx.quantity_change > 0;
                    const isNegative = tx.quantity_change < 0;
                    return (
                      <tr key={tx.id}>
                        <td style={{ color: '#64748b' }}>{new Date(tx.created_at).toLocaleString()}</td>
                        <td style={{ fontWeight: '600', color: '#334155' }}>{tx.transaction_type}</td>
                        <td style={{ color: '#475569' }}>
                          <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{tx.reference_type}</span>
                          <br />
                          {tx.reference_id}
                          {tx.notes && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{tx.notes}</div>}
                        </td>
                        <td style={{ 
                          fontWeight: 'bold', 
                          color: isPositive ? '#16a34a' : (isNegative ? '#dc2626' : '#64748b') 
                        }}>
                          {isPositive ? '+' : ''}{tx.quantity_change}
                        </td>
                        <td>{tx.warehouses?.name || 'Unknown'}</td>
                      </tr>
                    );
                  })}
                  {transactions?.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No transactions recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ADJUSTMENT MODAL */}
      {isAdjustModalOpen && selectedSku && (
        <AdjustmentModal 
          sku={selectedSku} 
          warehouses={warehouses}
          onClose={() => setIsAdjustModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(['inventory_list']);
            queryClient.invalidateQueries(['inventory_transactions', selectedSku.id]);
            setIsAdjustModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AdjustmentModal({ sku, warehouses, onClose, onSuccess }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    warehouse_id: warehouses?.[0]?.id || '',
    adjustment_type: 'add', // add or remove
    quantity: 1,
    reason_code: 'STOCK_COUNT',
    notes: ''
  });

  const REASON_CODES = {
    add: ['STOCK_COUNT', 'RETURNED_GOODS', 'FOUND_INVENTORY', 'PROMOTIONAL_GIVEAWAY_RETURN'],
    remove: ['STOCK_COUNT', 'DAMAGED', 'EXPIRED', 'PROMOTIONAL_GIVEAWAY', 'STOLEN', 'LOST']
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const inventoryRecord = sku.inventory?.find(i => i.warehouse_id === formData.warehouse_id);
      const currentAvailable = inventoryRecord ? inventoryRecord.quantity_available : 0;
      const invId = inventoryRecord ? inventoryRecord.id : null;
      
      const qtyNum = Number(formData.quantity);
      const change = formData.adjustment_type === 'add' ? qtyNum : -qtyNum;

      if (formData.adjustment_type === 'remove' && currentAvailable + change < 0) {
        throw new Error(`Cannot remove ${qtyNum} units. Only ${currentAvailable} available in this warehouse.`);
      }

      await inventoryService.manualAdjustment({
        sku_id: sku.id,
        warehouse_id: formData.warehouse_id,
        inventory_id: invId,
        current_available: currentAvailable,
        quantity_change: change,
        reason_code: formData.reason_code,
        notes: formData.notes,
        unit_cost: sku.purchase_cost || 0
      });

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
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <h3 style={{ marginBottom: '8px' }}>Adjust Stock</h3>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>{sku.sku_code} - {sku.products?.name}</p>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Warehouse</label>
            <select required value={formData.warehouse_id} onChange={e => setFormData({...formData, warehouse_id: e.target.value})}>
              <option value="">Select Warehouse...</option>
              {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Adjustment Type</label>
              <select value={formData.adjustment_type} onChange={e => setFormData({...formData, adjustment_type: e.target.value, reason_code: REASON_CODES[e.target.value][0] })}>
                <option value="add">Add Stock (+)</option>
                <option value="remove">Remove Stock (-)</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Quantity</label>
              <input type="number" min="1" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
            </div>
          </div>

          <div className="form-group">
            <label>Reason Code</label>
            <select required value={formData.reason_code} onChange={e => setFormData({...formData, reason_code: e.target.value})}>
              {REASON_CODES[formData.adjustment_type].map(code => (
                <option key={code} value={code}>{code.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea rows="2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Additional details..." />
          </div>

          <div className="form-actions" style={{ marginTop: '32px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSaving} style={{ backgroundColor: formData.adjustment_type === 'remove' ? '#dc2626' : '#16a34a' }}>
              {isSaving ? 'Saving...' : (formData.adjustment_type === 'remove' ? 'Remove Stock' : 'Add Stock')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
