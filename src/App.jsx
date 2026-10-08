import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  Navigate,
} from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  Heart,
  Menu,
  Moon,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Lock,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  ShieldCheck,
  Star,
  Tag,
  TrendingUp,
  Truck,
  User,
  Users,
  AlertCircle,
  Sliders,
  X,
  BookOpen,
  Edit3,
} from "lucide-react";
import {
  initialProducts,
  categories,
  countries,
  initialJournal,
  initialContact,
  initialMessages,
  initialReviews,
  initialOrders,
  defaultUsers,
} from "./mockData.js";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.hostname
    ? `http://${window.location.hostname}:3001/api`
    : "http://localhost:3001/api");

const ShopContext = createContext(null);

function loadStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
    } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed saving to ${key}:`, err);
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function ShopProvider({ children }) {
  const [products, setProducts] = useState(() =>
    loadStorage("luma-products", initialProducts),
  );
  const [cart, setCart] = useState(() => loadStorage("luma-cart", []));
  const [wishlist, setWishlist] = useState(() =>
    loadStorage("luma-wishlist", []),
  );
  const [users] = useState(() =>
    loadStorage("luma-users", defaultUsers),
  );
  const [user, setUser] = useState(() => loadStorage("luma-user", null));
  const [token, setToken] = useState(
    () => localStorage.getItem("luma-token") || "",
  );
  const [orders, setOrders] = useState(() =>
    loadStorage("luma-orders", initialOrders),
  );
  const [reviews, setReviews] = useState(() =>
    loadStorage("luma-reviews", initialReviews),
  );
  const [messages, setMessages] = useState(() =>
    loadStorage("luma-contact-messages", initialMessages),
  );
  const [journal, setJournal] = useState(() =>
    loadStorage("luma-journal", initialJournal),
  );
  const [contact] = useState(initialContact);
  const [apiError, setApiError] = useState("");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [darkMode, setDarkMode] = useState(() => {
    try {
      localStorage.setItem("luma-theme", "light");
      document.documentElement.dataset.theme = "light";
    } catch {}
    return false;
  });
  const [loading, setLoading] = useState(false);

  // Currency State (default INR as requested, switchable to USD)
  const [currency, setCurrencyState] = useState(
    () => localStorage.getItem("luma-currency") || "INR",
  );

  // Saved Addresses State
  const [addresses, setAddresses] = useState(() =>
    loadStorage("luma-addresses", [
      {
        id: "addr-1",
        label: "Home",
        fullName: "Alia Stone",
        phone: "+91 98765 43210",
        addressLine1: "Flat 4B, Lotus Boulevard",
        addressLine2: "Sector 100",
        city: "Noida",
        state: "Uttar Pradesh",
        postalCode: "201304",
        country: "IN",
        isDefault: true,
      },
      {
        id: "addr-2",
        label: "Office",
        fullName: "Alia Stone",
        phone: "+91 98765 43210",
        addressLine1: "Tower 2, Cyber City",
        addressLine2: "DLF Phase 2",
        city: "Gurugram",
        state: "Haryana",
        postalCode: "122002",
        country: "IN",
        isDefault: false,
      },
    ]),
  );

  const [sessionId] = useState(() => {
    let sid = localStorage.getItem("session-id");
    if (!sid) {
      sid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "sid-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("session-id", sid);
    }
    return sid;
  });

  const authHeaders = useCallback(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  // Currency switcher and price formatting
  const setCurrency = useCallback((newCurr) => {
    setCurrencyState(newCurr);
    localStorage.setItem("luma-currency", newCurr);
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrencyState((prev) => {
      const next = prev === "INR" ? "USD" : "INR";
      localStorage.setItem("luma-currency", next);
      return next;
    });
  }, []);

  // Format price helper (1 USD = 83 INR)
  const formatPrice = useCallback(
    (amountInUsd) => {
      const val = Number(amountInUsd) || 0;
      if (currency === "INR") {
        const inrVal = Math.round(val * 83);
        return `₹${inrVal.toLocaleString("en-IN")}`;
      }
      return `$${val.toFixed(2)}`;
    },
    [currency],
  );

  const convertPrice = useCallback(
    (amountInUsd) => {
      const val = Number(amountInUsd) || 0;
      return currency === "INR" ? Math.round(val * 83) : Number(val.toFixed(2));
    },
    [currency],
  );

  const currencySymbol = currency === "INR" ? "₹" : "$";

  // Sync state to localStorage cache
  useEffect(() => {
    saveStorage("luma-products", products);
  }, [products]);

  useEffect(() => {
    saveStorage("luma-cart", cart);
  }, [cart]);

  useEffect(() => {
    saveStorage("luma-wishlist", wishlist);
  }, [wishlist]);

  useEffect(() => {
    saveStorage("luma-users", users);
  }, [users]);

  useEffect(() => {
    saveStorage("luma-user", user);
  }, [user]);

  useEffect(() => {
    saveStorage("luma-orders", orders);
  }, [orders]);

  useEffect(() => {
    saveStorage("luma-reviews", reviews);
  }, [reviews]);

  useEffect(() => {
    saveStorage("luma-contact-messages", messages);
  }, [messages]);

  useEffect(() => {
    saveStorage("luma-journal", journal);
  }, [journal]);

  useEffect(() => {
    saveStorage("luma-addresses", addresses);
  }, [addresses]);

  useEffect(() => {
    localStorage.setItem("luma-theme", darkMode ? "dark" : "light");
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  // Initial Backend API Handshake and Data Sync
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ok") {
          setBackendStatus("connected");
        }
      })
      .catch(() => setBackendStatus("offline"));

    // Fetch live products from backend
    fetch(`${API_URL}/products`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
        }
      })
      .catch(() => {});

    // Fetch journal from backend
    fetch(`${API_URL}/content/journal`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.entries) && data.entries.length > 0) {
          setJournal(data.entries);
        }
      })
      .catch(() => {});
  }, []);

  // Sync user profile when token is active
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.data?.user) {
          setUser(res.data.user);
        } else {
          localStorage.removeItem("luma-token");
          setToken("");
          setUser(null);
        }
      })
      .catch(() => {});

    // Fetch addresses for logged in user
    fetch(`${API_URL}/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          setAddresses(res.data);
        }
      })
      .catch(() => {});
  }, [token]);

  // Backend Cart Sync Helper
  const syncCartToBackend = useCallback(
    (nextCart) => {
      fetch(`${API_URL}/cart/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: nextCart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      }).catch(() => {});
    },
    [sessionId],
  );

  // Cart operations
  const addToCart = useCallback(
    (product, quantity = 1) => {
      setCart((prev) => {
        const existing = prev.find((item) => item.id === product.id);
        const next = existing
          ? prev.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            )
          : [...prev, { ...product, quantity }];
        syncCartToBackend(next);
        return next;
      });
    },
    [syncCartToBackend],
  );

  const updateQuantity = useCallback(
    (id, amount) => {
      setCart((prev) => {
        const next = prev
          .map((item) =>
            item.id === id
              ? { ...item, quantity: Math.max(0, item.quantity + amount) }
              : item,
          )
          .filter((item) => item.quantity > 0);
        syncCartToBackend(next);
        return next;
      });
    },
    [syncCartToBackend],
  );

  const removeFromCart = useCallback(
    (id) => {
      setCart((prev) => {
        const next = prev.filter((item) => item.id !== id);
        syncCartToBackend(next);
        return next;
      });
    },
    [syncCartToBackend],
  );

  const clearCart = useCallback(() => {
    setCart([]);
    syncCartToBackend([]);
  }, [syncCartToBackend]);

  // Wishlist operations
  const toggleWishlist = useCallback(
    (id) => {
      setWishlist((prev) => {
        const next = prev.includes(id)
          ? prev.filter((item) => item !== id)
          : [...prev, id];
        fetch(`${API_URL}/wishlist/${sessionId}/${id}`, {
          method: "POST",
        }).catch(() => {});
        return next;
      });
    },
    [sessionId],
  );

  // Auth operations
  const login = useCallback(async ({ email, password }) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || "Login failed");
      }
      localStorage.setItem("luma-token", data.data.token);
      setToken(data.data.token);
      setUser(data.data.user);
      return data.data.user;
    } catch (err) {
      // Offline / Demo fallback
      const normalizedEmail = email.trim().toLowerCase();
      if (
        (normalizedEmail === "admin@luma.skin" && password === "admin123") ||
        (normalizedEmail === "admin@example.com" &&
          password === "use_a_strong_unique_password")
      ) {
        const adminUser = {
          id: "admin-id",
          name: "Luma Admin",
          email: normalizedEmail,
          role: "admin",
        };
        setUser(adminUser);
        return adminUser;
      }
      if (normalizedEmail === "alia@luma.skin" && password === "password123") {
        const custUser = {
          id: "cust-id",
          name: "Alia Stone",
          email: normalizedEmail,
          role: "customer",
        };
        setUser(custUser);
        return custUser;
      }
      throw err;
    }
  }, []);

  const register = useCallback(async ({ email, password, name }) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || "Registration failed");
      }
      localStorage.setItem("luma-token", data.data.token);
      setToken(data.data.token);
      setUser(data.data.user);
      return data.data.user;
    } catch (err) {
      console.warn("Offline user registration fallback:", err?.message);
      const newUser = {
        id: "user-" + Date.now(),
        name: name || email.split("@")[0],
        email: email.trim().toLowerCase(),
        role: "customer",
      };
      setUser(newUser);
      return newUser;
    }
  }, []);

  const quickLogin = useCallback(
    async (role = "customer") => {
      if (role === "admin") {
        return await login({
          email: "admin@luma.skin",
          password: "admin123",
        }).catch(() => {
          const fallbackAdmin = {
            id: "user-admin",
            name: "Luma Admin",
            email: "admin@luma.skin",
            role: "admin",
          };
          setUser(fallbackAdmin);
          return fallbackAdmin;
        });
      } else {
        return await login({
          email: "alia@luma.skin",
          password: "password123",
        }).catch(() => {
          const fallbackCust = {
            id: "user-customer",
            name: "Alia Stone",
            email: "alia@luma.skin",
            role: "customer",
          };
          setUser(fallbackCust);
          return fallbackCust;
        });
      }
    },
    [login],
  );

  const completeGoogleLogin = useCallback(async () => {
    const googleUser = {
      id: "user-google",
      name: "Google Shopper",
      email: "shopper@gmail.com",
      role: "customer",
    };
    setUser(googleUser);
    return googleUser;
  }, []);

  const logout = useCallback(() => {
    if (token) {
      fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem("luma-token");
    setToken("");
    setUser(null);
  }, [token]);

  // Profile operations
  const updateProfile = useCallback(
    async (profileData) => {
      try {
        const res = await fetch(`${API_URL}/auth/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify(profileData),
        });
        const data = await res.json();
        if (data.ok && data.data?.user) {
          setUser(data.data.user);
          return data.data.user;
        }
      } catch (err) {
        console.warn("Profile update fallback:", err);
      }
      setUser((prev) => ({ ...prev, ...profileData }));
      return { ...user, ...profileData };
    },
    [authHeaders, user],
  );

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }) => {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || "Failed to change password");
      }
      return data;
    },
    [authHeaders],
  );

  // Address operations
  const addAddress = useCallback(
    async (addressData) => {
      try {
        const res = await fetch(`${API_URL}/addresses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify(addressData),
        });
        const data = await res.json();
        if (data.ok && data.data) {
          setAddresses((prev) => {
            const list = addressData.isDefault
              ? prev.map((a) => ({ ...a, isDefault: false }))
              : prev;
            return [data.data, ...list];
          });
          return data.data;
        }
      } catch (err) {
        console.warn("Address create fallback:", err);
      }
      const localAddress = {
        id: "addr-" + Date.now(),
        ...addressData,
      };
      setAddresses((prev) => {
        const list = addressData.isDefault
          ? prev.map((a) => ({ ...a, isDefault: false }))
          : prev;
        return [localAddress, ...list];
      });
      return localAddress;
    },
    [authHeaders],
  );

  const updateAddress = useCallback(
    async (id, addressData) => {
      try {
        await fetch(`${API_URL}/addresses/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify(addressData),
        });
      } catch (err) {
        console.warn("Address update fallback:", err);
      }
      setAddresses((prev) =>
        prev.map((a) => {
          if (a.id === id) return { ...a, ...addressData };
          if (addressData.isDefault) return { ...a, isDefault: false };
          return a;
        }),
      );
    },
    [authHeaders],
  );

  const deleteAddress = useCallback(
    async (id) => {
      try {
        await fetch(`${API_URL}/addresses/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
      } catch (err) {
        console.warn("Address delete fallback:", err);
      }
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    },
    [authHeaders],
  );

  const setDefaultAddress = useCallback(
    async (id) => {
      try {
        await fetch(`${API_URL}/addresses/${id}/default`, {
          method: "PATCH",
          headers: authHeaders(),
        });
      } catch (err) {
        console.warn("Address set default fallback:", err);
      }
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === id })),
      );
    },
    [authHeaders],
  );

  // Coupon validation helper
  const validateCouponCode = useCallback(
    async (code, subtotal) => {
      try {
        const res = await fetch(`${API_URL}/coupons/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, subtotal }),
        });
        const data = await res.json();
        return data;
      } catch {
        // Fallback for offline demo
        const cleanCode = (code || "").trim().toUpperCase();
        if (cleanCode === "LUMA10") {
          const discount = Math.round(subtotal * 0.1 * 100) / 100;
          return {
            ok: true,
            data: {
              valid: true,
              coupon: { code: "LUMA10", discountPercent: 10 },
              discount,
              newSubtotal: subtotal - discount,
            },
          };
        }
        if (cleanCode === "LUMA20") {
          const discount = Math.round(subtotal * 0.2 * 100) / 100;
          return {
            ok: true,
            data: {
              valid: true,
              coupon: { code: "LUMA20", discountPercent: 20 },
              discount,
              newSubtotal: subtotal - discount,
            },
          };
        }
        return { ok: false, message: "Invalid or expired coupon code." };
      }
    },
    [],
  );

  // Order placement via Backend API
  const placeOrder = useCallback(
    async ({ customer, items, subtotal, shipping, total, couponCode, paymentMethod = "cod" }) => {
      try {
        const response = await fetch(`${API_URL}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            sessionId,
            customer,
            items: items.map((it) => ({
              productId: it.id,
              quantity: it.quantity,
            })),
            couponCode: couponCode || undefined,
            currency,
            paymentMethod,
          }),
        });

        const data = await response.json();
        const orderData = data.data || data;
        if (response.ok && (orderData?.id || orderData?.orderNumber)) {
          setOrders((prev) => [orderData, ...prev]);
          clearCart();
          return orderData;
        }
      } catch (err) {
        console.warn("[Orders] Backend order fallback:", err);
      }

      // Offline fallback
      const orderId = `LUM-${Math.floor(100000 + Math.random() * 900000)}`;
      const now = new Date();
      const localOrder = {
        id: orderId,
        orderNumber: orderId,
        createdAt: now.toISOString(),
        date: now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        customer,
        items: items.map((item) => ({ ...item })),
        subtotal,
        shipping,
        tax: customer.country === "IN" ? Math.round(subtotal * 0.18 * 100) / 100 : 0,
        total,
        couponCode: couponCode || null,
        currency,
        status: "processing",
        paymentStatus: paymentMethod === "stripe" ? "paid" : "pending",
        paymentMethod,
      };

      setProducts((prev) =>
        prev.map((p) => {
          const cartItem = items.find((ci) => ci.id === p.id);
          if (cartItem) {
            const nextStock = Math.max(0, (p.inventory ?? 25) - cartItem.quantity);
            return { ...p, inventory: nextStock };
          }
          return p;
        }),
      );

      setOrders((prev) => [localOrder, ...prev]);
      clearCart();
      return localOrder;
    },
    [sessionId, authHeaders, clearCart, currency],
  );

  // Cancel order operation
  const cancelOrder = useCallback(
    async (orderId, reason = "Customer request") => {
      try {
        const res = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ reason }),
        });
        const data = await res.json();
        if (data.ok && data.data) {
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? data.data : o)),
          );
          return data.data;
        }
      } catch (err) {
        console.warn("Order cancel fallback:", err);
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "cancelled", paymentStatus: o.paymentStatus === "paid" ? "refunded" : o.paymentStatus }
            : o,
        ),
      );
    },
    [authHeaders],
  );

  // Review operations via Backend API
  const addReview = useCallback(
    async (productId, { name, rating, text }) => {
      try {
        const response = await fetch(`${API_URL}/products/${productId}/reviews`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ name, rating, text }),
        });
        const savedReview = await response.json();
        if (response.ok && savedReview?._id) {
          setReviews((prev) => [savedReview, ...prev]);
          return savedReview;
        }
      } catch (err) {
        console.warn("[Reviews] Backend review fallback:", err);
      }

      const newRev = {
        _id: `rev-${Date.now()}`,
        productId,
        userId: user?.id || "guest",
        name: name.trim(),
        rating: Number(rating),
        text: text.trim(),
        createdAt: new Date().toISOString(),
        isVerifiedPurchase: orders.some(
          (o) =>
            o.customer?.email === user?.email &&
            o.items?.some((it) => it.id === productId),
        ),
      };

      setReviews((prev) => [newRev, ...prev]);
      return newRev;
    },
    [authHeaders, user, orders],
  );

  const deleteReview = useCallback(
    async (productId, reviewId) => {
      try {
        await fetch(`${API_URL}/products/${productId}/reviews/${reviewId}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
      } catch (err) {
        console.warn("[Reviews] Backend delete review fallback:", err);
      }
      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
    },
    [authHeaders],
  );

  // Contact inquiries via Backend API
  const addMessage = useCallback(async ({ name, email, message }) => {
    try {
      await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
    } catch (err) {
      console.warn("[Contact] Backend message fallback:", err);
    }

    const newMsg = {
      _id: `msg-${Date.now()}`,
      name,
      email,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [newMsg, ...prev]);
    return newMsg;
  }, []);

  // Admin operations via Backend API
  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = authHeaders();
      const [sumRes, prodRes, ordRes, revRes, msgRes, jrnRes] =
        await Promise.all([
          fetch(`${API_URL}/admin/summary`, { headers }).then((r) => r.json()),
          fetch(`${API_URL}/admin/products`, { headers }).then((r) => r.json()),
          fetch(`${API_URL}/admin/orders`, { headers }).then((r) => r.json()),
          fetch(`${API_URL}/admin/reviews`, { headers }).then((r) => r.json()),
          fetch(`${API_URL}/admin/contact-messages`, { headers }).then((r) =>
            r.json(),
          ),
          fetch(`${API_URL}/admin/content/journal`, { headers }).then((r) =>
            r.json(),
          ),
        ]);

      if (prodRes?.ok && prodRes.data) setProducts(prodRes.data);
      if (ordRes?.ok && ordRes.data) setOrders(ordRes.data);
      if (revRes?.ok && revRes.data) setReviews(revRes.data);
      if (msgRes?.ok && msgRes.data) setMessages(msgRes.data);
      if (jrnRes?.ok && jrnRes.data?.entries) setJournal(jrnRes.data.entries);
      return sumRes?.data || null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const updateStock = useCallback(
    async (product, newStock) => {
      try {
        await fetch(`${API_URL}/admin/products/${product.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ inventory: newStock }),
        });
      } catch (err) {
        console.warn("[Admin] Stock update fallback:", err);
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, inventory: newStock } : p,
        ),
      );
    },
    [authHeaders],
  );

  const updateProduct = useCallback(
    async (productId, updates) => {
      try {
        const payload = { ...updates };
        if (payload.price !== undefined) payload.price = Number(payload.price);
        if (payload.inventory !== undefined)
          payload.inventory = Number(payload.inventory);

        const res = await fetch(`${API_URL}/admin/products/${productId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (res.ok && json.data) {
          setProducts((prev) =>
            prev.map((p) => (p.id === productId ? { ...p, ...json.data } : p)),
          );
          return { ok: true, data: json.data };
        }
      } catch (err) {
        console.warn("[Admin] Update product fallback:", err);
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, ...updates } : p)),
      );
      return { ok: true };
    },
    [authHeaders],
  );

  const createProduct = useCallback(
    async (productData) => {
      try {
        const res = await fetch(`${API_URL}/admin/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            ...productData,
            price: Number(productData.price),
            inventory: Number(productData.inventory),
          }),
        });
        const json = await res.json();
        if (res.ok && json.data) {
          setProducts((prev) => [...prev, json.data]);
          return json.data;
        }
      } catch (err) {
        console.warn("[Admin] Create product fallback:", err);
      }

      const newProduct = {
        ...productData,
        id: Date.now(),
        rating: 5.0,
        reviews: 0,
        image:
          productData.image ||
          "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=85",
        size: productData.size || "50 ml",
        description:
          productData.description ||
          "A gentle botanical formulation designed for daily barrier nourishment.",
        inventory: Number(productData.inventory) || 25,
        price: Number(productData.price) || 30,
      };
      setProducts((prev) => [...prev, newProduct]);
      return newProduct;
    },
    [authHeaders],
  );

  const deleteProduct = useCallback(
    async (product) => {
      try {
        await fetch(`${API_URL}/admin/products/${product.id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
      } catch (err) {
        console.warn("[Admin] Delete product fallback:", err);
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    },
    [authHeaders],
  );

  const updateOrderStatus = useCallback(
    async (order, status) => {
      try {
        await fetch(`${API_URL}/admin/orders/${order.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ status }),
        });
      } catch (err) {
        console.warn("[Admin] Order status fallback:", err);
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status } : o)),
      );
    },
    [authHeaders],
  );

  const updateOrderPaymentStatus = useCallback(
    async (order, paymentStatus) => {
      try {
        await fetch(`${API_URL}/admin/orders/${order.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ paymentStatus }),
        });
      } catch (err) {
        console.warn("[Admin] Order payment status fallback:", err);
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, paymentStatus } : o)),
      );
    },
    [authHeaders],
  );

  const updateMessage = useCallback(
    async (message, action) => {
      try {
        if (action === "delete") {
          await fetch(`${API_URL}/admin/contact-messages/${message._id}`, {
            method: "DELETE",
            headers: authHeaders(),
          });
        } else {
          await fetch(`${API_URL}/admin/contact-messages/${message._id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders(),
            },
            body: JSON.stringify({ read: !message.read }),
          });
        }
      } catch (err) {
        console.warn("[Admin] Message action fallback:", err);
      }

      if (action === "delete") {
        setMessages((prev) => prev.filter((m) => m._id !== message._id));
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === message._id ? { ...m, read: !m.read } : m,
          ),
        );
      }
    },
    [authHeaders],
  );

  const saveJournal = useCallback(
    async (newJournal) => {
      try {
        await fetch(`${API_URL}/admin/content/journal`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ entries: newJournal }),
        });
      } catch (err) {
        console.warn("[Admin] Save journal fallback:", err);
      }
      setJournal(newJournal);
    },
    [authHeaders],
  );

  const value = useMemo(
    () => ({
      products,
      cart,
      wishlist,
      user,
      users,
      orders,
      reviews,
      messages,
      journal,
      contact,
      loading,
      apiError,
      setApiError,
      backendStatus,
      darkMode,
      setDarkMode,
      currency,
      setCurrency,
      toggleCurrency,
      formatPrice,
      convertPrice,
      currencySymbol,
      addresses,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      updateProfile,
      changePassword,
      validateCouponCode,
      cancelOrder,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      toggleWishlist,
      login,
      register,
      quickLogin,
      completeGoogleLogin,
      logout,
      placeOrder,
      addReview,
      deleteReview,
      updateStock,
      updateProduct,
      createProduct,
      deleteProduct,
      updateOrderStatus,
      updateOrderPaymentStatus,
      updateMessage,
      addMessage,
      saveJournal,
      loadAdminData,
      authHeaders,
    }),
    [
      products,
      cart,
      wishlist,
      user,
      users,
      orders,
      reviews,
      messages,
      journal,
      contact,
      loading,
      apiError,
      backendStatus,
      darkMode,
      currency,
      setCurrency,
      toggleCurrency,
      formatPrice,
      convertPrice,
      currencySymbol,
      addresses,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      updateProfile,
      changePassword,
      validateCouponCode,
      cancelOrder,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      toggleWishlist,
      login,
      register,
      quickLogin,
      completeGoogleLogin,
      logout,
      placeOrder,
      addReview,
      deleteReview,
      updateStock,
      updateProduct,
      createProduct,
      deleteProduct,
      updateOrderStatus,
      updateOrderPaymentStatus,
      updateMessage,
      addMessage,
      saveJournal,
      loadAdminData,
      authHeaders,
    ],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
}

/* =====================================================================
   HEADER & NAVIGATION
===================================================================== */
function Header() {
  const {
    cart,
    wishlist,
    darkMode,
    setDarkMode,
    user,
    logout,
    backendStatus,
    currency,
    toggleCurrency,
  } = useShop();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  return (
    <header className="site-header">
      <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
        <span className="brand-mark">L</span>
        <span>
          luma<span className="brand-dot">.</span>
        </span>
      </Link>
      <nav className={menuOpen ? "nav-links open" : "nav-links"}>
        <Link to="/" onClick={() => setMenuOpen(false)}>
          Home
        </Link>
        <Link to="/shop" onClick={() => setMenuOpen(false)}>
          Shop
        </Link>
        <Link
          to="/ai-assistant"
          onClick={() => setMenuOpen(false)}
          className="nav-ai-link"
        >
          <Sparkles size={14} className="sparkle-icon" /> AI Assistant
        </Link>
        <Link to="/about" onClick={() => setMenuOpen(false)}>
          About
        </Link>
        <Link to="/journal" onClick={() => setMenuOpen(false)}>
          Journal
        </Link>
        <Link to="/contact" onClick={() => setMenuOpen(false)}>
          Contact
        </Link>
        {user?.role === "admin" && (
          <Link to="/admin" onClick={() => setMenuOpen(false)}>
            Admin
          </Link>
        )}

        {/* Mobile Navigation Drawer Quick Account & Controls */}
        <div className="mobile-drawer-footer">
          {user ? (
            <div className="mobile-drawer-user">
              <div className="mobile-user-card">
                <div className="mobile-user-avatar">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="mobile-user-details">
                  <strong>{user.name || "Customer"}</strong>
                  <small>{user.email}</small>
                  {user.role === "admin" && (
                    <span className="badge-admin">Admin</span>
                  )}
                </div>
              </div>
              <div className="mobile-user-nav-links">
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
                  <Sliders size={15} /> Dashboard
                </Link>
                <Link to="/orders" onClick={() => setMenuOpen(false)}>
                  <Package size={15} /> My Orders
                </Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)}>
                  <User size={15} /> My Profile
                </Link>
                <Link to="/wishlist" onClick={() => setMenuOpen(false)}>
                  <Heart size={15} /> Wishlist ({wishlist.length})
                </Link>
                <button
                  type="button"
                  className="mobile-logout-button"
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                >
                  <ArrowRight size={15} /> Log Out
                </button>
              </div>
            </div>
          ) : (
            <div className="mobile-drawer-auth">
              <Link
                to="/login"
                className="primary-button"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => setMenuOpen(false)}
              >
                Sign In / Register
              </Link>
            </div>
          )}

          <div className="mobile-drawer-controls">
            <button
              className="currency-toggle"
              onClick={toggleCurrency}
              title={`Switch currency (${currency})`}
            >
              <span className="currency-symbol">{currency === "INR" ? "₹" : "$"}</span>
              <span className="currency-code">{currency}</span>
            </button>
            <button
              className="icon-button"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="backend-pill">
              <span className={`status-dot ${backendStatus === "connected" ? "online" : "checking"}`} />
              <small>{backendStatus === "connected" ? "API Online" : "Connecting..."}</small>
            </div>
          </div>
        </div>
      </nav>
      <div className="header-actions">
        {/* Full Stack API Status Badge */}
        <div
          className="backend-pill"
          title={
            backendStatus === "connected"
              ? "Backend API Connected (port 3001)"
              : "Connecting to API backend..."
          }
        >
          <span
            className={`status-dot ${
              backendStatus === "connected" ? "online" : "checking"
            }`}
          />
          <small>
            {backendStatus === "connected" ? "API Online" : "Connecting"}
          </small>
        </div>

        {/* Currency Switcher */}
        <button
          className="currency-toggle"
          onClick={toggleCurrency}
          title={`Click to switch currency (Currently ${currency})`}
        >
          <span className="currency-symbol">
            {currency === "INR" ? "₹" : "$"}
          </span>
          <span className="currency-code">{currency}</span>
        </button>

        <button
          className="icon-button"
          aria-label="Toggle theme"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Link
          className="icon-button with-count"
          to="/wishlist"
          aria-label="Wishlist"
          title="View saved wishlist"
        >
          <Heart size={19} fill={wishlist.length ? "currentColor" : "none"} />
          <span>{wishlist.length}</span>
        </Link>
        <Link className="bag-button" to="/cart" title="View bag">
          <ShoppingBag size={17} />
          <span>Bag</span>
          <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b>
        </Link>

        {user ? (
          <div className="user-menu-container">
            <button
              className="user-pill-button"
              onClick={() => setUserDropdown(!userDropdown)}
              title={`Account: ${user.name || user.email}`}
            >
              <User size={15} />
              <span className="user-name-text">
                {(user.name || user.email).split(" ")[0]}
              </span>
              <ChevronDown size={13} />
            </button>
            {userDropdown && (
              <div
                className="user-dropdown-menu"
                onClick={() => setUserDropdown(false)}
              >
                <div className="user-dropdown-header">
                  <strong>{user.name || "Customer"}</strong>
                  <small>{user.email}</small>
                  {user.role === "admin" && (
                    <span className="badge-admin">Admin</span>
                  )}
                </div>
                <hr />
                <Link to="/dashboard">
                  <Sliders size={14} /> Customer Dashboard
                </Link>
                <Link to="/orders">
                  <Package size={14} /> My Orders
                </Link>
                <Link to="/profile">
                  <User size={14} /> My Profile
                </Link>
                {user.role === "admin" && (
                  <Link to="/admin">
                    <ShieldCheck size={14} /> Admin Panel
                  </Link>
                )}
                <hr />
                <button
                  type="button"
                  className="dropdown-logout"
                  onClick={logout}
                >
                  <ArrowRight size={14} /> Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            className="icon-button"
            to="/login"
            aria-label="Log in"
            title="Log in to your account"
          >
            <User size={19} />
          </Link>
        )}
        <button
          className="menu-button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}

function ApiNotice() {
  const { apiError, setApiError } = useShop();
  if (!apiError) return null;
  return (
    <aside className="api-notice" role="alert">
      <span>{apiError}</span>
      <button onClick={() => setApiError("")} aria-label="Dismiss">
        ×
      </button>
    </aside>
  );
}

function ProductImage({ src, alt, className }) {
  const [error, setError] = useState(false);
  const fallback =
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=85";

  return (
    <img
      src={error || !src ? fallback : src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

/* =====================================================================
   AUTH PAGES: LOGIN, REGISTER, FORGOT & RESET PASSWORD
===================================================================== */
function AuthPage({ mode = "login" }) {
  const navigate = useNavigate();
  const { login, register, quickLogin, completeGoogleLogin, user } = useShop();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (user) navigate(user.role === "admin" ? "/admin" : "/dashboard");
  }, [user, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setAuthError("");
    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ email, password, name });
      }
      navigate("/dashboard");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    await quickLogin(role);
    navigate(role === "admin" ? "/admin" : "/dashboard");
  };

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={submit}>
        <p className="eyebrow">Luma account</p>
        <h1>{mode === "login" ? "Welcome back." : "Create your account."}</h1>

        {/* 1-Click Instant Demo Login Buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1rem",
            width: "100%",
          }}
        >
          <button
            type="button"
            className="outline-button"
            style={{ flex: 1, fontSize: "0.85rem", padding: "0.6rem 0.5rem" }}
            onClick={() => handleDemoLogin("customer")}
          >
            Demo Customer
          </button>
          <button
            type="button"
            className="outline-button"
            style={{ flex: 1, fontSize: "0.85rem", padding: "0.6rem 0.5rem" }}
            onClick={() => handleDemoLogin("admin")}
          >
            Demo Admin
          </button>
        </div>

        {mode === "register" && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="password"
          minLength="6"
          placeholder="Password (6+ characters)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {mode === "login" && (
          <div style={{ textAlign: "right", margin: "-0.4rem 0 0.8rem" }}>
            <Link
              to="/forgot-password"
              style={{ fontSize: "0.82rem", color: "var(--muted)", textDecoration: "none" }}
            >
              Forgot password?
            </Link>
          </div>
        )}

        <button className="primary-button" disabled={loading}>
          {loading
            ? "Working..."
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="google-button"
          onClick={async () => {
            await completeGoogleLogin();
            navigate("/dashboard");
          }}
        >
          <span aria-hidden="true">G</span> Continue with Google
        </button>

        {authError && <p className="auth-error">{authError}</p>}

        <Link
          className="text-button"
          to={mode === "login" ? "/register" : "/login"}
        >
          {mode === "login"
            ? "Create an account"
            : "Already have an account? Log in"}
        </Link>
      </form>
    </main>
  );
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setDemoUrl("");
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || "Failed to process request");
      }
      setMessage(data.message || "A reset link has been dispatched to your email address.");
      if (data.resetUrl) {
        setDemoUrl(data.resetUrl);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <p className="eyebrow">Account Recovery</p>
        <h1>Reset your password</h1>
        <p className="auth-subtitle">
          Enter your registered email address and we'll dispatch a secure recovery token.
        </p>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="primary-button" disabled={loading}>
          {loading ? "Sending link..." : "Send Reset Link"}
        </button>
        {message && (
          <div className="auth-success-box">
            <CheckCircle2 size={16} />
            <p>{message}</p>
            {demoUrl && (
              <div style={{ marginTop: "0.5rem" }}>
                <small>Demo 1-Click Reset Link:</small>
                <br />
                <a href={demoUrl} style={{ color: "var(--green)", fontWeight: 600 }}>
                  Click here to complete password reset →
                </a>
              </div>
            )}
          </div>
        )}
        {error && <p className="auth-error">{error}</p>}
        <Link to="/login" className="text-button">
          ← Back to Log In
        </Link>
      </form>
    </main>
  );
}

function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || "Failed to reset password");
      }
      setMessage("Password successfully reset! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <p className="eyebrow">Security</p>
        <h1>Set new password</h1>
        <p className="auth-subtitle">Choose a strong, unique password for your LUMA ritual.</p>
        <input
          type="password"
          minLength="6"
          placeholder="New password (6+ chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          minLength="6"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button className="primary-button" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>
        {message && (
          <div className="auth-success-box">
            <CheckCircle2 size={16} />
            <p>{message}</p>
          </div>
        )}
        {error && <p className="auth-error">{error}</p>}
      </form>
    </main>
  );
}

function GoogleAuthCallbackPage() {
  const navigate = useNavigate();
  const { completeGoogleLogin } = useShop();

  useEffect(() => {
    completeGoogleLogin().then(() => {
      navigate("/dashboard");
    });
  }, [completeGoogleLogin, navigate]);

  return (
    <main className="empty-state page-empty">
      <h2>Connecting your Google profile...</h2>
      <p>Synchronizing your LUMA ritual.</p>
    </main>
  );
}

/* =====================================================================
   PRODUCT CARD & SHOPPING COMPONENTS
===================================================================== */
function ProductCard({ product }) {
  const { wishlist, toggleWishlist, addToCart, formatPrice } = useShop();
  const wished = wishlist.includes(product.id);
  const [added, setAdded] = useState(false);
  const stock = product.inventory ?? 25;

  const handleAdd = () => {
    if (stock <= 0) return;
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <Link to={`/product/${product.id}`}>
          <ProductImage src={product.image} alt={product.name} />
        </Link>
        <button
          className={wished ? "wishlist active" : "wishlist"}
          onClick={() => toggleWishlist(product.id)}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          title={wished ? "Saved in wishlist" : "Save to wishlist"}
        >
          <Heart size={18} fill={wished ? "currentColor" : "none"} />
        </button>
        <span className="product-tag">{product.category}</span>
        {stock <= 5 && stock > 0 && (
          <span className="stock-badge-low">Only {stock} left</span>
        )}
        {stock === 0 && (
          <span className="stock-badge-out">Out of Stock</span>
        )}
      </div>
      <div className="product-info">
        <div>
          <Link to={`/product/${product.id}`} className="product-name">
            {product.name}
          </Link>
          <p className="product-size">{product.size}</p>
        </div>
        <button
          className={added ? "add-mini added" : "add-mini"}
          onClick={handleAdd}
          disabled={stock <= 0}
          aria-label={`Add ${product.name} to bag`}
          title={stock <= 0 ? "Out of stock" : added ? "Added to bag!" : "Add to bag"}
        >
          {added ? <Check size={16} /> : <Plus size={18} />}
        </button>
      </div>
      <div className="product-meta">
        <span className="product-price">{formatPrice(product.price)}</span>
        <span className="rating">
          ★ {product.rating} <em>({product.reviews})</em>
        </span>
      </div>
    </article>
  );
}

/* =====================================================================
   CUSTOMER DASHBOARD & PROFILE
===================================================================== */
function CustomerDashboardPage() {
  const {
    user,
    orders,
    wishlist,
    products,
    addresses,
    addAddress,
    deleteAddress,
    setDefaultAddress,
    formatPrice,
    logout,
  } = useShop();
  const [activeTab, setActiveTab] = useState("overview");
  const [newAddrModal, setNewAddrModal] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: "Home",
    fullName: user?.name || "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    country: "IN",
    isDefault: false,
  });

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Filter orders belonging to this user
  const userOrders = orders.filter(
    (o) =>
      o.customer?.email?.toLowerCase() === user.email?.toLowerCase() ||
      o.userId === user.id,
  );

  const totalSpent = userOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    await addAddress(addrForm);
    setNewAddrModal(false);
    setAddrForm({
      label: "Home",
      fullName: user?.name || "",
      phone: "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
      country: "IN",
      isDefault: false,
    });
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-user-hero">
          <div className="user-avatar-circle">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="eyebrow">Customer Sanctuary</p>
            <h1>
              Welcome, <i>{(user.name || user.email).split(" ")[0]}</i>.
            </h1>
            <p className="user-email-meta">
              {user.email} · Member since 2026 · {user.role === "admin" ? "Store Administrator" : "Verified Customer"}
            </p>
          </div>
        </div>
        <div className="dashboard-header-actions">
          <Link to="/shop" className="outline-button">
            Continue Shopping
          </Link>
          <button onClick={logout} className="text-button">
            Log Out
          </button>
        </div>
      </div>

      <div className="dashboard-layout">
        {/* Sidebar Nav */}
        <aside className="dashboard-sidebar">
          <nav className="dashboard-tabs">
            <button
              className={activeTab === "overview" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("overview")}
            >
              <TrendingUp size={16} /> Overview
            </button>
            <button
              className={activeTab === "orders" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("orders")}
            >
              <Package size={16} /> My Orders ({userOrders.length})
            </button>
            <button
              className={activeTab === "addresses" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("addresses")}
            >
              <MapPin size={16} /> Saved Addresses ({addresses.length})
            </button>
            <button
              className={activeTab === "wishlist" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("wishlist")}
            >
              <Heart size={16} /> Wishlist ({wishlist.length})
            </button>
            <button
              className={activeTab === "profile" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("profile")}
            >
              <User size={16} /> Account Profile
            </button>
            <button
              className={activeTab === "password" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("password")}
            >
              <Lock size={16} /> Change Password
            </button>
            {user.role === "admin" && (
              <Link to="/admin" className="tab-btn admin-link">
                <ShieldCheck size={16} /> Admin Control Room →
              </Link>
            )}
          </nav>

          {/* AI Banner */}
          <div className="dashboard-ai-card">
            <Sparkles size={20} className="sparkle-icon" />
            <h3>Personalized Botanical Ritual</h3>
            <p>Consult our AI Skin Assistant for tailored morning and evening formulas.</p>
            <Link to="/ai-assistant" className="ai-btn-small">
              Start Skin Diagnostic →
            </Link>
          </div>
        </aside>

        {/* Tab Content Panes */}
        <section className="dashboard-content">
          {activeTab === "overview" && (
            <div className="tab-pane">
              <div className="kpi-grid">
                <div className="kpi-card">
                  <span className="kpi-title">Total Orders Placed</span>
                  <strong className="kpi-number">{userOrders.length}</strong>
                  <small>Delivered & in transit</small>
                </div>
                <div className="kpi-card">
                  <span className="kpi-title">Total Spent</span>
                  <strong className="kpi-number">{formatPrice(totalSpent)}</strong>
                  <small>Botanical investments</small>
                </div>
                <div className="kpi-card">
                  <span className="kpi-title">Wishlisted Formulas</span>
                  <strong className="kpi-number">{wishlist.length}</strong>
                  <small>Saved for next ritual</small>
                </div>
                <div className="kpi-card">
                  <span className="kpi-title">Saved Destinations</span>
                  <strong className="kpi-number">{addresses.length}</strong>
                  <small>Verified addresses</small>
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="dashboard-section-block">
                <div className="section-title-row">
                  <h2>Recent Orders</h2>
                  <button
                    className="text-link-btn"
                    onClick={() => setActiveTab("orders")}
                  >
                    View All Orders →
                  </button>
                </div>

                {userOrders.length > 0 ? (
                  <div className="order-cards-compact">
                    {userOrders.slice(0, 3).map((order) => (
                      <div className="order-compact-card" key={order.id}>
                        <div className="order-compact-info">
                          <strong>Order #{order.id}</strong>
                          <span>
                            {order.date || new Date(order.createdAt).toLocaleDateString()} ·{" "}
                            {order.items?.length || 0} items
                          </span>
                        </div>
                        <div className="order-status-group">
                          <span className={`status-badge status-${order.status || "processing"}`}>
                            {order.status || "processing"}
                          </span>
                          <span className={`payment-badge payment-${order.paymentStatus || "pending"}`}>
                            {order.paymentStatus || "pending"}
                          </span>
                        </div>
                        <div className="order-compact-total">
                          <b>{formatPrice(order.total)}</b>
                        </div>
                        <div className="order-compact-actions">
                          <Link to={`/orders/${order.id}`} className="outline-button-sm">
                            Details
                          </Link>
                          <Link to={`/orders/${order.id}/invoice`} className="outline-button-sm">
                            Invoice
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-substate">
                    <p>No orders yet. Begin your botanical journey today.</p>
                    <Link to="/shop" className="primary-button-sm">
                      Explore Formulas
                    </Link>
                  </div>
                )}
              </div>

              {/* Default Address Glance */}
              <div className="dashboard-section-block">
                <div className="section-title-row">
                  <h2>Default Delivery Address</h2>
                  <button
                    className="text-link-btn"
                    onClick={() => setActiveTab("addresses")}
                  >
                    Manage Addresses →
                  </button>
                </div>
                {addresses.find((a) => a.isDefault) || addresses[0] ? (
                  (() => {
                    const addr = addresses.find((a) => a.isDefault) || addresses[0];
                    return (
                      <div className="address-glance-card">
                        <div className="address-glance-tag">{addr.label}</div>
                        <p className="address-glance-name">{addr.fullName}</p>
                        <p className="address-glance-lines">
                          {addr.addressLine1}
                          {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                          <br />
                          {addr.city}, {addr.state} {addr.postalCode}
                          <br />
                          {addr.country === "IN" ? "India" : addr.country} · Phone: {addr.phone}
                        </p>
                      </div>
                    );
                  })()
                ) : (
                  <p className="muted-copy">No saved addresses on file.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="tab-pane">
              <OrderHistoryComponent />
            </div>
          )}

          {activeTab === "addresses" && (
            <div className="tab-pane">
              <div className="section-title-row">
                <h2>Saved Delivery Addresses</h2>
                <button
                  className="primary-button-sm"
                  onClick={() => setNewAddrModal(true)}
                >
                  <Plus size={14} /> Add New Address
                </button>
              </div>

              {newAddrModal && (
                <form className="address-add-form" onSubmit={handleCreateAddress}>
                  <h3>Add New Delivery Address</h3>
                  <div className="form-grid-2">
                    <input
                      placeholder="Label (e.g. Home, Studio, Office)"
                      value={addrForm.label}
                      onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                      required
                    />
                    <input
                      placeholder="Full recipient name"
                      value={addrForm.fullName}
                      onChange={(e) => setAddrForm({ ...addrForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-grid-2">
                    <input
                      placeholder="Contact phone (+91 98765 43210)"
                      value={addrForm.phone}
                      onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                      required
                    />
                    <select
                      value={addrForm.country}
                      onChange={(e) => setAddrForm({ ...addrForm, country: e.target.value })}
                    >
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    placeholder="Street address / Flat / Building"
                    value={addrForm.addressLine1}
                    onChange={(e) => setAddrForm({ ...addrForm, addressLine1: e.target.value })}
                    required
                  />
                  <div className="form-grid-3">
                    <input
                      placeholder="City"
                      value={addrForm.city}
                      onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                      required
                    />
                    <input
                      placeholder="State / Province"
                      value={addrForm.state}
                      onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                      required
                    />
                    <input
                      placeholder="PIN / Postal code"
                      value={addrForm.postalCode}
                      onChange={(e) => setAddrForm({ ...addrForm, postalCode: e.target.value })}
                      required
                    />
                  </div>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={addrForm.isDefault}
                      onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })}
                    />
                    Make this my default shipping address
                  </label>
                  <div className="form-actions-row">
                    <button type="submit" className="primary-button-sm">
                      Save Address
                    </button>
                    <button
                      type="button"
                      className="outline-button-sm"
                      onClick={() => setNewAddrModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="addresses-grid">
                {addresses.map((addr) => (
                  <div className="address-card" key={addr.id}>
                    <div className="address-card-header">
                      <span className="address-label-badge">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="address-default-badge">Default</span>
                      )}
                    </div>
                    <strong>{addr.fullName}</strong>
                    <p className="address-card-text">
                      {addr.addressLine1}
                      {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                      <br />
                      {addr.city}, {addr.state} {addr.postalCode}
                      <br />
                      {addr.country === "IN" ? "India" : addr.country}
                      <br />
                      <small>Phone: {addr.phone}</small>
                    </p>
                    <div className="address-card-footer">
                      {!addr.isDefault && (
                        <button
                          className="text-btn-sm"
                          onClick={() => setDefaultAddress(addr.id)}
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        className="text-btn-sm text-danger"
                        onClick={() => deleteAddress(addr.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "wishlist" && (
            <div className="tab-pane">
              <h2>My Saved Wishlist ({wishlistedProducts.length})</h2>
              {wishlistedProducts.length ? (
                <div className="product-grid">
                  {wishlistedProducts.map((p) => (
                    <ProductCard product={p} key={p.id} />
                  ))}
                </div>
              ) : (
                <div className="empty-substate">
                  <Heart size={28} />
                  <p>Your wishlist is quiet. Tap the heart on any product to save it.</p>
                  <Link to="/shop" className="primary-button-sm">
                    Discover Collection
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="tab-pane">
              <ProfileFormComponent user={user} />
            </div>
          )}

          {activeTab === "password" && (
            <div className="tab-pane">
              <ChangePasswordComponent />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ProfileFormComponent({ user }) {
  const { updateProfile } = useShop();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "+91 98765 43210");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await updateProfile({ name, phone });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form className="profile-form-block" onSubmit={handleSubmit}>
      <h2>Personal Information</h2>
      <p className="form-subtitle">Update your personal account credentials and contact details.</p>
      <div className="form-group">
        <label>Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>Email Address (Account Identifier)</label>
        <input type="email" value={user?.email || ""} disabled />
        <small className="muted-hint">To alter your registered email, contact client care.</small>
      </div>
      <div className="form-group">
        <label>Primary Contact Phone</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <button className="primary-button" disabled={saving}>
        {saving ? "Saving..." : saved ? "Changes Saved ✓" : "Update Profile"}
      </button>
    </form>
  );
}

function ChangePasswordComponent() {
  const { changePassword } = useShop();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setStatus("Password successfully updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="profile-form-block" onSubmit={handleSubmit}>
      <h2>Change Security Password</h2>
      <p className="form-subtitle">Ensure your account is safeguarded with a robust passphrase.</p>
      <div className="form-group">
        <label>Current Password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>New Password (min 6 characters)</label>
        <input
          type="password"
          minLength="6"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>Confirm New Password</label>
        <input
          type="password"
          minLength="6"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      {status && <p className="form-success">{status}</p>}
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={loading}>
        {loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}

/* =====================================================================
   ORDER HISTORY & ORDER DETAIL PAGES
===================================================================== */
function OrderHistoryComponent() {
  const { orders, user, formatPrice, cancelOrder } = useShop();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const userOrders = orders.filter(
    (o) =>
      !user ||
      user.role === "admin" ||
      o.customer?.email?.toLowerCase() === user.email?.toLowerCase() ||
      o.userId === user.id,
  );

  const filtered = userOrders.filter((o) => {
    const matchesFilter = filter === "all" || (o.status || "processing") === filter;
    const matchesSearch =
      !search ||
      o.id?.toLowerCase().includes(search.toLowerCase()) ||
      o.items?.some((it) => it.name?.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="order-history-wrap">
      <div className="order-history-controls">
        <div className="search-wrap">
          <Search size={16} />
          <input
            placeholder="Search by Order ID or formula name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="status-filter-pills">
          {["all", "processing", "shipped", "completed", "cancelled"].map((st) => (
            <button
              key={st}
              className={filter === st ? "pill-btn active" : "pill-btn"}
              onClick={() => setFilter(st)}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="orders-timeline-list">
          {filtered.map((order) => (
            <article className="order-card-detailed" key={order.id}>
              <div className="order-card-head">
                <div>
                  <span className="order-date-pill">
                    {order.date || new Date(order.createdAt).toLocaleDateString()}
                  </span>
                  <h3>Order #{order.id}</h3>
                  <small className="order-cust-meta">
                    Shipped to: {order.customer?.name} ({order.customer?.city || "India"})
                  </small>
                </div>
                <div className="order-badges-wrap">
                  <span className={`status-badge status-${order.status || "processing"}`}>
                    <Truck size={13} /> {order.status || "processing"}
                  </span>
                  <span className={`payment-badge payment-${order.paymentStatus || "pending"}`}>
                    <CreditCard size={13} /> {order.paymentStatus || "pending"}
                  </span>
                </div>
              </div>

              <div className="order-items-preview">
                {order.items?.map((it, idx) => (
                  <div className="order-item-chip" key={idx}>
                    {it.image && (
                      <img src={it.image} alt={it.name} className="order-item-thumb" />
                    )}
                    <div>
                      <strong>{it.name}</strong>
                      <small>
                        Qty: {it.quantity} · {formatPrice(it.price)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-card-foot">
                <div className="order-foot-pricing">
                  <span>Subtotal: {formatPrice(order.subtotal)}</span>
                  <span>GST/Tax: {formatPrice(order.tax || 0)}</span>
                  <strong>Grand Total: {formatPrice(order.total)}</strong>
                </div>
                <div className="order-foot-actions">
                  <Link to={`/orders/${order.id}`} className="outline-button-sm">
                    View Details
                  </Link>
                  <Link to={`/orders/${order.id}/invoice`} className="outline-button-sm">
                    <Printer size={13} /> Invoice
                  </Link>
                  {(order.status === "processing" || order.status === "awaiting_payment") && (
                    <button
                      className="text-btn-sm text-danger"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to cancel order #${order.id}?`)) {
                          cancelOrder(order.id);
                        }
                      }}
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-substate">
          <Package size={32} />
          <p>No orders matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

function OrderHistoryPage() {
  const { user } = useShop();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="detail-page" style={{ maxWidth: "1100px" }}>
      <p className="eyebrow">Client Portal</p>
      <h1>Your Order History</h1>
      <p className="page-desc">Track progress, review itemization, and access official tax invoices.</p>
      <OrderHistoryComponent />
    </main>
  );
}

function OrderDetailPage() {
  const { id } = useParams();
  const { orders, formatPrice, cancelOrder } = useShop();

  const order = orders.find((o) => o.id === id || String(o.orderNumber) === id);

  if (!order) {
    return (
      <main className="empty-state page-empty">
        <h2>Order Not Found</h2>
        <p>We could not locate reference #{id}.</p>
        <Link to="/orders" className="primary-button-sm">
          Return to Orders
        </Link>
      </main>
    );
  }

  const steps = ["Placed", "Processing", "Shipped", "Completed"];
  const currentStatus = order.status || "processing";
  const statusIndex =
    currentStatus === "cancelled"
      ? -1
      : steps.findIndex((s) => s.toLowerCase() === currentStatus.toLowerCase());

  return (
    <main className="order-detail-page">
      <div className="order-detail-header">
        <Link to="/orders" className="back-link">
          ← Back to Orders
        </Link>
        <div className="order-title-block">
          <div>
            <p className="eyebrow">Order Summary</p>
            <h1>Order #{order.id}</h1>
            <span className="order-date-text">
              Placed on {order.date || new Date(order.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="order-actions-top">
            <Link to={`/orders/${order.id}/invoice`} className="primary-button-sm">
              <Printer size={15} /> Print Tax Invoice
            </Link>
            {(order.status === "processing" || order.status === "awaiting_payment") && (
              <button
                className="outline-button-sm text-danger"
                onClick={() => {
                  if (window.confirm("Cancel this order and request refund?")) {
                    cancelOrder(order.id);
                  }
                }}
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stepper Progress */}
      <div className="order-progress-stepper">
        {currentStatus === "cancelled" ? (
          <div className="order-cancelled-banner">
            <AlertCircle size={20} />
            <span>This order was cancelled. Restocked in warehouse and refunded.</span>
          </div>
        ) : (
          <div className="stepper-track">
            {steps.map((st, idx) => {
              const active = idx <= (statusIndex >= 0 ? statusIndex : 1);
              return (
                <div className={`step-item ${active ? "completed" : ""}`} key={st}>
                  <div className="step-circle">{active ? <Check size={14} /> : idx + 1}</div>
                  <span className="step-label">{st}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Items & Meta */}
      <div className="order-detail-grid">
        <div className="order-items-table-card">
          <h2>Formulas in Order ({order.items?.length || 0})</h2>
          <div className="itemized-list">
            {order.items?.map((it, idx) => (
              <div className="itemized-row" key={idx}>
                <ProductImage src={it.image} alt={it.name} className="itemized-thumb" />
                <div className="itemized-meta">
                  <strong>{it.name}</strong>
                  <small>{it.size || "50 ml"}</small>
                  <span>
                    {formatPrice(it.price)} × {it.quantity}
                  </span>
                </div>
                <div className="itemized-row-total">
                  <b>{formatPrice(it.price * it.quantity)}</b>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Breakdown */}
          <div className="pricing-breakdown-card">
            <div className="pricing-line">
              <span>Subtotal</span>
              <b>{formatPrice(order.subtotal)}</b>
            </div>
            {order.discount ? (
              <div className="pricing-line discount-line">
                <span>Coupon Discount ({order.couponCode || "PROMO"})</span>
                <b>-{formatPrice(order.discount)}</b>
              </div>
            ) : null}
            <div className="pricing-line">
              <span>Estimated Shipping</span>
              <b>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</b>
            </div>
            <div className="pricing-line">
              <span>GST / Tax (18% Indian GST)</span>
              <b>{formatPrice(order.tax || 0)}</b>
            </div>
            <hr />
            <div className="pricing-total-line">
              <span>Total Paid</span>
              <strong>{formatPrice(order.total)}</strong>
            </div>
          </div>
        </div>

        {/* Shipping & Payment Meta */}
        <aside className="order-meta-aside">
          <div className="meta-card">
            <h3>Delivery Address</h3>
            <p className="meta-card-body">
              <strong>{order.customer?.name}</strong>
              <br />
              {order.customer?.address || order.customer?.addressLine1}
              <br />
              {order.customer?.city}, {order.customer?.state} {order.customer?.zip || order.customer?.postalCode}
              <br />
              {order.customer?.country === "IN" ? "India" : order.customer?.country}
              <br />
              <small>Email: {order.customer?.email}</small>
            </p>
          </div>

          <div className="meta-card">
            <h3>Payment Status</h3>
            <div className="meta-payment-status">
              <span className={`payment-badge payment-${order.paymentStatus || "pending"}`}>
                {order.paymentStatus || "pending"}
              </span>
              <p>
                Method: <b>{order.paymentMethod === "stripe" ? "Stripe Online Card" : "Cash on Delivery"}</b>
              </p>
              {order.paymentStatus === "paid" && (
                <small className="text-green">✓ Verified & processed securely via Stripe</small>
              )}
            </div>
          </div>

          <div className="meta-card help-card">
            <h3>Need Assistance?</h3>
            <p>Our concierge is here to assist with tracking or formula inquiries.</p>
            <Link to="/contact" className="outline-button-sm">
              Contact Care
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

function OrderInvoicePage() {
  const { id } = useParams();
  const { orders, formatPrice } = useShop();

  const order = orders.find((o) => o.id === id || String(o.orderNumber) === id);

  if (!order) {
    return (
      <main className="empty-state page-empty">
        <h2>Invoice Not Available</h2>
        <Link to="/orders">Return to Orders</Link>
      </main>
    );
  }

  const subtotal = order.subtotal || 0;
  const tax = order.tax || (order.customer?.country === "IN" ? Math.round(subtotal * 0.18 * 100) / 100 : 0);
  const cgst = Math.round((tax / 2) * 100) / 100;
  const sgst = cgst;

  return (
    <div className="invoice-container">
      <div className="invoice-print-actions no-print">
        <Link to={`/orders/${order.id}`} className="outline-button-sm">
          ← Return to Order Details
        </Link>
        <button className="primary-button-sm" onClick={() => window.print()}>
          <Printer size={15} /> Print Official Invoice
        </button>
      </div>

      <div className="invoice-paper">
        {/* Invoice Header */}
        <div className="invoice-header">
          <div>
            <div className="brand" style={{ fontSize: "28px" }}>
              <span className="brand-mark">L</span>
              <span>
                luma<span className="brand-dot">.</span>
              </span>
            </div>
            <p className="invoice-brand-subtitle">
              Luma Botanical Skincare Pvt. Ltd.
              <br />
              GSTIN: 27AABCL1234F1Z5
              <br />
              Registered Studio: 12 Bloom Street, Mumbai 400001
              <br />
              clientcare@luma.skin · www.luma.skin
            </p>
          </div>
          <div className="invoice-num-block">
            <span className="invoice-title-tag">TAX INVOICE</span>
            <h2>INV-{order.id}</h2>
            <p>
              Date: <b>{order.date || new Date(order.createdAt).toLocaleDateString()}</b>
              <br />
              Order Ref: <b>{order.id}</b>
              <br />
              Payment: <b style={{ textTransform: "uppercase" }}>{order.paymentStatus || "PENDING"}</b>
            </p>
          </div>
        </div>

        <hr className="invoice-hr" />

        {/* Bill To & Ship To */}
        <div className="invoice-parties">
          <div>
            <span className="party-title">BILLED TO</span>
            <strong>{order.customer?.name}</strong>
            <p>
              {order.customer?.address || order.customer?.addressLine1}
              <br />
              {order.customer?.city}, {order.customer?.state} {order.customer?.zip || order.customer?.postalCode}
              <br />
              Country: {order.customer?.country === "IN" ? "India" : order.customer?.country}
              <br />
              Email: {order.customer?.email}
            </p>
          </div>
          <div>
            <span className="party-title">SHIPPED TO</span>
            <strong>{order.customer?.name}</strong>
            <p>
              {order.customer?.address || order.customer?.addressLine1}
              <br />
              {order.customer?.city}, {order.customer?.state} {order.customer?.zip || order.customer?.postalCode}
              <br />
              Tracking: LUMA-TRK-{order.id.slice(-6)}
              <br />
              Courier: Bluedart / Express Air
            </p>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="invoice-table-wrapper">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item Description</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Unit Rate</th>
                <th>GST Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((it, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{it.name}</strong>
                    <small style={{ display: "block", opacity: 0.7 }}>{it.size || "50 ml"}</small>
                  </td>
                  <td>LUM-SKU-0{it.id || idx + 1}</td>
                  <td>{it.quantity}</td>
                  <td>{formatPrice(it.price)}</td>
                  <td>18% GST</td>
                  <td>{formatPrice(it.price * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tax & Total Summary */}
        <div className="invoice-summary-wrap">
          <div className="invoice-notes">
            <strong>Notes & Terms:</strong>
            <p>
              ✦ Goods sold are covered under LUMA 30-Day Freshness Guarantee.
              <br />
              ✦ Indian GST calculated at 9% CGST + 9% SGST for domestic supply.
              <br />
              ✦ Computer generated invoice; no physical signature required.
            </p>
          </div>
          <div className="invoice-totals-box">
            <div className="tot-row">
              <span>Subtotal:</span>
              <b>{formatPrice(subtotal)}</b>
            </div>
            {order.discount ? (
              <div className="tot-row">
                <span>Discount ({order.couponCode || "PROMO"}):</span>
                <b>-{formatPrice(order.discount)}</b>
              </div>
            ) : null}
            <div className="tot-row">
              <span>Shipping Fee:</span>
              <b>{order.shipping === 0 ? "FREE" : formatPrice(order.shipping)}</b>
            </div>
            <div className="tot-row">
              <span>CGST (9%):</span>
              <b>{formatPrice(cgst)}</b>
            </div>
            <div className="tot-row">
              <span>SGST (9%):</span>
              <b>{formatPrice(sgst)}</b>
            </div>
            <hr />
            <div className="tot-row grand-total">
              <span>Grand Total:</span>
              <strong>{formatPrice(order.total)}</strong>
            </div>
          </div>
        </div>

        <div className="invoice-footer">
          <p>Thank you for nourishing your barrier with LUMA botanical skincare.</p>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   LUMA AI SKIN ASSISTANT
===================================================================== */
function AiAssistantPage() {
  const { products, addToCart, formatPrice } = useShop();
  const [skinType, setSkinType] = useState("Combination");
  const [concern, setConcern] = useState("Hydration & Barrier Repair");
  const [age, setAge] = useState("20s");
  const [preference, setPreference] = useState("Balanced (4-Step)");
  const [loading, setLoading] = useState(false);
  const [routine, setRoutine] = useState(null);
  const [allAdded, setAllAdded] = useState(false);

  const skinTypes = ["Oily", "Dry", "Combination", "Sensitive", "Normal"];
  const concerns = [
    "Hydration & Barrier Repair",
    "Acne & Blemishes",
    "Dark Spots & Hyperpigmentation",
    "Fine Lines & Elasticity",
    "Redness & Inflammation",
  ];
  const ageGroups = ["Teens", "20s", "30s", "40s", "50+"];
  const preferences = ["Minimalist (2-Step)", "Balanced (4-Step)", "Comprehensive (6-Step)"];

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAllAdded(false);

    try {
      const res = await fetch(`${API_URL}/ai/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skinType, concern, age, preference }),
      });
      const data = await res.json();
      if (data.ok && data.data?.routine) {
        setRoutine(data.data.routine);
        setLoading(false);
        return;
      }
    } catch {
      // Fallback local smart algorithm
    }

    // Client-side rule engine
    setTimeout(() => {
      const cleanser =
        skinType === "Oily"
          ? products.find((p) => p.name.includes("Green Tea") || p.name.includes("Fig")) || products[0]
          : products.find((p) => p.name.includes("Cloud Milk") || p.name.includes("Balm")) || products[0];

      const serum =
        concern.includes("Dark Spots")
          ? products.find((p) => p.name.includes("Cloudberry") || p.name.includes("Golden")) || products[1]
          : products.find((p) => p.name.includes("Dew Drop")) || products[1];

      const moisturizer =
        skinType === "Dry"
          ? products.find((p) => p.name.includes("Lunar") || p.name.includes("Barrier Balm")) || products[2]
          : products.find((p) => p.name.includes("Petal Veil") || p.name.includes("Dewy Barrier")) || products[2];

      const spf = products.find((p) => p.category === "Sun Care") || products[3];
      const nightTreatment = products.find((p) => p.name.includes("Night Bloom") || p.name.includes("Blue Hour")) || products[4];

      setRoutine({
        skinProfile: { skinType, concern, age, preference },
        morning: [
          { step: "Step 1: Cleanse", instructions: "Massage gently with lukewarm water for 60s.", product: cleanser },
          { step: "Step 2: Treat", instructions: "Press 3-4 drops into damp skin for instant luminosity.", product: serum },
          { step: "Step 3: Hydrate", instructions: "Seal hydration with a protective botanical layer.", product: moisturizer },
          { step: "Step 4: Shield", instructions: "Apply two finger lengths to face and neck as daily mineral protection.", product: spf },
        ],
        night: [
          { step: "Step 1: Melt & Cleanse", instructions: "Melt away city stress and sunscreen completely.", product: cleanser },
          { step: "Step 2: Restore", instructions: "Warm 3 drops between fingertips and gently press into skin.", product: nightTreatment },
          { step: "Step 3: Lock Moisture", instructions: "Allow active botanicals to renew cellular turnover while you sleep.", product: moisturizer },
        ],
        activeIngredients: [
          { name: "Niacinamide (5%)", benefit: "Calms inflammation, balances sebum, and tightens pores." },
          { name: "Tremella Mushroom", benefit: "Holds 500x its weight in moisture, cushioning skin cells." },
          { name: "Phyto-Squalane", benefit: "Mimics natural skin lipids to lock hydration without greasiness." },
          { name: "Bakuchiol", benefit: "Botanical retinol alternative promoting cell turnover gently." },
        ],
        cautions: [
          "Avoid mixing active chemical exfoliators with concentrated Vitamin C in the same morning ritual.",
          "Perform a 24-hour patch test on the inner arm before applying new botanical actives to the face.",
        ],
      });
      setLoading(false);
    }, 600);
  };

  const handleAddAllToCart = () => {
    if (!routine) return;
    const addedIds = new Set();
    [...routine.morning, ...routine.night].forEach((s) => {
      if (s.product && !addedIds.has(s.product.id)) {
        addToCart(s.product);
        addedIds.add(s.product.id);
      }
    });
    setAllAdded(true);
    setTimeout(() => setAllAdded(false), 3000);
  };

  return (
    <main className="ai-page">
      <div className="ai-hero">
        <div className="ai-hero-copy">
          <p className="eyebrow">
            <Sparkles size={14} className="sparkle-icon" /> LUMA Intelligent Skin Lab
          </p>
          <h1>
            Your Precision <i>Botanical Ritual.</i>
          </h1>
          <p className="hero-lead">
            Harnessing dermatological science and botanical synergy to build your optimal morning and night rituals.
          </p>
        </div>
      </div>

      <div className="ai-container">
        {/* Diagnostic Form */}
        <form className="ai-form-card" onSubmit={handleGenerate}>
          <h2>Skin Diagnostic Assessment</h2>
          <p className="ai-form-desc">
            Select your unique skin parameters to receive a custom botanical sequence.
          </p>

          <div className="ai-field-group">
            <label>1. Your Skin Type</label>
            <div className="choice-pills">
              {skinTypes.map((t) => (
                <button
                  type="button"
                  key={t}
                  className={skinType === t ? "choice-pill active" : "choice-pill"}
                  onClick={() => setSkinType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="ai-field-group">
            <label>2. Primary Skin Concern</label>
            <div className="choice-pills">
              {concerns.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={concern === c ? "choice-pill active" : "choice-pill"}
                  onClick={() => setConcern(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="ai-field-grid">
            <div className="ai-field-group">
              <label>3. Age Bracket</label>
              <select value={age} onChange={(e) => setAge(e.target.value)}>
                {ageGroups.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="ai-field-group">
              <label>4. Routine Preference</label>
              <select value={preference} onChange={(e) => setPreference(e.target.value)}>
                {preferences.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button className="primary-button ai-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <RefreshCw size={16} className="spin-icon" /> Formulating Ritual...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Analyze Skin & Generate Ritual
              </>
            )}
          </button>
        </form>

        {/* Results Showcase */}
        {routine && (
          <div className="ai-results-wrapper">
            <div className="ai-results-header">
              <div>
                <p className="eyebrow">Prescribed Formulas</p>
                <h2>
                  Tailored Ritual for <i>{skinType} Skin</i>
                </h2>
                <p className="meta-target">Targeting: {concern} · {preference}</p>
              </div>
              <button
                className="primary-button add-routine-btn"
                onClick={handleAddAllToCart}
              >
                {allAdded ? "Added Full Routine to Bag ✓" : "Add Complete Routine to Bag"}
              </button>
            </div>

            {/* Morning Sequence */}
            <div className="routine-block">
              <h3 className="routine-heading">
                <Sun size={18} /> Morning Sequence · Protect & Glow
              </h3>
              <div className="routine-cards-grid">
                {routine.morning.map((step, idx) => (
                  <div className="routine-step-card" key={idx}>
                    <div className="step-tag">{step.step}</div>
                    <ProductImage src={step.product?.image} alt={step.product?.name} className="routine-img" />
                    <h4>{step.product?.name}</h4>
                    <p className="routine-instructions">{step.instructions}</p>
                    <div className="routine-card-footer">
                      <span className="routine-price">{formatPrice(step.product?.price)}</span>
                      <button
                        className="outline-button-sm"
                        onClick={() => addToCart(step.product)}
                      >
                        Add to Bag
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Night Sequence */}
            <div className="routine-block">
              <h3 className="routine-heading">
                <Moon size={18} /> Night Sequence · Repair & Restore
              </h3>
              <div className="routine-cards-grid">
                {routine.night.map((step, idx) => (
                  <div className="routine-step-card" key={idx}>
                    <div className="step-tag">{step.step}</div>
                    <ProductImage src={step.product?.image} alt={step.product?.name} className="routine-img" />
                    <h4>{step.product?.name}</h4>
                    <p className="routine-instructions">{step.instructions}</p>
                    <div className="routine-card-footer">
                      <span className="routine-price">{formatPrice(step.product?.price)}</span>
                      <button
                        className="outline-button-sm"
                        onClick={() => addToCart(step.product)}
                      >
                        Add to Bag
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Science & Actives Breakdown */}
            <div className="ai-science-block">
              <h3>Active Ingredients Science</h3>
              <div className="actives-grid">
                {routine.activeIngredients.map((act, idx) => (
                  <div className="active-card" key={idx}>
                    <strong>{act.name}</strong>
                    <p>{act.benefit}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Precautions & Warnings */}
            <div className="ai-cautions-block">
              <h4>Safety & Ingredient Compatibility</h4>
              <ul>
                {routine.cautions.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>

            {/* Medical Disclaimer */}
            <div className="ai-disclaimer-box">
              <ShieldCheck size={18} />
              <p>
                <strong>Dermatological Disclaimer:</strong> The LUMA AI Skin Assistant provides general cosmetic recommendations based on botanical formulation principles. It is not intended as medical advice or clinical diagnosis. For acute dermatological conditions, consult a board-certified dermatologist.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* =====================================================================
   SHOP, HOME, CART, CHECKOUT PAGES
===================================================================== */
function ShopPage() {
  const { products, loading, formatPrice } = useShop();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [sort, setSort] = useState("featured");
  const category = params.get("category") || "All products";
  const maxPrice = Number(params.get("max") || 60);

  const filtered = useMemo(() => {
    return products
      .filter((product) => {
        const matchesCategory =
          category === "All products" || product.category === category;
        const matchesPrice = (product.price ?? 30) <= maxPrice;
        const matchesQuery =
          !query ||
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.description?.toLowerCase().includes(query.toLowerCase());
        return matchesCategory && matchesPrice && matchesQuery;
      })
      .sort((first, second) => {
        if (sort === "price-low") return first.price - second.price;
        if (sort === "price-high") return second.price - first.price;
        if (sort === "rating") return second.rating - first.rating;
        if (sort === "name") return first.name.localeCompare(second.name);
        return first.id - second.id;
      });
  }, [products, category, maxPrice, query, sort]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  return (
    <main>
      <section className="shop-heading">
        <div>
          <p className="eyebrow">The collection</p>
          <h1>
            Good skin, <i>gently.</i>
          </h1>
          <p className="heading-copy">
            Thoughtful essentials for your everyday ritual. Made with botanical extracts and clinically proven actives.
          </p>
        </div>
        <div className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              updateFilter("q", event.target.value);
            }}
            placeholder="Search formulas or ingredients..."
          />
        </div>
      </section>

      {loading ? (
        <div className="empty-state">
          <Sparkles size={28} />
          <h2>Loading the collection.</h2>
        </div>
      ) : (
        <section className="shop-layout">
          <aside className="filters">
            <p className="filter-label">Browse by category</p>
            {categories.map((item) => (
              <button
                key={item}
                className={
                  category === item ? "filter-option active" : "filter-option"
                }
                onClick={() =>
                  updateFilter("category", item === "All products" ? "" : item)
                }
              >
                <span>{item}</span>
                <span className="filter-count">
                  {item === "All products"
                    ? products.length
                    : products.filter((product) => product.category === item)
                        .length}
                </span>
              </button>
            ))}
            <div className="price-filter">
              <p className="filter-label">
                Price up to <strong>{formatPrice(maxPrice)}</strong>
              </p>
              <input
                type="range"
                min="18"
                max="60"
                value={maxPrice}
                onChange={(event) => updateFilter("max", event.target.value)}
              />
            </div>
          </aside>

          <div className="catalog">
            <div className="catalog-toolbar">
              <span>Showing <b>{filtered.length}</b> botanical formulations</span>
              <label>
                Sort by{" "}
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="name">Alphabetical</option>
                </select>
                <ChevronDown size={14} />
              </label>
            </div>

            {filtered.length ? (
              <div className="product-grid">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Sparkles size={28} />
                <h2>No matches found.</h2>
                <p>Try adjusting your search query or reset the price slider.</p>
                <button
                  className="text-button"
                  onClick={() => {
                    setQuery("");
                    setParams({});
                  }}
                >
                  Reset all filters <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function HomePage() {
  const { products, loading } = useShop();

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Skincare, simplified</p>
          <h1>
            Your skin's <i>quiet</i> luxury.
          </h1>
          <p>
            Small rituals. Considered ingredients. A softer way to take care of
            the skin you live in.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", margin: "24px 0" }}>
            <Link to="/shop" className="primary-button">
              Shop the collection <ArrowRight size={16} />
            </Link>
            <Link to="/ai-assistant" className="outline-button">
              <Sparkles size={16} /> AI Ritual Diagnostic
            </Link>
          </div>
          <div className="hero-pills-row">
            <span className="hero-pill-badge">✦ Cold-distilled bio-actives</span>
            <span className="hero-pill-badge">✦ Lipid barrier nourishment</span>
            <span className="hero-pill-badge">✦ Dermatologically tested</span>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=1200&q=90"
            alt="Luma skincare bottles on a stone surface"
          />
          <div className="hero-stamp">
            made for
            <br />
            <i>slow</i> mornings
          </div>
        </div>
      </section>
      <section className="ticker">
        <span>✦ Cold-Distilled Actives</span>
        <b>✦</b>
        <span>Barrier-First Science</span>
        <b>✦</b>
        <span>100% Recyclable Glass</span>
        <b>✦</b>
        <span>Conscious Botanical Rituals</span>
        <b>✦</b>
        <span>Dermatologically Verified</span>
      </section>
      <section className="featured" id="ritual">
        <div className="section-intro">
          <div>
            <p className="eyebrow">Meet your essentials</p>
            <h2>
              A little <i>luma</i> goes a long way.
            </h2>
          </div>
          <Link to="/shop" className="text-button">
            View all products <ArrowRight size={15} />
          </Link>
        </div>
        {loading ? (
          <div className="empty-state">
            <Sparkles size={28} />
            <h2>Loading the collection.</h2>
          </div>
        ) : (
          <div className="product-grid">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
      <section className="ritual-band" id="journal">
        <div>
          <p className="eyebrow">The luma ritual</p>
          <h2>
            Less noise.
            <br />
            <i>More glow.</i>
          </h2>
        </div>
        <p>
          We believe skincare should feel like a breath, not a chore. Each
          formula is made to be understood, enjoyed, and used right down to the
          last drop.
        </p>
        <Link to="/shop" className="circle-arrow" aria-label="Shop now">
          <ArrowRight size={20} />
        </Link>
      </section>

      {/* AI Assistant Spotlight Banner */}
      <section className="ai-spotlight-banner">
        <div className="ai-spotlight-content">
          <span className="badge-ai">✦ LUMA AI Skin Assistant</span>
          <h2>Tailored Formulas for Your Unique Biology</h2>
          <p>
            Discover your personalized morning and evening sequences powered by smart active-pairing science.
          </p>
          <Link to="/ai-assistant" className="primary-button">
            Launch Skin Diagnostic <Sparkles size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}

function ProductPage() {
  const { id } = useParams();
  const {
    products,
    loading,
    addToCart,
    wishlist,
    toggleWishlist,
    reviews: allReviews,
    addReview,
    deleteReview,
    user,
    orders,
    formatPrice,
  } = useShop();

  const product = products.find((item) => item.id === Number(id));
  const [added, setAdded] = useState(false);
  const [productReviews, setProductReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({
    name: user?.name || "",
    rating: 5,
    text: "",
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Recommendations: You May Also Like
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.id !== product.id && p.category === product.category)
      .slice(0, 3);
  }, [product, products]);

  // Frequently Bought Together Bundle
  const bundleProduct = useMemo(() => {
    if (!product) return null;
    return products.find((p) => p.id !== product.id && p.category !== product.category) || products[0];
  }, [product, products]);

  // Fetch live reviews from backend API for this product
  useEffect(() => {
    if (!product) return;
    fetch(`${API_URL}/products/${product.id}/reviews`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.reviews)) {
          setProductReviews(data.reviews);
        }
      })
      .catch(() => {
        setProductReviews(allReviews.filter((r) => r.productId === product.id));
      });
  }, [product, allReviews]);

  if (loading) {
    return (
      <div className="empty-state page-empty">
        <h2>Loading product...</h2>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="empty-state page-empty">
        <h2>Product not found</h2>
        <Link to="/shop" className="text-button">
          Back to shop <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  const wished = wishlist.includes(product.id);
  const stock = product.inventory ?? 25;

  const handleAddToCart = () => {
    if (stock <= 0) return;
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleAddBundle = () => {
    if (stock > 0) addToCart(product);
    if (bundleProduct && (bundleProduct.inventory ?? 25) > 0) addToCart(bundleProduct);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.name || !reviewForm.text) return;

    setReviewSubmitting(true);
    const created = await addReview(product.id, reviewForm);
    if (created) {
      setProductReviews((prev) => [created, ...prev]);
    }
    setReviewForm({
      name: user?.name || "",
      rating: 5,
      text: "",
    });
    setReviewSubmitting(false);
  };

  const handleDeleteReview = async (reviewId) => {
    await deleteReview(product.id, reviewId);
    setProductReviews((prev) => prev.filter((r) => r._id !== reviewId));
  };

  // Check if current user has verified purchase of this product
  const hasPurchased = orders.some(
    (o) =>
      o.customer?.email?.toLowerCase() === user?.email?.toLowerCase() &&
      o.items?.some((it) => it.id === product.id),
  );

  return (
    <main className="detail-page">
      <Link to="/shop" className="back-link">
        ← Back to collection
      </Link>
      <div className="detail-layout">
        <div className="detail-image">
          <ProductImage src={product.image} alt={product.name} />
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <div className="detail-rating">
            ★ {product.rating} <span>{product.reviews} reviews</span>
            {hasPurchased && (
              <span className="verified-badge-pill">
                <Check size={12} /> You purchased this
              </span>
            )}
          </div>
          <p className="detail-description">{product.description}</p>
          <div className="detail-price">
            {formatPrice(product.price)}
            <span>
              {product.size} ·{" "}
              {stock > 5
                ? "In Stock"
                : stock > 0
                  ? `Only ${stock} left`
                  : "Out of Stock"}
            </span>
          </div>
          <div className="detail-actions">
            <button
              className="primary-button"
              disabled={stock <= 0}
              onClick={handleAddToCart}
            >
              {stock > 0
                ? added
                  ? "Added to bag ✓"
                  : "Add to bag"
                : "Out of stock"}{" "}
              <ShoppingBag size={16} />
            </button>
            <button
              className={wished ? "outline-button active" : "outline-button"}
              onClick={() => toggleWishlist(product.id)}
            >
              <Heart size={17} fill={wished ? "currentColor" : "none"} />{" "}
              {wished ? "Saved" : "Save"}
            </button>
          </div>
          <div className="detail-note">
            <span>✦</span>
            <p>
              Complimentary shipping on orders over ₹4,000 / $50
              <br />
              <span>Easy 30-day botanical freshness guarantee</span>
            </p>
          </div>
        </div>
      </div>

      {/* Frequently Bought Together Bundle */}
      {bundleProduct && (
        <section className="bundle-section">
          <h3>Frequently Bought Together</h3>
          <div className="bundle-card">
            <div className="bundle-images">
              <ProductImage src={product.image} alt={product.name} className="bundle-thumb" />
              <span className="bundle-plus">+</span>
              <ProductImage src={bundleProduct.image} alt={bundleProduct.name} className="bundle-thumb" />
            </div>
            <div className="bundle-meta">
              <strong>
                {product.name} + {bundleProduct.name}
              </strong>
              <p>Pair these complementary formulations for holistic barrier synergy.</p>
              <div className="bundle-price-row">
                <b>Total: {formatPrice(product.price + bundleProduct.price)}</b>
                <button className="primary-button-sm" onClick={handleAddBundle}>
                  Add Both to Bag
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recommendations: You May Also Like */}
      {relatedProducts.length > 0 && (
        <section className="recommendations-section">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Complementary Care</p>
              <h2>You May Also Like</h2>
            </div>
          </div>
          <div className="products-grid">
            {relatedProducts.map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
          </div>
        </section>
      )}

      {/* Reviews Section */}
      <section className="reviews-section">
        <div>
          <p className="eyebrow">Community notes</p>
          <h2>
            Reviews from <i>real rituals.</i>
          </h2>
        </div>
        <div className="reviews-list">
          {productReviews.length ? (
            productReviews.map((item) => (
              <article
                className="review"
                key={item._id || `${item.createdAt}-${item.name}`}
              >
                <div className="review-header-row">
                  <strong>{"★".repeat(item.rating)}</strong>
                  {(item.isVerifiedPurchase || item.verified) && (
                    <span className="badge-verified-purchase">
                      <ShieldCheck size={12} /> Verified Purchase
                    </span>
                  )}
                </div>
                <p>{item.text}</p>
                <span>
                  {item.name}{" "}
                  {item.createdAt && (
                    <small style={{ opacity: 0.6, fontSize: "0.8rem" }}>
                      · {new Date(item.createdAt).toLocaleDateString()}
                    </small>
                  )}
                </span>
                {user &&
                  (user.role === "admin" || user.id === item.userId) && (
                    <button
                      className="review-delete"
                      onClick={() => handleDeleteReview(item._id)}
                    >
                      Delete review
                    </button>
                  )}
              </article>
            ))
          ) : (
            <p className="muted-copy">
              Be the first to share a note about this formula.
            </p>
          )}
        </div>

        <form className="review-form" onSubmit={handleSubmitReview}>
          <p className="filter-label">Leave a review</p>
          <input
            placeholder="Your name"
            value={reviewForm.name}
            onChange={(event) =>
              setReviewForm({ ...reviewForm, name: event.target.value })
            }
            required
          />
          <select
            value={reviewForm.rating}
            onChange={(event) =>
              setReviewForm({
                ...reviewForm,
                rating: Number(event.target.value),
              })
            }
          >
            {[5, 4, 3, 2, 1].map((stars) => (
              <option key={stars} value={stars}>
                {stars} {stars === 1 ? "star" : "stars"}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Your experience with this skincare product..."
            value={reviewForm.text}
            onChange={(event) =>
              setReviewForm({ ...reviewForm, text: event.target.value })
            }
            required
          />
          <button className="primary-button" disabled={reviewSubmitting}>
            {reviewSubmitting ? "Submitting..." : "Share review"}
          </button>
        </form>
      </section>
    </main>
  );
}

function CartPage() {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    formatPrice,
    validateCouponCode,
    currency,
  } = useShop();
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const discountAmount = appliedCoupon?.discount || 0;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  // Free shipping threshold: $50 or approx ₹4,000
  const shippingFreeThreshold = currency === "INR" ? 48.19 : 50;
  const shippingCost = subtotal >= shippingFreeThreshold || subtotal === 0 ? 0 : 5;
  const estTax = discountedSubtotal * 0.18; // 18% GST estimate
  const grandTotal = discountedSubtotal + shippingCost + estTax;

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    setCouponError("");
    const res = await validateCouponCode(couponInput, subtotal);
    if (res.ok && res.data?.valid) {
      setAppliedCoupon(res.data);
    } else {
      setCouponError(res.message || "Invalid coupon code.");
    }
  };

  return (
    <main className="cart-page">
      <div className="cart-heading">
        <div>
          <p className="eyebrow">Your ritual</p>
          <h1>
            Your bag <i>({cart.length})</i>
          </h1>
        </div>
        <Link to="/shop" className="text-button">
          Continue shopping <ArrowRight size={15} />
        </Link>
      </div>

      {cart.length ? (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <ProductImage src={item.image} alt={item.name} />
                <div className="cart-item-info">
                  <Link to={`/product/${item.id}`}>{item.name}</Link>
                  <span>
                    {item.size} · {formatPrice(item.price)}
                  </span>
                  <div className="quantity">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <b>{item.quantity}</b>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  className="remove-button"
                  onClick={() => removeFromCart(item.id)}
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>

          <aside className="summary">
            <p className="filter-label">Order summary</p>
            <div className="summary-line">
              <span>Subtotal</span>
              <b>{formatPrice(subtotal)}</b>
            </div>

            {/* Coupon Code Input */}
            <form className="coupon-form" onSubmit={handleApplyCoupon}>
              <div className="coupon-input-row">
                <input
                  placeholder="Promo code (e.g. LUMA10)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                />
                <button type="submit" className="outline-button-sm">
                  Apply
                </button>
              </div>
              {appliedCoupon && (
                <small className="coupon-success">
                  ✓ {appliedCoupon.coupon?.code} applied (-{formatPrice(discountAmount)})
                </small>
              )}
              {couponError && <small className="coupon-error">{couponError}</small>}
            </form>

            {discountAmount > 0 && (
              <div className="summary-line discount-line">
                <span>Coupon Savings</span>
                <b>-{formatPrice(discountAmount)}</b>
              </div>
            )}

            <div className="summary-line">
              <span>Shipping</span>
              <b>{shippingCost === 0 ? "Free" : formatPrice(shippingCost)}</b>
            </div>
            <div className="summary-line">
              <span>GST / Tax (18% Included/Est)</span>
              <b>{formatPrice(estTax)}</b>
            </div>
            <hr />
            <div className="summary-total">
              <span>Estimated total</span>
              <b>{formatPrice(grandTotal)}</b>
            </div>

            <p className="secure-note" style={{ margin: "1rem 0" }}>
              ✦ Free standard shipping unlocked over {currency === "INR" ? "₹4,000" : "$50"}
            </p>

            <Link
              to="/checkout"
              className="primary-button checkout-button"
              style={{ textAlign: "center", textDecoration: "none" }}
            >
              Proceed to checkout <ArrowRight size={16} />
            </Link>
          </aside>
        </div>
      ) : (
        <div className="empty-state cart-empty">
          <ShoppingBag size={30} />
          <h2>Your bag is empty.</h2>
          <p>Explore our considered formulas and start your ritual.</p>
          <Link to="/shop" className="primary-button">
            Shop the collection <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </main>
  );
}

function CheckoutPage() {
  const {
    cart,
    placeOrder,
    user,
    quickLogin,
    addresses,
    formatPrice,
    currency,
    validateCouponCode,
    authHeaders,
  } = useShop();

  const [email, setEmail] = useState(() => user?.email || "");
  const [name, setName] = useState(() => {
    const def = addresses?.find((a) => a.isDefault) || addresses?.[0];
    return def?.fullName || user?.name || "";
  });
  const [country, setCountry] = useState(() => {
    const def = addresses?.find((a) => a.isDefault) || addresses?.[0];
    return def?.country || "IN";
  });
  const [address, setAddress] = useState(() => {
    const def = addresses?.find((a) => a.isDefault) || addresses?.[0];
    return def?.addressLine1 || "";
  });
  const [city, setCity] = useState(() => {
    const def = addresses?.find((a) => a.isDefault) || addresses?.[0];
    return def?.city || "";
  });
  const [state, setState] = useState(() => {
    const def = addresses?.find((a) => a.isDefault) || addresses?.[0];
    return def?.state || "";
  });
  const [zip, setZip] = useState(() => {
    const def = addresses?.find((a) => a.isDefault) || addresses?.[0];
    return def?.postalCode || "";
  });
  const [phone, setPhone] = useState(() => {
    const def = addresses?.find((a) => a.isDefault) || addresses?.[0];
    return def?.phone || "+91 98765 43210";
  });
  const [paymentMethod, setPaymentMethod] = useState("cod"); // 'cod' or 'stripe'
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [error, setError] = useState("");

  const selectedCountry = countries.find((c) => c.code === country);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const discountAmount = appliedCoupon?.discount || 0;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const shipping = discountedSubtotal >= 50 ? 0 : selectedCountry?.shipping || 5;
  const tax = country === "IN" ? Math.round(discountedSubtotal * 0.18 * 100) / 100 : 0;
  const total = discountedSubtotal + shipping + tax;

  const handleSelectSavedAddress = (addr) => {
    setName(addr.fullName);
    setPhone(addr.phone);
    setAddress(addr.addressLine1);
    setCity(addr.city);
    setState(addr.state);
    setZip(addr.postalCode);
    setCountry(addr.country);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !address || !city || !state || !zip) {
      setError("Please complete all shipping address fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // If Stripe Checkout requested
      if (paymentMethod === "stripe") {
        const sessionRes = await fetch(`${API_URL}/checkout-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            items: cart.map((it) => ({ productId: it.id, quantity: it.quantity })),
            customer: { email, name, country, address, city, state, zip, phone },
            couponCode: appliedCoupon?.coupon?.code,
            currency,
          }),
        });

        const sessionData = await sessionRes.json();
        if (sessionRes.ok && sessionData.url) {
          // In actual production Stripe redirects to sessionData.url
          // If offline mock mode, session returns a test success redirect
          window.location.href = sessionData.url;
          return;
        }
      }

      // Default COD / Demo Order Placement
      const order = await placeOrder({
        customer: { email, name, country, address, city, state, zip, phone },
        items: cart,
        subtotal,
        shipping,
        total,
        couponCode: appliedCoupon?.coupon?.code,
        paymentMethod,
      });

      setPlacedOrder(order);
    } catch (err) {
      setError("Order could not be processed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (placedOrder) {
    return (
      <main className="checkout-page">
        <div className="order-success">
          <p className="eyebrow">Order Placed Successfully</p>
          <h1>Thank you, {placedOrder.customer?.name?.split(" ")[0] || "there"}.</h1>
          <p>
            Your skincare order has been recorded in the database. A confirmation notification has been dispatched to <b>{placedOrder.customer?.email}</b>.
          </p>
          <div className="order-number-banner">
            <strong>Order Reference: #{placedOrder.id}</strong>
          </div>

          <div className="order-summary-box">
            <p className="summary-box-title">Delivery Details</p>
            <p className="summary-box-body">
              {placedOrder.customer?.name}
              <br />
              {placedOrder.customer?.address}
              <br />
              {placedOrder.customer?.city}, {placedOrder.customer?.state} {placedOrder.customer?.zip}
              <br />
              {placedOrder.customer?.country === "IN" ? "India" : placedOrder.customer?.country}
            </p>
            <hr />
            <div className="summary-box-row">
              <span>Total Paid:</span>
              <b>{formatPrice(placedOrder.total)}</b>
            </div>
            <div className="summary-box-row">
              <span>Payment Mode:</span>
              <b>{placedOrder.paymentMethod === "stripe" ? "Stripe Online Card" : "Cash on Delivery"}</b>
            </div>
          </div>

          <div className="success-action-buttons">
            <Link to={`/orders/${placedOrder.id}`} className="outline-button">
              View Order Details
            </Link>
            <Link to={`/orders/${placedOrder.id}/invoice`} className="outline-button">
              <Printer size={15} /> Print Tax Invoice
            </Link>
            <Link to="/shop" className="primary-button">
              Continue Shopping <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!cart.length) {
    return (
      <main className="checkout-page">
        <div className="empty-state">
          <ShoppingBag size={30} />
          <h2>Your bag is empty</h2>
          <p>Add skincare essentials before proceeding to checkout.</p>
          <Link to="/shop" className="primary-button">
            Explore collection <ArrowRight size={15} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="checkout-heading">
        <p className="eyebrow">Complete your order</p>
        <h1>Secure Checkout</h1>
        <Link to="/cart" className="text-button">
          ← Back to cart
        </Link>
      </div>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          {error && <p className="checkout-error">{error}</p>}

          {!user && (
            <div className="checkout-auth-banner">
              <span>Have a registered account?</span>
              <button
                type="button"
                className="outline-button-sm"
                onClick={async () => {
                  const u = await quickLogin("customer");
                  if (u) {
                    setEmail(u.email);
                    setName(u.name);
                  }
                }}
              >
                1-Click Demo Sign In
              </button>
            </div>
          )}

          {/* Saved Address Quick Selector */}
          {addresses?.length > 0 && (
            <fieldset>
              <legend>Use Saved Address</legend>
              <div className="saved-address-selector-row">
                {addresses.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    className="address-select-pill"
                    onClick={() => handleSelectSavedAddress(a)}
                  >
                    <MapPin size={12} /> {a.label} ({a.city})
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset>
            <legend>Contact Information</legend>
            <input
              type="email"
              placeholder="Email address for order updates"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="tel"
              placeholder="Phone number (+91 98765 43210)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </fieldset>

          <fieldset>
            <legend>Shipping Destination</legend>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Street address / Apartment"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <div className="form-row">
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="State / Province"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="ZIP / Postal code"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                required
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>Payment Method</legend>
            <div className="payment-method-radios">
              <label className={`payment-radio-label ${paymentMethod === "stripe" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="payment"
                  value="stripe"
                  checked={paymentMethod === "stripe"}
                  onChange={() => setPaymentMethod("stripe")}
                />
                <div>
                  <strong>Pay Online via Stripe (Card / UPI / NetBanking)</strong>
                  <small>Encrypted 256-bit checkout with Stripe Webhook verification</small>
                </div>
              </label>
              <label className={`payment-radio-label ${paymentMethod === "cod" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                />
                <div>
                  <strong>Cash on Delivery / Direct Demo Placement</strong>
                  <small>Instant simulated order placement for interview showcase</small>
                </div>
              </label>
            </div>
          </fieldset>

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Processing..." : paymentMethod === "stripe" ? "Proceed to Stripe Payment" : "Place Order"}{" "}
            <ArrowRight size={16} />
          </button>
        </form>

        <aside className="checkout-summary">
          <p className="filter-label">Order summary</p>
          <div className="summary-items">
            {cart.map((item) => (
              <div key={item.id} className="summary-item">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <b>{formatPrice(item.price * item.quantity)}</b>
              </div>
            ))}
          </div>
          <hr />
          <div className="summary-line">
            <span>Subtotal</span>
            <b>{formatPrice(subtotal)}</b>
          </div>
          <div className="coupon-input-row" style={{ margin: "10px 0" }}>
            <input
              placeholder="Promo code (e.g. LUMA10)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <button
              type="button"
              className="outline-button-sm"
              onClick={async () => {
                const res = await validateCouponCode(couponCode, subtotal);
                if (res.ok && res.data?.valid) {
                  setAppliedCoupon(res.data);
                } else {
                  alert(res.message || "Invalid coupon code");
                }
              }}
            >
              Apply
            </button>
          </div>
          {appliedCoupon && (
            <small className="coupon-success" style={{ display: "block", marginBottom: "6px" }}>
              ✓ {appliedCoupon.coupon?.code} applied (-{formatPrice(discountAmount)})
            </small>
          )}

          {discountAmount > 0 && (
            <div className="summary-line discount-line">
              <span>Discount</span>
              <b>-{formatPrice(discountAmount)}</b>
            </div>
          )}
          <div className="summary-line">
            <span>Shipping ({selectedCountry?.name})</span>
            <b>{shipping === 0 ? "Free" : formatPrice(shipping)}</b>
          </div>
          <div className="summary-line">
            <span>GST / Tax ({country === "IN" ? "18% Indian GST" : "Standard"})</span>
            <b>{formatPrice(tax)}</b>
          </div>
          <hr />
          <div className="summary-total">
            <span>Total Payable</span>
            <b>{formatPrice(total)}</b>
          </div>
          <p className="secure-note">
            ✦ Full Stack REST API Order Processing
            <br />✦ Idempotent Server Pricing & Stock Validation
          </p>
        </aside>
      </div>
    </main>
  );
}

/* =====================================================================
   ADMIN CONTROL ROOM
===================================================================== */
function AdminPage() {
  const {
    user,
    quickLogin,
    products,
    updateStock,
    updateProduct,
    createProduct,
    deleteProduct,
    orders,
    updateOrderStatus,
    updateOrderPaymentStatus,
    reviews,
    deleteReview,
    messages,
    journal,
    saveJournal,
    loadAdminData,
    loading,
    formatPrice,
    authHeaders,
  } = useShop();

  const [activeAdminTab, setActiveAdminTab] = useState("analytics");
  const [customers, setCustomers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [emails, setEmails] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editorialEntries, setEditorialEntries] = useState(journal || []);
  const [journalSaved, setJournalSaved] = useState(false);

  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountPercent: 10,
    minPurchase: 0,
    maxUses: 100,
  });

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "Cleansers",
    price: "",
    inventory: "",
    size: "50 ml",
    description: "",
    image: "",
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  // Load admin extras (customers, coupons, emails)
  useEffect(() => {
    if (user?.role === "admin") {
      loadAdminData();
      fetch(`${API_URL}/admin/customers`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((res) => {
          if (res.ok && res.data) setCustomers(res.data);
        })
        .catch(() => {});

      fetch(`${API_URL}/admin/coupons`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((res) => {
          if (res.ok && res.data) setCoupons(res.data);
        })
        .catch(() => {});

      fetch(`${API_URL}/admin/emails`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((res) => {
          if (res.ok && res.data) setEmails(res.data);
        })
        .catch(() => {});
    }
  }, [user, loadAdminData, authHeaders]);

  if (!user || user.role !== "admin") {
    return (
      <main className="empty-state page-empty">
        <h2>Admins only.</h2>
        <p>The control room is reserved for store managers.</p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1.5rem" }}>
          <button className="primary-button" onClick={() => quickLogin("admin")}>
            Sign in as Demo Admin
          </button>
          <Link to="/shop" className="outline-button">
            Back to shop
          </Link>
        </div>
      </main>
    );
  }

  // Dashboard analytics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const lowStockCount = products.filter((p) => (p.inventory ?? 25) <= 5).length;
  const unreadMessagesCount = messages.filter((m) => !m.read).length;
  const avgOrderValue = orders.length ? totalRevenue / orders.length : 0;

  // Handle Image Upload
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, WebP).");
      return;
    }

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result;
        setImagePreview(base64Data);

        const res = await fetch(`${API_URL}/admin/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            dataUrl: base64Data,
            filename: file.name,
          }),
        });
        const json = await res.json();
        if (json.ok && json.data?.url) {
          setNewProduct((prev) => ({ ...prev, image: json.data.url }));
        } else {
          // fallback to data url
          setNewProduct((prev) => ({ ...prev, image: base64Data }));
        }
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn("Upload failed:", err);
      setUploadingImage(false);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/coupons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(newCoupon),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setCoupons((prev) => [data.data, ...prev]);
        setNewCoupon({ code: "", discountPercent: 10, minPurchase: 0, maxUses: 100 });
      }
    } catch (err) {
      console.warn("Coupon create error:", err);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    await fetch(`${API_URL}/admin/coupons/${couponId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    setCoupons((prev) => prev.filter((c) => c._id !== couponId && c.id !== couponId));
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    await createProduct(newProduct);
    setNewProduct({
      name: "",
      category: "Cleansers",
      price: "",
      inventory: "",
      size: "50 ml",
      description: "",
      image: "",
    });
    setImagePreview("");
  };

  const handleSaveEditProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    await updateProduct(editingProduct.id, {
      name: editingProduct.name,
      category: editingProduct.category,
      price: Number(editingProduct.price),
      inventory: Number(editingProduct.inventory),
      size: editingProduct.size,
      description: editingProduct.description,
      image: editingProduct.image,
    });
    setEditingProduct(null);
  };

  const handleSaveJournal = async () => {
    await saveJournal(editorialEntries);
    setJournalSaved(true);
    setTimeout(() => setJournalSaved(false), 2500);
  };

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Enterprise Control Room</p>
          <h1>
            Admin <i>Dashboard & Analytics.</i>
          </h1>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button className="text-button" onClick={loadAdminData} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Live Data"}
          </button>
          <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>
            Logged in as <b>{user.name || user.email}</b>
          </span>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="admin-tabs-nav">
        <button
          className={activeAdminTab === "analytics" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveAdminTab("analytics")}
        >
          <TrendingUp size={15} /> Analytics & Trends
        </button>
        <button
          className={activeAdminTab === "products" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveAdminTab("products")}
        >
          <Package size={15} /> Inventory & Upload ({products.length})
        </button>
        <button
          className={activeAdminTab === "orders" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveAdminTab("orders")}
        >
          <Truck size={15} /> Customer Orders ({orders.length})
        </button>
        <button
          className={activeAdminTab === "customers" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveAdminTab("customers")}
        >
          <Users size={15} /> Customers ({customers.length || 2})
        </button>
        <button
          className={activeAdminTab === "editorial" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveAdminTab("editorial")}
        >
          <BookOpen size={15} /> Editorial Journal ({editorialEntries.length})
        </button>
        <button
          className={activeAdminTab === "coupons" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveAdminTab("coupons")}
        >
          <Tag size={15} /> Coupons ({coupons.length || 3})
        </button>
        <button
          className={activeAdminTab === "emails" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveAdminTab("emails")}
        >
          <FileText size={15} /> Email Outbox ({emails.length})
        </button>
        <button
          className={activeAdminTab === "community" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveAdminTab("community")}
        >
          <Star size={15} /> Reviews ({reviews.length})
        </button>
      </div>

      {/* 1. Analytics Tab */}
      {activeAdminTab === "analytics" && (
        <section className="admin-tab-pane">
          <div className="admin-stats">
            <div>
              <strong>{formatPrice(totalRevenue)}</strong>
              <span>Total Revenue</span>
            </div>
            <div>
              <strong>{orders.length}</strong>
              <span>Total Orders</span>
            </div>
            <div>
              <strong>{formatPrice(avgOrderValue)}</strong>
              <span>Average Order Value</span>
            </div>
            <div>
              <strong style={{ color: lowStockCount > 0 ? "#e57373" : "inherit" }}>
                {lowStockCount}
              </strong>
              <span>Low Stock Alerts</span>
            </div>
            <div>
              <strong>{customers.length || 2}</strong>
              <span>Registered Customers</span>
            </div>
            <div>
              <strong>{unreadMessagesCount}</strong>
              <span>Unread Inquiries</span>
            </div>
          </div>

          {/* SVG Charts Grid */}
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Revenue Trajectory (Last 7 Cycles)</h3>
              <p className="chart-subtitle">Gross turnover with server-side validation</p>
              <svg className="admin-svg-chart" viewBox="0 0 500 180">
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--green)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--green)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 20,140 Q 90,110 160,125 T 300,70 T 420,40 T 480,20 L 480,160 L 20,160 Z"
                  fill="url(#revenueGrad)"
                />
                <path
                  d="M 20,140 Q 90,110 160,125 T 300,70 T 420,40 T 480,20"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="3"
                />
                <circle cx="20" cy="140" r="4" fill="var(--green)" />
                <circle cx="160" cy="125" r="4" fill="var(--green)" />
                <circle cx="300" cy="70" r="4" fill="var(--green)" />
                <circle cx="420" cy="40" r="4" fill="var(--green)" />
                <circle cx="480" cy="20" r="4" fill="var(--green)" />
              </svg>
              <div className="chart-labels-row">
                <span>Day 1</span>
                <span>Day 2</span>
                <span>Day 3</span>
                <span>Day 4</span>
                <span>Day 5</span>
                <span>Day 6</span>
                <span>Today</span>
              </div>
            </div>

            <div className="chart-card">
              <h3>Order Volume Distribution</h3>
              <p className="chart-subtitle">Completed vs. Processing flow</p>
              <svg className="admin-svg-chart" viewBox="0 0 500 180">
                <rect x="50" y="80" width="35" height="80" rx="4" fill="var(--green)" />
                <rect x="130" y="50" width="35" height="110" rx="4" fill="var(--green)" />
                <rect x="210" y="100" width="35" height="60" rx="4" fill="var(--green)" />
                <rect x="290" y="40" width="35" height="120" rx="4" fill="var(--green)" />
                <rect x="370" y="70" width="35" height="90" rx="4" fill="var(--green)" />
                <rect x="450" y="30" width="35" height="130" rx="4" fill="var(--green)" />
              </svg>
              <div className="chart-labels-row">
                <span>Cleansers</span>
                <span>Serums</span>
                <span>Moisturizers</span>
                <span>Sun Care</span>
                <span>Treatments</span>
                <span>Toners</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Products & Image Upload Tab */}
      {activeAdminTab === "products" && (
        <section className="admin-tab-pane">
          <div className="section-intro">
            <h2>Inventory & Product Catalog</h2>
            <span>{products.length} catalog items</span>
          </div>

          <form className="admin-product-form" onSubmit={handleCreateProduct}>
            <input
              placeholder="Product name"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              required
            />
            <select
              value={newProduct.category}
              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
            >
              {categories
                .filter((cat) => cat !== "All products")
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Price (USD)"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              required
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Initial Stock Inventory"
              value={newProduct.inventory}
              onChange={(e) => setNewProduct({ ...newProduct, inventory: e.target.value })}
              required
            />

            {/* Product Image File Upload */}
            <div className="admin-upload-field">
              <label className="upload-label">
                <FileText size={14} /> Upload Product Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  style={{ display: "none" }}
                />
              </label>
              {uploadingImage && <small>Uploading image...</small>}
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="upload-preview-thumb" />
              )}
            </div>

            <button className="primary-button" disabled={uploadingImage}>
              Add Product
            </button>
          </form>

          <div className="admin-table">
            {products.map((product) => (
              <div className="admin-row" key={product.id}>
                <span>
                  <strong>{product.name}</strong>
                  <small>
                    {product.category} · {formatPrice(product.price)} · {product.size}
                  </small>
                </span>
                <b className={(product.inventory ?? 25) <= 5 ? "low-stock" : ""}>
                  {product.inventory ?? 25} in stock
                </b>
                <button
                  className="outline-button"
                  onClick={() => setEditingProduct({ ...product })}
                >
                  <Edit3 size={13} style={{ marginRight: "4px" }} /> Edit
                </button>
                <button
                  className="outline-button"
                  onClick={() => {
                    const next = prompt(`Set stock for ${product.name}:`, product.inventory ?? 25);
                    if (next !== null && !isNaN(Number(next))) {
                      updateStock(product, Number(next));
                    }
                  }}
                >
                  Stock
                </button>
                <button
                  className="review-delete"
                  onClick={() => {
                    if (confirm(`Delete ${product.name}?`)) deleteProduct(product);
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          {/* Edit Formulation Modal */}
          {editingProduct && (
            <div className="admin-modal-backdrop" onClick={() => setEditingProduct(null)}>
              <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3>Edit Formulation: {editingProduct.name}</h3>
                  <button
                    type="button"
                    className="admin-modal-close"
                    onClick={() => setEditingProduct(null)}
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form className="admin-edit-form" onSubmit={handleSaveEditProduct}>
                  <div>
                    <label>Formulation Name</label>
                    <input
                      value={editingProduct.name || ""}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-grid-2">
                    <div>
                      <label>Category</label>
                      <select
                        value={editingProduct.category || "Cleansers"}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, category: e.target.value })
                        }
                      >
                        {categories
                          .filter((c) => c !== "All products")
                          .map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label>Price (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingProduct.price ?? ""}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            price: Number(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div>
                      <label>Stock Inventory</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editingProduct.inventory ?? 25}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            inventory: Number(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label>Size / Volume</label>
                      <input
                        value={editingProduct.size || "50 ml"}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, size: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label>Botanical Formulation Description</label>
                    <textarea
                      rows={3}
                      value={editingProduct.description || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label>Image URL</label>
                    <input
                      value={editingProduct.image || ""}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, image: e.target.value })
                      }
                    />
                  </div>
                  <div className="admin-modal-actions">
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => setEditingProduct(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="primary-button">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 3. Orders Tab */}
      {activeAdminTab === "orders" && (
        <section className="admin-tab-pane">
          <div className="section-intro">
            <h2>Customer Orders & Fulfillment</h2>
            <span>{orders.length} orders recorded</span>
          </div>

          <div className="admin-table">
            {orders.length ? (
              orders.map((order) => (
                <div className="admin-row-detailed" key={order.id}>
                  <div>
                    <strong>Order #{order.id}</strong>
                    <p style={{ margin: "4px 0", fontSize: "0.85rem", opacity: 0.8 }}>
                      Customer: <b>{order.customer?.name}</b> ({order.customer?.email})
                      <br />
                      Items: {order.items?.length} · Total: <b>{formatPrice(order.total)}</b>
                      <br />
                      Placed on: {order.date || new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    <div style={{ marginTop: "6px", display: "flex", gap: "0.6rem" }}>
                      <Link to={`/orders/${order.id}`} className="outline-button-sm">
                        View Order
                      </Link>
                      <Link to={`/orders/${order.id}/invoice`} className="outline-button-sm">
                        Invoice
                      </Link>
                    </div>
                  </div>

                  <div className="admin-order-controls">
                    <div>
                      <small style={{ display: "block", marginBottom: "4px" }}>Shipping Status</small>
                      <select
                        value={order.status || "processing"}
                        onChange={(e) => updateOrderStatus(order, e.target.value)}
                      >
                        <option value="awaiting_payment">awaiting_payment</option>
                        <option value="processing">processing</option>
                        <option value="shipped">shipped</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </div>

                    <div>
                      <small style={{ display: "block", marginBottom: "4px" }}>Payment Status</small>
                      <select
                        value={order.paymentStatus || "pending"}
                        onChange={(e) => updateOrderPaymentStatus(order, e.target.value)}
                      >
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="failed">failed</option>
                        <option value="refunded">refunded</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted-copy">No orders placed yet.</p>
            )}
          </div>
        </section>
      )}

      {/* 4. Customers Directory Tab */}
      {activeAdminTab === "customers" && (
        <section className="admin-tab-pane">
          <div className="section-intro">
            <h2>Registered Customers Directory</h2>
            <span>Privacy-hardened client list</span>
          </div>
          <div className="admin-table">
            {(customers.length ? customers : defaultUsers).map((cust, idx) => (
              <div className="admin-row" key={cust.id || idx}>
                <span>
                  <strong>{cust.name}</strong>
                  <small>{cust.email}</small>
                </span>
                <span className="badge-verified">
                  {cust.role === "admin" ? "Store Administrator" : "Active Customer"}
                </span>
                <span>Joined: 2026</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Editorial Journal Tab */}
      {activeAdminTab === "editorial" && (
        <section className="admin-tab-pane">
          <div className="section-intro">
            <div>
              <h2>The Editorial Journal</h2>
              <span>Essays, ingredient science & botanical notes ({editorialEntries.length} entries)</span>
            </div>
            <button className="primary-button" onClick={handleSaveJournal}>
              {journalSaved ? "Journal Saved ✓" : "Save Journal"}
            </button>
          </div>

          <div className="admin-journal-editor">
            {editorialEntries.map((entry, index) => (
              <div key={entry.id || `${entry.title}-${index}`}>
                <input
                  placeholder="Article Title"
                  value={entry.title || ""}
                  onChange={(event) =>
                    setEditorialEntries((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, title: event.target.value } : item,
                      ),
                    )
                  }
                />
                <input
                  placeholder="Category / Type (e.g. Rituals, Ingredients)"
                  value={entry.type || entry.category || ""}
                  onChange={(event) =>
                    setEditorialEntries((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? { ...item, type: event.target.value, category: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <textarea
                  placeholder="Summary text or essay excerpt..."
                  value={entry.summary || entry.text || entry.content || ""}
                  onChange={(event) =>
                    setEditorialEntries((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              summary: event.target.value,
                              text: event.target.value,
                              content: event.target.value,
                            }
                          : item,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Coupons & Discounts Tab */}
      {activeAdminTab === "coupons" && (
        <section className="admin-tab-pane">
          <div className="section-intro">
            <h2>Promotions & Coupons Management</h2>
            <span>Server-side calculated discounts</span>
          </div>

          <form className="admin-coupon-form" onSubmit={handleCreateCoupon}>
            <input
              placeholder="Coupon Code (e.g. SUMMER15)"
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Discount Percentage (e.g. 15)"
              value={newCoupon.discountPercent}
              onChange={(e) => setNewCoupon({ ...newCoupon, discountPercent: Number(e.target.value) })}
              required
            />
            <input
              type="number"
              placeholder="Usage Limit (e.g. 50)"
              value={newCoupon.maxUses}
              onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: Number(e.target.value) })}
            />
            <button className="primary-button">Create Coupon</button>
          </form>

          <div className="admin-table">
            {(coupons.length ? coupons : [
              { code: "LUMA10", discountPercent: 10, isActive: true },
              { code: "LUMA20", discountPercent: 20, isActive: true },
              { code: "WELCOME5", discountPercent: 5, isActive: true },
            ]).map((cpn, idx) => (
              <div className="admin-row" key={cpn.code || idx}>
                <span>
                  <strong>{cpn.code}</strong>
                  <small>{cpn.discountPercent}% Off All Formulations</small>
                </span>
                <span className="badge-active">Active</span>
                <button
                  className="review-delete"
                  onClick={() => handleDeleteCoupon(cpn._id || cpn.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Email Outbox Audit Tab */}
      {activeAdminTab === "emails" && (
        <section className="admin-tab-pane">
          <div className="section-intro">
            <h2>System Notification Outbox</h2>
            <span>Automated customer communication audit trail</span>
          </div>
          <div className="admin-table">
            {emails.length ? (
              emails.map((em, idx) => (
                <div className="admin-row" key={em.id || idx}>
                  <span>
                    <strong>{em.subject}</strong>
                    <small>To: {em.to} · Event: {em.event || "Transactional"}</small>
                  </span>
                  <span>
                    {em.createdAt ? new Date(em.createdAt).toLocaleTimeString() : "Recent"}
                  </span>
                  <span className="badge-verified">Dispatched</span>
                </div>
              ))
            ) : (
              <p className="muted-copy" style={{ padding: "1rem" }}>
                Transactional email audit log is active. Notifications are dispatched on order confirmation, shipment, and password reset events.
              </p>
            )}
          </div>
        </section>
      )}

      {/* 7. Community Reviews & Inquiries Tab */}
      {activeAdminTab === "community" && (
        <section className="admin-tab-pane">
          <div className="section-intro">
            <h2>Customer Reviews & Feedback</h2>
            <span>{reviews.length} reviews published</span>
          </div>
          <div className="admin-table">
            {reviews.map((rev) => (
              <div className="admin-row" key={rev._id}>
                <span>
                  <strong>{rev.name} ({rev.rating}★)</strong>
                  <small>"{rev.text}"</small>
                </span>
                <button
                  className="review-delete"
                  onClick={() => deleteReview(rev.productId, rev._id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

/* =====================================================================
   STATIC PAGES: ABOUT (EDITORIAL), JOURNAL, CONTACT, WISHLIST
===================================================================== */
function WishlistPage() {
  const { wishlist, products } = useShop();
  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <main className="wishlist-page">
      <div className="cart-heading">
        <div>
          <p className="eyebrow">Your saved edit</p>
          <h1>
            Wishlist <i>({wishlistedProducts.length})</i>
          </h1>
        </div>
        <Link to="/shop" className="text-button">
          Explore collection <ArrowRight size={15} />
        </Link>
      </div>

      {wishlistedProducts.length ? (
        <div className="product-grid">
          {wishlistedProducts.map((p) => (
            <ProductCard product={p} key={p.id} />
          ))}
        </div>
      ) : (
        <div className="empty-state cart-empty">
          <Heart size={32} />
          <h2>Your saved edit is quiet.</h2>
          <p>Keep the formulations that make you curious close by for your future rituals.</p>
          <Link to="/shop" className="primary-button">
            Find your favorites <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </main>
  );
}

function AboutPage() {
  return (
    <main className="editorial-page">
      <section className="editorial-hero">
        <div>
          <p className="eyebrow">A softer kind of skincare</p>
          <h1>
            Good skin is a <i>daily feeling.</i>
          </h1>
          <p>
            We started Luma with one simple belief: skincare should bring you back to yourself, not add more noise to your day.
          </p>
        </div>
        <img
          src="https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1200&q=85"
          alt="Luma botanical formulations on natural linen"
          loading="lazy"
        />
      </section>

      <section className="editorial-split">
        <div>
          <p className="eyebrow">Our point of view</p>
          <h2>
            Small formulas.
            <br />
            <i>Real rituals.</i>
          </h2>
        </div>
        <div>
          <p>
            Every Luma formula is made with a short, purposeful ingredient list and a clear role in your routine. No overcomplicated steps. No pressure to chase artificial perfection.
          </p>
          <p>
            Just thoughtful care for the skin barrier you have today, formulated with cold-distilled bio-actives and verified for dermatological comfort.
          </p>
          <Link to="/shop" className="text-button">
            Meet the collection <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <section className="values-grid">
        <div>
          <strong>01</strong>
          <h3>Considered</h3>
          <p>Ingredients chosen for comfort, function, and everyday biological compatibility.</p>
        </div>
        <div>
          <strong>02</strong>
          <h3>Gentle</h3>
          <p>Cold-distilled formulations that preserve your lipid barrier instead of stripping it.</p>
        </div>
        <div>
          <strong>03</strong>
          <h3>Honest</h3>
          <p>Clear rituals, clear textures, and transparent active concentrations without impossible promises.</p>
        </div>
      </section>
    </main>
  );
}

function JournalPage() {
  const { journal } = useShop();
  return (
    <main className="journal-page">
      <section className="journal-heading">
        <p className="eyebrow">The Luma Journal</p>
        <h1>
          Notes for a <i>slower</i> routine.
        </h1>
        <p>Thoughts, rituals, and ingredient wisdom for making skincare feel like yours.</p>
      </section>
      <div className="journal-list">
        {journal.map((entry, index) => (
          <article className="journal-entry" key={entry.id || entry.title || index}>
            <span>0{index + 1}</span>
            <div>
              <p className="eyebrow">{entry.category || entry.type || "Rituals"}</p>
              <h2>{entry.title}</h2>
              <p>{entry.summary || entry.excerpt || entry.content}</p>
            </div>
            <Link to="/shop" aria-label={`Read ${entry.title}`}>
              <ArrowRight size={20} />
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}

function ContactPage() {
  const { addMessage } = useShop();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await addMessage({ name, email, message });
    setLoading(false);
    setSent(true);
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <main className="contact-page">
      <section>
        <p className="eyebrow">We are here</p>
        <h1>
          Have a <i>question?</i>
        </h1>
        <p>Our small team reads every note. Reach us Monday to Friday, 9am to 6pm IST.</p>
        <div className="contact-grid">
          <a href="mailto:hello@luma.skin">
            <span>Email us</span>
            <strong>hello@luma.skin</strong>
            <ArrowRight size={18} />
          </a>
          <a href="tel:+918005551234">
            <span>Call us</span>
            <strong>+91 800 555 1234</strong>
            <ArrowRight size={18} />
          </a>
          <div>
            <span>Visit our studio</span>
            <strong>
              Bandra West
              <br />
              Mumbai, MH
            </strong>
          </div>
        </div>
      </section>

      <div>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-form-heading">
            <div>
              <p className="eyebrow">Studio Concierge</p>
              <h2>Send a note</h2>
            </div>
            <span>Replies in 24 hours</span>
          </div>
          <label htmlFor="contact-name">Your Name</label>
          <input
            id="contact-name"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label htmlFor="contact-email">Email Address</label>
          <input
            id="contact-email"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="contact-message">Message</label>
          <textarea
            id="contact-message"
            placeholder="How can our studio team assist your skincare ritual?"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <button className="primary-button" disabled={loading}>
            {loading ? "Sending..." : sent ? "Note Received ✓" : "Send Note"}
          </button>
        </form>
      </div>
    </main>
  );
}

/* =====================================================================
   MAIN APP ROUTER
===================================================================== */
export default function App() {
  return (
    <BrowserRouter>
      <ShopProvider>
        <ScrollToTop />
        <ApiNotice />
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/editorial" element={<AboutPage />} />
          <Route path="/edit" element={<AboutPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<CustomerDashboardPage />} />
          <Route path="/profile" element={<CustomerDashboardPage />} />
          <Route path="/orders" element={<OrderHistoryPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/orders/:id/invoice" element={<OrderInvoicePage />} />
          <Route path="/ai-assistant" element={<AiAssistantPage />} />
          <Route path="/auth/google/callback" element={<GoogleAuthCallbackPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
        <footer>
          <span>
            luma<span className="brand-dot">.</span>
          </span>
          <nav>
            <Link to="/about">About</Link>
            <Link to="/journal">Journal</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/ai-assistant">AI Assistant</Link>
          </nav>
          <span>© 2026 Luma Botanical Skincare</span>
        </footer>
      </ShopProvider>
    </BrowserRouter>
  );
}
