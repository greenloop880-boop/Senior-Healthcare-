import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../config/supabaseClient';

export default function SearchPage() {
  const {
    navigateTo, addToCart, setIsCheckoutModalOpen, setIsCartOpen, triggerBuyNow
  } = useAppContext();

  // Read query from URL hash
  const hash = window.location.hash.substring(1);
  const [page, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || "");
  const query = params.get('q') || "";

  // Perform search query from Supabase
  const { data: list = [], isLoading } = useQuery({
    queryKey: ['searchProducts', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories ( name ),
          skus ( id, sku_code, variant_name, selling_price, mrp, inventory(quantity_available) ),
          product_concerns ( concerns ( name ) )
        `)
        .eq('is_active', true)
        .ilike('name', `%${query.trim()}%`);

      if (error) throw error;

      return (data || []).map(p => {
        const defaultSku = p.skus && p.skus.length > 0 ? p.skus[0] : null;
        const totalStock = p.skus?.reduce((sum, sku) => sum + (sku.inventory?.reduce((invSum, inv) => invSum + (inv.quantity_available || 0), 0) || 0), 0) || 0;
        return {
          ...p,
          title: p.name,
          price: defaultSku ? Number(defaultSku.selling_price) : 0,
          mrp: defaultSku ? Number(defaultSku.mrp) : 0,
          totalStock,
          image: p.image_url,
          discount: (defaultSku && defaultSku.mrp > 0 && defaultSku.selling_price < defaultSku.mrp)
            ? Math.round(((Number(defaultSku.mrp) - Number(defaultSku.selling_price)) / Number(defaultSku.mrp)) * 100) + '% off'
            : ''
        };
      });
    },
    enabled: !!query.trim()
  });

  return (
    <div className="section-container animate-fade" style={{ paddingTop: '20px', minHeight: '60vh' }}>
      <div className="section-heading-wrapper" style={{ marginBottom: '24px', textAlign: 'left' }}>
        <h2 className="section-heading">Search Results</h2>
        <p className="section-sub" style={{ marginLeft: 0 }}>
          {list.length > 0 ? `Showing ${list.length} results for "${query}"` : `No products found for "${query}"`}
        </p>
      </div>

      <main className="catalog-main" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '64px' }}>
            <h3>Searching products...</h3>
          </div>
        ) : list.length > 0 ? (
          <div className="products-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {list.map(prod => (
              <div key={prod.id} className="product-card">
                <div
                  className="product-card-img-wrapper"
                  onClick={() => navigateTo('product-detail', { productId: prod.id })}
                >
                  <img src={prod.image} alt={prod.title} />
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
                      <button className="btn-buy-now-mobile" onClick={() => triggerBuyNow(prod)}>Buy Now</button>
                      <button className="btn-add-cart-mobile" onClick={() => addToCart(prod)}>Add to Cart</button>
                    </>
                  )}
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
