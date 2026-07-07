import React, { createContext, useState, useRef, useContext } from 'react';
import { supabase } from '../config/supabaseClient';
import Fuse from 'fuse.js';

export const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

const getInitialRoute = () => {
  if (typeof window === 'undefined') return { pageName: 'home', params: {} };
  const hash = window.location.hash.substring(1);
  if (!hash) return { pageName: 'home', params: {} };

  const [page, queryString] = hash.split('?');
  const params = {};
  if (queryString) {
    const urlParams = new URLSearchParams(queryString);
    for (const [key, value] of urlParams.entries()) {
      params[key] = value;
    }
  }
  return { pageName: page || 'home', params };
};

export const AppProvider = ({ children }) => {
  const [currentPage, setCurrentPage] = useState(() => getInitialRoute().pageName);
  const [currentPageParams, setCurrentPageParams] = useState(() => getInitialRoute().params);

  
  const [userSession, setUserSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userAvatar, setUserAvatar] = useState(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId, sessionEmail) => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', `profile-${userId}`)
        .maybeSingle();
        
      if (data && data.content) {
        const dbProfile = data.content;
        dbProfile.email = sessionEmail || dbProfile.email;
        setUserProfile(dbProfile);
        localStorage.setItem('userProfile', JSON.stringify(dbProfile));
        if (data.image_url) {
          setUserAvatar(data.image_url);
          localStorage.setItem('userAvatar', data.image_url);
        } else {
          setUserAvatar(null);
        }
      } else {
        if (sessionEmail) {
          setUserProfile({ email: sessionEmail });
        }
      }
    } catch (e) {
      console.error('Error fetching profile from DB:', e);
    }
  };

  React.useEffect(() => {
    if (userSession) {
      fetchUserProfile(userSession.user.id, userSession.user.email);
    } else {
      setUserProfile(null);
      setUserAvatar(null);
    }
  }, [userSession]);

  React.useEffect(() => {
    

    // Setup browser history state for back button support
    const handlePopState = (event) => {
      if (event.state) {
        setCurrentPage(event.state.pageName);
        setCurrentPageParams(event.state.params);

        if (event.state.pageName === "collection") {
          if (event.state.params.activeCategory) {
            setSelectedFilterCats([event.state.params.activeCategory]);
            setSelectedFilterConcerns([]);
          } else if (event.state.params.activeConcern) {
            setSelectedFilterConcerns([event.state.params.activeConcern]);
            setSelectedFilterCats([]);
          } else {
            setSelectedFilterCats([]);
            setSelectedFilterConcerns([]);
          }
        }
      } else {
        setCurrentPage("home");
        setCurrentPageParams({});
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
      setIsMobileMenuOpen(false);
    };

    window.addEventListener("popstate", handlePopState);

    // Initialize the very first history state correctly
    const initialRoute = getInitialRoute();
    const initHash = window.location.hash || (initialRoute.pageName === 'home' && Object.keys(initialRoute.params).length === 0 ? window.location.pathname : "#home");
    window.history.replaceState(initialRoute, "", initHash);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  

  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [activeBestSellersTab, setActiveBestSellersTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [activeReviewDetail, setActiveReviewDetail] = useState(null);
  const [currentScrollDot, setCurrentScrollDot] = useState(0);
  const reviewsScrollRef = useRef(null);

  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);

  const [heroIndex, setHeroIndex] = useState(0);
  const carouselTimer = useRef(null);

  const [helpfulCounts, setHelpfulCounts] = useState({ 0: 12, 1: 8, 2: 19, 3: 4, 4: 15 });
  const [upvotedReviews, setUpvotedReviews] = useState({});
  const [helpFormOpen, setHelpFormOpen] = useState(false);
  const [helpFormData, setHelpFormData] = useState({ name: '', phone: '', timeSlot: '' });

  // Checkout Modal State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  const [currentQuizStep, setCurrentQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  const [selectedFilterCats, setSelectedFilterCats] = useState(() => {
    const r = getInitialRoute();
    if (r.pageName === 'collection' && r.params.activeCategory) return [r.params.activeCategory];
    return [];
  });
  const [selectedFilterConcerns, setSelectedFilterConcerns] = useState(() => {
    const r = getInitialRoute();
    if (r.pageName === 'collection' && r.params.activeConcern) return [r.params.activeConcern];
    return [];
  });
  const [catalogSort, setCatalogSort] = useState("bestseller");

  

  const navigateTo = (pageName, params = {}) => {
    // Push new state to browser history with query params
    let hash = pageName === 'home' ? "" : "#" + pageName;
    const query = new URLSearchParams(params).toString();
    if (query) {
      hash = (hash === "" ? "#home" : hash) + "?" + query;
    }
    window.history.pushState({ pageName, params }, "", hash || window.location.pathname);

    setCurrentPage(pageName);
    setCurrentPageParams(params);
    window.scrollTo({ top: 0, behavior: 'instant' });
    setIsMobileMenuOpen(false);

    if (pageName === "collection") {
      if (params.activeCategory) {
        setSelectedFilterCats([params.activeCategory]);
        setSelectedFilterConcerns([]);
      } else if (params.activeConcern) {
        setSelectedFilterConcerns([params.activeConcern]);
        setSelectedFilterCats([]);
      } else {
        setSelectedFilterCats([]);
        setSelectedFilterConcerns([]);
      }
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  const addToCart = (product, quantity = 1, selectedSku = null) => {
    const cartItemId = selectedSku ? selectedSku.id : product.id;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        return prevCart.map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { cartItemId, product, quantity, selectedSku }];
    });
    showToast(`Added ${product.title} to cart.`);
  };

  const [buyNowItem, setBuyNowItem] = useState(null);

  const triggerBuyNow = (product, quantity = 1, selectedSku = null) => {
    const cartItemId = selectedSku ? selectedSku.id : product.id;
    setBuyNowItem({ cartItemId, product, quantity, selectedSku });
    setIsCartOpen(false);
    setIsCheckoutModalOpen(true);
  };

  const updateCartQty = (cartItemId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          // Backward compatibility for old items without cartItemId
          const itemId = item.cartItemId || item.product.id;
          if (itemId === cartItemId) {
            return { ...item, quantity: item.quantity + delta };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (cartItemId) => {
    setCart((prevCart) => prevCart.filter((item) => (item.cartItemId || item.product.id) !== cartItemId));
    showToast("Item removed from cart.");
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    showToast("Order placed successfully! Cash on Delivery confirmed.");
    setCart([]);
    setIsCartOpen(false);
    setAppliedPromo(null);
  };

  const submitCallbackRequest = async (formData) => {
    try {
      const payload = {
        id: `callback-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: `Callback Request: ${formData.name}`,
        summary: formData.phone,
        date: new Date().toISOString(),
        read_time: formData.timeSlot,
        author: 'SYSTEM_CALLBACK',
        image_url: '',
        content: formData
      };
      await supabase.from('blogs').insert([payload]);
      showToast(`Call scheduled! We will contact you shortly.`);
    } catch (e) {
      console.error(e);
      showToast('Failed to schedule call.');
    }
  };

  const saveUserProfileToDb = async (profileData, avatarImg, userId) => {
    try {
      if (!userId) {
        console.error('Cannot save profile: No userId provided.');
        return;
      }
      const payload = {
        id: `profile-${userId}`,
        title: `${profileData.firstName} ${profileData.lastName}`,
        summary: profileData.email || 'No email provided',
        date: new Date().toISOString(),
        read_time: profileData.gender || 'Not specified',
        author: 'SYSTEM_USER_PROFILE',
        image_url: avatarImg || '',
        content: profileData
      };
      await supabase.from('blogs').upsert([payload]);
      // Update global context state
      setUserProfile(prev => ({ ...prev, ...profileData, email: prev?.email || profileData.email }));
      setUserAvatar(avatarImg || null);
    } catch (e) {
      console.error('Error saving profile to DB:', e);
    }
  };

  const subscribeNewsletter = async (email) => {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showToast("Please enter a valid email address.");
        return false;
      }

      const payload = {
        id: `newsletter-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: email,
        summary: 'Newsletter Subscription',
        date: new Date().toISOString(),
        read_time: 'N/A',
        author: 'SYSTEM_NEWSLETTER',
        image_url: '',
        content: { email }
      };
      await supabase.from('blogs').upsert([payload]);
      showToast("Thank you for subscribing!");
      return true;
    } catch (e) {
      console.error('Error saving newsletter subscription:', e);
      showToast("Subscription failed. Try again.");
      return false;
    }
  };

  const applyPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (code === "SENIORANANDAM10") {
      setAppliedPromo({ code: "SENIORANANDAM10", discountPercent: 10 });
      showToast("10% Coupon Applied!");
    } else if (code === "SENIOR15") {
      setAppliedPromo({ code: "SENIOR15", discountPercent: 15 });
      showToast("15% Senior concession applied!");
    } else {
      showToast("Invalid code. Use: SENIORANANDAM10 or SENIOR15");
    }
    setPromoCodeInput("");
  };

  const removePromo = () => {
    setAppliedPromo(null);
    showToast("Coupon removed.");
  };

  const subtotal = cart.reduce((acc, item) => {
    const price = item.selectedSku ? item.selectedSku.selling_price : item.product.price;
    return acc + price * item.quantity;
  }, 0);
  const discountAmount = appliedPromo ? Math.round(subtotal * (appliedPromo.discountPercent / 100)) : 0;
  const deliveryCharges = 0; // Temporarily removed delivery fee
  const estimatedTax = 0; // Taxes are inclusive in MRP
  const grandTotal = subtotal - discountAmount + deliveryCharges;

  const value = {
    currentPage, setCurrentPage,
    currentPageParams, setCurrentPageParams,
    cart, setCart,
    isCartOpen, setIsCartOpen,
    activeQuizId, setActiveQuizId,
    activeBestSellersTab, setActiveBestSellersTab,
    searchQuery, setSearchQuery,
    isSearchOpen, setIsSearchOpen,
    isMobileMenuOpen, setIsMobileMenuOpen,
    toastMessage, setToastMessage,
    activeVideoId, setActiveVideoId,
    activeReviewDetail, setActiveReviewDetail,
    currentScrollDot, setCurrentScrollDot,
    reviewsScrollRef,
    promoCodeInput, setPromoCodeInput,
    appliedPromo, setAppliedPromo,
    heroIndex, setHeroIndex,
    carouselTimer,
    helpfulCounts, setHelpfulCounts,
    upvotedReviews, setUpvotedReviews,
    helpFormOpen, setHelpFormOpen,
    helpFormData, setHelpFormData,
    currentQuizStep, setCurrentQuizStep,
    quizAnswers, setQuizAnswers,
    showQuizResults, setShowQuizResults,
    selectedFilterCats, setSelectedFilterCats,
    selectedFilterConcerns, setSelectedFilterConcerns,
    catalogSort, setCatalogSort,
    isCheckoutModalOpen, setIsCheckoutModalOpen,
    showCancelAlert, setShowCancelAlert,
    
    
    
    
    navigateTo,
    
    showToast,
    addToCart,
    updateCartQty,
    removeFromCart,
    triggerBuyNow,
    handleCheckout,
    submitCallbackRequest,
    saveUserProfileToDb,
    subscribeNewsletter,
    applyPromo,
    removePromo,
    subtotal, discountAmount, deliveryCharges, estimatedTax, grandTotal,
    userSession, setUserSession,
    userProfile, setUserProfile,
    userAvatar, setUserAvatar,
    fetchUserProfile,
    buyNowItem, setBuyNowItem
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
