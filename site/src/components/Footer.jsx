import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import logoImg from '../assets/logo.png';

export default function Footer() {
  const { navigateTo, subscribeNewsletter } = useAppContext();
  const [emailInput, setEmailInput] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    const success = await subscribeNewsletter(emailInput);
    if (success) {
      setEmailInput('');
    }
  };

  return (
    <footer className="footer-main">
      <div className="footer-top">
        <div className="footer-column">
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); navigateTo('home'); }}
            style={{ display: 'inline-block', marginBottom: '16px', textDecoration: 'none' }}
          >
            <img 
              src={logoImg} 
              alt="Senior Anandam Logo" 
              style={{ height: '65px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} 
            />
          </a>
          <p style={{ marginTop: '16px' }}>Empowering Indian seniors to live active, independent, and joyful lives with premium, clinically approved support products.</p>
          <p><strong>AnandamNXT Company</strong><br />Partner in healthy aging</p>
        </div>

        <div className="footer-column">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="#products" onClick={(e) => { e.preventDefault(); navigateTo('collection'); }}>Products Range</a></li>
            <li><a href="#categories" onClick={(e) => { e.preventDefault(); navigateTo('collection'); }}>Categories List</a></li>
            <li><a href="#health-reviews" onClick={(e) => { e.preventDefault(); navigateTo('home'); setTimeout(() => { const el = document.getElementById("health-reviews"); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100); }}>Health Assessment</a></li>
            <li><a href="#about" onClick={(e) => { e.preventDefault(); navigateTo('about'); }}>About Our Legacy</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Support Policy</h3>
          <ul>
            <li><a href="#return" onClick={(e) => { e.preventDefault(); navigateTo('policy', { policyKey: 'return' }); }}>Return & Refund Policy</a></li>
            <li><a href="#cancel" onClick={(e) => { e.preventDefault(); navigateTo('policy', { policyKey: 'cancellation' }); }}>Cancellation Policy</a></li>
            <li><a href="#grievance" onClick={(e) => { e.preventDefault(); navigateTo('policy', { policyKey: 'grievance' }); }}>Grievance Redressal</a></li>
            <li><a href="#privacy" onClick={(e) => { e.preventDefault(); navigateTo('policy', { policyKey: 'privacy' }); }}>Privacy & Security</a></li>
            <li><a href="#terms" onClick={(e) => { e.preventDefault(); navigateTo('policy', { policyKey: 'terms' }); }}>Terms of Service</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Stay Updated</h3>
          <p>Subscribe to receive medical advice, healthy aging guides, and exclusive product discounts.</p>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              className="newsletter-input"
              placeholder="Enter email address"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
            <button type="submit" className="btn-newsletter-submit">JOIN</button>
          </form>
          <div className="social-links">
            <a href="https://instagram.com" className="social-icon" target="_blank" rel="noreferrer">📷</a>
            <a href="https://linkedin.com" className="social-icon" target="_blank" rel="noreferrer">💼</a>
            <a href="https://facebook.com" className="social-icon" target="_blank" rel="noreferrer">📘</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <span>© 2026 Senior Anandam. All Rights Reserved.</span>
          <div className="payment-gateways">
            <span style={{ fontSize: '11px', marginRight: '6px' }}>SECURE PAYMENTS:</span>
            <span style={{ color: '#FFFFFF', fontWeight: 'bold' }}>VISA   &nbsp; &nbsp; | &nbsp; &nbsp; MASTERCARD &nbsp; &nbsp; | &nbsp; &nbsp;  UPI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
