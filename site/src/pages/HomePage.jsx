import React, { useEffect, useRef, useState } from 'react';
import { ArrowIcon, StarIcon } from '../components/Icons';
import { IMAGES, COMMUNITY_VIDEOS, PREMIUM_CUSTOMER_REVIEWS } from '../config/images';
import { useAppContext } from '../context/AppContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../config/supabaseClient';
import expertBanner from '../assets/expert banner.png';

export default function HomePage() {
  const {
    currentPage, navigateTo, heroIndex, setHeroIndex, carouselTimer,
    activeBestSellersTab, setActiveBestSellersTab, addToCart, setIsCheckoutModalOpen, setIsCartOpen,
    setActiveQuizId, setActiveVideoId, setActiveReviewDetail,
    currentScrollDot, setCurrentScrollDot, reviewsScrollRef
  } = useAppContext();

  const queryClient = useQueryClient();

  const { data: heroBanners = [], isLoading: isLoadingHero } = useQuery({
    queryKey: ['heroBanners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hero_banners').select('*').order('id');
      if (error) { console.error('Hero Error:', error); throw error; }
      return data || [];
    }
  });

  const { data: categoriesList = [], isLoading: isLoadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').is('deleted_at', null).eq('is_active', true);
      if (error) { console.error('Categories Error:', error); throw error; }
      return (data || []).map(c => ({ ...c, title: c.name }));
    }
  });

  const { data: concernsList = [] } = useQuery({
    queryKey: ['concerns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('concerns').select('*').eq('is_active', true);
      if (error) { console.error('Concerns Error:', error); throw error; }
      return (data || []).map(c => ({ ...c, title: c.name }));
    }
  });

  const { data: healthReviews = [] } = useQuery({
    queryKey: ['healthReviews'],
    queryFn: async () => {
      const { data } = await supabase.from('health_reviews').select('*').order('id');
      return data || [];
    }
  });

  const { data: communityVideos = [] } = useQuery({
    queryKey: ['communityVideos'],
    queryFn: async () => {
      const { data } = await supabase.from('community_videos').select('*');
      return data || [];
    }
  });

  const { data: customerReviews = [] } = useQuery({
    queryKey: ['customerReviews'],
    queryFn: async () => {
      const { data } = await supabase.from('customer_reviews').select('*').order('id');
      return data || [];
    }
  });

  const { data: homepageProducts = {}, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['homepageProducts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products')
        .select('*, categories(name), skus(id, selling_price, mrp, inventory(quantity_available))')
        .eq('is_active', true)
        .limit(24);
      
      if (error) { console.error('Products Error:', error); throw error; }
      
      const processed = (data || []).map(p => {
        const price = p.skus && p.skus.length > 0 ? Number(p.skus[0].selling_price) : 0;
        const mrp = p.skus && p.skus.length > 0 ? Number(p.skus[0].mrp) : 0;
        const totalStock = p.skus?.reduce((sum, sku) => sum + (sku.inventory?.reduce((invSum, inv) => invSum + (inv.quantity_available || 0), 0) || 0), 0) || 0;
        return {
          ...p,
          title: p.name,
          category_title: p.categories?.name || 'Other',
          price, mrp, totalStock,
          discount: (mrp > 0 && price < mrp) ? Math.round(((mrp - price) / mrp) * 100) + '% off' : ''
        };
      });

      const grouped = {
        'All': processed
      };
      processed.forEach(p => {
        const cat = p.category_title;
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p);
      });
      return grouped;
    }
  });

  const groupedProducts = homepageProducts;

  const [tabsScrollOffset, setTabsScrollOffset] = useState(0);
  const tabsContainerRef = useRef(null);
  const tabsListRef = useRef(null);
  const productsScrollRef = useRef(null);
  const [featuredVideoIndex, setFeaturedVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const nextFeaturedVideo = () => {
    if (!communityVideos || communityVideos.length === 0) return;
    setFeaturedVideoIndex((prev) => (prev + 1) % communityVideos.length);
    setIsPlaying(false);
  };

  const prevFeaturedVideo = () => {
    if (!communityVideos || communityVideos.length === 0) return;
    setFeaturedVideoIndex((prev) => (prev - 1 + communityVideos.length) % communityVideos.length);
    setIsPlaying(false);
  };

  const activeBanners = (heroBanners || []).filter(
    (banner) => banner && banner.image_url && banner.image_url.trim() !== ''
  );

  const safeHeroIndex = activeBanners.length > 0 ? (heroIndex % activeBanners.length + activeBanners.length) % activeBanners.length : 0;

  // Sequential Banner Prefetching
  useEffect(() => {
    if (activeBanners.length > 1) {
      const nextIndex = (safeHeroIndex + 1) % activeBanners.length;
      const nextBanner = activeBanners[nextIndex];
      if (nextBanner) {
        const isMobile = window.innerWidth <= 768;
        const imgUrl = isMobile ? (nextBanner.mobile_image_url || nextBanner.image_url) : nextBanner.image_url;
        if (imgUrl) {
          const img = new Image();
          img.src = imgUrl;
        }
      }
    }
  }, [safeHeroIndex, activeBanners]);

  const scrollReviewsSlider = (dir) => {
    if (reviewsScrollRef.current) {
      reviewsScrollRef.current.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
    }
  };

  const scrollProducts = (dir) => {
    if (productsScrollRef.current) {
      productsScrollRef.current.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (productsScrollRef.current) {
      productsScrollRef.current.scrollLeft = 0;
    }
  }, [activeBestSellersTab]);

  const handleTabsScroll = (direction) => {
    if (tabsContainerRef.current && tabsListRef.current) {
      const totalWidth = tabsListRef.current.scrollWidth;
      const visibleWidth = tabsContainerRef.current.clientWidth;
      const maxOffset = Math.max(0, totalWidth - visibleWidth);
      const scrollAmount = 300;
      let newOffset = tabsScrollOffset + (direction === 'left' ? -scrollAmount : scrollAmount);
      if (newOffset < 0) newOffset = 0;
      if (newOffset > maxOffset) newOffset = maxOffset;
      setTabsScrollOffset(newOffset);
    }
  };

  // Autoplay Hero Banner Effect
  useEffect(() => {
    if (currentPage === "home") {
      startAutoplay();
    } else {
      stopAutoplay();
    }
    return () => stopAutoplay();
  }, [heroIndex, currentPage, activeBanners.length]);

  const startAutoplay = () => {
    stopAutoplay();
    if (activeBanners.length <= 1) return;
    carouselTimer.current = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
  };

  const stopAutoplay = () => {
    if (carouselTimer.current) clearInterval(carouselTimer.current);
  };

  // Scroll and dot navigation for premium customer reviews
  const handleReviewsScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const clientWidth = e.target.clientWidth;
    const scrollWidth = e.target.scrollWidth;

    if (scrollLeft < clientWidth / 2) setCurrentScrollDot(0);
    else if (scrollLeft > scrollWidth - clientWidth * 1.5) setCurrentScrollDot(1);
  };

  const handleReviewsDotClick = (dotIdx) => {
    if (reviewsScrollRef.current) {
      const { scrollWidth, clientWidth } = reviewsScrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const targetScroll = dotIdx === 0 ? 0 : maxScroll;
      reviewsScrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
      setCurrentScrollDot(dotIdx);
    }
  };
  const startQuiz = (quizId) => {
    setActiveQuizId(quizId);
  };

  return (
    <>
      {/* HERO SKELETON */}
      {isLoadingHero && (
        <section className="hero-banner-section" style={{ background: '#e0e0e0', animation: 'pulse 1.5s infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        </section>
      )}

      {/* HERO CAROUSEL */}
      {activeBanners.length > 0 && (
        <section className="hero-banner-section" onMouseEnter={stopAutoplay} onMouseLeave={startAutoplay}>
          <div className="hero-slider">
            <div 
              className="hero-slider-track" 
              style={{ transform: `translateX(-${safeHeroIndex * 100}%)` }}
            >
              {activeBanners.map((banner, idx) => (
                <div
                  key={banner.id}
                  className={`hero-slide ${idx === safeHeroIndex ? 'active' : ''}`}
                  onClick={() => navigateTo('collection')}
                  style={{ cursor: 'pointer' }}
                >
                  <picture>
                    <source media="(max-width: 768px)" srcSet={banner.mobile_image_url} />
                    <img src={banner.image_url} alt="Senior Anandam Banner" className="hero-bg-img" loading={idx === 0 ? "eager" : "lazy"} />
                  </picture>
                </div>
              ))}
            </div>
          </div>

          {activeBanners.length > 1 && (
            <>
              <button
                className="carousel-btn prev"
                onClick={() => setHeroIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length)}
                aria-label="Previous Slide"
              >
                <ArrowIcon direction="left" />
              </button>
              <button
                className="carousel-btn next"
                onClick={() => setHeroIndex((prev) => (prev + 1) % activeBanners.length)}
                aria-label="Next Slide"
              >
                <ArrowIcon direction="right" />
              </button>

              <div className="carousel-bullets">
                {activeBanners.map((_, idx) => (
                  <button
                    key={idx}
                    className={`bullet ${idx === safeHeroIndex ? 'active' : ''}`}
                    onClick={() => setHeroIndex(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* SENIOR FIRST BANNER */}
      <div className="senior-first-banner">
        Senior First Science Backed
      </div>

      {/* SHOP BY CONCERN */}
      <section className="section-container" id="concerns">
        <div className="section-heading-wrapper" style={{ paddingTop: '30px', paddingBottom: '10px' }}>
          <h2 className="section-heading">SHOP BY CONCERN</h2>
        </div>
        <div className="concern-grid">
          {concernsList.map((concern, idx) => (
            <a
              key={idx}
              href="#products"
              className="concern-card"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('collection', { activeConcern: concern.title });
              }}
            >
              <div className="concern-image-wrapper">
                <img src={concern.image_url} alt={concern.title} loading="lazy" />
              </div>
              <div className="concern-title-box">
                <h3 className="concern-title">{concern.title}</h3>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* SHOP BY CATEGORY */}
      <section className="section-container" id="categories" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
        <div className="section-heading-wrapper">
          <span className="section-tag">Browse All Items</span>
          <h2 className="section-heading">SHOP BY CATEGORY</h2>
        </div>
        <div className="category-scroll-container">
          <div className="category-grid">
            {isLoadingCats ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="category-card" style={{ background: '#f5f5f5', animation: 'pulse 1.5s infinite', border: 'none' }}>
                  <div style={{ height: '100px' }}></div>
                </div>
              ))
            ) : (
              categoriesList.map((cat, idx) => (
                <a
                  key={idx}
                  href="#products"
                  className="category-card"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('collection', { activeCategory: cat.title });
                  }}
                >
                  <span className="category-card-title">{cat.title}</span>
                  <div className="category-card-img-wrapper">
                    <img src={cat.image_url} alt={cat.title} className="category-card-img" loading="lazy" />
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </section>

      {/* QUICK HEALTH REVIEW */}
      <section className="section-container health-bg" id="health-reviews" style={{ paddingLeft: '135px', paddingRight: '135px', paddingBottom: '40px' }}>
        <div className="section-heading-wrapper" style={{ paddingBottom: '25px' }}>
          <h2 className="section-heading">LET'S DO A QUICK HEALTH REVIEW</h2>
        </div>
        <div className="health-grid">
          {healthReviews.map((review, idx) => (
            <div className="health-card" key={idx}>
              <div className="health-card-img-wrapper">
                <img src={review.image_url} alt={review.title} className="health-review-img" loading="lazy" />
                <span className="health-card-tag">{review.tag}</span>
              </div>
              <div className="health-card-content">
                <h3 className="health-card-title">{review.title}</h3>
                <p className="health-card-desc">{review.description}</p>
                <button
                  className="health-card-btn"
                  onClick={() => startQuiz(review.quiz_id)}
                >
                  START QUICK TEST
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* WHY INDIA TRUSTS Senior Anandam */}
      <section className="section-container" id="trust-section" style={{ backgroundColor: '#FFFFFF', paddingTop: '40px', paddingBottom: '10px', marginTop: '20px', marginBottom: '0px' }}>
        <div className="section-heading-wrapper" style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h2 className="section-heading" style={{ color: 'var(--text-dark)', fontSize: '32px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>WHY INDIA TRUSTS Senior Anandam?</h2>
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

      {/* BEST SELLERS SECTION */}
      <section className="section-container" id="products" style={{ paddingTop: '20px', paddingBottom: '30px' }}>
        <div className="section-heading-wrapper">
          <h2 className="section-heading">BEST SELLERS</h2>
        </div>

        <div className="tabs-container-with-arrows">
          <button className="tabs-arrow left-arrow" onClick={() => handleTabsScroll('left')}><ArrowIcon direction="left" /></button>
          <div className="tabs-scroll-container" ref={tabsContainerRef} style={{ overflow: 'hidden' }}>
            <div className="tabs-list" ref={tabsListRef} style={{ transition: 'transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)', transform: `translate3d(-${tabsScrollOffset}px, 0px, 0px)` }}>
              {Object.keys(groupedProducts).map((tabName, index) => {
                const isActive = activeBestSellersTab === tabName || (index === 0 && !groupedProducts[activeBestSellersTab]);
                return (
                  <button
                    key={tabName}
                    className={`tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveBestSellersTab(tabName)}
                  >
                    {tabName}
                  </button>
                );
              })}
            </div>
          </div>
          <button className="tabs-arrow right-arrow" onClick={() => handleTabsScroll('right')}><ArrowIcon direction="right" /></button>
        </div>
        
        <div className="products-slider-container">
          {(() => {
            const currentTab = groupedProducts[activeBestSellersTab] ? activeBestSellersTab : Object.keys(groupedProducts)[0];
            return (
              <>
                {(groupedProducts[currentTab] || []).length > 1 && (
                  <>
                    <button className="slider-arrow-btn left" onClick={() => scrollProducts('left')} aria-label="Scroll products left"><ArrowIcon direction="left" /></button>
                    <button className="slider-arrow-btn right" onClick={() => scrollProducts('right')} aria-label="Scroll products right"><ArrowIcon direction="right" /></button>
                  </>
                )}
                <div className="products-slider-track" ref={productsScrollRef}>
                  {isLoadingProducts ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div className="product-card animate-slide-up" key={i} style={{ background: '#f5f5f5', animation: 'pulse 1.5s infinite' }}>
                        <div className="product-card-img-wrapper" style={{ background: '#e0e0e0' }}></div>
                        <div className="product-card-content">
                          <div style={{ height: '20px', background: '#e0e0e0', marginBottom: '10px', borderRadius: '4px' }}></div>
                          <div style={{ height: '15px', background: '#e0e0e0', width: '80%', marginBottom: '20px', borderRadius: '4px' }}></div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ height: '36px', background: '#e0e0e0', flex: 1, borderRadius: '4px' }}></div>
                            <div style={{ height: '36px', background: '#e0e0e0', flex: 1, borderRadius: '4px' }}></div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    groupedProducts[currentTab]?.map((prod) => (
                      <div className="product-card animate-slide-up" key={prod.id}>
                        <div
                          className="product-card-img-wrapper"
                          onClick={() => navigateTo('product-detail', { productId: prod.id })}
                        >
                          <img src={prod.image_url} alt={prod.title} loading="lazy" />
                        </div>
                        <div className="product-card-content">
                          <h3
                            className="product-card-title"
                            onClick={() => navigateTo('product-detail', { productId: prod.id })}
                          >
                            {prod.title}
                          </h3>
                          <p className="product-card-desc">{prod.description}</p>
                          <div className="product-card-price-row">
                            <span className="product-price">₹{prod.price}</span>
                            <span className="product-mrp">MRP ₹{prod.mrp}</span>
                            <span className="product-discount">{prod.discount}</span>
                          </div>
                          <div className="product-card-actions">
                            {prod.totalStock <= 0 ? (
                              <button
                                className="btn-out-of-stock"
                                disabled
                                style={{ gridColumn: 'span 2', backgroundColor: '#f1f5f9', color: '#94a3b8', border: 'none', borderRadius: '30px', padding: '10px', fontSize: '12px', fontWeight: '700', cursor: 'not-allowed', textAlign: 'center' }}
                              >
                                Out of Stock
                              </button>
                            ) : (
                              <>
                                <button
                                  className="btn-secondary-sm"
                                  onClick={() => addToCart(prod)}
                                >
                                  Add to Cart
                                </button>
                                <button
                                  className="btn-primary-sm"
                                  onClick={() => { addToCart(prod); setIsCartOpen(false); setIsCheckoutModalOpen(true); }}
                                >
                                  Buy Now
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* MOBILE ASSISTANCE BLOCK */}
      <section className="section-container mobile-assistance-section" id="mobile-assistance">
        <div className="mobile-assistance-card">
          <h3 className="mobile-assistance-heading">Need Assistance?</h3>
          <button className="mobile-assistance-btn whatsapp-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.7925 2.47167 15.4746 3.29813 16.9248L2 22L7.20235 20.7516C8.66598 21.551 10.2877 22 12 22Z" fill="#25D366" />
              <path d="M17.11 15.63C16.89 16.27 15.77 16.8 15.17 16.88C14.65 16.95 13.9 17.07 11.23 15.96C8.01 14.62 5.92 11.33 5.76 11.11C5.6 10.89 4.47 9.38 4.47 7.82C4.47 6.26 5.27 5.49 5.59 5.16C5.87 4.86 6.32 4.73 6.75 4.73C6.89 4.73 7.01 4.74 7.12 4.74C7.5 4.74 7.69 4.76 7.94 5.37C8.24 6.09 8.97 7.88 9.06 8.07C9.15 8.26 9.24 8.52 9.1 8.79C8.97 9.07 8.87 9.2 8.67 9.42C8.48 9.64 8.27 9.88 8.1 10.05C7.9 10.24 7.69 10.45 7.92 10.85C8.15 11.24 8.96 12.56 10.15 13.62C11.69 15 12.92 15.42 13.35 15.6C13.78 15.78 14.04 15.75 14.28 15.5C14.53 15.24 15.26 14.39 15.53 14.02C15.81 13.65 16.07 13.71 16.46 13.86C16.85 14.01 18.9 15.02 19.3 15.22C19.7 15.42 19.96 15.52 20.06 15.68C20.16 15.84 20.16 16.59 19.86 17.34L17.11 15.63Z" fill="white" />
            </svg>
            Connect on WhatsApp
          </button>
          <button className="mobile-assistance-btn call-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            Connect on Call
          </button>
        </div>
      </section>

      {/* FEATURED COMMUNITY VIDEO */}
      <section className="section-container padded-section" id="featured-video">
        <div className="section-heading-wrapper" style={{ paddingTop: '30px', paddingBottom: '0px' }}>
          <h2 className="section-heading">HEAR FROM THE Senior Anandam COMMUNITY</h2>
        </div>

        <div className="featured-video-wrapper">
          <button className="featured-video-arrow left" onClick={prevFeaturedVideo}>❮</button>
          <button className="featured-video-arrow right" onClick={nextFeaturedVideo}>❯</button>

          {communityVideos && communityVideos.length > 0 && (() => {
            const video = communityVideos[featuredVideoIndex];
            return (
              <div className="featured-video-card" key={video.id} style={{ animation: 'fadeIn 0.5s ease-out' }}>
                <div className="featured-video-left" style={{ position: 'relative', cursor: 'pointer', backgroundColor: '#000' }} onClick={() => setIsPlaying(true)}>
                  {!isPlaying ? (
                    <>
                      <img
                        src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
                        alt={video.title}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                      />
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '68px', height: '48px', backgroundColor: 'rgba(255, 0, 0, 0.9)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </>
                  ) : (
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1&rel=0`}
                      title={video.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ position: 'absolute', top: 0, left: 0 }}
                    ></iframe>
                  )}
                </div>
                <div className="featured-video-right">
                  <div className="featured-video-stars">
                    <StarIcon filled={true} /><StarIcon filled={true} /><StarIcon filled={true} /><StarIcon filled={true} /><StarIcon filled={true} />
                  </div>
                  <blockquote className="featured-video-quote">
                    "{video.overlay_text}"
                  </blockquote>
                  <div className="featured-video-author">
                    <h4>{video.title}</h4>
                    <p>Community Review</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* CUSTOMER REVIEW (Premium senior portrait slider) */}
      <section className="section-container padded-section" id="reviews" style={{ paddingTop: '20px' }}>
        <div className="section-heading-wrapper" style={{ marginBottom: '24px' }}>
          <h2 className="section-heading">CUSTOMER REVIEW</h2>
        </div>

        <div className="reviews-slider-container">
          <button className="slider-arrow-btn left" onClick={() => scrollReviewsSlider('left')}>❮</button>
          <button className="slider-arrow-btn right" onClick={() => scrollReviewsSlider('right')}>❯</button>
          <div
            className="reviews-slider-track"
            ref={reviewsScrollRef}
            onScroll={handleReviewsScroll}
          >
            {customerReviews.map((review, idx) => (
              <div
                className="review-card-premium"
                key={idx}
                onClick={() => setActiveReviewDetail(review)}
              >
                <img src={review.bg_image_url} alt="Review Background" className="review-card-bg" loading="lazy" />

                <button
                  className="expand-circle-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveReviewDetail(review);
                  }}
                  aria-label="Expand Review"
                >
                  +
                </button>

                <div className="review-card-overlay">
                  <h3 className="review-card-title">{review.title}</h3>
                  <p className="review-card-author">- {review.author}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="reviews-slider-dots">
            <button
              className={`dot ${currentScrollDot === 0 ? 'active' : ''}`}
              onClick={() => handleReviewsDotClick(0)}
              aria-label="Scroll to first reviews page"
            ></button>
            <button
              className={`dot ${currentScrollDot === 1 ? 'active' : ''}`}
              onClick={() => handleReviewsDotClick(1)}
              aria-label="Scroll to second reviews page"
            ></button>
          </div>
        </div>
      </section>

      {/* EXPERTS IN SENIOR CARE BANNER SECTION */}
      <section className="experts-banner-section">
        <div className="experts-banner-image-wrapper">
          <img
            src={expertBanner}
            alt="Experts in Senior Care"
            className="experts-banner-image"
            loading="lazy"
          />
        </div>
        <div className="experts-banner-content animate-fade">
          <h2 className="experts-banner-title">Experts in Senior Care</h2>
          <p className="experts-banner-sub">We make aging easier with solutions that cater to the unique needs of seniors.</p>
          <button
            className="experts-banner-btn"
            onClick={() => navigateTo('collection')}
          >
            Explore Products
          </button>
        </div>
      </section>
    </>
  );
}
