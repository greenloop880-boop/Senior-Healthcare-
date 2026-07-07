import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../config/supabaseClient';
import TrackOrder from '../components/TrackOrder';
import OrderStatusBadge from '../components/OrderStatusBadge';

export default function ProfilePage() {
  const { navigateTo, currentPageParams, setHelpFormOpen, showToast, saveUserProfileToDb, userSession, userProfile, userAvatar, setUserAvatar } = useAppContext();

  const [activeTab, setActiveTab] = useState(currentPageParams?.activeTab || 'account');
  const [mobileActiveView, setMobileActiveView] = useState(currentPageParams?.activeTab ? 'content' : 'menu');
  const [trackOrderId, setTrackOrderId] = useState(currentPageParams?.orderId || '');

  useEffect(() => {
    if (currentPageParams?.activeTab) {
      setActiveTab(currentPageParams.activeTab);
      setMobileActiveView('content');
      if (currentPageParams.orderId) {
        setTrackOrderId(currentPageParams.orderId);
      }
    }
  }, [currentPageParams]);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  const [isUpdateEmailModalOpen, setIsUpdateEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [updateEmailStep, setUpdateEmailStep] = useState('EMAIL'); // 'EMAIL' or 'OTP'
  const [newEmailOtp, setNewEmailOtp] = useState('');

  const closeUpdateEmailModal = () => {
    setIsUpdateEmailModalOpen(false);
    setNewEmail('');
    setNewEmailOtp('');
    setUpdateEmailStep('EMAIL');
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showToast("Please enter a valid email address.");
      return;
    }
    setIsUpdatingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setIsUpdatingEmail(false);
    if (error) {
      showToast(error.message);
    } else {
      showToast("OTP sent to your new email. Please check your inbox.");
      setUpdateEmailStep('OTP');
    }
  };

  const handleVerifyNewEmailOtp = async () => {
    if (!newEmailOtp || newEmailOtp.length !== 6) {
      showToast("Please enter a valid 6-digit OTP.");
      return;
    }
    setIsUpdatingEmail(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: newEmail,
      token: newEmailOtp,
      type: 'email_change'
    });
    setIsUpdatingEmail(false);
    if (error) {
      showToast(error.message);
    } else {
      showToast("Email updated successfully!");
      setFormData(prev => ({ ...prev, email: newEmail }));
      
      const currentProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      currentProfile.email = newEmail;
      localStorage.setItem('userProfile', JSON.stringify(currentProfile));
      
      closeUpdateEmailModal();
    }
  };
  const [addresses, setAddresses] = useState([]);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: '', phone: '', address_line1: '', address_line2: '', pincode: '', city: '', state: ''
  });
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({ ...prev, ...userProfile }));
    }
  }, [userProfile]);

  useEffect(() => {
    if (userSession) {
      fetchAddresses(userSession.user.id);
      fetchOrders(userSession.user.id);
    } else {
      showToast("Please log in to view your profile.");
      navigateTo('home');
    }
  }, [userSession]);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchOrders = async (userId) => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items ( *, skus ( sku_code, variant_name, products(name, images, image_url) ) ),
          shipments (*),
          payments (*)
        `)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    const orderToCancel = orders.find(o => o.id === orderId);
    if (orderToCancel) {
      const shipment = orderToCancel.shipments?.[0];
      const isShipped = shipment && ['SHIPPED', 'OUT FOR DELIVERY', 'DELIVERED'].includes(shipment.status);
      if (isShipped || !['DRAFT', 'PENDING', 'PROCESSING'].includes(orderToCancel.status)) {
        showToast("This order has already been shipped and cannot be cancelled.");
        return;
      }
    }

    if (!window.confirm("Are you sure you want to cancel this order? If prepaid, your refund will be processed automatically.")) return;
    try {
      const { data, error } = await supabase.functions.invoke('razorpay', {
        body: { action: 'cancel_order', order_id: orderId }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      showToast("Order cancelled and refund initiated successfully.");
      fetchOrders(userSession.user.id);
    } catch (err) {
      console.error("Cancellation error:", err);
      showToast("Failed to cancel order: " + err.message);
    }
  };

  const fetchAddresses = async (userId) => {
    try {
      const { data, error } = await supabase.from('user_addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false });
      if (error) {
        if (error.code === '42P01') {
          showToast("Database update needed for addresses. Please run the provided SQL script.");
        }
      } else if (data) {
        setAddresses(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNewAddress = async () => {
    if (!newAddress.full_name || !newAddress.phone || !newAddress.address_line1 || !newAddress.pincode || !newAddress.city || !newAddress.state) {
      showToast("Please fill all required address fields.");
      return;
    }
    if (!/^\d{6}$/.test(newAddress.pincode)) {
      showToast("Please enter a valid 6-digit PIN code.");
      return;
    }

    if (addresses.length >= 10) {
      showToast("Maximum 10 addresses allowed.");
      return;
    }

    if (!userSession) {
      showToast("Please log in to manage addresses.");
      return;
    }

    setIsAddingAddress(true);
    try {
      const isFirst = addresses.length === 0;
      const { data, error } = await supabase
        .from('user_addresses')
        .insert([{
          user_id: userSession.user.id,
          ...newAddress,
          is_default: isFirst
        }])
        .select()
        .single();

      if (error) throw error;

      setAddresses([data, ...addresses]);
      setShowNewAddressForm(false);
      setNewAddress({ full_name: '', phone: '', address_line1: '', address_line2: '', pincode: '', city: '', state: '' });
      showToast("Address added successfully");
    } catch (err) {
      console.error(err);
      showToast("Failed to add address.");
    } finally {
      setIsAddingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', userSession.user.id);
      await supabase.from('user_addresses').update({ is_default: true }).eq('id', id);
      fetchAddresses(userSession.user.id);
      showToast("Default address updated.");
    } catch (e) { console.error(e); }
  };

  const handleDeleteAddress = async (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        await supabase.from('user_addresses').delete().eq('id', id);
        setAddresses(addresses.filter(a => a.id !== id));
        showToast("Address deleted.");
      } catch (e) { console.error(e); }
    }
  };

  const [formData, setFormData] = useState(() => {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      return JSON.parse(savedProfile);
    }
    return {
      firstName: '',
      lastName: '',
      dob: '',
      gender: '',
      mobile: '',
      email: ''
    };
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserAvatar(reader.result);
        showToast("Profile photo updated locally.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (formData.dob) {
      const selectedDate = new Date(formData.dob);
      const today = new Date();
      if (selectedDate > today) {
        showToast("Date of birth cannot be in the future.");
        return;
      }
    }

    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        showToast("Please enter a valid email address.");
        return;
      }
    }

    localStorage.setItem('userProfile', JSON.stringify(formData));
    if (userAvatar) {
      localStorage.setItem('userAvatar', userAvatar);
    } else {
      localStorage.removeItem('userAvatar');
    }

    if (userSession) {
      saveUserProfileToDb(formData, userAvatar, userSession.user.id);
    }

    setIsEditing(false);
    showToast("Profile updated successfully!");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userProfile');
    localStorage.removeItem('userAvatar');
    navigateTo('home');
    showToast("Signed out successfully.");
  };

  return (
    <>
      <div className="profile-page-container section-container animate-fade">
      <aside className={`profile-sidebar ${mobileActiveView === 'content' ? 'mobile-hide' : ''}`}>
        <div className="sidebar-avatar-section" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div className="sidebar-avatar" style={{ flexShrink: 0 }}>
            {userAvatar ? (
              <img src={userAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40" style={{ color: '#ccc' }}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
            )}
          </div>
          <div className="sidebar-user-info" style={{ display: 'flex', flexDirection: 'column' }}>
             <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-dark)', lineHeight: '1.2' }}>
               {formData.firstName ? `${formData.firstName} ${formData.lastName}`.trim() : (userSession?.user?.phone || userSession?.user?.email?.split('@')[0] || 'User')}
             </span>
             {formData.email && <span style={{ fontSize: '13px', color: 'var(--text-gray)', marginTop: '4px' }}>{formData.email}</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`sidebar-link ${activeTab === 'account' ? 'active' : ''}`} onClick={() => { setActiveTab('account'); setMobileActiveView('content'); }}>
            My Account
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          <button className={`sidebar-link ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => { setActiveTab('orders'); setMobileActiveView('content'); }}>
            My Orders
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          <button className={`sidebar-link ${activeTab === 'track-order' ? 'active' : ''}`} onClick={() => { setActiveTab('track-order'); setMobileActiveView('content'); setTrackOrderId(''); }}>
            Track Order
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          <button className={`sidebar-link ${activeTab === 'addresses' ? 'active' : ''}`} onClick={() => { setActiveTab('addresses'); setMobileActiveView('content'); }}>
            Manage Addresses
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </nav>

        <div className="sidebar-divider"></div>

        <div className="sidebar-nav-secondary-wrapper">
          <nav className="sidebar-nav-secondary">
            <button className="sidebar-link-alt" onClick={() => setHelpFormOpen(true)}>Need Help?</button>
            <button className="sidebar-link-alt" onClick={() => navigateTo('about')}>About Us</button>
            <button className="sidebar-link-alt" onClick={() => navigateTo('policy')}>Terms & Conditions</button>
          </nav>
        </div>

        <div className="sidebar-logout">
          <button className="btn-signout" onClick={handleSignOut}>Sign Out</button>
        </div>
      </aside>

      <main className={`profile-main-content ${mobileActiveView === 'menu' ? 'mobile-hide' : ''}`}>
        <button 
          className="desktop-hide" 
          onClick={() => setMobileActiveView('menu')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-gray)', fontSize: '15px', fontWeight: '500', cursor: 'pointer', marginBottom: '20px', padding: 0 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Profile
        </button>
        
        {activeTab === 'account' && (
          <div className="animate-fade">
            <h2 className="profile-heading">MY ACCOUNT</h2>

            <div className="account-content-flex">
              <div className="profile-avatar-large-container" style={{ paddingTop: '10px' }}>
                <div className="profile-avatar-large">
                  {userAvatar ? (
                    <img src={userAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="80" height="80" style={{ color: '#aaa' }}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                  )}
                  {isEditing && (
                    <>
                      <button className="avatar-edit-btn" onClick={() => fileInputRef.current.click()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                      </button>
                      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePhotoChange} />
                    </>
                  )}
                </div>
              </div>

              <div className="form-container" style={{ flex: 1 }}>
                <div className="profile-form-grid">
                  <div className="form-group">
                    <label>First Name</label>
                    <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} disabled={!isEditing} className={`profile-input ${!isEditing ? 'disabled-input' : ''}`} />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} disabled={!isEditing} className={`profile-input ${!isEditing ? 'disabled-input' : ''}`} />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <div className="input-with-icon">
                      <input type="date" name="dob" placeholder="Select date" value={formData.dob} onChange={handleChange} disabled={!isEditing} className={`profile-input ${!isEditing ? 'disabled-input' : ''}`} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Gender</label>
                    <div className="input-with-icon">
                      <select name="gender" value={formData.gender} onChange={handleChange} disabled={!isEditing} className={`profile-input ${!isEditing ? 'disabled-input' : ''}`}>
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Mobile Number</label>
                    <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} disabled={!isEditing} className={`profile-input ${!isEditing ? 'disabled-input' : ''}`} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" placeholder="Email Address" value={formData.email} disabled={true} className="profile-input disabled-input" />
                    {!isEditing ? (
                      <button className="btn-edit-inline" onClick={() => setIsEditing(true)}>
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg> Edit profile
                      </button>
                    ) : (
                      <button className="btn-edit-inline" onClick={handleSave} style={{ color: 'var(--primary-red)' }}>
                        Save Changes
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="animate-fade">
            <h2 className="profile-heading">MY ORDERS</h2>
            <div className="orders-disclaimer" style={{ background: '#FFFBEB', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #F59E0B', marginBottom: '24px', fontSize: '13px', color: '#B45309' }}>
              <strong>Notice:</strong> No returns or refunds are allowed after shipment. Cancellations can only be made before the item is shipped.
            </div>

            {loadingOrders ? (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>Loading orders...</p>
            ) : orders.length === 0 ? (
              <div style={{ marginTop: '80px', marginBottom: '80px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div style={{ color: '#000', fontSize: '20px', fontWeight: '400' }}>No orders found</div>
                <button 
                  onClick={() => navigateTo('collection')}
                  style={{ 
                    background: 'var(--primary-red)', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '24px', 
                    padding: '12px 32px', 
                    fontSize: '16px', 
                    cursor: 'pointer'
                  }}
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map(order => {
                  const shipment = order.shipments?.[0];
                  const payment = order.payments?.[0];
                  const isShipped = shipment && ['SHIPPED', 'OUT FOR DELIVERY', 'DELIVERED'].includes(shipment.status);
                  const canCancel = ['DRAFT', 'PENDING', 'PROCESSING'].includes(order.status) && !isShipped;

                  return (
                    <div key={order.id} className="order-card">
                      <div className="order-card-header">
                        <div>
                          <span className="order-id">Order #{order.id.substring(0, 8).toUpperCase()}</span>
                          <span className="order-date">Placed on {new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        <OrderStatusBadge status={order.status} paymentGateway={order.payments?.[0]?.gateway} createdAt={order.created_at} />
                      </div>

                      <div className="order-card-body">
                        {order.order_items?.map(item => (
                          <div key={item.id} className="order-item">
                            <img src={item.skus?.products?.image_url || item.skus?.products?.images?.[0] || 'https://via.placeholder.com/60'} alt={item.skus?.products?.name} className="order-item-img" />
                            <div className="order-item-details">
                              <h4>{item.skus?.products?.name}</h4>
                              {item.skus?.variant_name && <p>Variant: {item.skus.variant_name}</p>}
                              {item.skus?.sku_code && <p className="sku-text" style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'monospace' }}>SKU: {item.skus.sku_code}</p>}
                              <p>Qty: {item.quantity} × ₹{item.price_at_time}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="order-card-footer">
                        <div className="order-totals">
                          <p style={{ marginBottom: '8px' }}><strong>Total Amount:</strong> ₹{order.total_amount}</p>
                          {payment ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ 
                                padding: '4px 8px', 
                                background: payment.gateway?.toLowerCase() === 'cod' ? '#FFFBEB' : '#ECFDF5',
                                color: payment.gateway?.toLowerCase() === 'cod' ? '#B45309' : '#047857',
                                border: `1px solid ${payment.gateway?.toLowerCase() === 'cod' ? '#FDE68A' : '#A7F3D0'}`,
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}>
                                {payment.gateway?.toLowerCase() === 'cod' ? 'Cash on Delivery' : 'Prepaid (Online)'}
                              </span>
                              <span style={{
                                padding: '4px 8px',
                                background: (payment.status === 'PAID' || payment.status === 'captured') ? '#ECFDF5' : (payment.status === 'PENDING' || payment.status === 'CREATED' ? '#FEF2F2' : '#F3F4F6'),
                                color: (payment.status === 'PAID' || payment.status === 'captured') ? '#047857' : (payment.status === 'PENDING' || payment.status === 'CREATED' ? '#B91C1C' : '#374151'),
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}>
                                {payment.status === 'CREATED' && payment.gateway?.toLowerCase() === 'cod' ? 'PENDING' : payment.status}
                              </span>
                            </div>
                          ) : (
                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Payment details pending</div>
                          )}
                          {payment?.status === 'REFUNDED' && (
                            <span style={{ color: 'var(--primary-red)', fontSize: '12px', fontWeight: 'bold', marginTop: '4px', display: 'block' }}>[REFUNDED]</span>
                          )}
                        </div>

                        <div className="order-tracking">
                          {shipment ? (
                            <div className="tracking-info">
                              <strong>Tracking Status:</strong> <span className="tracking-status">{shipment.status}</span>
                              {shipment.tracking_number && <div>AWB: {shipment.tracking_number}</div>}
                            </div>
                          ) : order.status === 'CANCELLED' ? (
                            <div className="tracking-info" style={{ color: 'var(--primary-red)' }}>Order Cancelled</div>
                          ) : (
                            <div className="tracking-info">Processing for shipment...</div>
                          )}
                          {order.status !== 'CANCELLED' && (
                            <button 
                              className="btn-track-order"
                              onClick={() => { setActiveTab('track-order'); setMobileActiveView('content'); setTrackOrderId(order.id); }} 
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                              Track Order
                            </button>
                          )}
                        </div>

                        {canCancel && (
                          <div className="order-actions">
                            <button className="btn-cancel-order" onClick={() => handleCancelOrder(order.id)}>
                              Cancel Order
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'addresses' && (
          <div className="animate-fade">
            <h2 className="profile-heading">MANAGE ADDRESSES</h2>

            {!showNewAddressForm && (
              <div className="profile-address-list" style={{ marginTop: '30px' }}>
                <div className="address-grid">
                  {addresses.map(addr => (
                    <div key={addr.id} className="address-card">
                      <div className="address-card-header">
                        <strong>{addr.full_name || 'Home'}</strong>
                        {addr.is_default && <span className="badge-default">Default <span className="red-dot"></span></span>}
                      </div>
                      <div className="address-card-body">
                        <p>{addr.address_line1}</p>
                        {addr.address_line2 && <p>{addr.address_line2}</p>}
                        <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                        <p className="address-phone">Ph: {addr.phone}</p>
                      </div>
                      <div className="address-card-footer">
                        <button className="btn-text-action" onClick={() => {/* edit logic */ }}>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /></svg> Edit
                        </button>
                        <button className="btn-text-action" onClick={() => handleDeleteAddress(addr.id)}>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg> Delete
                        </button>
                        {!addr.is_default && (
                          <button className="btn-text-primary ml-auto" onClick={() => handleSetDefaultAddress(addr.id)}>Set Default</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {addresses.length < 10 && (
                    <div className="add-address-card" onClick={() => setShowNewAddressForm(true)}>
                      <div className="add-address-icon">+</div>
                      <span>Add New Address</span>
                    </div>
                  )}
                </div>

                {addresses.length >= 10 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-gray)', marginTop: '20px', fontSize: '13px' }}>Maximum limit of 10 addresses reached.</p>
                )}
              </div>
            )}

            {showNewAddressForm && (
              <div className="new-address-form glass-panel" style={{ marginTop: '30px', border: '1px solid #E5E7EB', padding: '24px', borderRadius: '12px' }}>
                <h4 style={{ color: 'var(--dark-blue)', marginBottom: '20px' }}>Add New Address</h4>
                <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <input type="text" placeholder="Full Name *" value={newAddress.full_name} onChange={e => setNewAddress({ ...newAddress, full_name: e.target.value })} className="profile-input" />
                  <input type="tel" placeholder="Mobile Number *" value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} className="profile-input" />
                </div>
                <input type="text" placeholder="Address Line 1 (House No, Building, Street) *" value={newAddress.address_line1} onChange={e => setNewAddress({ ...newAddress, address_line1: e.target.value })} className="profile-input" style={{ marginTop: '20px' }} />
                <input type="text" placeholder="Address Line 2 (Locality, Area)" value={newAddress.address_line2} onChange={e => setNewAddress({ ...newAddress, address_line2: e.target.value })} className="profile-input" style={{ marginTop: '20px' }} />
                <div className="form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
                  <input type="text" maxLength={6} placeholder="PIN Code *" value={newAddress.pincode} onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value.replace(/\\D/g, '') })} className="profile-input" />
                  <input type="text" placeholder="City *" value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} className="profile-input" />
                  <input type="text" placeholder="State *" value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })} className="profile-input" />
                </div>
                <div className="form-actions" style={{ display: 'flex', gap: '16px', marginTop: '30px' }}>
                  <button style={{ flex: 1, padding: '12px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }} onClick={() => setShowNewAddressForm(false)} disabled={isAddingAddress}>Cancel</button>
                  <button className="btn-primary-sm" style={{ flex: 1, padding: '12px', textAlign: 'center', opacity: isAddingAddress ? 0.7 : 1 }} onClick={handleSaveNewAddress} disabled={isAddingAddress}>{isAddingAddress ? 'Adding...' : 'Save Address'}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'track-order' && (
          <TrackOrder initialOrderId={trackOrderId} />
        )}

      </main>
    </div>

      {/* UPDATE EMAIL MODAL OVERLAY */}
      {isUpdateEmailModalOpen && (
        <div className="signin-modal-overlay">
          <div className="signin-modal">
            <button className="signin-close-btn" onClick={closeUpdateEmailModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 className="signin-title">Update email id</h2>

            {updateEmailStep === 'EMAIL' ? (
              <>
                <div className="signin-form-group">
                  <label>new email id</label>
                  <input
                    type="email"
                    placeholder="Enter email address to get started"
                    className="signin-input"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>

                <div className="signin-offer-banner">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--primary-red)">
                    <path d="M12 2l2.4 2.4 3.4-.7.7 3.4 2.4 2.4-1.6 3.1 1.6 3.1-2.4 2.4-.7 3.4-3.4-.7L12 22l-2.4-2.4-3.4.7-.7-3.4-2.4-2.4 1.6-3.1-1.6-3.1 2.4-2.4.7-3.4 3.4.7L12 2z" />
                    <text x="12" y="16.5" fill="#fff" fontSize="11" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">%</text>
                  </svg>
                  <span>Unlock amazing offers by logging in</span>
                </div>

                <button className="signin-get-otp-btn" disabled={isUpdatingEmail} onClick={handleUpdateEmail}>
                  {isUpdatingEmail ? 'Sending...' : 'Get OTP'}
                </button>
              </>
            ) : (
              <>
                <div className="signin-form-group">
                  <label>Enter OTP</label>
                  <input
                    type="text"
                    placeholder="6-digit OTP"
                    className="signin-input"
                    value={newEmailOtp}
                    onChange={(e) => setNewEmailOtp(e.target.value)}
                    maxLength={6}
                  />
                </div>
                <button className="signin-get-otp-btn" disabled={isUpdatingEmail} onClick={handleVerifyNewEmailOtp}>
                  {isUpdatingEmail ? 'Verifying...' : 'Verify OTP'}
                </button>
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#666' }}>Didn't receive code? </span>
                  <button onClick={handleUpdateEmail} style={{ background: 'none', border: 'none', color: 'var(--primary-red)', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                    Resend
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
