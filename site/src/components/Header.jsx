import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, UserIcon, CartIcon, ChevronDownIcon, CloseIcon, ArrowIcon } from './Icons';
import { supabase } from '../config/supabaseClient';
import { useQuery } from '@tanstack/react-query';

import { useAppContext } from '../context/AppContext';
import logoImg from '../assets/logo.png';

export default function Header() {
  const {
    isMobileMenuOpen, setIsMobileMenuOpen,
    navigateTo,
    isSearchOpen, setIsSearchOpen,
    isCartOpen, setIsCartOpen,
    cart,
    setHelpFormOpen,
    searchQuery, setSearchQuery,
    currentPage,
    userSession, showToast
  } = useAppContext();

  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginStep, setLoginStep] = useState('EMAIL'); // 'EMAIL' | 'OTP'
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [megaScrollOffset, setMegaScrollOffset] = useState(0);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  const megaMenuRef = useRef(null);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        document.documentElement.style.setProperty('--header-height', `${entry.target.offsetHeight}px`);
      }
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleGetOtp = async () => {
    if (!loginEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      showToast("Please enter a valid email address.");
      return;
    }
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithOtp({ email: loginEmail });
    setIsLoggingIn(false);
    if (error) {
      showToast(error.message);
    } else {
      showToast("OTP sent to your email!");
      setLoginStep('OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (!loginOtp || loginOtp.length < 6) {
      showToast("Please enter a valid OTP.");
      return;
    }
    setIsLoggingIn(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: loginEmail,
      token: loginOtp,
      type: 'email'
    });
    setIsLoggingIn(false);
    if (error) {
      showToast(error.message);
    } else if (data.session) {
      showToast("Logged in successfully!");
      setIsSignInModalOpen(false);
      navigateTo('profile');
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (megaMenuRef.current && !megaMenuRef.current.contains(event.target)) {
        setIsMegaMenuOpen(false);
      }
    }

    if (isMegaMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMegaMenuOpen]);

  useEffect(() => {
    function handleSearchClickOutside(event) {
      const isOutsideDesktop = searchRef.current ? !searchRef.current.contains(event.target) : true;
      const isOutsideMobile = mobileSearchRef.current ? !mobileSearchRef.current.contains(event.target) : true;

      if (isOutsideDesktop && isOutsideMobile) {
        setIsSearchOpen(false);
      }
    }

    if (isSearchOpen) {
      document.addEventListener("mousedown", handleSearchClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleSearchClickOutside);
    };
  }, [isSearchOpen, setIsSearchOpen]);

  const handleMegaScroll = (direction) => {
    const itemWidth = 200; // 180px + 20px gap
    // Total width of all items minus the last gap (20px), minus container width (1180px)
    const maxOffset = Math.max(0, (categoriesList.length * itemWidth) - 20 - 1180);

    let newOffset = megaScrollOffset + (direction === 'left' ? -400 : 400);
    if (newOffset < 0) newOffset = 0;
    if (newOffset > maxOffset) newOffset = maxOffset;

    setMegaScrollOffset(newOffset);
  };

  // Search execution with debounce
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [focusedSearchIndex, setFocusedSearchIndex] = useState(-1);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setFocusedSearchIndex(-1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // TanStack Queries for Header Data
  const { data: categoriesList = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').is('deleted_at', null).eq('is_active', true);
      return (data || []).map(c => ({ ...c, title: c.name }));
    }
  });

  const { data: announcementText = "<strong>IMPORTANT :</strong> Dear Customer, Senior Anandam never asks for additional payments, OTPs, bank details, or personal information over phone calls. If you receive any suspicious calls, please report: <strong>+91 9911789911</strong> or email: <strong>support@senioranandam.com</strong>" } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data } = await supabase.from('announcements').select('*');
      return (data && data.length > 0) ? data[0].text : undefined;
    }
  });

  const { data: recommendedProducts = [] } = useQuery({
    queryKey: ['recommendedProducts'],
    queryFn: async () => {
      const { data } = await supabase.from('products')
        .select('id, name, skus(selling_price)')
        .ilike('specs', '%__RECOMMENDED__%')
        .limit(4);
      return (data || []).map(p => {
        const price = p.skus && p.skus.length > 0 ? Number(p.skus[0].selling_price) : 0;
        return { ...p, title: p.name, price };
      });
    }
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['search', debouncedSearchQuery],
    queryFn: async () => {
      if (!debouncedSearchQuery.trim()) return [];
      const { data } = await supabase.from('products')
        .select('id, name, image_url, skus(selling_price)')
        .ilike('name', `%${debouncedSearchQuery}%`)
        .limit(8);
      return (data || []).map(p => {
        const price = p.skus && p.skus.length > 0 ? Number(p.skus[0].selling_price) : 0;
        return { ...p, title: p.name, price };
      });
    },
    enabled: debouncedSearchQuery.length > 0
  });

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSearchIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSearchIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedSearchIndex >= 0 && focusedSearchIndex < searchResults.length) {
        const selected = searchResults[focusedSearchIndex];
        setIsSearchOpen(false);
        setSearchQuery("");
        navigateTo('product-detail', { productId: selected.id });
      } else if (searchQuery.trim()) {
        setIsSearchOpen(false);
        navigateTo('search', { q: searchQuery.trim() });
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  // recommendedProducts is now handled by useQuery above

  return (
    <>
      {/* NAVBAR */}
      <header ref={headerRef} className="header-main" style={{ padding: 0, position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000, transform: 'translateZ(0)' }}>
        {/* TOP ANNOUNCEMENT STRIP */}
        <div className="top-strip">
          <div className="marquee-content" dangerouslySetInnerHTML={{ __html: announcementText }} />
        </div>

        <div className="navbar-container">
          <div className="header-left">
            <button
              className="icon-btn mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <CloseIcon />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              )}
            </button>
            <a
              href="/"
              className="logo-container"
              onClick={(e) => { e.preventDefault(); navigateTo('home'); }}
              style={{ textDecoration: 'none' }}
            >
              <img src={logoImg} alt="Senior Anandam Logo" style={{ height: '45px', objectFit: 'contain', transform: 'scale(1.4)', transformOrigin: 'left center' }} />
            </a>
          </div>

          <nav style={{ marginLeft: 'auto', marginRight: '32px' }}>
            <ul className="nav-links">
              <li><a href="#products" onClick={(e) => { e.preventDefault(); navigateTo('collection'); }}>All Products</a></li>
              <li className="dropdown-trigger" ref={megaMenuRef}>
                <a href="#categories" onClick={(e) => { e.preventDefault(); setIsMegaMenuOpen(!isMegaMenuOpen); }}>
                  Categories <ChevronDownIcon />
                </a>

                {isMegaMenuOpen && (
                  <div className="mega-menu" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100vw',
                    backgroundColor: '#FAFAFA',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    padding: '40px 0',
                    zIndex: 200,
                    borderTop: '1px solid #EBEBEB'
                  }}>
                    <div style={{ position: 'relative', maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
                      <button style={{ position: 'absolute', left: '-20px', background: '#fff', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', zIndex: 10, cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', color: '#333' }} onClick={() => handleMegaScroll('left')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                      </button>
                      <div style={{ overflow: 'hidden', padding: '10px 0', width: '100%', margin: '0 10px' }}>
                        <div className="swiper-wrapper" style={{ display: 'flex', gap: '20px', transition: 'transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)', transform: `translate3d(-${megaScrollOffset}px, 0px, 0px)` }}>
                          {categoriesList.map((cat, idx) => (
                            <div key={idx} onClick={() => { setIsMegaMenuOpen(false); navigateTo('collection', { activeCategory: cat.title }); }} style={{
                              position: 'relative',
                              flex: '0 0 auto',
                              width: '180px',
                              aspectRatio: '1 / 1',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                              transition: 'box-shadow 0.2s, transform 0.2s',
                            }}>
                              <img src={cat.image_url} alt={cat.title} loading="lazy" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
                              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)', zIndex: 1 }}></div>
                              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '16px 12px', zIndex: 2, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: '1.3', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{cat.title}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button style={{ position: 'absolute', right: '-20px', background: '#fff', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', zIndex: 10, cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', color: '#333' }} onClick={() => handleMegaScroll('right')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </button>
                    </div>
                  </div>
                )}
              </li>
              <li><a href="#about" onClick={(e) => { e.preventDefault(); navigateTo('about'); }}>About Us</a></li>
              <li><a href="#help" onClick={(e) => { e.preventDefault(); setHelpFormOpen(true); }}>Need Help</a></li>
              <li>
                <a
                  href="https://senioranandam.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  Explore
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#FFC107',
                    color: '#000',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    padding: '3px'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"></line><polyline points="10 5 19 5 19 14"></polyline></svg>
                  </span>
                </a>
              </li>
            </ul>
          </nav>

          <div className="header-actions">
            {isSearchOpen ? (
              <div className="inline-search-container mobile-hide" ref={searchRef}>
                <div className={`desktop-search-input-box ${!searchQuery.trim() ? 'show-recommended' : 'show-results'}`}>
                  <SearchIcon />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    autoFocus
                  />

                </div>

                <div className="desktop-search-dropdown">
                  {!debouncedSearchQuery.trim() ? (
                    <div className="desktop-search-recommended">
                      <h4>Popular Searches</h4>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        {['BP Monitor', 'Walking Stick', 'Nebulizer', 'Neck Pillow'].map(term => (
                          <button key={term} className="filter-chip" onClick={() => { setIsSearchOpen(false); navigateTo('search', { q: term }); }}>{term}</button>
                        ))}
                      </div>
                      <h4>Recommended</h4>
                      <div className="desktop-search-rec-list">
                        {recommendedProducts.length > 0 ? (
                          recommendedProducts.map(prod => (
                            <div key={prod.id} className="desktop-search-rec-item" onClick={() => { setIsSearchOpen(false); navigateTo('product-detail', { productId: prod.id }) }}>
                              <span>{prod.title}</span>
                              <ArrowIcon direction="right" />
                            </div>
                          ))
                        ) : (
                          <div style={{ color: 'var(--text-gray)', fontSize: '14px' }}>No recommended products found.</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="desktop-search-results">
                      {searchResults.length > 0 ? (
                        searchResults.map((prod, idx) => (
                          <div
                            key={prod.id}
                            onClick={() => {
                              navigateTo('product-detail', { productId: prod.id });
                              setIsSearchOpen(false);
                              setSearchQuery("");
                            }}
                            className={`desktop-search-result-item ${focusedSearchIndex === idx ? 'focused' : ''}`}
                            style={focusedSearchIndex === idx ? { backgroundColor: '#f0f0f0' } : {}}
                          >
                            <img src={prod.image_url} alt={prod.title} loading="lazy" />
                            <div>
                              <div className="result-title">{prod.title}</div>
                              <div className="result-price">₹{prod.price}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '16px 24px', color: 'var(--text-gray)', fontSize: '15px' }}>
                          No products found. Press Enter to view more results.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                className="icon-btn"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search"
              >
                <SearchIcon />
              </button>
            )}
            <button className="icon-btn" aria-label="Profile" onClick={() => {
              if (userSession) {
                navigateTo('profile');
              } else {
                setLoginEmail('');
                setLoginOtp('');
                setLoginStep('EMAIL');
                setIsSignInModalOpen(true);
              }
            }}>
              <UserIcon />
            </button>
            <div className="action-btn-wrapper">
              <button
                className="icon-btn"
                onClick={() => setIsCartOpen(true)}
                aria-label="Open Cart"
              >
                <CartIcon />
              </button>
              {cart.length > 0 && (
                <span className="cart-badge">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE NAV PANEL (Moved inside header to position below it) */}
        <div
          className={`mobile-nav-panel ${isMobileMenuOpen ? 'open' : ''}`}
          style={{ position: 'absolute', top: '100%', left: 0, width: '85%', height: 'calc(100vh - 100%)', boxShadow: '2px 0 15px rgba(0,0,0,0.1)', overflowY: 'auto' }}
        >

          <ul className="mobile-nav-links" style={{ listStyle: 'none', padding: '0px 5px', margin: 0 }}>
            <li style={{ padding: '12px 0' }}>
              <a href="/" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); navigateTo('home'); }} style={{ textDecoration: 'none', color: 'var(--primary-red)', fontSize: '20px', fontWeight: '600', display: 'block' }}>Home</a>
            </li>
            <li style={{ padding: '12px 0' }}>
              <a href="#products" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); navigateTo('collection'); }} style={{ textDecoration: 'none', color: 'var(--primary-red)', fontSize: '20px', fontWeight: '600', display: 'block' }}>All Products</a>
            </li>
            <li style={{ padding: '12px 0' }}>
              <div
                className="mobile-dropdown-btn"
                onClick={() => setIsMobileCategoriesOpen(!isMobileCategoriesOpen)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--primary-red)', fontSize: '20px', fontWeight: '600', cursor: 'pointer' }}
              >
                Categories
                <span style={{ transform: isMobileCategoriesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>
                  <ChevronDownIcon />
                </span>
              </div>

              {isMobileCategoriesOpen && (
                <div className="mobile-dropdown-content" style={{ paddingLeft: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {categoriesList.map((cat) => (
                    <a
                      key={cat.title}
                      href="#products"
                      onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); navigateTo('collection', { activeCategory: cat.title }); }}
                      style={{ textDecoration: 'none', color: 'var(--text-dark)', fontSize: '16px', fontWeight: '500', display: 'block' }}
                    >
                      {cat.title}
                    </a>
                  ))}
                </div>
              )}
            </li>
            <li style={{ padding: '12px 0' }}>
              <a href="#about" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); navigateTo('about'); }} style={{ textDecoration: 'none', color: 'var(--primary-red)', fontSize: '20px', fontWeight: '600', display: 'block' }}>About Us</a>
            </li>
            <li style={{ padding: '12px 0' }}>
              <a href="#help" onClick={(e) => { e.preventDefault(); setHelpFormOpen(true); setIsMobileMenuOpen(false); }} style={{ textDecoration: 'none', color: 'var(--primary-red)', fontSize: '20px', fontWeight: '600', display: 'block' }}>Need Help</a>
            </li>
            <li style={{ padding: '12px 0' }}>
              <a href="https://senioranandam.in" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'var(--primary-red)', fontSize: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Explore
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFC107',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  padding: '4px'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"></line><polyline points="10 5 19 5 19 14"></polyline></svg>
                </span>
              </a>
            </li>
          </ul>
        </div>
      </header>



      {/* MOBILE SEARCH PAGE */}
      <div className={`mobile-search-page desktop-hide ${isSearchOpen ? 'open' : ''}`} ref={mobileSearchRef}>
        <div className="mobile-search-header">
          <button className="mobile-search-back-btn" onClick={() => setIsSearchOpen(false)}>
            <ArrowIcon direction="left" />
          </button>
          <h2>Search</h2>
        </div>
        <div className="mobile-search-body">
          <div className="mobile-search-input-wrapper">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />

          </div>
          {!debouncedSearchQuery.trim() ? (
            <div className="mobile-search-recommended">
              <h4>Popular Searches</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {['BP Monitor', 'Walking Stick', 'Nebulizer', 'Neck Pillow'].map(term => (
                  <button key={term} className="filter-chip" onClick={() => { setIsSearchOpen(false); navigateTo('search', { q: term }); }}>{term}</button>
                ))}
              </div>
              <h4>Recommended</h4>
              <div className="mobile-search-recommended-list">
                {recommendedProducts.length > 0 ? (
                  recommendedProducts.map(prod => (
                    <div key={prod.id} className="mobile-search-rec-item" onClick={() => { setIsSearchOpen(false); navigateTo('product-detail', { productId: prod.id }) }}>
                      <span>{prod.title}</span>
                      <ArrowIcon direction="right" />
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-gray)', fontSize: '14px' }}>No recommended products found.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="mobile-search-results">
              {searchResults.length > 0 ? (
                searchResults.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      navigateTo('product-detail', { productId: prod.id });
                      setIsSearchOpen(false);
                      setSearchQuery("");
                    }}
                    style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid #eee' }}
                  >
                    <img src={prod.image_url} alt={prod.title} loading="lazy" style={{ width: '50px', height: '50px', borderRadius: '4px', objectFit: 'cover' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-dark)' }}>{prod.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--primary-red)', fontWeight: '600' }}>₹{prod.price}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '16px 0', color: 'var(--text-gray)', fontSize: '15px', textAlign: 'center' }}>
                  No products found. Press Go/Enter to view more.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SIGN IN MODAL OVERLAY */}
      {isSignInModalOpen && (
        <div className="signin-modal-overlay">
          <div className="signin-modal">
            <button className="signin-close-btn" onClick={() => setIsSignInModalOpen(false)}>
              <CloseIcon />
            </button>
            <h2 className="signin-title">Sign In</h2>

            {loginStep === 'EMAIL' ? (
              <>
                <div className="signin-form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter email address to get started"
                    className="signin-input"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>

                <div className="signin-offer-banner">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--primary-red)">
                    <path d="M12 2l2.4 2.4 3.4-.7.7 3.4 2.4 2.4-1.6 3.1 1.6 3.1-2.4 2.4-.7 3.4-3.4-.7L12 22l-2.4-2.4-3.4.7-.7-3.4-2.4-2.4 1.6-3.1-1.6-3.1 2.4-2.4.7-3.4 3.4.7L12 2z" />
                    <text x="12" y="16.5" fill="#fff" fontSize="11" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">%</text>
                  </svg>
                  <span>Unlock amazing offers by logging in</span>
                </div>

                <button className="signin-get-otp-btn" disabled={isLoggingIn} onClick={handleGetOtp}>
                  {isLoggingIn ? 'Sending...' : 'Get OTP'}
                </button>
              </>
            ) : (
              <>
                <div className="signin-form-group">
                  <label>Enter OTP</label>
                  <input
                    type="text"
                    placeholder=""
                    className="signin-input"
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value)}
                    maxLength={8}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-gray)' }}>Sent to {loginEmail}</span>
                  <button style={{ background: 'none', border: 'none', color: 'var(--primary-red)', cursor: 'pointer', fontWeight: '600' }} onClick={handleGetOtp} disabled={isLoggingIn}>
                    Resend OTP
                  </button>
                </div>

                <button className="signin-get-otp-btn" disabled={isLoggingIn} onClick={handleVerifyOtp} style={{ marginTop: '20px' }}>
                  {isLoggingIn ? 'Verifying...' : 'Verify & Login'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
