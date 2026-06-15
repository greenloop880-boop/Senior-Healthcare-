import React from 'react';

import { useAppContext } from '../context/AppContext';

export default function CollectionPage() {
  const {
    allProductsList, groupedProducts, concernsList, categoriesList,
    selectedFilterCats, setSelectedFilterCats,
    selectedFilterConcerns, setSelectedFilterConcerns,
    catalogSort, setCatalogSort,
    navigateTo, addToCart
  } = useAppContext();

  // Local state for advanced search & filters
  const [searchVal, setSearchVal] = React.useState("");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = React.useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = React.useState(false);
  const ABS_MIN = 249;
  const ABS_MAX = 59999;
  const [minPrice, setMinPrice] = React.useState(ABS_MIN);
  const [maxPrice, setMaxPrice] = React.useState(ABS_MAX);
  const [selectedAvailability, setSelectedAvailability] = React.useState('All Products');

  // Generate filtered list
  let list = [...allProductsList];

  // Filter by Category and Concern (OR logic across both groups)
  if (selectedFilterCats.length > 0 || selectedFilterConcerns.length > 0) {
    const catsLower = selectedFilterCats.map(c => c.toLowerCase().trim());
    const concernsLower = selectedFilterConcerns.map(c => c.toLowerCase().trim());
    
    list = list.filter(p => {
      const matchCat = p.category_title && catsLower.includes(p.category_title.toLowerCase().trim());
      const matchConcern = p.concern_title && concernsLower.includes(p.concern_title.toLowerCase().trim());
      return matchCat || matchConcern;
    });
  }

  // Filter by Price Range
  list = list.filter(p => p.price >= minPrice && p.price <= maxPrice);

  // Filter by Availability
  if (selectedAvailability !== 'All Products') {
    list = list.filter(p => {
      if (selectedAvailability === 'In Stock') return true;
      if (selectedAvailability === 'Out of Stock') return false;
      return true;
    });
  }

  // Filter by Keyword Search
  if (searchVal.trim()) {
    const query = searchVal.toLowerCase().trim();
    list = list.filter(p =>
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
    list.sort((a, b) => a.price - b.price);
  } else if (catalogSort === "price-high") {
    list.sort((a, b) => b.price - a.price);
  } else if (catalogSort === "rating") {
    list.sort((a, b) => b.rating - a.rating);
  } else if (catalogSort === "alpha") {
    list.sort((a, b) => a.title.localeCompare(b.title));
  } else if (catalogSort === "discount-low") {
    list.sort((a, b) => getDiscountVal(a.discount) - getDiscountVal(b.discount));
  } else if (catalogSort === "discount-high") {
    list.sort((a, b) => getDiscountVal(b.discount) - getDiscountVal(a.discount));
  }

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

          {list.length > 0 ? (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {list.map(prod => (
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
                      <button
                        className="btn-secondary-sm mobile-hide"
                        onClick={() => navigateTo('product-detail', { productId: prod.id })}
                      >
                        QUICK VIEW
                      </button>
                      <button
                        className="btn-primary-sm mobile-hide"
                        onClick={() => addToCart(prod)}
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                  <div className="mobile-buttons-row desktop-hide">
                    <button className="btn-buy-now-mobile" onClick={() => addToCart(prod)}>Buy Now</button>
                    <button className="btn-add-cart-mobile" onClick={() => addToCart(prod)}>Add to Cart</button>
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
        </main>
      </div>

      {/* Mobile Fixed Bottom Bar */}
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

      {/* Mobile Filter Drawer Backdrop */}
      {isMobileFilterOpen && (
        <div className="mobile-filter-backdrop desktop-hide" onClick={() => setIsMobileFilterOpen(false)}></div>
      )}

      {/* Mobile Filter Drawer */}
      <div className={`mobile-filter-drawer desktop-hide ${isMobileFilterOpen ? 'open' : ''}`}>
        <div className="mobile-filter-header">
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--primary-red)' }}>Filters</h3>
          <button onClick={() => setIsMobileFilterOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-gray)' }}>✕</button>
        </div>
        <div className="mobile-filter-body">
          <div className="filter-section">
            <h4 style={{ color: 'var(--primary-red)' }}>Price Range</h4>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', marginTop: '16px' }}>
              <div className="price-input-box">
                <span>₹</span>
                <input type="number" value={minPrice} onChange={(e) => setMinPrice(Math.max(ABS_MIN, Math.min(e.target.value, maxPrice)))} />
              </div>
              <div className="price-input-box">
                <span>₹</span>
                <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(Math.max(minPrice, Math.min(e.target.value, ABS_MAX)))} />
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
            <h4 style={{ color: 'var(--primary-red)' }}>Availability</h4>
            <div className="filter-list" style={{ marginTop: '16px' }}>
              {['All Products', 'In Stock', 'Out of Stock'].map(avail => (
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
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '-16px' }}>
            <button className="btn-primary-sm" onClick={clearAllFilters} style={{ flex: 1, background: 'transparent', color: 'var(--primary-red)', border: '1px solid var(--primary-red)', borderRadius: '30px', padding: '12px' }}>Clear All</button>
            <button className="btn-primary-sm" onClick={() => setIsMobileFilterOpen(false)} style={{ flex: 1, background: 'var(--primary-red)', color: '#fff', border: 'none', borderRadius: '30px', padding: '12px' }}>Apply</button>
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
            { id: 'newest', label: 'Newly Launched' },
            { id: 'price-low', label: 'Price: Low to high' },
            { id: 'price-high', label: 'Price: High to low' },
            { id: 'discount-low', label: 'Discount: Low to high' },
            { id: 'discount-high', label: 'Discount: High to low' }
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
