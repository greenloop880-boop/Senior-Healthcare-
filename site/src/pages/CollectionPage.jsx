import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../config/supabaseClient';

export default function CollectionPage() {
  const {
    selectedFilterCats, setSelectedFilterCats,
    selectedFilterConcerns, setSelectedFilterConcerns,
    catalogSort, setCatalogSort,
    navigateTo, addToCart, triggerBuyNow
  } = useAppContext();

  // Local state for advanced search, filter, sorting, pagination
  const [searchVal, setSearchVal] = useState("");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);

  // Set ABS_MIN to 0 so local 1-Rupee test products are visible
  const ABS_MIN = 0;
  const ABS_MAX = 59999;
  const [minPrice, setMinPrice] = useState(ABS_MIN);
  const [maxPrice, setMaxPrice] = useState(ABS_MAX);
  const [selectedAvailability, setSelectedAvailability] = useState('All Products');
  const [visibleCount, setVisibleCount] = useState(12);
  const [showBottomPill, setShowBottomPill] = useState(true);

  // Hide pill when near footer (bottom of page)
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      setShowBottomPill(total - scrolled > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch all active products
  const { data: allProductsList = [], isLoading } = useQuery({
    queryKey: ['allProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories ( name ),
          skus ( id, sku_code, variant_name, selling_price, mrp, inventory(quantity_available) ),
          product_concerns ( concerns ( name ) )
        `)
        .eq('is_active', true);

      if (error) throw error;

      return (data || []).map(p => {
        const defaultSku = p.skus && p.skus.length > 0 ? p.skus[0] : null;
        const totalStock = p.skus?.reduce((sum, sku) => sum + (sku.inventory?.reduce((invSum, inv) => invSum + (inv.quantity_available || 0), 0) || 0), 0) || 0;
        const category_title = p.categories ? p.categories.name : 'Uncategorized';
        const concern_title = p.product_concerns && p.product_concerns.length > 0 && p.product_concerns[0].concerns
          ? p.product_concerns[0].concerns.name
          : null;

        return {
          ...p,
          title: p.name,
          category_title,
          concern_title,
          price: defaultSku ? Number(defaultSku.selling_price) : 0,
          mrp: defaultSku ? Number(defaultSku.mrp) : 0,
          totalStock,
          image: p.image_url,
          discount: (defaultSku && defaultSku.mrp > 0 && defaultSku.selling_price < defaultSku.mrp)
            ? Math.round(((Number(defaultSku.mrp) - Number(defaultSku.selling_price)) / Number(defaultSku.mrp)) * 100) + '% off'
            : ''
        };
      });
    }
  });

  // Fetch concerns
  const { data: concernsList = [] } = useQuery({
    queryKey: ['concerns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concerns')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return (data || []).map(c => ({ ...c, title: c.name }));
    }
  });

  // Fetch categories
  const { data: categoriesList = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true);

      if (error) throw error;
      return (data || []).map(c => ({ ...c, title: c.name }));
    }
  });

  // Compute grouped products for checklist
  const groupedProducts = useMemo(() => {
    return allProductsList.reduce((acc, product) => {
      if (!acc[product.category_title]) acc[product.category_title] = [];
      acc[product.category_title].push(product);
      return acc;
    }, {});
  }, [allProductsList]);

  // Reset pagination when filter criteria change
  React.useEffect(() => {
    setVisibleCount(12);
  }, [selectedFilterCats, selectedFilterConcerns, minPrice, maxPrice, selectedAvailability, searchVal]);

  // Generate filtered list
  let list = useMemo(() => {
    let filtered = [...allProductsList];

    // Filter by Category and Concern (OR logic across both groups)
    if (selectedFilterCats.length > 0 || selectedFilterConcerns.length > 0) {
      const catsLower = selectedFilterCats.map(c => c.toLowerCase().trim());
      const concernsLower = selectedFilterConcerns.map(c => c.toLowerCase().trim());

      filtered = filtered.filter(p => {
        const matchCat = p.category_title && catsLower.includes(p.category_title.toLowerCase().trim());
        const matchConcern = p.concern_title && concernsLower.includes(p.concern_title.toLowerCase().trim());
        return matchCat || matchConcern;
      });
    }

    // Filter by Price Range
    filtered = filtered.filter(p => p.price >= minPrice && p.price <= maxPrice);

    // Filter by Availability
    if (selectedAvailability !== 'All Products') {
      filtered = filtered.filter(p => {
        if (selectedAvailability === 'In Stock') return p.totalStock > 0;
        if (selectedAvailability === 'Out of Stock') return p.totalStock <= 0;
        return true;
      });
    }

    // Filter by Keyword Search
    if (searchVal.trim()) {
      const query = searchVal.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // Sort products
    const getDiscountVal = (discountStr) => {
      if (!discountStr) return 0;
      const match = discountStr.match(/(\d+)%/);
      return match ? parseInt(match[1], 10) : 0;
    };

    if (catalogSort === "price-low") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (catalogSort === "price-high") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (catalogSort === "rating") {
      filtered.sort((a, b) => a.rating - b.rating);
    } else if (catalogSort === "alpha") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (catalogSort === "discount-low") {
      filtered.sort((a, b) => getDiscountVal(a.discount) - getDiscountVal(b.discount));
    } else if (catalogSort === "discount-high") {
      filtered.sort((a, b) => getDiscountVal(b.discount) - getDiscountVal(a.discount));
    }

    return filtered;
  }, [allProductsList, selectedFilterCats, selectedFilterConcerns, minPrice, maxPrice, selectedAvailability, searchVal, catalogSort]);

  const paginatedList = useMemo(() => {
    return list.slice(0, visibleCount);
  }, [list, visibleCount]);

  const hasNextPage = list.length > visibleCount;

  const toggleCatFilter = (catName) => {
    setSelectedFilterCats(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const toggleConcernFilter = (concernName) => {
    setSelectedFilterConcerns(prev =>
      prev.includes(concernName) ? prev.filter(c => c !== concernName) : [...prev, concernName]
    );
  };

  const hasActiveFilters =
    selectedFilterCats.length > 0 ||
    selectedFilterConcerns.length > 0 ||
    minPrice > ABS_MIN ||
    maxPrice < ABS_MAX ||
    selectedAvailability !== 'All Products' ||
    searchVal.trim() !== "";

  const clearAllFilters = () => {
    setSelectedFilterCats([]);
    setSelectedFilterConcerns([]);
    setMinPrice(ABS_MIN);
    setMaxPrice(ABS_MAX);
    setSelectedAvailability('All Products');
    setSearchVal("");
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  return (
    <div className="section-container animate-fade" style={{ paddingTop: '10px' }}>
      <div className="section-heading-wrapper mobile-hide" style={{ marginBottom: '24px', textAlign: 'left' }}>
        <span className="section-tag">Clinical Products</span>
        <h2 className="section-heading" style={{ textAlign: 'left' }}>Eldercare Catalog</h2>
        <p className="section-sub" style={{ marginLeft: 0 }}>Browse and filter our comprehensive list of senior wellness aids.</p>
      </div>

      {/* Filter chips active row */}
      {hasActiveFilters && (
        <div className="active-filters-row mobile-hide">
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dark)' }}>Active Filters:</span>

          {selectedFilterCats.map(cat => (
            <span key={cat} className="filter-chip" onClick={() => toggleCatFilter(cat)}>
              Cat: {cat} ✕
            </span>
          ))}
          {selectedFilterConcerns.map(concern => (
            <span key={concern} className="filter-chip" onClick={() => toggleConcernFilter(concern)}>
              Concern: {concern} ✕
            </span>
          ))}
          {searchVal.trim() && (
            <span className="filter-chip" onClick={() => setSearchVal("")}>
              Search: "{searchVal}" ✕
            </span>
          )}

          <button className="clear-filters-btn" onClick={clearAllFilters}>Clear All</button>
        </div>
      )}

      <div className="catalog-layout">
        {/* Mobile Sidebar (only visible on mobile) */}
        <aside className="mobile-category-sidebar desktop-hide">
          <div className={`mobile-cat-item ${selectedFilterConcerns.length === 0 ? 'active' : ''}`} onClick={() => {
            setSelectedFilterConcerns([]);
            setSelectedFilterCats([]);
          }}>
            <div className="mobile-cat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
              </svg>
            </div>
            <span>All Products</span>
          </div>
          {concernsList && concernsList.map(concern => (
            <div
              key={concern.title}
              className={`mobile-cat-item ${selectedFilterConcerns.includes(concern.title) ? 'active' : ''}`}
              onClick={() => {
                setSelectedFilterConcerns([concern.title]);
                setSelectedFilterCats([]);
              }}
            >
              <div className="mobile-cat-icon">
                <img src={concern.image_url} alt={concern.title} loading="lazy" />
              </div>
              <span>{concern.title}</span>
            </div>
          ))}
        </aside>

        {/* Side Filters Panel */}
        <aside className="catalog-sidebar mobile-hide">
          {/* Keyword Search Section */}
          <div className="filter-section mobile-hide">
            <h4>Search within catalog</h4>
            <div className="search-input-wrapper" style={{ position: 'relative' }}>
              <input
                type="text"
                className="filter-search-input"
                placeholder="Search products..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 32px 10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  outline: 'none',
                  fontSize: '13px',
                  fontFamily: 'var(--font-body)'
                }}
              />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => setSearchVal("")}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#999',
                    fontSize: '14px',
                    padding: '4px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="filter-section">
            <h4>Shop By Concern</h4>
            <div className="filter-list">
              {concernsList.map(c => c.title).map(concern => (
                <label key={concern} className="filter-item">
                  <input
                    type="checkbox"
                    className="filter-checkbox"
                    checked={selectedFilterConcerns.includes(concern)}
                    onChange={() => toggleConcernFilter(concern)}
                  />
                  {concern}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section mobile-hide">
            <h4>Product Categories</h4>
            <div className="filter-list">
              {Object.keys(groupedProducts).map(catName => (
                <label key={catName} className="filter-item">
                  <input
                    type="checkbox"
                    className="filter-checkbox"
                    checked={selectedFilterCats.includes(catName)}
                    onChange={() => toggleCatFilter(catName)}
                  />
                  {catName}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Products Grid */}
        <main className="catalog-main">
          <div className="catalog-toolbar mobile-hide">
            <span className="catalog-results-count">Showing {list.length} Products</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-gray)' }}>Sort By:</span>
              <select
                className="catalog-sort-select"
                value={catalogSort}
                onChange={(e) => setCatalogSort(e.target.value)}
              >
                <option value="bestseller">Best Sellers</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Average Rating</option>
                <option value="alpha">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="product-card" style={{ background: '#f5f5f5', animation: 'pulse 1.5s infinite' }}>
                  <div className="product-card-img-wrapper" style={{ background: '#e0e0e0', minHeight: '200px' }}></div>
                  <div className="product-card-content">
                    <div style={{ height: '20px', background: '#e0e0e0', marginBottom: '10px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : paginatedList.length > 0 ? (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {paginatedList.map(prod => (
                <div className="product-card" key={prod.id}>
                  <div
                    className="product-card-img-wrapper"
                    onClick={() => navigateTo('product-detail', { productId: prod.id })}
                  >
                    <img src={prod.image_url} alt={prod.title} loading="lazy" />
                    {prod.id === 'wheelassist-lite' && (
                      <div className="warranty-badge-1 desktop-hide">
                        <span>1</span>
                        YEAR
                        <div style={{ fontSize: '5px' }}>WARRANTY</div>
                      </div>
                    )}
                    {prod.id === 'pivot-lumina' && (
                      <div className="warranty-badge-2 desktop-hide">
                        6 MONTHS<br />WARRANTY
                      </div>
                    )}
                    {prod.rating && (
                      <div className="mobile-rating-badge desktop-hide">
                        {prod.rating}<span style={{ color: '#FFD700', marginLeft: '2px' }}>★</span>
                      </div>
                    )}
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
                      <span className="product-mrp">₹{prod.mrp}</span>
                      <span className="product-discount">{prod.discount}</span>
                    </div>
                    <div className="product-card-actions">
                      {prod.totalStock <= 0 ? (
                        <button
                          className="btn-out-of-stock mobile-hide"
                          disabled
                          style={{ gridColumn: 'span 2', backgroundColor: '#f1f5f9', color: '#94a3b8', border: 'none', borderRadius: '30px', padding: '10px', fontSize: '12px', fontWeight: '700', cursor: 'not-allowed', textAlign: 'center' }}
                        >
                          Out of Stock
                        </button>
                      ) : (
                        <>
                          <button
                            className="btn-secondary-sm mobile-hide"
                            onClick={() => addToCart(prod)}
                          >
                            Add to Cart
                          </button>
                          <button
                            className="btn-primary-sm mobile-hide"
                            onClick={() => triggerBuyNow(prod)}
                          >
                            Buy Now
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mobile-buttons-row desktop-hide">
                    {prod.totalStock <= 0 ? (
                      <button className="btn-out-of-stock-mobile" disabled>Out of Stock</button>
                    ) : (
                      <>
                        <button
                          className="btn-buy-now-mobile"
                          onClick={() => triggerBuyNow(prod)}
                        >
                          Buy Now
                        </button>
                        <button
                          className="btn-add-cart-mobile"
                          onClick={() => addToCart(prod)}
                        >
                          Add to Cart
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '64px', backgroundColor: '#FAF8F5', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '20px', color: 'var(--text-dark)', marginBottom: '8px' }}>No products match active filters</h3>
              <p style={{ color: 'var(--text-gray)', fontSize: '14px', marginBottom: '20px' }}>Try deselecting some checkboxes or reset search to view more items.</p>
              <button className="btn-primary-sm" style={{ width: 'auto', padding: '10px 24px' }} onClick={clearAllFilters}>Reset Filters</button>
            </div>
          )}

          {hasNextPage && (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button className="btn-secondary" onClick={handleLoadMore}>
                Load More Products
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Bar */}
      {showBottomPill && !isMobileFilterOpen && !isMobileSortOpen && (
        <div className="mobile-bottom-actions desktop-hide">
          <div className="mobile-bottom-btn" onClick={() => setIsMobileFilterOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filter
          </div>
          <div className="mobile-bottom-divider"></div>
          <div className="mobile-bottom-btn" onClick={() => setIsMobileSortOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
            Sort By
          </div>
        </div>
      )}

      {/* Mobile Filter Drawer Backdrop */}
      {isMobileFilterOpen && (
        <div className="mobile-filter-backdrop desktop-hide" onClick={() => setIsMobileFilterOpen(false)}></div>
      )}

      {/* Mobile Filter Drawer */}
      <div className={`mobile-filter-drawer desktop-hide ${isMobileFilterOpen ? 'open' : ''}`}>
        <div className="mobile-filter-header">
          <h3 className="mobile-filter-title">Filters</h3>
          <button onClick={() => setIsMobileFilterOpen(false)} className="mobile-filter-close-btn">✕</button>
        </div>
        <div className="mobile-filter-body">
          <div className="filter-section">
            <h4 className="mobile-filter-section-title">Price Range</h4>
            <div className="price-inputs-row">
              <div className="price-input-box">
                <span>₹</span>
                <input type="number" value={minPrice} onChange={(e) => setMinPrice(Math.max(ABS_MIN, Math.min(Number(e.target.value), maxPrice)))} />
              </div>
              <div className="price-input-box">
                <span>₹</span>
                <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(Math.max(minPrice, Math.min(Number(e.target.value), ABS_MAX)))} />
              </div>
            </div>

            <div className="price-slider-container">
              <div className="price-labels">
                <span>₹{ABS_MIN}</span>
                <span>₹{ABS_MAX}</span>
              </div>
              <div className="slider-track-container">
                <div className="slider-track-bg"></div>
                <div className="slider-track-fill" style={{ left: `${((minPrice - ABS_MIN) / (ABS_MAX - ABS_MIN)) * 100}%`, width: `${((maxPrice - minPrice) / (ABS_MAX - ABS_MIN)) * 100}%` }}></div>
                <input type="range" min={ABS_MIN} max={ABS_MAX} value={minPrice} onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice))} className="range-slider" />
                <input type="range" min={ABS_MIN} max={ABS_MAX} value={maxPrice} onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice))} className="range-slider" />
              </div>
            </div>
          </div>
          <div className="filter-section">
            <h4 className="mobile-filter-section-title">Availability</h4>
            <div className="filter-list">
              {['All Products', 'In Stock'].map(avail => (
                <label key={avail} className="availability-radio">
                  <input
                    type="radio"
                    name="availability"
                    checked={selectedAvailability === avail}
                    onChange={() => setSelectedAvailability(avail)}
                  />
                  <div className="radio-circle"></div>
                  {avail}
                </label>
              ))}
            </div>
          </div>

          <div className="mobile-filter-footer-actions">
            <button className="mobile-filter-btn-clear" onClick={clearAllFilters}>Clear All</button>
            <button className="mobile-filter-btn-apply" onClick={() => setIsMobileFilterOpen(false)}>Apply</button>
          </div>
        </div>
      </div>

      {/* Mobile Sort Drawer Backdrop */}
      {isMobileSortOpen && (
        <div className="mobile-filter-backdrop desktop-hide" onClick={() => setIsMobileSortOpen(false)}></div>
      )}

      {/* Mobile Sort Drawer */}
      <div className={`mobile-sort-drawer desktop-hide ${isMobileSortOpen ? 'open' : ''}`}>
        <div className="mobile-sort-list">
          {[
            { id: 'bestseller', label: 'Best Sellers' },
            { id: 'price-low', label: 'Price: Low to high' },
            { id: 'price-high', label: 'Price: High to low' },
            { id: 'alpha', label: 'Alphabetical (A-Z)' }
          ].map(option => (
            <label key={option.id} className="mobile-sort-item">
              <div className={`sort-radio-outer ${catalogSort === option.id ? 'active' : ''}`}>
                {catalogSort === option.id && <div className="sort-radio-inner"></div>}
              </div>
              <input
                type="radio"
                name="mobile-sort"
                checked={catalogSort === option.id}
                onChange={() => {
                  setCatalogSort(option.id);
                  setTimeout(() => setIsMobileSortOpen(false), 200);
                }}
                style={{ display: 'none' }}
              />
              <span className="sort-label">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

    </div>
  );
}
