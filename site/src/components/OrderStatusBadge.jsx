import React, { useState, useEffect } from 'react';

export default function OrderStatusBadge({ status, paymentGateway, createdAt, inlineStyle }) {
  const [displayStatus, setDisplayStatus] = useState(status);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const isCOD = paymentGateway?.toLowerCase() === 'cod';
    if (status === 'PENDING' && isCOD) {
      const orderTime = new Date(createdAt).getTime();
      const now = new Date().getTime();
      const diff = now - orderTime;
      
      if (diff < 5000) {
        setIsLoading(true);
        setDisplayStatus('Pending...');
        
        const timer = setTimeout(() => {
          setIsLoading(false);
          setDisplayStatus('Order Placed');
        }, 5000 - diff);
        
        return () => clearTimeout(timer);
      } else {
        setDisplayStatus('Order Placed');
      }
    } else {
      if (status === 'PENDING') {
        setDisplayStatus('Order Placed'); // Map all pending to Order Placed in UI for better UX
      } else {
        setDisplayStatus(status);
      }
    }
  }, [status, paymentGateway, createdAt]);

  return (
    <div className={inlineStyle ? '' : 'order-status-badge'} data-status={status} style={inlineStyle ? { ...inlineStyle, display: 'inline-flex', alignItems: 'center', gap: '6px' } : { display: 'flex', alignItems: 'center', gap: '6px' }}>
      {isLoading && (
        <svg viewBox="0 0 50 50" style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }}>
          <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray="30, 200" strokeLinecap="round" />
        </svg>
      )}
      {displayStatus}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
