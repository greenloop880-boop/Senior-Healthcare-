import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../config/supabaseClient';


export default function CheckoutModal() {
  const {
    isCheckoutModalOpen, setIsCheckoutModalOpen,
    showCancelAlert, setShowCancelAlert,
    cart,
    removeFromCart, navigateTo, showToast, userProfile,
    buyNowItem, setBuyNowItem, appliedPromo
  } = useAppContext();

  const checkoutCart = buyNowItem ? [buyNowItem] : cart;
  const subtotal = checkoutCart.reduce((acc, item) => {
    const price = item.selectedSku ? item.selectedSku.selling_price : item.product.price;
    return acc + price * item.quantity;
  }, 0);
  const discountAmount = appliedPromo ? Math.round(subtotal * (appliedPromo.discountPercent / 100)) : 0;
  const deliveryCharges = 0;
  const grandTotal = subtotal - discountAmount + deliveryCharges;

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  
  const [newAddress, setNewAddress] = useState({
    full_name: '', phone: '', address_line1: '', address_line2: '', pincode: '', city: '', state: ''
  });

  const [isOrderSuccessProcessing, setIsOrderSuccessProcessing] = useState(false);

  const finalizeOrderAndNavigate = (orderId, isCOD) => {
    setIsOrderSuccessProcessing(true);
    if (buyNowItem) {
      setBuyNowItem(null);
    } else {
      checkoutCart.forEach(item => removeFromCart(item.cartItemId || item.product.id));
    }
    
    setTimeout(() => {
      setIsCheckoutModalOpen(false);
      setIsOrderSuccessProcessing(false);
      navigateTo('order-success', { orderId: orderId, isCOD: isCOD });
    }, 5000);
  };


  const [userSession, setUserSession] = useState(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  useEffect(() => {
    if (!isCheckoutModalOpen) return;

    // Check if user is logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast("Please log in to proceed to checkout.");
        setIsCheckoutModalOpen(false);
        navigateTo('profile'); 
        return;
      }
      setUserSession(session);
      fetchAddresses(session.user.id);
    };
    checkUser();
  }, [isCheckoutModalOpen]);

  const fetchAddresses = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });
        
      if (!error && data) {
        setAddresses(data);
        if (data.length > 0) {
          const defaultAddr = data.find(a => a.is_default);
          setSelectedAddressId(defaultAddr ? defaultAddr.id : data[0].id);
        } else {
          setShowNewAddressForm(true);
        }
      }
    } catch (err) {
      console.error(err);
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
      setSelectedAddressId(data.id);
      setShowNewAddressForm(false);
      setNewAddress({ full_name: '', phone: '', address_line1: '', address_line2: '', pincode: '', city: '', state: '' });
      showToast("Address added successfully");
    } catch (err) {
      console.error(err);
      showToast("Failed to add address.");
    }
  };

  const handleRazorpayCheckout = async () => {
    if (!selectedAddressId && !showNewAddressForm) {
      showToast("Please select a delivery address.");
      return;
    }
    
    if (showNewAddressForm && (!newAddress.full_name || !newAddress.phone)) {
        showToast("Please save your delivery address first.");
        return;
    }

    const deliveryAddress = addresses.find(a => a.id === selectedAddressId);
    
    if (!deliveryAddress) {
       showToast("Invalid address selected.");
       return;
    }

    if (!userSession) {
      showToast("Please log in to place an order.");
      return;
    }

    setIsProcessing(true);
    try {
      const itemNames = checkoutCart.map(item => item.product.title).join(', ').substring(0, 250);
      
      const { data: orderData, error: orderError } = await supabase.functions.invoke('razorpay', {
        body: { 
          action: 'create_order', 
          amount: grandTotal,
          notes: {
            customer: deliveryAddress.full_name.substring(0, 250),
            phone: deliveryAddress.phone.substring(0, 20),
            items: itemNames
          }
        }
      });

      if (orderError) throw orderError;
      if (!orderData || !orderData.id) throw new Error("Failed to create Razorpay order");

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_T3AU2KuNvZn2ZS', 
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Senior Anandam",
        description: "Order Payment",
        order_id: orderData.id,
        handler: async function (response) {
          // Call the verify_payment action on our fixed edge function
          const { data: verificationData, error: verificationError } = await supabase.functions.invoke('razorpay', {
            body: {
              action: 'verify_payment',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              cartItems: buyNowItem ? [buyNowItem] : checkoutCart,
              customerDetails: {
                name: deliveryAddress.full_name,
                email: userProfile?.email || '',
                phone: deliveryAddress.phone,
                address: deliveryAddress.address_line1 + ' ' + (deliveryAddress.address_line2 || ''),
                pincode: deliveryAddress.pincode,
                city: deliveryAddress.city || 'Default City',
                state: deliveryAddress.state || 'Default State'
              },
              totalAmount: grandTotal,
              userId: userSession?.user?.id
            }
          });

          if (verificationError || !verificationData || verificationData.error) {
             const exactError = verificationError?.message || verificationData?.error || "Unknown Error";
             console.error("Payment verification error:", exactError);
             
             // Log error to database so developers can see it
             await supabase.from('webhook_logs').insert([{
               event_type: 'checkout_error',
               payload: { error: exactError, order_id: response.razorpay_order_id }
             }]);

             showToast("Payment verification failed: " + exactError);
             alert("Payment verification failed: " + exactError); // Ensure user sees it
          } else {
            showToast("Payment Successful! Your order has been placed.");
            finalizeOrderAndNavigate(verificationData.orderId || 'CONFIRMED', false); 
          }
        },
        prefill: {
          name: deliveryAddress.full_name,
          contact: deliveryAddress.phone
        },
        theme: {
          color: "#2F3966" // Updated to dark blue
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        showToast("Payment Failed: " + response.error.description);
      });
      rzp.open();

    } catch (err) {
      console.error(err);
      showToast("Error initiating checkout: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCODCheckout = async () => {
    if (!selectedAddressId && !showNewAddressForm) {
      showToast("Please select a delivery address.");
      return;
    }
    if (showNewAddressForm && (!newAddress.full_name || !newAddress.phone)) {
        showToast("Please save your delivery address first.");
        return;
    }
    const deliveryAddress = addresses.find(a => a.id === selectedAddressId);
    if (!deliveryAddress) {
       showToast("Invalid address selected.");
       return;
    }

    setIsProcessing(true);
    try {
      if (!userSession) {
        showToast("Please log in to place an order.");
        setIsProcessing(false);
        return;
      }

      // Format items for RPC
      const orderItems = checkoutCart.map((item) => ({
        sku_id: item.selectedSku ? item.selectedSku.id : (item.product.skus && item.product.skus.length > 0 ? item.product.skus[0].id : null),
        quantity: item.quantity,
        unit_price: item.selectedSku ? item.selectedSku.selling_price : item.product.price
      }));

      // Call the RPC to securely bypass Row Level Security on insert
      const { data: orderId, error: orderError } = await supabase.rpc('create_cod_order', {
        p_customer_id: userSession.user.id,
        p_total_amount: grandTotal,
        p_address: {
          full_name: deliveryAddress.full_name,
          phone: deliveryAddress.phone,
          address_line1: deliveryAddress.address_line1,
          address_line2: deliveryAddress.address_line2,
          pincode: deliveryAddress.pincode,
          city: deliveryAddress.city || 'Default City',
          state: deliveryAddress.state || 'Default State'
        },
        p_items: orderItems
      });

      if (orderError) {
        console.error("RPC Error placing COD order:", orderError);
        throw new Error("Could not place order");
      }
      
      showToast("Order Placed Successfully via Cash on Delivery!");
      finalizeOrderAndNavigate(orderId, true); 
    } catch (error) {
      console.error(error);
      showToast("Failed to place order.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseClick = () => {
    setShowCancelAlert(true);
  };

  const confirmCancel = () => {
    setShowCancelAlert(false);
    setIsCheckoutModalOpen(false);
    setBuyNowItem(null);
  };

  const denyCancel = () => {
    setShowCancelAlert(false);
  };

  if (!isCheckoutModalOpen) return null;

  const currentAddress = addresses.find(a => a.id === selectedAddressId);

  return (
    <div className="checkout-modal-overlay">
      <div className="checkout-modal-content animate-slide-up" style={{ position: 'relative' }}>
        
        {isOrderSuccessProcessing && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255,255,255,0.98)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, borderRadius: '24px' }}>
            <div style={{ width: '60px', height: '60px', border: '5px solid #E5E7EB', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '24px' }}></div>
            <h2 style={{ fontSize: '24px', color: '#111827', fontWeight: 'bold' }}>Processing Order</h2>
            <p style={{ color: '#6B7280', marginTop: '8px', fontSize: '15px' }}>Please wait, do not refresh or close.</p>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}} />
          </div>
        )}

        {/* Header */}
        <div className="checkout-modal-header">
          <div className="ch-logo-wrapper" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
             <span style={{cursor:'pointer', fontWeight:'bold', color:'#333'}}>←</span>
             <span style={{ fontWeight: 'bold', color: '#2F3966', fontSize: '18px' }}>Senior Anandam</span>
          </div>
          <div className="ch-steps">
             <span className="ch-step active">✓ Address</span>
             <span className="ch-step-dots">....</span>
             <span className="ch-step active">Pay</span>
          </div>
          <button className="ch-close-btn" onClick={handleCloseClick}>✕</button>
        </div>

        {/* Discount Banner */}
        <div className="ch-discount-banner">
           Extra Discount Available at Payment Step
        </div>

        <div className="ch-body-scroll">
          {/* Order Summary Accordion */}
          <div className="ch-section ch-summary">
            <div className="ch-summary-header" onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}>
              <div className="ch-summary-title">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                 Order Summary {isSummaryExpanded ? '∧' : '∨'}
              </div>
              <div className="ch-summary-total">₹{grandTotal}</div>
            </div>
            {isSummaryExpanded && (
              <div className="ch-summary-items">
                {checkoutCart.map((item) => (
                   <div key={item.cartItemId || item.product.id} className="ch-summary-item-row">
                      <span>{item.quantity}x {item.product.title}</span>
                      <span>₹{(item.selectedSku ? item.selectedSku.selling_price : item.product.price) * item.quantity}</span>
                   </div>
                ))}
              </div>
            )}
          </div>

          {/* Welcome Back */}
          {userSession && (
            <div className="ch-welcome">
               Hey! Welcome back <strong>{userProfile?.firstName ? userProfile.firstName : (userSession.user.phone || userSession.user.email)}</strong> <span className="ch-edit-link">Edit</span>
            </div>
          )}

          {/* Deliver To Box */}
          <div className="ch-section ch-address-box">
             <div className="ch-address-header">
                <strong>Deliver To</strong>
                <span className="ch-edit-badge" onClick={() => setShowNewAddressForm(true)}>+ Add New</span>
             </div>
             
             {!showNewAddressForm ? (
               <div className="ch-address-slider">
                 {addresses.map(addr => (
                   <div 
                     key={addr.id} 
                     className={`ch-address-card ${selectedAddressId === addr.id ? 'selected' : ''}`}
                     onClick={() => setSelectedAddressId(addr.id)}
                   >
                     <strong>{addr.full_name}</strong>
                     <p>{addr.address_line1}, {addr.address_line2}</p>
                     <p>{addr.city}, {addr.state}, {addr.pincode}</p>
                     <div className="ch-address-contact">
                        <span>{userSession?.user?.email}</span> | <span>{addr.phone}</span>
                     </div>
                   </div>
                 ))}
                 {addresses.length === 0 && (
                    <div style={{fontSize: '13px', color: '#888', padding: '10px'}}>No address found. Please add a new address.</div>
                 )}
               </div>
             ) : (
               <div className="ch-new-address-form">
                  <input type="text" placeholder="Full Name" value={newAddress.full_name} onChange={e => setNewAddress({...newAddress, full_name: e.target.value})} className="ch-input" />
                  <input type="text" placeholder="Phone" value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} className="ch-input" />
                  <input type="text" placeholder="Address" value={newAddress.address_line1} onChange={e => setNewAddress({...newAddress, address_line1: e.target.value})} className="ch-input" />
                  <input type="text" maxLength={6} placeholder="Pincode" value={newAddress.pincode} onChange={e => setNewAddress({...newAddress, pincode: e.target.value.replace(/\\D/g, '')})} className="ch-input" />
                  <div style={{display:'flex', gap:'10px'}}>
                     <input type="text" placeholder="City" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="ch-input" />
                     <input type="text" placeholder="State" value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} className="ch-input" />
                  </div>
                  <button className="ch-save-btn" onClick={handleSaveNewAddress}>Save Address</button>
               </div>
             )}
          </div>

          <div className="ch-payment-options">
             <p>Payment Options</p>
             <div className={`ch-pay-method ${paymentMethod === 'razorpay' ? 'selected' : ''}`} onClick={() => setPaymentMethod('razorpay')}>
                <input type="radio" checked={paymentMethod === 'razorpay'} readOnly />
                <span>Online Payment (UPI, Cards, Netbanking)</span>
             </div>
             <div className={`ch-pay-method ${paymentMethod === 'cod' ? 'selected' : ''}`} onClick={() => setPaymentMethod('cod')}>
                <input type="radio" checked={paymentMethod === 'cod'} readOnly />
                <span>Cash on Delivery (COD)</span>
             </div>
          </div>
        </div>

        {/* Payment Button Footer */}
        <div className="ch-footer-pay">
          <button 
             className="ch-pay-btn" 
             onClick={paymentMethod === 'razorpay' ? handleRazorpayCheckout : handleCODCheckout}
             disabled={isProcessing || (showNewAddressForm && addresses.length === 0)}
          >
             {isProcessing ? 'Processing...' : (
               <>
                 <span className="ch-pay-upi-text">
                   {paymentMethod === 'razorpay' ? (
                     <>
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                       Pay Online
                     </>
                   ) : (
                     "Place Order (COD)"
                   )}
                 </span>
                 <div className="ch-pay-amount">
                    <span className="ch-pay-strike">₹{grandTotal + 50}</span>
                    <span className="ch-pay-final">₹{grandTotal} &gt;</span>
                 </div>
                 {paymentMethod === 'razorpay' && <div className="ch-cashback-badge">Win Cashback</div>}
               </>
             )}
          </button>
          
          <div className="ch-trust-footer">
             <div className="ch-trust-icons">
                <span>🔒 PCI DSS Certified</span>
                <span>🛡 Secured Payments</span>
                <span>✓ Verified Merchant</span>
             </div>
          </div>
        </div>

      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelAlert && (
        <div className="ch-cancel-alert-overlay">
          <div className="ch-cancel-alert-box">
             <h3>Products are in huge demand<br/><span style={{color: '#F59E0B'}}>may run Out of Stock</span></h3>
             <p>Are you sure you want to cancel payment?</p>
             <div className="ch-cancel-actions">
                <button className="ch-btn-yes" onClick={confirmCancel}>Yes</button>
                <button className="ch-btn-no" onClick={denyCancel}>No</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
