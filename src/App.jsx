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

function ShopProvider({ children }) {
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
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("luma-theme") === "dark",
  );
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState(
    () => localStorage.getItem("luma-currency") || "INR",
  );

  useEffect(() => {
    localStorage.setItem("luma-currency", currency);
  }, [currency]);

  const formatPrice = useCallback(
    (amount) => {
      const num = Number(amount) || 0;
      if (currency === "INR") {
        const inrAmount = Math.round(num * 83);
        return `₹${inrAmount.toLocaleString("en-IN")}`;
      }
      return `$${num.toFixed(2)}`;
    },
    [currency],
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
    (product) => {
      setCart((prev) => {
        const existing = prev.find((item) => item.id === product.id);
        const next = existing
          ? prev.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            )
          : [...prev, { ...product, quantity: 1 }];
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
        throw new Error(data.error || "Login failed");
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
        throw new Error(data.error || "Registration failed");
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

  // Order placement via Backend API
  const placeOrder = useCallback(
    async ({ customer, items, subtotal, shipping, total }) => {
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
          }),
        });

        const data = await response.json();
        if (response.ok && data?.id) {
          setOrders((prev) => [data, ...prev]);
          clearCart();
          return data;
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
        total,
        status: "processing",
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
    [sessionId, authHeaders, clearCart],
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
      };

      setReviews((prev) => [newRev, ...prev]);
      return newRev;
    },
    [authHeaders, user],
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
      createProduct,
      deleteProduct,
      updateOrderStatus,
      updateMessage,
      addMessage,
      saveJournal,
      loadAdminData,
      authHeaders,
      currency,
      setCurrency,
      formatPrice,
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
      createProduct,
      deleteProduct,
      updateOrderStatus,
      updateMessage,
      addMessage,
      saveJournal,
      loadAdminData,
      authHeaders,
      currency,
      formatPrice,
    ],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}


function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
}

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
    setCurrency,
  } = useShop();
  const [menuOpen, setMenuOpen] = useState(false);

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
          onClick={() => setCurrency(currency === "INR" ? "USD" : "INR")}
          title={`Active currency: ${currency}. Click to switch to ${currency === "INR" ? "USD ($)" : "INR (₹)"}`}
          aria-label="Toggle currency"
        >
          <span className="currency-symbol">{currency === "INR" ? "₹" : "$"}</span>
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                opacity: 0.85,
                maxWidth: "80px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={`Logged in as ${user.name || user.email} (${user.role})`}
            >
              {(user.name || user.email).split(" ")[0]}
            </span>
            <button
              className="icon-button"
              onClick={logout}
              aria-label="Log out"
              title="Log out"
            >
              ↪
            </button>
          </div>
        ) : (
          <Link
            className="icon-button"
            to="/login"
            aria-label="Log in"
            title="Log in"
          >
            ↗
          </Link>
        )}
        <button
          className="menu-button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Menu size={20} />
        </button>
      </div>
    </header>
  );
}

function ApiNotice() {
  const { apiError, setApiError } = useShop();
  if (!apiError) return null;
  return (
    <div className="api-notice" role="alert">
      <span>{apiError}</span>
      <button onClick={() => setApiError("")} aria-label="Dismiss notification">
        ×
      </button>
    </div>
  );
}

function ProductImage({ src, alt, className }) {
  const [error, setError] = useState(false);
  const fallback =
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=85";

  return (
    <img
      className={className}
      src={error || !src ? fallback : src}
      alt={alt || "Luma skincare product"}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

function AuthPage({ mode = "login" }) {
  const navigate = useNavigate();
  const { login, register, quickLogin, completeGoogleLogin, user } = useShop();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (user) navigate(user.role === "admin" ? "/admin" : "/shop");
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
      navigate("/shop");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    await quickLogin(role);
    navigate(role === "admin" ? "/admin" : "/shop");
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
          placeholder="Email"
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
            navigate("/shop");
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

function GoogleAuthCallbackPage() {
  const navigate = useNavigate();
  const { completeGoogleLogin } = useShop();

  useEffect(() => {
    completeGoogleLogin().then(() => navigate("/shop", { replace: true }));
  }, [completeGoogleLogin, navigate]);

  return (
    <main className="auth-page">
      <p>Signing you in with Google…</p>
    </main>
  );
}

function AdminPage() {
  const {
    user,
    quickLogin,
    products,
    updateStock,
    createProduct,
    deleteProduct,
    orders,
    updateOrderStatus,
    reviews,
    deleteReview,
    messages,
    updateMessage,
    journal,
    saveJournal,
    loadAdminData,
    loading,
    formatPrice,
    currency,
  } = useShop();

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "Cleansers",
    price: "",
    inventory: "",
    size: "50 ml",
    description: "",
  });

  const [localJournal, setLocalJournal] = useState(journal);
  const [journalSaved, setJournalSaved] = useState(false);

  // Load live admin data from backend on entry
  useEffect(() => {
    if (user?.role === "admin") {
      loadAdminData();
    }
  }, [user, loadAdminData]);

  if (!user || user.role !== "admin") {
    return (
      <main className="empty-state page-empty">
        <h2>Admins only.</h2>
        <p>The control room is reserved for store managers.</p>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            marginTop: "1.5rem",
          }}
        >
          <button
            className="primary-button"
            onClick={() => quickLogin("admin")}
          >
            Sign in as Demo Admin
          </button>
          <Link to="/shop" className="outline-button">
            Back to shop
          </Link>
        </div>
      </main>
    );
  }

  // Calculate dynamic dashboard stats
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const lowStockCount = products.filter(
    (p) => (p.inventory ?? 25) <= 5,
  ).length;
  const unreadMessagesCount = messages.filter((m) => !m.read).length;

  const handleUpdateStock = (product) => {
    const current = product.inventory ?? 25;
    const input = window.prompt(
      `Update stock quantity for ${product.name}:`,
      current,
    );
    if (input === null) return;
    const num = Number(input);
    if (!Number.isInteger(num) || num < 0) {
      alert("Please enter a valid non-negative integer.");
      return;
    }
    updateStock(product, num);
  };

  const handleCreateProduct = (e) => {
    e.preventDefault();
    createProduct(newProduct);
    setNewProduct({
      name: "",
      category: "Cleansers",
      price: "",
      inventory: "",
      size: "50 ml",
      description: "",
    });
  };

  const handleDeleteProduct = (product) => {
    if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
      deleteProduct(product);
    }
  };

  const handleDeleteReview = (review) => {
    if (window.confirm("Are you sure you want to delete this customer review?")) {
      deleteReview(review.productId, review._id);
    }
  };

  const handleSaveJournal = () => {
    saveJournal(localJournal);
    setJournalSaved(true);
    setTimeout(() => setJournalSaved(false), 2500);
  };

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Control room</p>
          <h1>
            Admin <i>dashboard.</i>
          </h1>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button
            className="text-button"
            onClick={loadAdminData}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh live data"}
          </button>
          <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>
            Logged in as <b>{user.name || user.email}</b> (Admin)
          </span>
        </div>
      </div>

      <div className="admin-stats">
        <div>
          <strong>{formatPrice(totalRevenue)}</strong>
          <span>Total revenue</span>
        </div>
        <div>
          <strong>{orders.length}</strong>
          <span>Total orders</span>
        </div>
        <div>
          <strong>{products.length}</strong>
          <span>Total products</span>
        </div>
        <div>
          <strong style={{ color: lowStockCount > 0 ? "#e57373" : "inherit" }}>
            {lowStockCount}
          </strong>
          <span>Low stock alerts</span>
        </div>
        <div>
          <strong>{reviews.length}</strong>
          <span>Total reviews</span>
        </div>
        <div>
          <strong>{unreadMessagesCount}</strong>
          <span>Unread inquiries</span>
        </div>
      </div>

      {/* Inventory Section */}
      <section className="admin-section">
        <div className="section-intro">
          <h2>Inventory Management</h2>
          <span>{products.length} products</span>
        </div>
        <form className="admin-product-form" onSubmit={handleCreateProduct}>
          <input
            placeholder="Product name"
            value={newProduct.name}
            onChange={(event) =>
              setNewProduct({ ...newProduct, name: event.target.value })
            }
            required
          />
          <select
            value={newProduct.category}
            onChange={(event) =>
              setNewProduct({ ...newProduct, category: event.target.value })
            }
          >
            {categories
              .filter((cat) => cat !== "All products")
              .map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder={`Price (${currency === "INR" ? "₹ INR" : "$ USD"})`}
            value={newProduct.price}
            onChange={(event) =>
              setNewProduct({ ...newProduct, price: event.target.value })
            }
            required
          />
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Initial stock"
            value={newProduct.inventory}
            onChange={(event) =>
              setNewProduct({
                ...newProduct,
                inventory: event.target.value,
              })
            }
            required
          />
          <button className="primary-button">Add product</button>
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
              <b
                className={(product.inventory ?? 25) <= 5 ? "low-stock" : ""}
              >
                {product.inventory ?? 25} in stock
              </b>
              <button
                className="outline-button"
                onClick={() => handleUpdateStock(product)}
              >
                Update stock
              </button>
              <button
                className="review-delete"
                onClick={() => handleDeleteProduct(product)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Orders Section */}
      <section className="admin-section">
        <div className="section-intro">
          <h2>Customer Orders</h2>
          <span>{orders.length} placed orders</span>
        </div>
        <div className="admin-table">
          {orders.length ? (
            orders.map((order) => (
              <div className="admin-row" key={order.id}>
                <span>
                  <strong>{order.id}</strong>
                  <small>
                    {order.customer?.name} ({order.customer?.email}) ·{" "}
                    {formatPrice(order.total)} · {order.items?.length} items ·{" "}
                    {order.date || order.createdAt}
                  </small>
                </span>
                <select
                  value={order.status}
                  onChange={(event) =>
                    updateOrderStatus(order, event.target.value)
                  }
                >
                  <option value="awaiting_payment">awaiting_payment</option>
                  <option value="processing">processing</option>
                  <option value="shipped">shipped</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
            ))
          ) : (
            <p className="muted-copy" style={{ padding: "1rem" }}>
              No orders placed yet.
            </p>
          )}
        </div>
      </section>

      {/* Reviews Moderation */}
      <section className="admin-section">
        <div className="section-intro">
          <h2>Community Reviews</h2>
          <span>{reviews.length} reviews</span>
        </div>
        <div className="admin-table">
          {reviews.length ? (
            reviews.map((review) => {
              const prod = products.find((p) => p.id === review.productId);
              return (
                <div className="admin-row" key={review._id}>
                  <span>
                    <strong>
                      {review.name} ({review.rating}★)
                    </strong>
                    <small>
                      Product: {prod ? prod.name : `#${review.productId}`} · "
                      {review.text}"
                    </small>
                  </span>
                  <button
                    className="review-delete"
                    onClick={() => handleDeleteReview(review)}
                  >
                    Delete review
                  </button>
                </div>
              );
            })
          ) : (
            <p className="muted-copy" style={{ padding: "1rem" }}>
              No reviews to moderate.
            </p>
          )}
        </div>
      </section>

      {/* Contact Messages */}
      <section className="admin-section">
        <div className="section-intro">
          <h2>Contact Inquiries</h2>
          <span>{messages.length} messages</span>
        </div>
        <div className="admin-table">
          {messages.length ? (
            messages.map((message) => (
              <div className="admin-row" key={message._id}>
                <span>
                  <strong>
                    {message.name} · {message.email}
                  </strong>
                  <small>{message.message}</small>
                </span>
                <span
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <b style={{ color: message.read ? "inherit" : "#809c73" }}>
                    {message.read ? "Read" : "New"}
                  </b>
                  <button
                    className="outline-button"
                    onClick={() => updateMessage(message, "toggle")}
                  >
                    {message.read ? "Mark unread" : "Mark read"}
                  </button>
                  <button
                    className="review-delete"
                    onClick={() => updateMessage(message, "delete")}
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))
          ) : (
            <p className="muted-copy" style={{ padding: "1rem" }}>
              No inquiries received yet.
            </p>
          )}
        </div>
      </section>

      {/* Journal Editor */}
      <section className="admin-section">
        <div className="section-intro">
          <h2>Journal Content</h2>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            {journalSaved && (
              <span style={{ color: "#809c73", fontSize: "0.9rem" }}>
                Saved successfully!
              </span>
            )}
            <button className="text-button" onClick={handleSaveJournal}>
              Save journal
            </button>
          </div>
        </div>
        <div className="admin-journal-editor">
          {localJournal.map((entry, index) => (
            <div key={`${entry.title}-${index}`}>
              <input
                value={entry.title}
                onChange={(event) =>
                  setLocalJournal((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, title: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="Article title"
              />
              <input
                value={entry.type}
                onChange={(event) =>
                  setLocalJournal((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, type: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="Category (e.g. Rituals, Ingredients)"
              />
              <textarea
                value={entry.text}
                onChange={(event) =>
                  setLocalJournal((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, text: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="Article summary text"
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function ProductCard({ product }) {
  const { wishlist, toggleWishlist, addToCart, formatPrice } = useShop();
  const wished = wishlist.includes(product.id);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
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
      </div>
      <div className="product-info">
        <div>
          <Link to={`/product/${product.id}`} className="product-name">
            {product.name}
          </Link>
          <p className="product-size">{product.size}</p>
        </div>
        <button
          className="add-mini"
          onClick={handleAdd}
          aria-label={`Add ${product.name} to bag`}
          title={added ? "Added!" : "Add to bag"}
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="product-meta">
        <span>{formatPrice(product.price)}</span>
        <span className="rating">
          ★ {product.rating} <em>({product.reviews})</em>
        </span>
      </div>
    </article>
  );
}

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
        const matchesPrice = product.price <= maxPrice;
        const matchesQuery =
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
            Thoughtful essentials for your everyday ritual. Made with less,
            chosen with care.
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
            placeholder="Search the collection"
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
            <p className="filter-label">Browse by</p>
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
                {item}
                <span>
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
              <span>{filtered.length} products</span>
              <label>
                Sort by{" "}
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="rating">Top rated</option>
                  <option value="name">Name</option>
                </select>
                <ChevronDown size={15} />
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
                <h2>No matches just yet.</h2>
                <p>Try a different search or reset your filters.</p>
                <button
                  className="text-button"
                  onClick={() => {
                    setQuery("");
                    setParams({});
                  }}
                >
                  Clear filters <ArrowRight size={15} />
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
          <Link to="/shop" className="primary-button">
            Shop the collection <ArrowRight size={16} />
          </Link>
          <div className="hero-note">
            <span>✦</span> Dermatologist tested
            <br />
            <span>✦</span> Kind to sensitive skin
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
        <span>Clean formulas</span>
        <b>✦</b>
        <span>Thoughtful rituals</span>
        <b>✦</b>
        <span>Visible calm</span>
        <b>✦</b>
        <span>Clean formulas</span>
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
        // Fallback to local reviews state
        setProductReviews(allReviews.filter((r) => r.productId === product.id));
      });
  }, [product, allReviews]);

  if (loading) {
    return (
      <div className="empty-state page-empty">
        <h2>Loading product.</h2>
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
          </div>
          <p className="detail-description">{product.description}</p>
          <div className="detail-price">
            {formatPrice(product.price)}
            <span>
              {product.size} · {stock > 0 ? `${stock} in stock` : "Out of stock"}
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
              Free shipping on orders over {formatPrice(50)}
              <br />
              <span>Easy returns within 30 days</span>
            </p>
          </div>
        </div>
      </div>

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
                <strong>{"★".repeat(item.rating)}</strong>
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
  const { cart, updateQuantity, removeFromCart, formatPrice } = useShop();
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const freeShippingNeeded = Math.max(0, 50 - subtotal);

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
            <div className="summary-line">
              <span>Estimated shipping</span>
              <b>{subtotal >= 50 ? "Free" : formatPrice(5)}</b>
            </div>
            <hr />
            <div className="summary-total">
              <span>Estimated total</span>
              <b>{formatPrice(subtotal + (subtotal >= 50 ? 0 : 5))}</b>
            </div>

            <p className="secure-note" style={{ margin: "1rem 0" }}>
              {freeShippingNeeded > 0 ? (
                <>✦ Add {formatPrice(freeShippingNeeded)} more for Free Shipping</>
              ) : (
                <>✦ You have unlocked Free Standard Shipping!</>
              )}
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

function WishlistPage() {
  const { products, wishlist, loading } = useShop();
  const saved = products.filter((product) => wishlist.includes(product.id));

  return (
    <main className="wishlist-page">
      <div className="cart-heading">
        <div>
          <p className="eyebrow">Your saved edit</p>
          <h1>
            Wishlist <i>({saved.length})</i>
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="empty-state cart-empty">
          <h2>Loading your wishlist.</h2>
        </div>
      ) : saved.length ? (
        <div className="product-grid">
          {saved.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state cart-empty">
          <Heart size={30} />
          <h2>Nothing saved yet.</h2>
          <p>Keep the formulas that make you curious close by.</p>
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
            We started Luma with one simple belief: skincare should bring you
            back to yourself, not add more noise to your day.
          </p>
        </div>
        <img
          src="https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1200&q=85"
          alt="Luma skincare products beside a towel"
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
            Every Luma formula is made with a short, purposeful ingredient list
            and a clear role in your routine. No overcomplicated steps. No
            pressure to chase perfect skin.
          </p>
          <p>
            Just thoughtful care for the skin you have today, made in small
            batches and tested on sensitive skin.
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
          <p>Ingredients chosen for comfort, function, and everyday use.</p>
        </div>
        <div>
          <strong>02</strong>
          <h3>Gentle</h3>
          <p>Formulas that support your barrier instead of fighting it.</p>
        </div>
        <div>
          <strong>03</strong>
          <h3>Honest</h3>
          <p>Clear rituals, clear textures, and no impossible promises.</p>
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
        <p className="eyebrow">The Luma journal</p>
        <h1>
          Notes for a <i>slower</i> routine.
        </h1>
        <p>
          Thoughts, rituals, and ingredient wisdom for making skincare feel like
          yours.
        </p>
      </section>
      <div className="journal-list">
        {journal.map((entry, index) => (
          <article className="journal-entry" key={entry.title}>
            <span>0{index + 1}</span>
            <div>
              <p className="eyebrow">{entry.type}</p>
              <h2>{entry.title}</h2>
              <p>{entry.text}</p>
            </div>
            <ArrowRight size={20} />
          </article>
        ))}
      </div>
    </main>
  );
}

function ContactPage() {
  const { contact, addMessage } = useShop();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitMessage = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    await addMessage(form);
    setForm({ name: "", email: "", message: "" });
    setSent(true);
    setIsSubmitting(false);
  };

  return (
    <main className="contact-page">
      <section>
        <p className="eyebrow">We are here</p>
        <h1>
          Have a <i>question?</i>
        </h1>
        <p>
          Our small team reads every note. Reach us{" "}
          {contact.hours || "Monday to Friday"}.
        </p>
      </section>
      <div className="contact-grid">
        <a href={`mailto:${contact.email}`}>
          <span>Email us</span>
          <strong>{contact.email}</strong>
          <ArrowRight size={18} />
        </a>
        <a href={`tel:${contact.phone}`}>
          <span>Call us</span>
          <strong>{contact.phone}</strong>
          <ArrowRight size={18} />
        </a>
        <div>
          <span>Visit our studio</span>
          <strong>
            {contact.address.split("\n").map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </strong>
        </div>
      </div>
      <form className="contact-form" onSubmit={submitMessage}>
        <div className="contact-form-heading">
          <div>
            <p className="eyebrow">Send a note</p>
            <h2>Let&apos;s talk skincare.</h2>
          </div>
          <span>We usually reply within 1–2 business days.</span>
        </div>
        {sent && (
          <p className="success-copy" role="status">
            Thanks, your message has been sent. We&apos;ll be in touch soon.
          </p>
        )}
        <label>
          Your name
          <input
            name="name"
            autoComplete="name"
            placeholder="Jane Smith"
            value={form.name}
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
            }
            required
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="jane@example.com"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
            required
          />
        </label>
        <label>
          Your message
          <textarea
            name="message"
            placeholder="Tell us how we can help..."
            maxLength={2000}
            value={form.message}
            onChange={(event) =>
              setForm({ ...form, message: event.target.value })
            }
            required
          />
          <span className="character-count">{form.message.length}/2000</span>
        </label>
        <button className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send message"}
          {!isSubmitting && <ArrowRight size={17} />}
        </button>
      </form>
    </main>
  );
}

function CheckoutPage() {
  const { cart, placeOrder, user, quickLogin, formatPrice, currency } = useShop();
  const [email, setEmail] = useState(() => user?.email || "");
  const [name, setName] = useState(() => user?.name || "");
  const [country, setCountry] = useState(() => (currency === "INR" ? "IN" : "US"));
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [error, setError] = useState("");

  const selectedCountry = countries.find((c) => c.code === country);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shipping = subtotal >= 50 ? 0 : selectedCountry?.shipping || 5;
  const total = subtotal + shipping;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !address || !city || !state || !zip) {
      setError("Please fill in all shipping fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const order = await placeOrder({
        customer: { email, name, country, address, city, state, zip },
        items: cart,
        subtotal,
        shipping,
        total,
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
          <p className="eyebrow">Order received</p>
          <h1>
            Thank you,{" "}
            {placedOrder.customer?.name?.split(" ")[0] || "there"}.
          </h1>
          <p>
            Your skincare order has been placed successfully in the database! Tracking
            updates will be sent to <b>{placedOrder.customer?.email}</b>.
          </p>
          <strong>Order number: {placedOrder.id}</strong>

          <div
            style={{
              marginTop: "1.5rem",
              marginBottom: "1.5rem",
              textAlign: "left",
              padding: "1.2rem",
              borderRadius: "10px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              maxWidth: "480px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <p
              style={{
                margin: "0 0 0.5rem",
                fontWeight: 600,
                fontSize: "0.95rem",
              }}
            >
              Shipping to:
            </p>
            <p
              style={{
                margin: 0,
                opacity: 0.85,
                fontSize: "0.9rem",
                lineHeight: "1.4",
              }}
            >
              {placedOrder.customer?.name}
              <br />
              {placedOrder.customer?.address}
              <br />
              {placedOrder.customer?.city}, {placedOrder.customer?.state}{" "}
              {placedOrder.customer?.zip}
            </p>
            <hr
              style={{
                margin: "0.8rem 0",
                borderColor: "var(--border)",
                opacity: 0.5,
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.95rem",
                fontWeight: 600,
              }}
            >
              <span>Total Paid:</span>
              <span>{formatPrice(placedOrder.total)}</span>
            </div>
          </div>

          <Link to="/shop" className="primary-button">
            Continue shopping <ArrowRight size={15} />
          </Link>
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
        <h1>Checkout</h1>
        <Link to="/cart" className="text-button">
          ← Back to cart
        </Link>
      </div>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          {error && <p className="checkout-error">{error}</p>}

          {!user && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.8rem",
                background: "var(--surface)",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "0.85rem" }}>Have an account?</span>
              <button
                type="button"
                className="outline-button"
                style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
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

          <fieldset>
            <legend>Contact information</legend>
            <input
              type="email"
              placeholder="Email address"
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
          </fieldset>
          <fieldset>
            <legend>Shipping address</legend>
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
              placeholder="Street address"
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
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Processing..." : "Place order"}{" "}
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
          <div className="summary-line">
            <span>Shipping ({selectedCountry?.name})</span>
            <b>{shipping === 0 ? "Free" : formatPrice(shipping)}</b>
          </div>
          <div className="summary-line">
            <span>Estimated tax</span>
            <b>{formatPrice(0)} (Included)</b>
          </div>
          <hr />
          <div className="summary-total">
            <span>Total</span>
            <b>{formatPrice(total)}</b>
          </div>
          <p className="secure-note">
            ✦ Full Stack REST API Order Processing
            <br />✦{" "}
            {subtotal >= 50
              ? "Free standard shipping unlocked"
              : `Standard shipping: ${formatPrice(shipping)}`}
          </p>
        </aside>
      </div>
    </main>
  );
}

function App() {
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
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route
            path="/auth/google/callback"
            element={<GoogleAuthCallbackPage />}
          />
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
          </nav>
          <span>© 2026 Luma skincare</span>
        </footer>
      </ShopProvider>
    </BrowserRouter>
  );
}

export default App;
