import React from 'react';
import { CartIcon, CloseIcon } from './Icons';
import { useAppContext } from '../context/AppContext';

export default function CartDrawer() {
  const {
    isCartOpen, setIsCartOpen,
    cart,
    updateCartQty,
    removeFromCart,
    appliedPromo,
    promoCodeInput, setPromoCodeInput,
    applyPromo, removePromo,
    subtotal, discountAmount, deliveryCharges, estimatedTax, grandTotal,
    handleCheckout
  } = useAppContext();

  return (
    <div
      className={`cart-drawer-overlay ${isCartOpen ? 'open' : ''}`}
      onClick={() => setIsCartOpen(false)}
    >
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cart-header">
          <h2>
            <CartIcon /> Shopping Cart
          </h2>
          <button className="cart-close-icon-btn" onClick={() => setIsCartOpen(false)} aria-label="Close Cart">
            <CloseIcon />
          </button>
        </div>

        <div className="cart-items-container">
          {cart.length === 0 ? (
            <div className="cart-empty-message">
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🛒</div>
              <p>Your cart is empty.</p>
              <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-gray)' }}>
                Explore best sellers to add items.
              </p>
              <button
                className="btn-primary-sm"
                style={{ marginTop: '20px', padding: '10px 24px', width: 'auto' }}
                onClick={() => setIsCartOpen(false)}
              >
                START SHOPPING
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const itemId = item.cartItemId || item.product.id;
              return (
              <div className="cart-item" key={itemId}>
                <div className="cart-item-img">
                  <img src={item.product.image_url || item.product.image} alt={item.product.title} />
                </div>
                <div className="cart-item-details">
                  <div>
                    <h4 className="cart-item-title">{item.product.title}</h4>
                    {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                        {Object.entries(item.selectedVariants).map(([k, v]) => (
                          <span key={k} style={{ marginRight: '8px' }}>{k}: <strong>{v}</strong></span>
                        ))}
                      </div>
                    )}
                    <div className="cart-item-price-row" style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--primary-red)' }}>
                        ₹{item.product.price}
                      </span>
                      <span style={{ fontSize: '11px', textDecoration: 'line-through', color: 'var(--text-gray)' }}>
                        ₹{item.product.mrp}
                      </span>
                    </div>
                  </div>

                  <div className="cart-item-qty-selector">
                    <button className="qty-btn" onClick={() => updateCartQty(itemId, -1)}>-</button>
                    <span className="qty-val">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateCartQty(itemId, 1)}>+</button>
                  </div>
                </div>
                <button
                  className="cart-item-remove-btn"
                  onClick={() => removeFromCart(itemId)}
                  aria-label="Remove item"
                >
                  🗑️
                </button>
              </div>
            );})
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-summary">
            {!appliedPromo ? (
              <div className="promo-container">
                <input
                  type="text"
                  className="promo-input"
                  placeholder="Enter Coupon: SENIORANANDAM10 / SENIOR15"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                />
                <button className="btn-promo-apply" onClick={applyPromo}>APPLY</button>
              </div>
            ) : (
              <div className="promo-active-tag">
                <span>🎟️ COUPON APPLIED: <strong>{appliedPromo.code}</strong> (-{appliedPromo.discountPercent}%)</span>
                <button className="promo-remove-btn" onClick={removePromo}>Remove</button>
              </div>
            )}

            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            {appliedPromo && (
              <div className="cart-summary-row" style={{ color: '#1A6E58', fontWeight: '600' }}>
                <span>Discount</span>
                <span>-₹{discountAmount}</span>
              </div>
            )}
            <div className="cart-summary-row">
              <span>Delivery & Handling</span>
              <span>{deliveryCharges === 0 ? "FREE" : `₹${deliveryCharges}`}</span>
            </div>
            <div className="cart-summary-row">
              <span>Estimated Taxes (5% GST)</span>
              <span>₹{estimatedTax}</span>
            </div>

            <div className="cart-summary-row total">
              <span>Total Amount</span>
              <span>₹{grandTotal}</span>
            </div>

            <button className="btn-checkout" onClick={handleCheckout}>
              PLACE ORDER (CASH ON DELIVERY)
            </button>
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-gray)', marginTop: '10px' }}>
              🔒 256-bit SSL encrypted secure checkout
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
