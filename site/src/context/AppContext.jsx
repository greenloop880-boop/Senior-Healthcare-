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

  const [allProductsList, setAllProductsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [concernsList, setConcernsList] = useState([]);
  const [heroBanners, setHeroBanners] = useState([]);
  const [healthReviews, setHealthReviews] = useState([]);
  const [communityVideos, setCommunityVideos] = useState([]);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [isLoadingDynamicData, setIsLoadingDynamicData] = useState(true);
  const [announcementText, setAnnouncementText] = useState("<strong>IMPORTANT :</strong> Dear Customer, Senior Anandam never asks for additional payments, OTPs, bank details, or personal information over phone calls. If you receive any suspicious calls, please report: <strong>+91 9911789911</strong> or email: <strong>support@senioranandam.com</strong>");

  React.useEffect(() => {
    async function loadData() {
      try {
        const CACHE_KEY = 'senior_anandam_data_cache_v1';
        const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL && parsed.data) {
              setAllProductsList(parsed.data.products || []);
              setCategoriesList(parsed.data.categories || []);
              setConcernsList(parsed.data.concerns || []);
              setHeroBanners(parsed.data.heroBanners || []);
              setHealthReviews(parsed.data.healthReviews || []);
              setCommunityVideos(parsed.data.communityVideos || []);
              setCustomerReviews(parsed.data.customerReviews || []);
              if (parsed.data.announcement) setAnnouncementText(parsed.data.announcement);
              setIsLoadingDynamicData(false);
              return;
            }
          } catch (e) {
            console.error('Cache parsing failed, fetching fresh data', e);
          }
        }

        const [prodRes, catRes, conRes, heroRes, hrRes, cvRes, crRes, annRes] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('categories').select('*'),
          supabase.from('concerns').select('*'),
          supabase.from('hero_banners').select('*').order('id'),
          supabase.from('health_reviews').select('*').order('id'),
          supabase.from('community_videos').select('*'),
          supabase.from('customer_reviews').select('*').order('id'),
          supabase.from('announcements').select('*')
        ]);
        
        let products = [];
        if (prodRes.data) {
          products = prodRes.data.map(p => ({
            ...p,
            discount: (p.mrp > 0 && p.price < p.mrp)
              ? Math.round(((p.mrp - p.price) / p.mrp) * 100) + '% off'
              : ''
          }));
          setAllProductsList(products);
        }
        
        const categories = catRes.data || [];
        const concerns = conRes.data || [];
        const banners = heroRes.data || [];
        const hReviews = hrRes.data || [];
        const cVideos = cvRes.data || [];
        const cReviews = crRes.data || [];
        const announcement = (annRes && annRes.data && annRes.data.length > 0) ? annRes.data[0].text : null;

        setCategoriesList(categories);
        setConcernsList(concerns);
        setHeroBanners(banners);
        setHealthReviews(hReviews);
        setCommunityVideos(cVideos);
        setCustomerReviews(cReviews);
        if (announcement) setAnnouncementText(announcement);

        // Save to cache
        try {
          const cacheData = {
            timestamp: Date.now(),
            data: {
              products,
              categories,
              concerns,
              heroBanners: banners,
              healthReviews: hReviews,
              communityVideos: cVideos,
              customerReviews: cReviews,
              announcement
            }
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch (e) {
          console.error("Failed to save cache (quota exceeded?)", e);
        }

      } catch (e) {
        console.error('Error fetching data:', e);
      } finally {
        setIsLoadingDynamicData(false);
      }
    }
    loadData();

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
    window.history.replaceState(initialRoute, "", window.location.hash || "#home");

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const fuseRef = useRef(null);
  
  React.useEffect(() => {
    if (allProductsList.length > 0) {
      fuseRef.current = new Fuse(allProductsList, {
        keys: [
          { name: 'title', weight: 3 },
          { name: 'category_title', weight: 2 },
          { name: 'description', weight: 1 },
          { name: 'specs', weight: 1 }
        ],
        threshold: 0.4,
        ignoreLocation: true
      });
    }
  }, [allProductsList]);

  const performSearch = React.useCallback((query) => {
    if (!query || !query.trim() || !fuseRef.current) return [];
    return fuseRef.current.search(query).map(result => result.item);
  }, []);

  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [activeBestSellersTab, setActiveBestSellersTab] = useState("BP Monitors & Other Devices");
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

  const groupedProducts = allProductsList.reduce((acc, product) => {
    if (!acc[product.category_title]) acc[product.category_title] = [];
    acc[product.category_title].push(product);
    return acc;
  }, {});

  const navigateTo = (pageName, params = {}) => {
    // Push new state to browser history with query params
    let hash = "#" + pageName;
    const query = new URLSearchParams(params).toString();
    if (query) hash += "?" + query;
    window.history.pushState({ pageName, params }, "", hash);

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

  const addToCart = (product, quantity = 1, selectedVariants = {}) => {
    const variantsString = Object.entries(selectedVariants || {})
      .sort(([k1], [k2]) => k1.localeCompare(k2))
      .map(([k, v]) => `${k}:${v}`).join('|');
    const cartItemId = variantsString ? `${product.id}-${variantsString}` : product.id;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        return prevCart.map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { cartItemId, product, quantity, selectedVariants }];
    });
    showToast(`Added ${product.title} to cart.`);
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

  const saveUserProfileToDb = async (profileData, avatarImg) => {
    try {
      const payload = {
        id: `profile-${profileData.mobile}`, // use mobile as unique identifier since it's hardcoded for this demo
        title: `${profileData.firstName} ${profileData.lastName}`,
        summary: profileData.email || 'No email provided',
        date: new Date().toISOString(),
        read_time: profileData.gender || 'Not specified',
        author: 'SYSTEM_USER_PROFILE',
        image_url: avatarImg || '',
        content: profileData
      };
      await supabase.from('blogs').upsert([payload]);
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

  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountAmount = appliedPromo ? Math.round(subtotal * (appliedPromo.discountPercent / 100)) : 0;
  const deliveryCharges = subtotal > 999 || subtotal === 0 ? 0 : 99;
  const estimatedTax = Math.round((subtotal - discountAmount) * 0.05); // 5% GST
  const grandTotal = subtotal - discountAmount + deliveryCharges + estimatedTax;

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
    allProductsList, categoriesList, concernsList,
    heroBanners, healthReviews, communityVideos, customerReviews,
    isLoadingDynamicData, groupedProducts,
    announcementText, setAnnouncementText,
    navigateTo,
    performSearch,
    showToast,
    addToCart,
    updateCartQty,
    removeFromCart,
    handleCheckout,
    submitCallbackRequest,
    saveUserProfileToDb,
    subscribeNewsletter,
    applyPromo,
    removePromo,
    subtotal, discountAmount, deliveryCharges, estimatedTax, grandTotal
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
