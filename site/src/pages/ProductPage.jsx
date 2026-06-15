import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, StarIcon, UserIcon, CloseIcon } from '../components/Icons';

import { useAppContext } from '../context/AppContext';
import banner1 from '../assets/feature_banner_1.avif';
import banner2 from '../assets/feature_banner_2.avif';
import banner3 from '../assets/feature_banner_3.avif';
import banner4 from '../assets/feature_banner_4.avif';

const getCategoryDetails = (category, title) => {
  const cat = (category || "").toLowerCase();
  const t = (title || "").toLowerCase();
  
  if (cat.includes("device") || cat.includes("nebulizer") || cat.includes("bp monitor") || t.includes("monitor") || t.includes("nebulizer")) {
    return {
      shortDesc: `Experience clinical-grade reliability with ${title}, designed to provide accurate tracking and ease of use in the comfort of your home.`,
      highlights: [
        { icon: 'accuracy', text: 'Clinical-Grade Accuracy' },
        { icon: 'operation', text: 'One-Touch Operation' },
        { icon: 'display', text: 'Easy-to-Read Screen' },
        { icon: 'portable', text: 'Compact & Portable' }
      ],
      howToUseHeader: 'How to Use (For Accurate Readings)',
      howToUseBody: 'Please consult the user manual included in the packaging for detailed instructions to ensure the most accurate readings/results and optimal usage of the product.'
    };
  }
  
  if (cat.includes("gut") || cat.includes("consti") || cat.includes("probiotic") || t.includes("diaper") || t.includes("capsules") || t.includes("powder")) {
    return {
      shortDesc: `Promote daily wellness with ${title}, carefully formulated to support healthy digestion and improve overall wellness.`,
      highlights: [
        { icon: 'organic', text: '100% Safe & Organic' },
        { icon: 'toxin', text: 'Toxin & Chemical Free' },
        { icon: 'clinically', text: 'Clinically Tested' },
        { icon: 'digest', text: 'Easy to Consume' }
      ],
      howToUseHeader: 'Suggested Usage & Dosage',
      howToUseBody: 'Please take as directed by your physician or consult the packaging instructions for the recommended dosage and optimal results.'
    };
  }

  if (cat.includes("support") || cat.includes("cushion") || cat.includes("pillow") || cat.includes("safety") || cat.includes("wheelchair") || cat.includes("walker") || t.includes("chair") || t.includes("bar") || t.includes("belt") || t.includes("brace") || t.includes("pillow")) {
    return {
      shortDesc: `Experience reliable support with ${title}, designed to ease discomfort while ensuring all-day comfort and stability.`,
      highlights: [
        { icon: 'stretch', text: 'Flexible & Adaptive Fit' },
        { icon: 'comfort', text: 'Premium Comfort Lining' },
        { icon: 'antislip', text: 'Stable Anti-Slip Design' },
        { icon: 'breathable', text: 'Breathable Fabric/Material' }
      ],
      howToUseHeader: 'How to Use',
      howToUseBody: 'Please consult the user manual included in the packaging for detailed instructions on adjustment, fitting, and usage to ensure safety and comfort.'
    };
  }

  // Fallback
  return {
    shortDesc: `Enhance daily living and independence with ${title}, crafted from premium materials for reliability and ease of use.`,
    highlights: [
      { icon: 'quality', text: 'Premium Quality Materials' },
      { icon: 'comfort', text: 'Ergonomic & Comfortable' },
      { icon: 'durable', text: 'Heavy-Duty Durability' },
      { icon: 'easy', text: 'Easy to Use & Maintain' }
    ],
    howToUseHeader: 'How to Use',
    howToUseBody: 'Please consult the user manual included in the packaging for detailed instructions to ensure optimal usage of the product.'
  };
};

const renderHighlightIcon = (iconName) => {
  switch (iconName) {
    case 'accuracy':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
      );
    case 'operation':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
      );
    case 'display':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
      );
    case 'portable':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
      );
    case 'organic':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22c1.25-3.87 3.96-7.05 7.62-8.77C12.35 12.01 15.65 11 19 11h3v3c0 3.35-1.01 6.65-2.23 9.38C18.05 20.04 14.87 17.25 11 16c-1.72 3.66-4.9 6.37-8.77 7.62A20.9 20.9 0 0 1 2 22z"></path><path d="M19 11V6a2 2 0 0 0-2-2h-5"></path></svg>
      );
    case 'toxin':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
      );
    case 'clinically':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      );
    case 'digest':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2zm0 13c-2.33 0-4.307 1.196-5.12 3h10.24c-.813-1.804-2.79-3-5.12-3zm-3.5-5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"></path></svg>
      );
    case 'stretch':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="19 9 22 12 19 15"></polyline><polyline points="9 19 12 22 15 19"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>
      );
    case 'comfort':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><circle cx="15.5" cy="8.5" r="1.5"></circle><circle cx="8.5" cy="15.5" r="1.5"></circle><circle cx="15.5" cy="15.5" r="1.5"></circle></svg>
      );
    case 'antislip':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
      );
    case 'breathable':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path></svg>
      );
    case 'quality':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
      );
    case 'durable':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
      );
    case 'easy':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
      );
    default:
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      );
  }
};

export default function ProductPage() {
  const { currentPageParams, allProductsList, navigateTo, addToCart, handleCheckout, showToast } = useAppContext();
  const prodId = currentPageParams.productId;
  const prod = allProductsList.find(p => p.id === prodId);
  const catDetails = prod ? getCategoryDetails(prod.category_title, prod.title) : null;


  // Extract variants from specs
  const parsedVariants = [];
  const normalSpecs = [];
  let parsedGallery = [];
  
  if (prod && prod.specs) {
    prod.specs.forEach(s => {
      if (s.startsWith('__VARIANTS__:')) {
        try {
          const vConfig = JSON.parse(s.replace('__VARIANTS__:', ''));
          if (Array.isArray(vConfig)) {
            parsedVariants.push(...vConfig);
          }
        } catch (e) { console.error(e); }
      } else if (s.startsWith('__GALLERY__:')) {
        try {
          parsedGallery = JSON.parse(s.replace('__GALLERY__:', ''));
        } catch (e) { console.error(e); }
      } else if (s !== '__RECOMMENDED__') {
        normalSpecs.push(s);
      }
    });
  }

  const [qty, setQty] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [pincode, setPincode] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [openAccordion, setOpenAccordion] = useState(null);

  useEffect(() => {
    // Initialize default variants
    if (parsedVariants.length > 0 && Object.keys(selectedVariants).length === 0) {
      const initial = {};
      parsedVariants.forEach(v => {
        if (v.options && v.options.length > 0) {
          initial[v.label] = v.options[0];
        }
      });
      setSelectedVariants(initial);
    }
  }, [parsedVariants, selectedVariants]);

  if (!prod) {
    return (
      <div className="section-container" style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h3>Product Not Found</h3>
        <button className="btn-primary-sm" style={{ width: 'auto', marginTop: '16px' }} onClick={() => navigateTo('collection')}>Back to Products</button>
      </div>
    );
  }

  const catName = prod.category_title || "All Products";

  const handleAddToCart = () => {
    addToCart(prod, qty, selectedVariants);
  };

  const handleBuyNow = () => {
    addToCart(prod, qty, selectedVariants);
    handleCheckout();
  };

  const toggleAccordion = (id) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  const validGallery = parsedGallery.filter(url => url && url.trim() !== '');
  const thumbnails = [prod.image_url, ...validGallery];

  return (
    <div className="product-detail-container animate-fade">
      <div className="breadcrumb-nav">
        <span onClick={() => navigateTo('home')}>Home</span>
        <span className="separator">›</span>
        <span onClick={() => navigateTo('collection')}>All Products</span>
        <span className="separator">›</span>
        <span onClick={() => navigateTo('collection', { activeCategory: catName })}>{catName}</span>
        <span className="separator">›</span>
        <span className="current">{prod.title}</span>
      </div>

      <div className="product-detail-main">
        <div className="product-gallery-section">

          <div className="gallery-main-img-wrapper">
            <button className="share-btn-top-right mobile-hide" onClick={() => showToast('Link copied!')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
            <button className="gallery-arrows left-arrow" onClick={() => setActiveImage((activeImage - 1 + thumbnails.length) % thumbnails.length)}>❮</button>
            <img src={thumbnails[activeImage]} alt={prod.title} className="gallery-main-img" />
            <button className="gallery-arrows right-arrow" onClick={() => setActiveImage((activeImage + 1) % thumbnails.length)}>❯</button>
          </div>
          {thumbnails.length > 1 && (
            <>
              <div className="gallery-dots">
                {thumbnails.map((_, idx) => (
                  <span key={idx} className={`dot ${activeImage === idx ? 'active' : ''}`} onClick={() => setActiveImage(idx)}></span>
                ))}
              </div>
              <div className="gallery-thumbnails">
                {thumbnails.map((imgUrl, idx) => (
                  <div key={idx} className={`thumbnail-card ${activeImage === idx ? 'active' : ''}`} onClick={() => setActiveImage(idx)}>
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} loading="lazy" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="product-info-section">
          <h1 className="product-title-large">{prod.title}</h1>
          <div className="badges-row">
            <span className="bestseller-badge">★ BESTSELLER</span>
            <span className="rating-pill">
              <span className="star-icon">★</span> {prod.rating}
              <span className="review-count">({prod.reviewsCount} Reviews)</span>
            </span>
          </div>

          <div className="price-block">
            <span className="current-price">₹{prod.price}</span>
            <span className="mrp-price">₹{prod.mrp}</span>
            <span className="discount-green">{prod.discount}</span>
          </div>
          <div className="tax-incl-text">(incl of all taxes)</div>

          <div className="product-highlights">
            <p className="product-short-desc">
              {catDetails ? catDetails.shortDesc : `Experience reliable support with ${prod.title}, designed to ease discomfort while ensuring all-day comfort and stability.`}
            </p>
            <div className="highlights-grid">
              {catDetails && catDetails.highlights.map((h, i) => (
                <div key={i} className="highlight-item">
                  <div className="highlight-icon">
                    {renderHighlightIcon(h.icon)}
                  </div>
                  <span>{h.text}</span>
                </div>
              ))}
            </div>
          </div>

          {parsedVariants.length > 0 && (
            <div className="product-variants-section" style={{ marginTop: '24px', marginBottom: '24px' }}>
              {parsedVariants.map((v, idx) => (
                <div key={idx} style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '500', marginBottom: '12px', color: '#111' }}>{v.label}</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {v.options.map((opt, i) => {
                      const isSelected = selectedVariants[v.label] === opt;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedVariants(prev => ({ ...prev, [v.label]: opt }))}
                          style={{
                            padding: '8px 24px',
                            borderRadius: '30px',
                            border: `1px solid ${isSelected ? 'var(--primary-red)' : '#ccc'}`,
                            backgroundColor: isSelected ? '#fef2f2' : '#fff',
                            color: isSelected ? 'var(--primary-red)' : '#333',
                            fontSize: '14px',
                            fontWeight: isSelected ? '500' : '400',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="cart-action-row">
            <div className="quantity-selector">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}>-</button>
              <input type="text" value={qty} readOnly />
              <button onClick={() => setQty(q => q + 1)}>+</button>
            </div>
          </div>

          <div className="action-buttons-large desktop-only">
            <button className="btn-add-to-cart-large" onClick={handleAddToCart}>Add to Cart</button>
            <button className="btn-buy-now-large" onClick={handleBuyNow}>Buy Now</button>
          </div>

          <div className="mobile-delivery-block desktop-only">
            <span><span className="free-text">Free</span> Delivery by Jun 14 to 110001</span>
            <div className="location-action" onClick={() => showToast("Change location")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
              <span>Check Location</span>
            </div>
          </div>

          {/* Mobile-Only Action Block directly after quantity */}
          <div className="mobile-buy-block mobile-only" style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
            <button onClick={handleAddToCart} style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--primary-red)', border: '1px solid var(--primary-red)', borderRadius: '30px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>Add to Cart</button>
            <button onClick={handleBuyNow} style={{ flex: 1, backgroundColor: 'var(--primary-red)', color: '#FFF', border: 'none', borderRadius: '30px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>Buy Now</button>
          </div>

          <div className="pincode-checker-section desktop-only">
            <h4>Check Delivery Location</h4>
            <div className="pincode-input-group">
              <input
                type="text"
                placeholder="Enter PIN code"
                value={pincode}
                onChange={e => setPincode(e.target.value)}
              />
              <button className="btn-pincode-check" onClick={() => showToast("Delivery available at this PIN code!")}>Check</button>
            </div>
          </div>

          {/* Mobile-Only Pincode Checker */}
          <div className="mobile-pincode-checker mobile-only" style={{ marginTop: '24px', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#0d1b2a', marginBottom: '12px' }}>Check Delivery Location</h4>
            <div style={{ display: 'flex', alignItems: 'center', background: '#F5F5F5', borderRadius: '12px', padding: '6px' }}>
              <input
                type="text"
                placeholder="Enter PIN code"
                value={pincode}
                onChange={e => setPincode(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', padding: '10px 12px', fontSize: '16px', outline: 'none' }}
              />
              <button onClick={() => showToast("Delivery available at this PIN code!")} style={{ background: 'transparent', color: 'var(--primary-red)', border: '1px solid var(--primary-red)', borderRadius: '30px', padding: '8px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Check</button>
            </div>
          </div>

          <div className="product-accordions">
            <div className="accordion-item">
              <button className={`accordion-header ${openAccordion === "desc" ? 'active' : ''}`} onClick={() => toggleAccordion("desc")}>
                <span>Product Description</span>
                <ChevronDownIcon />
              </button>
              <div className={`accordion-collapse ${openAccordion === "desc" ? 'open' : ''}`}>
                <div className="accordion-collapse-inner">
                  <div className="accordion-content">
                    <p>{prod.description}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <button className={`accordion-header ${openAccordion === "features" ? 'active' : ''}`} onClick={() => toggleAccordion("features")}>
                <span>Key Features</span>
                <ChevronDownIcon />
              </button>
              <div className={`accordion-collapse ${openAccordion === "features" ? 'open' : ''}`}>
                <div className="accordion-collapse-inner">
                  <div className="accordion-content">
                    {normalSpecs && normalSpecs.length > 0 ? (
                      <ul style={{ paddingLeft: '20px', margin: 0 }}>
                        {normalSpecs.map((spec, i) => (
                          <li key={i} style={{ marginBottom: '8px' }}>{spec}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No specific features listed for this product.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <button className={`accordion-header ${openAccordion === "usage" ? 'active' : ''}`} onClick={() => toggleAccordion("usage")}>
                <span>{catDetails ? catDetails.howToUseHeader : 'How to Use'}</span>
                <ChevronDownIcon />
              </button>
              <div className={`accordion-collapse ${openAccordion === "usage" ? 'open' : ''}`}>
                <div className="accordion-collapse-inner">
                  <div className="accordion-content">
                    <p>{catDetails ? catDetails.howToUseBody : 'Please consult the user manual included in the packaging for detailed instructions.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WHY INDIA TRUSTS Senior Anandam */}
      <section className="section-container" id="trust-section" style={{ backgroundColor: '#F9F9F9', paddingTop: '48px', paddingBottom: '48px', marginTop: '40px', borderRadius: 'var(--radius-md)' }}>
        <div className="section-heading-wrapper" style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h2 className="section-heading" style={{ color: 'var(--text-dark)', fontSize: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>WHY INDIA TRUSTS Senior Anandam?</h2>
        </div>
        <div className="trust-grid">
          <div className="trust-card">
            <div className="trust-icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <p className="trust-title">Trusted By</p>
            <h3 className="trust-desc">5L+ Customers</h3>
          </div>
          <div className="trust-card">
            <div className="trust-icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />
              </svg>
            </div>
            <p className="trust-title">Part of</p>
            <h3 className="trust-desc">AnandamNXT</h3>
          </div>
          <div className="trust-card">
            <div className="trust-icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </div>
            <p className="trust-title">Top Rated</p>
            <h3 className="trust-desc">Premium Quality Products</h3>
          </div>
          <div className="trust-card">
            <div className="trust-icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
            </div>
            <p className="trust-title">Honored By</p>
            <h3 className="trust-desc">The Innovation Award at Eldercare, APAC</h3>
          </div>
        </div>
      </section>

      {/* Promotional Banners */}
      {(() => {
        const detailBanners = (prod.detail_banners && prod.detail_banners.filter(url => url && url.trim() !== '').length > 0)
          ? prod.detail_banners.filter(url => url && url.trim() !== '')
          : [banner1, banner2, banner3, banner4];
        
        return detailBanners.length > 0 && (
          <div className="feature-banners-section" style={{ marginTop: '24px', paddingBottom: '24px' }}>
              {detailBanners.map((url, idx) => (
                <img key={idx} src={url} alt={`Feature Banner ${idx + 1}`} className="feature-banner-img" loading="lazy" style={{ width: '100%', height: 'auto', display: 'block' }} />
              ))}
            </div>
        );
      })()}

      <div className="product-reviews-section">
        <div className="reviews-summary-col">
          <h3 className="reviews-heading">Customer Reviews <span className="chevron-right">›</span></h3>
          <div className="reviews-rating-overall">
            <div className="stars-row">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} filled={i < Math.round(prod.rating || 5)} />
              ))}
            </div>
            <span className="rating-text">{prod.rating || 5} out of 5</span>
          </div>
          <p className="global-ratings-text">{prod.reviews_count || 0} global ratings</p>

          <button className="write-review-btn">Write a review</button>
        </div>

        <div className="reviews-list-col">
          <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: '#FAF8F5', borderRadius: '12px', border: '1px solid #EBEBEB' }}>
            <p style={{ color: 'var(--text-dark)', fontSize: '15px', fontWeight: '500', marginBottom: '6px' }}>No customer reviews yet</p>
            <p style={{ color: 'var(--text-gray)', fontSize: '13px' }}>Be the first to write a review and help other customers with their purchase decision!</p>
          </div>
        </div>
      </div>

      {/* Need Assistance Section */}
      <div className="assistance-banner" style={{
        backgroundColor: '#053e7a',
        borderRadius: 'var(--radius-lg)',
        padding: '32px 48px',
        marginTop: '20px',
        marginBottom: '60px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '24px'
      }}>
        <div style={{ color: 'white', fontSize: '20px', fontWeight: '500' }}>
          Need Assistance?
        </div>
        <div className="assistance-buttons" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'white', color: '#333',
            border: 'none', borderRadius: '30px',
            padding: '12px 24px', fontSize: '15px', fontWeight: '500',
            cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }} onClick={() => showToast('Opening WhatsApp...')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            Connect on WhatsApp
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'white', color: '#333',
            border: 'none', borderRadius: '30px',
            padding: '12px 24px', fontSize: '15px', fontWeight: '500',
            cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }} onClick={() => showToast('Initiating call...')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            Connect on Call
          </button>
        </div>
      </div>

      {/* FAQs Section */}
      <section className="faq-section">
        <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '40px', fontWeight: '700', color: 'var(--primary-red)' }}>FAQs</h2>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
          {((prod.faqs && prod.faqs.length > 0) ? prod.faqs : [
            { q: "My elderly parent lives alone. Will they actually be able to use this without help?", a: "Detailed answer will be available soon." },
            { q: "How is this different from cheaper massage devices I've seen at pharmacies for ₹300 - ₹500?", a: "Detailed answer will be available soon." },
            { q: "How long before I actually feel a difference?", a: "Detailed answer will be available soon." },
            { q: "The product page says 4 hours battery, but the FAQ says 3 hours - which is correct?", a: "Detailed answer will be available soon." }
          ]).map((faq, idx, arr) => (
            <div key={idx} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--primary-red)' }}>
              <div style={{
                padding: '24px 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
              }} onClick={() => toggleAccordion(`faq-${idx}`)}>
                <span style={{ fontSize: '15px', fontWeight: '400', color: 'var(--text-dark)' }}>{faq.q}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openAccordion === `faq-${idx}` ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <div className={`accordion-collapse ${openAccordion === `faq-${idx}` ? 'open' : ''}`}>
                <div className="accordion-collapse-inner" style={{ color: '#666', fontSize: '14px' }}>
                  <div style={{ paddingBottom: '24px' }}>
                    <p>{faq.a}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Product Details Section */}
      <section style={{
        paddingTop: '40px',
        paddingBottom: '80px',
        maxWidth: '900px',
        margin: '0 auto',
        paddingLeft: '24px',
        paddingRight: '24px'
      }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '40px', fontWeight: '700', color: 'var(--primary-red)' }}>Product Details</h2>
        <div className="product-details-table">
          {[
            { label: 'Marketed by', value: prod.marketed_by || 'Senior Anandam Assisted Care Services Limited Plot No. 65, 2nd Floor, Landmark House,Sector- 44, Gurugram -122003, Haryana' },
            { label: 'Net Quantity', value: prod.net_quantity || '1 Unit' },
            { label: 'Country of Origin', value: prod.country_of_origin || 'China' },
            { label: 'Included Components', value: prod.included_components || '1 Unit massage gun with 4 heads, 1 Unit type-C charging cable, 1 Unit warranty card, 1 Unit User Manual' },
            { label: 'Customer Care Details', value: prod.customer_care_details || 'Contact No +91 9911789911 , Email ID- support@senioranandam.com , Address - Senior Anandam Assisted Care Services Limited Plot No. 65, 2nd Floor, Landmark House, Sector- 44, Gurugram -122003, Haryana' },
            { label: 'Dimensions (if applicable)', value: prod.dimensions || '13.2*5*14.4 cm centimeters' },
            { label: 'Common or Generic Name of Commodity', value: prod.generic_name || 'Massage Gun' },
            { label: 'Name and Address of the Manufacturer', value: prod.manufacturer_details || 'ZHEJIANG LUYAO ELECTRONICS TECHNOLOGY CO., LTD, Wei 1st Road, Mechanical Park, Wanquan Light Industrial Base, Pingyang, Wenzhou, Zhejiang -325409, China' },
            { label: 'Maximum Retail Price (MRP) inclusive of taxes', value: `₹${prod.mrp || 1599}` }
          ].map((item, idx) => (
            <div key={idx} className="product-details-row">
              <div className="product-details-label">
                {item.label}
              </div>
              <div className="product-details-value">
                {item.value}
              </div>
            </div>
          ))}

          <div style={{ padding: '24px', fontSize: '14px', color: '#111', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '12px', fontWeight: '500', fontSize: '15px' }}>Why Trust Senior Anandam</div>
            <div>Senior Anandam is part of AnandamNXT, India's leading healthcare and senior care ecosystem trusted by 3 lakh+ customers across India. It was honored with the Innovation Award at Eldercare, APAC.</div>
          </div>
        </div>
      </section>


    </div>
  );
}
