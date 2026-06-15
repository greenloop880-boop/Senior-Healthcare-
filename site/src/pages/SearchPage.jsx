import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export default function SearchPage() {
  const {
    navigateTo, addToCart, performSearch
  } = useAppContext();

  // Read query from URL hash
  const hash = window.location.hash.substring(1);
  const [page, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || "");
  const query = params.get('q') || "";

  // Perform fuzzy search
  const list = useMemo(() => performSearch(query), [query, performSearch]);

  return (
    <div className="section-container animate-fade" style={{ paddingTop: '20px', minHeight: '60vh' }}>
      <div className="section-heading-wrapper" style={{ marginBottom: '24px', textAlign: 'left' }}>
        <h2 className="section-heading">Search Results</h2>
        <p className="section-sub" style={{ marginLeft: 0 }}>
          {list.length > 0 ? `Showing ${list.length} results for "${query}"` : `No products found for "${query}"`}
        </p>
      </div>

      <main className="catalog-main" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        {list.length > 0 ? (
          <div className="products-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {list.map(prod => (
              <div className="product-card" key={prod.id}>
                <div
                  className="product-card-img-wrapper"
                  onClick={() => navigateTo('product-detail', { productId: prod.id })}
                >
                  <img src={prod.image_url} alt={prod.title} />
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
            <h3 style={{ fontSize: '20px', color: 'var(--text-dark)', marginBottom: '8px' }}>No products match your search</h3>
            <p style={{ color: 'var(--text-gray)', fontSize: '14px', marginBottom: '20px' }}>Try searching for generic terms like:</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="filter-chip" onClick={() => navigateTo('search', { q: 'BP Monitor' })}>BP Monitor</button>
              <button className="filter-chip" onClick={() => navigateTo('search', { q: 'Walking Stick' })}>Walking Stick</button>
              <button className="filter-chip" onClick={() => navigateTo('search', { q: 'Nebulizer' })}>Nebulizer</button>
              <button className="filter-chip" onClick={() => navigateTo('search', { q: 'Neck Pillow' })}>Neck Pillow</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
