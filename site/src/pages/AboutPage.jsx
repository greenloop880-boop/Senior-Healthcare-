import React from 'react';
import aboutusImg from '../assets/aboutus_img.avif';

export default function AboutPage() {
  return (
    <div className="section-container animate-fade">
      <div className="about-hero">
        <span className="section-tag" style={{ color: '#E5A93C', marginBottom: '12px' }}>Clinical Senior Care</span>
        <h1>Experts in Senior Care</h1>
        <p>Senior Anandam brings years of clinical expertise, specialized assistance, and the trusted AnandamNXT legacy to make aging easier for Indian seniors.</p>
      </div>

      <div className="about-milestones">
        <div className="milestone-card">
          <div className="milestone-num">5L+</div>
          <h4 style={{ fontSize: '15px', color: 'var(--text-dark)', fontWeight: '700' }}>Seniors Served</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-gray)', marginTop: '4px' }}>Across diagnostics and supports</p>
        </div>
        <div className="milestone-card">
          <div className="milestone-num">AnandamNXT</div>
          <h4 style={{ fontSize: '15px', color: 'var(--text-dark)', fontWeight: '700' }}>Group Ecosystem</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-gray)', marginTop: '4px' }}>Decades of clinical trust</p>
        </div>
        <div className="milestone-card">
          <div className="milestone-num">4.8★</div>
          <h4 style={{ fontSize: '15px', color: 'var(--text-dark)', fontWeight: '700' }}>Community Rating</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-gray)', marginTop: '4px' }}>Verified customer satisfaction</p>
        </div>
        <div className="milestone-card">
          <div className="milestone-num">APAC</div>
          <h4 style={{ fontSize: '15px', color: 'var(--text-dark)', fontWeight: '700' }}>Award Winner</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-gray)', marginTop: '4px' }}>Eldercare Innovation Honoree</p>
        </div>
      </div>

      <div className="about-story">
        <div className="about-story-text">
          <h2 style={{ fontSize: '28px', color: 'var(--text-dark)', marginBottom: '20px' }}>Our Mission & Values</h2>
          <p>At Senior Anandam, we make aging easier. We recognize that physical independence is the cornerstone of joyful aging. Our products are engineered with clinical supervision to provide joint offloading, fall security, and clean breathing solutions.</p>
          <p>We blend medical-grade ergonomics with senior-friendly details (like large vocal BP outputs, quad cane bases, and soft braces fabric) to ensure ease-of-use without helper reliance.</p>
          <p>Our commitment remains absolute: zero-compromise quality, clinically proven designs, and supportive guidance every step of standard senior living.</p>
        </div>
        <div className="about-story-img">
          <img src={aboutusImg} alt="Active Senior Living" />
        </div>
      </div>
    </div>
  );
}
