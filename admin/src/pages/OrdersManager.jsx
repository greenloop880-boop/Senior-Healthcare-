import React, { useState, useEffect } from 'react';
import { orderService } from '../services/orderService';
import './orders.css';

export default function OrdersManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFilter, setDateFilter] = useState('All Dates');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // Input states per order
  const [shippingInputs, setShippingInputs] = useState({});
  const [shippingStatus, setShippingStatus] = useState({});

  // Modal State for deeper details
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAdminNotes, setModalAdminNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [page, dateFilter, statusFilter, searchQuery]);

  // Handle Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  async function loadData() {
    setLoading(true);
    try {
      const result = await orderService.getOrdersPaginated({
        search: searchQuery,
        status: statusFilter,
        dateFilter: dateFilter,
        page: page,
        pageSize: pageSize
      });
      setOrders(result || []);
      if (result && result.length > 0) {
        setTotalCount(result[0].total_count);
      } else {
        setTotalCount(0);
      }
      
      // Initialize shipping inputs from fetched orders
      if (result) {
        const initialShipping = {};
        result.forEach(order => {
          if (order.shipments && order.shipments.length > 0) {
            initialShipping[order.id] = {
              courier: order.shipments[0].courier_name || '',
              tracking: order.shipments[0].tracking_number || ''
            };
          }
        });
        setShippingInputs(prev => ({ ...prev, ...initialShipping }));
      }
      
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    if (newStatus === 'SHIPPED') {
      setShippingStatus(prev => ({ ...prev, [orderId]: 'sending' }));
    }
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      if (newStatus === 'SHIPPED') {
        setShippingStatus(prev => ({ ...prev, [orderId]: 'success' }));
        setTimeout(() => setShippingStatus(prev => ({ ...prev, [orderId]: null })), 3000);
      }
      await loadData();
    } catch (err) {
      if (newStatus === 'SHIPPED') {
        setShippingStatus(prev => ({ ...prev, [orderId]: null }));
      }
      alert("Failed to update status: " + (err.message || JSON.stringify(err)));
    }
  };

  const handleShip = async (orderId) => {
    const inputs = shippingInputs[orderId] || {};
    if (!inputs.courier || !inputs.tracking) {
      alert("Please enter Courier and Tracking Number before saving.");
      return;
    }
    
    try {
      await orderService.addShipment(orderId, inputs.tracking, inputs.courier);
      alert("Tracking information saved successfully!");
      await loadData();
    } catch (err) {
      alert("Failed to save shipping info: " + err.message);
    }
  };

  const handleBill = (orderId) => {
    alert(`Generating PDF Bill for Order ${orderId.substring(0, 8)}... (Feature coming soon)`);
  };

  const updateShippingInput = (orderId, field, value) => {
    setShippingInputs(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [field]: value
      }
    }));
  };

  const handleViewDetails = async (orderId) => {
    setModalOpen(true);
    setLoadingDetails(true);
    try {
      const details = await orderService.getOrderDetails(orderId);
      setSelectedOrder(details);
      setModalAdminNotes(details.admin_notes || '');
    } catch (err) {
      console.error(err);
      alert("Failed to load details: " + err.message);
      setModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Group orders by relative date
  const groupedOrders = orders.reduce((acc, order) => {
    const d = new Date(order.created_at);
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(order);
    return acc;
  }, {});

  return (
    <div className="orders-manager-light">
      <div className="om-header">
        <h2 className="om-title">Order Management</h2>
        <div className="om-filters">
          <input 
            type="text" 
            placeholder="Search ID, Name, Phone, Email" 
            className="om-search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <select className="om-select" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }}>
            <option>All Dates</option>
            <option>Today</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Month</option>
          </select>
          <select className="om-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="All Status">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CREATED">Created</option>
            <option value="PROCESSING">Order Placed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="OUT FOR DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? <div className="om-loading">Loading orders...</div> : error ? <div className="om-error">{error}</div> : (
        <div className="om-content">
          {Object.keys(groupedOrders).map(dateGroup => (
            <div key={dateGroup} className="om-date-group">
              <h3 className="om-date-header">{dateGroup}</h3>
              
              <div className="om-cards-container">
                {groupedOrders[dateGroup].map(order => {
                  const d = new Date(order.created_at);
                  const timeString = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                  const ref = order.payment_gateway_id || 'N/A';
                  
                  const subtotal = Number(order.total_amount) - Number(order.shipping_amount || 0) - Number(order.tax_amount || 0) + Number(order.discount_amount || 0);
                  const shippingDisplay = Number(order.shipping_amount || 0) === 0 ? 'Free' : `₹${order.shipping_amount}`;

                  return (
                    <div key={order.id} className="om-card">
                      {/* Card Header (Checkout ID and Customer Info) */}
                      <div className="om-card-top">
                        <div className="om-card-top-left">
                          <div className="om-checkout-id">
                            <span className="om-label">CHECKOUT ID:</span>
                            <span className="om-value">{order.id.substring(0,8).toUpperCase()}</span>
                            <span className="om-divider">|</span>
                            <span className="om-time">{timeString}</span>
                          </div>
                          <div className="om-ref">
                            REF: {ref}
                          </div>
                        </div>
                        
                        <div className="om-card-top-right">
                          <div className="om-customer-name">{order.customer_name || 'Customer Name'}</div>
                          <div className="om-customer-address">
                            {order.customer_address?.address_line1}, {order.customer_address?.address_line2 ? order.customer_address.address_line2 + ', ' : ''}
                            {order.customer_address?.city}, {order.customer_address?.state} {order.customer_address?.pincode}
                          </div>
                          <div className="om-customer-address">{order.customer_address?.country || 'India'}</div>
                          <div className="om-customer-phone" style={{ marginTop: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px', verticalAlign: 'middle'}}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            {order.customer_phone}
                          </div>
                          <div className="om-customer-email" style={{ color: '#4B5563', fontSize: '13px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px', verticalAlign: 'middle'}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            {order.customer_email || 'No email provided'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Items Section */}
                      <div className="om-card-items">
                        {order.items && order.items.length > 0 ? order.items.map(item => (
                          <div key={item.id} className="om-item-row">
                            <div className="om-item-left">
                              <div className="om-item-img-wrap">
                                <img 
                                  src={item.sku?.product?.image_url || item.sku?.product?.images?.[0] || 'https://via.placeholder.com/60'} 
                                  alt={item.sku?.product?.name} 
                                  className="om-item-img"
                                />
                              </div>
                              <div className="om-item-details">
                                <div className="om-item-name">{item.sku?.product?.name || 'Unknown Product'}</div>
                                <div className="om-item-meta">
                                  Size: {item.sku?.variant_name || 'Standard'} | Qty: {item.quantity} | SKU: {item.sku?.sku_code || 'N/A'}
                                </div>
                              </div>
                            </div>
                            <div className="om-item-right">
                              <div className="om-item-price">₹{item.total_price}</div>
                            </div>
                          </div>
                        )) : (
                          <div className="om-no-items">Items not found. Please apply the latest database patch.</div>
                        )}
                      </div>
                      
                      {/* Card Footer (Totals and Actions) */}
                      <div className="om-card-bottom">
                        <div className="om-card-bottom-left">
                          <div className="om-total-row">
                            <span className="om-grand-total">₹{order.total_amount}</span>
                            <span className="om-payment-badge">
                              {order.payment_status} ({order.payment_method})
                            </span>
                          </div>
                          <div className="om-subtotal-row">
                            Subtotal: ₹{subtotal} + Shipping: {shippingDisplay}
                          </div>
                        </div>
                        
                        <div className="om-card-bottom-right">
                          <div className="om-actions-primary">
                            <select 
                              className="om-status-select"
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            >
                              <option value="PENDING">Pending Payment</option>
                              <option value="CREATED">Order Created</option>
                              <option value="PROCESSING">Order Placed</option>
                              <option value="SHIPPED">Shipped</option>
                              <option value="OUT FOR DELIVERY">Out for Delivery</option>
                              <option value="DELIVERED">Delivered</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                            
                            <button className="om-btn-bill" onClick={() => handleBill(order.id)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                              Bill
                            </button>
                            
                            {order.status !== 'SHIPPED' && order.status !== 'DELIVERED' && (
                              <button 
                                className="om-btn-ship-action" 
                                onClick={() => handleStatusChange(order.id, 'SHIPPED')}
                                disabled={shippingStatus[order.id] === 'sending'}
                                style={{
                                  backgroundColor: shippingStatus[order.id] === 'success' ? '#10B981' : '',
                                  opacity: shippingStatus[order.id] === 'sending' ? 0.7 : 1,
                                  minWidth: '120px'
                                }}
                              >
                                {shippingStatus[order.id] === 'sending' ? (
                                  <>
                                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line></svg>
                                    Sending...
                                  </>
                                ) : shippingStatus[order.id] === 'success' ? (
                                  <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    Sent!
                                  </>
                                ) : (
                                  <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                                    Ship via Shiprocket
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Shipping Inputs Row */}
                      <div className="om-shipping-row">
                        <input 
                          type="text" 
                          placeholder="Courier (e.g. FedEx)" 
                          className="om-shipping-input"
                          value={shippingInputs[order.id]?.courier || ''}
                          onChange={(e) => updateShippingInput(order.id, 'courier', e.target.value)}
                        />
                        <input 
                          type="text" 
                          placeholder="Tracking #" 
                          className="om-shipping-input"
                          value={shippingInputs[order.id]?.tracking || ''}
                          onChange={(e) => updateShippingInput(order.id, 'tracking', e.target.value)}
                        />
                        <button className="om-btn-save" onClick={() => handleShip(order.id)}>Save</button>
                        <button className="om-btn-view-details" onClick={() => handleViewDetails(order.id)}>Full Details</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {orders.length === 0 && (
            <div className="om-loading" style={{textAlign: 'center', padding: '60px 0'}}>
              <h3 style={{fontSize: '20px', color: '#374151', marginBottom: '8px'}}>No customer orders have been placed yet.</h3>
              <p style={{color: '#6B7280'}}>When an order is placed, it will appear here.</p>
            </div>
          )}

          {orders.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '20px 0', borderTop: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} orders
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="om-btn-light" 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </button>
                <button 
                  className="om-btn-light" 
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Details Modal - Keeping original implementation for deeper details */}
      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#fff', width: '90%', maxWidth: '1000px', maxHeight: '90vh',
            borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Order Details</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#F9FAFB' }}>
              {loadingDetails ? <p>Loading details...</p> : selectedOrder ? (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                  {/* Left Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Timeline */}
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Timeline</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {selectedOrder.timeline?.length > 0 ? selectedOrder.timeline.map((event, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '12px', fontSize: '14px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#8B5CF6', marginTop: '6px' }}></div>
                            <div>
                              <div style={{ fontWeight: '500' }}>{event.new_status}</div>
                              <div style={{ color: '#6B7280', fontSize: '12px' }}>{new Date(event.created_at).toLocaleString()}</div>
                            </div>
                          </div>
                        )) : (
                          <p style={{ color: '#6B7280', fontSize: '14px' }}>No timeline events found.</p>
                        )}
                      </div>
                    </div>

                    {/* Admin Notes */}
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Admin Notes</h3>
                      <textarea 
                        className="om-input-light"
                        style={{ width: '100%', minHeight: '100px', resize: 'vertical', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                        value={modalAdminNotes}
                        onChange={(e) => setModalAdminNotes(e.target.value)}
                        placeholder="Add internal notes about this order..."
                      ></textarea>
                      <button className="om-btn-save" style={{ marginTop: '12px' }} onClick={async () => {
                         try {
                           await orderService.updateAdminNotes(selectedOrder.id, modalAdminNotes);
                           alert("Admin notes saved!");
                         } catch (err) {
                           alert("Failed to save admin notes: " + err.message);
                         }
                      }}>Save Notes</button>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Payment Info */}
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Payment Details</h3>
                      {selectedOrder.payments?.[0] ? (
                        <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6B7280' }}>Method</span>
                            <span>{selectedOrder.payments[0].gateway}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6B7280' }}>Status</span>
                            <span style={{ fontWeight: '500', color: selectedOrder.payments[0].status === 'CAPTURED' ? '#059669' : '#D97706' }}>{selectedOrder.payments[0].status}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6B7280' }}>Transaction ID</span>
                            <span style={{ wordBreak: 'break-all', textAlign: 'right', marginLeft: '12px' }}>{selectedOrder.payments[0].gateway_payment_id || 'N/A'}</span>
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: '#6B7280', fontSize: '14px' }}>No payment details found.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : <p>Order not found.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
