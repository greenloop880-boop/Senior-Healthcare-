import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function OrderSuccessPage() {
  const { navigateTo, currentPageParams, userProfile } = useAppContext();
  const orderId = currentPageParams?.orderId || null;
  const isCOD = currentPageParams?.isCOD === true || currentPageParams?.isCOD === 'true';
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setShowConfetti(true), 300);
  }, []);

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

  return (
    <div className="order-success-wrapper" style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Background Decor */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(47, 57, 102, 0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>

      <div className={`success-card ${showConfetti ? 'visible' : ''}`} style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.6)',
        borderRadius: '24px',
        padding: '30px 24px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
        textAlign: 'center',
        transform: showConfetti ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
        opacity: showConfetti ? 1 : 0,
        transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}>
        
        {/* Animated Checkmark */}
        <div className="checkmark-container" style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
          animation: showConfetti ? 'popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' : 'none'
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="36" height="36" style={{
            strokeDasharray: 50,
            strokeDashoffset: showConfetti ? 0 : 50,
            transition: 'stroke-dashoffset 0.8s ease-in-out 0.3s'
          }}>
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <h1 style={{ 
          fontSize: '26px', 
          color: '#111827', 
          marginBottom: '8px', 
          fontWeight: '800', 
          letterSpacing: '-0.5px',
          background: 'linear-gradient(90deg, #111827 0%, #374151 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {isCOD ? 'Order Confirmed!' : 'Payment Successful!'}
        </h1>
        
        <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '24px', lineHeight: '1.6' }}>
          Thank you, <strong style={{color: '#111827'}}>{userProfile?.firstName || 'Valued Customer'}</strong>! Your {isCOD ? 'Cash on Delivery' : ''} order has been placed successfully. We are preparing it for shipment.
        </p>

        <div style={{ background: '#F9FAFB', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1px solid #E5E7EB', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '4px' }}>Order Reference</div>
              <div style={{ fontSize: '16px', color: '#111827', fontWeight: '700' }}>{orderId ? orderId.substring(0, 12).toUpperCase() : 'N/A'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '4px' }}>Date</div>
              <div style={{ fontSize: '16px', color: '#111827', fontWeight: '700' }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Estimated Delivery</div>
              <div style={{ fontSize: '15px', color: '#111827', fontWeight: '600' }}>By {estimatedDelivery.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
          <button 
            className="btn-track" 
            onClick={() => navigateTo('profile', { activeTab: 'track-order', orderId: orderId })}
            style={{ 
              width: '100%',
              background: '#2F3966', 
              color: '#fff', 
              border: 'none', 
              padding: '16px', 
              borderRadius: '12px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              fontSize: '16px', 
              transition: 'all 0.3s',
              boxShadow: '0 4px 12px rgba(47, 57, 102, 0.2)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(47, 57, 102, 0.3)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(47, 57, 102, 0.2)'; }}
          >
            Track My Order
          </button>
          
          <button 
            onClick={() => navigateTo('collection')}
            style={{ 
              width: '100%',
              background: 'transparent', 
              color: '#4B5563', 
              border: 'none', 
              padding: '16px', 
              borderRadius: '12px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              fontSize: '16px', 
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#111827'; e.currentTarget.style.background = '#F3F4F6'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#4B5563'; e.currentTarget.style.background = 'transparent'; }}
          >
            Continue Shopping
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
}
