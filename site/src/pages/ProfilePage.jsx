import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';

export default function ProfilePage() {
  const { navigateTo, setHelpFormOpen, showToast, saveUserProfileToDb } = useAppContext();
  
  const [activeTab, setActiveTab] = useState('account');
  const [isEditing, setIsEditing] = useState(false);
  const [avatarImg, setAvatarImg] = useState(() => {
    return localStorage.getItem('userAvatar') || null;
  });
  const fileInputRef = useRef(null);

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
      mobile: '7735067724',
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
        setAvatarImg(reader.result);
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
    if (avatarImg) {
      localStorage.setItem('userAvatar', avatarImg);
    } else {
      localStorage.removeItem('userAvatar');
    }

    saveUserProfileToDb(formData, avatarImg);

    setIsEditing(false);
    showToast("Profile updated successfully!");
  };

  const handleSignOut = () => {
    localStorage.removeItem('userProfile');
    localStorage.removeItem('userAvatar');
    navigateTo('home');
    showToast("Signed out successfully.");
  };

  return (
    <div className="profile-page-container section-container animate-fade">
      <aside className="profile-sidebar">
        <div className="sidebar-avatar-section">
          <div className="sidebar-avatar">
            {avatarImg ? (
              <img src={avatarImg} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40" style={{ color: '#ccc' }}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`sidebar-link ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')}>
            My Account
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          <button className={`sidebar-link ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            My Orders
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          <button className={`sidebar-link ${activeTab === 'addresses' ? 'active' : ''}`} onClick={() => setActiveTab('addresses')}>
            Manage Addresses
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </nav>

        <div className="sidebar-divider"></div>

        <nav className="sidebar-nav-secondary">
          <button className="sidebar-link-alt" onClick={() => setHelpFormOpen(true)}>Need Help?</button>
          <button className="sidebar-link-alt" onClick={() => navigateTo('about')}>About Us</button>
          <button className="sidebar-link-alt" onClick={() => navigateTo('policy')}>Terms & Conditions</button>
        </nav>

        <div className="sidebar-logout">
          <button className="btn-signout" onClick={handleSignOut}>Sign Out</button>
        </div>
      </aside>

      <main className="profile-main-content">
        {activeTab === 'account' && (
          <div className="animate-fade">
            <h2 className="profile-heading">MY ACCOUNT</h2>
            
            <div className="profile-avatar-large-container">
              <div className="profile-avatar-large">
                {avatarImg ? (
                  <img src={avatarImg} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="80" height="80" style={{ color: '#aaa' }}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
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
                <input type="text" name="mobile" value={formData.mobile} readOnly className="profile-input disabled-input" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} disabled={!isEditing} className={`profile-input ${!isEditing ? 'disabled-input' : ''}`} />
              </div>
            </div>

            <div className="profile-form-actions">
              {!isEditing ? (
                <button className="btn-edit-profile" onClick={() => setIsEditing(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  Edit
                </button>
              ) : (
                <button className="btn-primary-sm" style={{ padding: '10px 24px' }} onClick={handleSave}>
                  Save Changes
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="animate-fade">
            <h2 className="profile-heading">MY ORDERS</h2>
            <div style={{ marginTop: '40px', textAlign: 'center', color: 'var(--text-gray)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" width="48" height="48" style={{ marginBottom: '16px', opacity: 0.5 }}>
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              <p>You have no past orders.</p>
              <button className="btn-primary-sm" style={{ marginTop: '20px' }} onClick={() => navigateTo('collection')}>Start Shopping</button>
            </div>
          </div>
        )}

        {activeTab === 'addresses' && (
          <div className="animate-fade">
            <h2 className="profile-heading">MANAGE ADDRESSES</h2>
            <div style={{ marginTop: '40px', textAlign: 'center', color: 'var(--text-gray)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" width="48" height="48" style={{ marginBottom: '16px', opacity: 0.5 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <p>No saved addresses found.</p>
              <button className="btn-primary-sm" style={{ marginTop: '20px' }}>Add New Address</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
