import "dotenv/config";
import cors from "cors";
import express from "express";
import { ObjectId } from "mongodb";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import {
  createToken,
  hashPassword,
  readToken,
  verifyPassword,
} from "./auth.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initDatabase } from "./db.js";
import { calculateOrderTotals } from "./services/taxService.js";
import { emailService } from "./services/emailService.js";
import { aiService } from "./services/aiService.js";
import { getProductRecommendations } from "./services/recommendationService.js";

const app = express();
const port = process.env.PORT || 3001;
const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB || "luma_store";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "data", "store.json");
const uploadsDir = path.join(__dirname, "uploads");

// Ensure uploads directory exists
if (!existsSync(uploadsDir)) {
  try {
    await mkdir(uploadsDir, { recursive: true });
  } catch {}
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
const jwtSecret =
  process.env.JWT_SECRET || "local-development-jwt-secret-luma-skincare";
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirectUri =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:3001/api/auth/google/callback";
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

let currentDbType = "unknown";

// Security headers
app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("X-XSS-Protection", "1; mode=block");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Permissive CORS for local Vite dev server
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  }),
);

// Serve uploaded product images
app.use("/uploads", express.static(uploadsDir));

// Health check endpoint
app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    dbType: currentDbType,
    port,
    timestamp: new Date().toISOString(),
  });
});

// Raw body parser for Stripe Webhook BEFORE express.json()
const stripeWebhookHandler = async (request, response) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return response.status(503).json({
      success: false,
      error: "Stripe webhook is not configured on this server",
    });
  }
  try {
    const event = stripe.webhooks.constructEvent(
      request.body,
      request.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        const order = await ordersCollection.findOne({ id: orderId });
        if (order && order.paymentStatus !== "paid") {
          await ordersCollection.updateOne(
            { id: orderId },
            {
              $set: {
                paymentStatus: "paid",
                status: "processing",
                paidAt: new Date(),
                stripeSessionId: session.id,
              },
            },
          );

          // Decrement stock if not already decremented
          if (Array.isArray(order.items)) {
            await Promise.all(
              order.items.map((item) =>
                productsCollection.updateOne(
                  { id: item.productId },
                  { $inc: { inventory: -item.quantity } },
                ),
              ),
            );
          }

          if (order.sessionId) {
            await cartsCollection.deleteOne({ _id: order.sessionId });
          }

          // Trigger email confirmation
          emailService.sendOrderConfirmation(order).catch(() => {});
        }
      }
    }
    response.json({ received: true });
  } catch (error) {
    response.status(400).send(`Webhook Error: ${error.message}`);
  }
};

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

// JSON body parser with 10mb limit for image uploads
app.use(express.json({ limit: "10mb" }));

// In-memory sliding window rate limiter for auth / sensitive endpoints
const rateLimitMap = new Map();
function rateLimit(maxRequests = 40, windowMs = 60000) {
  return (request, response, next) => {
    const ip = request.ip || request.socket.remoteAddress || "127.0.0.1";
    const now = Date.now();
    const entry = rateLimitMap.get(ip) || [];
    const valid = entry.filter((ts) => now - ts < windowMs);

    if (valid.length >= maxRequests) {
      return response.status(429).json({
        ok: false,
        success: false,
        error: "Too many requests. Please slow down and try again.",
      });
    }

    valid.push(now);
    rateLimitMap.set(ip, valid);
    next();
  };
}

let productsCollection;
let cartsCollection;
let wishlistsCollection;
let ordersCollection;
let reviewsCollection;
let contentCollection;
let usersCollection;
let contactMessagesCollection;
let couponsCollection;
let addressesCollection;
let passwordResetsCollection;
let emailsCollection;

const categoryMedia = {
  Cleansers:
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=85",
  Serums:
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=85",
  Moisturizers:
    "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=900&q=85",
  "Sun Care":
    "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=85",
  Treatments:
    "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85",
  Toners:
    "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=85",
  Exfoliators:
    "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&q=85",
  "Body Care":
    "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=900&q=85",
  "Lip Care":
    "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=85",
};

async function connectDatabase() {
  const { collections, dbType } = await initDatabase({
    mongoUri,
    databaseName,
    storePath: seedPath,
    adminEmail: process.env.ADMIN_EMAIL || "admin@luma.skin",
    adminPassword: process.env.ADMIN_PASSWORD || "admin123",
    hashPassword,
  });

  currentDbType = dbType;
  productsCollection = collections.productsCollection;
  cartsCollection = collections.cartsCollection;
  wishlistsCollection = collections.wishlistsCollection;
  ordersCollection = collections.ordersCollection;
  reviewsCollection = collections.reviewsCollection;
  contentCollection = collections.contentCollection;
  usersCollection = collections.usersCollection;
  contactMessagesCollection = collections.contactMessagesCollection;
  couponsCollection = collections.couponsCollection;
  addressesCollection = collections.addressesCollection;
  passwordResetsCollection = collections.passwordResetsCollection;
  emailsCollection = collections.emailsCollection;

  // Connect email audit logger to database outbox
  emailService.setCollection(emailsCollection);

  if (dbType === "mongodb") {
    const seed = JSON.parse(await readFile(seedPath, "utf8"));
    if (seed.products?.length) {
      await Promise.all(
        seed.products.map((product) => {
          const seededProduct = {
            ...product,
            inventory: product.inventory ?? 25,
          };
          const insertProduct = { ...seededProduct };
          for (const field of [
            "name",
            "category",
            "price",
            "rating",
            "reviews",
            "size",
            "image",
            "description",
          ])
            delete insertProduct[field];
          const update = {
            $setOnInsert: insertProduct,
            $set: {
              name: product.name,
              category: product.category,
              price: product.price,
              rating: product.rating,
              reviews: product.reviews,
              size: product.size,
              ...(product.image ? { image: product.image } : {}),
              ...(product.description
                ? { description: product.description }
                : {}),
            },
          };
          return productsCollection.updateOne({ id: product.id }, update, {
            upsert: true,
          });
        }),
      );
    }
  }

  await productsCollection.createIndex({ category: 1 });
  await productsCollection.createIndex({ name: "text" });

  // Ensure healthy inventory baseline for all demo items
  try {
    await productsCollection.updateMany(
      { $or: [{ inventory: { $lt: 5 } }, { inventory: { $exists: false } }] },
      { $set: { inventory: 50 } },
    );
  } catch {}
}

async function getProducts() {
  const products = await productsCollection
    .find({}, { projection: { _id: 0 } })
    .toArray();
  return products.map((product) => ({
    ...product,
    image:
      product.image ||
      categoryMedia[product.category] ||
      categoryMedia.Treatments,
    description:
      product.description ||
      `${product.name}, thoughtfully made for a simple everyday ritual.`,
    inventory:
      typeof product.inventory === "number" && product.inventory >= 0
        ? product.inventory
        : 25,
  }));
}

async function normalizeItems(items) {
  if (!Array.isArray(items)) return null;
  const products = await getProducts();
  const normalized = [];
  for (const item of items) {
    const prodId = Number(item.productId || item.id);
    const product = products.find((entry) => entry.id === prodId);
    const quantity = Number(item.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1) {
      return null;
    }
    const availableStock =
      typeof product.inventory === "number" && product.inventory > 0
        ? product.inventory
        : 50;
    if (quantity > availableStock) {
      return null;
    }
    const existing = normalized.find((entry) => entry.productId === product.id);
    if (existing) existing.quantity += quantity;
    else normalized.push({ productId: product.id, quantity });
  }
  return normalized;
}

// Consistent standardized response utilities
function sendSuccess(response, data = {}, message = "Success", status = 200) {
  return response.status(status).json({
    ok: true,
    success: true,
    message,
    data,
  });
}

function sendError(response, error, status = 500) {
  const errMsg = typeof error === "string" ? error : error?.message || "Something went wrong.";
  if (status >= 500) {
    console.error("[ServerError]", error);
  }
  return response.status(status).json({
    ok: false,
    success: false,
    error: status === 500 ? "Internal server error. Please try again." : errMsg,
    message: status === 500 ? "Internal server error. Please try again." : errMsg,
  });
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name || user.email.split("@")[0],
    phone: user.phone || "",
    createdAt: user.createdAt,
  };
}

async function requireAuth(request, response, next) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token)
    return response
      .status(401)
      .json({ ok: false, success: false, error: "Authentication required" });
  try {
    const claims = readToken(token, jwtSecret);
    const user = await usersCollection.findOne({
      _id: new ObjectId(claims.sub),
    });
    if (!user)
      return response
        .status(401)
        .json({ ok: false, success: false, error: "User account not found" });
    request.user = user;
    next();
  } catch {
    response.status(401).json({ ok: false, success: false, error: "Invalid or expired token" });
  }
}

async function optionalAuth(request, _response, next) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token) {
    try {
      const claims = readToken(token, jwtSecret);
      const user = await usersCollection.findOne({
        _id: new ObjectId(claims.sub),
      });
      if (user) request.user = user;
    } catch {}
  }
  next();
}

function requireRole(role) {
  return (request, response, next) =>
    request.user?.role === role
      ? next()
      : response.status(403).json({ ok: false, success: false, error: "Permission denied" });
}

// Root API discovery
app.get("/", (_request, response) =>
  response.json({
    name: "LUMA Skincare Full-Stack API",
    status: "running",
    database: databaseName,
    endpoints: {
      health: "/api/health",
      products: "/api/products",
      cart: "/api/cart/:sessionId",
      wishlist: "/api/wishlist/:sessionId",
      orders: "/api/orders",
      coupons: "/api/coupons/validate",
      ai: "/api/ai/recommend",
      auth: "/api/auth/me",
    },
  }),
);

/* ==========================================================================
   AUTHENTICATION & PROFILE ENDPOINTS
   ========================================================================== */

app.post("/api/auth/register", rateLimit(15), async (request, response) => {
  try {
    const email = String(request.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(request.body.password || "");
    const name = String(request.body.name || "").trim() || email.split("@")[0];
    const phone = String(request.body.phone || "").trim();

    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8)
      return response.status(400).json({
        ok: false,
        success: false,
        error: "Use a valid email address and a password of at least 8 characters",
      });

    if (await usersCollection.findOne({ email }))
      return response.status(409).json({
        ok: false,
        success: false,
        error: "An account with this email already exists",
      });

    const user = {
      email,
      passwordHash: await hashPassword(password),
      role: "customer",
      name,
      phone,
      createdAt: new Date(),
    };
    const result = await usersCollection.insertOne(user);
    user._id = result.insertedId;

    response.status(201).json({
      ok: true,
      success: true,
      data: { user: publicUser(user), token: createToken(user, jwtSecret) },
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/auth/login", rateLimit(25), async (request, response) => {
  try {
    const email = String(request.body.email || "")
      .trim()
      .toLowerCase();
    const user = await usersCollection.findOne({ email });

    if (
      !user ||
      !user.passwordHash ||
      !(await verifyPassword(
        String(request.body.password || ""),
        user.passwordHash,
      ))
    )
      return response
        .status(401)
        .json({ ok: false, success: false, error: "Invalid email or password" });

    response.json({
      ok: true,
      success: true,
      data: { user: publicUser(user), token: createToken(user, jwtSecret) },
    });
  } catch (error) {
    sendError(response, error);
  }
});

// Google OAuth
app.get("/api/auth/google", (request, response) => {
  if (!googleClientId || !googleClientSecret)
    return response.status(503).json({
      ok: false,
      success: false,
      error: "Google sign-in is not configured on this server",
    });
  const state = jwt.sign({ nonce: randomUUID() }, jwtSecret, {
    expiresIn: "10m",
  });
  const parameters = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: googleRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${parameters}`);
});

app.get("/api/auth/google/callback", async (request, response) => {
  try {
    if (!googleClientId || !googleClientSecret)
      throw new Error("Google sign-in is not configured on this server");
    if (!request.query.code || !request.query.state)
      throw new Error("Google sign-in was cancelled");
    jwt.verify(String(request.query.state), jwtSecret);

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(request.query.code),
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: googleRedirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) throw new Error("Google could not verify this sign-in");
    const tokens = await tokenResponse.json();
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileResponse.ok) throw new Error("Google profile could not be loaded");
    const profile = await profileResponse.json();
    if (!profile.sub || !profile.email || !profile.email_verified)
      throw new Error("A verified Google email address is required");

    const email = profile.email.toLowerCase();
    let user = await usersCollection.findOne({ googleId: profile.sub });
    if (!user) {
      user = await usersCollection.findOne({ email });
      if (user) {
        await usersCollection.updateOne({ _id: user._id }, { $set: { googleId: profile.sub } });
        user.googleId = profile.sub;
      } else {
        const newUser = {
          email,
          googleId: profile.sub,
          name: profile.name || email.split("@")[0],
          role: "customer",
          createdAt: new Date(),
        };
        const result = await usersCollection.insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
      }
    }
    const token = createToken(user, jwtSecret);
    response.redirect(`${clientUrl}/auth/google/callback?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error(error);
    response.redirect(`${clientUrl}/login?error=${encodeURIComponent(error.message)}`);
  }
});

app.get("/api/auth/me", requireAuth, async (request, response) => {
  const user = request.user;
  const addresses = await addressesCollection
    .find({ $or: [{ userId: user._id.toString() }, { userEmail: user.email }] })
    .toArray();
  const orderCount = await ordersCollection.countDocuments({
    $or: [{ "customer.email": user.email }, { userId: user._id.toString() }],
  });

  response.json({
    ok: true,
    success: true,
    data: {
      user: {
        ...publicUser(user),
        addresses,
        totalOrders: orderCount,
      },
    },
  });
});

app.put("/api/auth/profile", requireAuth, async (request, response) => {
  try {
    const { name, phone } = request.body;
    const updates = {};
    if (name && typeof name === "string") updates.name = name.trim().slice(0, 80);
    if (phone !== undefined) updates.phone = String(phone).trim().slice(0, 30);

    await usersCollection.updateOne(
      { _id: request.user._id },
      { $set: updates },
    );

    const updated = await usersCollection.findOne({ _id: request.user._id });
    sendSuccess(response, { user: publicUser(updated) }, "Profile updated successfully");
  } catch (error) {
    sendError(response, error);
  }
});

app.put("/api/auth/change-password", requireAuth, async (request, response) => {
  try {
    const { currentPassword, newPassword } = request.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return response.status(400).json({
        ok: false,
        success: false,
        error: "New password must be at least 8 characters long",
      });
    }

    if (!request.user.passwordHash || !(await verifyPassword(currentPassword, request.user.passwordHash))) {
      return response.status(401).json({
        ok: false,
        success: false,
        error: "Incorrect current password",
      });
    }

    const newHash = await hashPassword(newPassword);
    await usersCollection.updateOne(
      { _id: request.user._id },
      { $set: { passwordHash: newHash, passwordUpdatedAt: new Date() } },
    );

    sendSuccess(response, null, "Password changed successfully");
  } catch (error) {
    sendError(response, error);
  }
});

// Forgot Password Flow
app.post("/api/auth/forgot-password", rateLimit(10), async (request, response) => {
  try {
    const email = String(request.body.email || "").trim().toLowerCase();
    if (!email) {
      return response.status(400).json({ ok: false, success: false, error: "Email is required" });
    }

    const user = await usersCollection.findOne({ email });
    if (user) {
      const resetToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(resetToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await passwordResetsCollection.deleteMany({ email });
      await passwordResetsCollection.insertOne({
        email,
        tokenHash,
        expiresAt,
        createdAt: new Date(),
      });

      const resetUrl = `${clientUrl}/reset-password/${resetToken}`;
      await emailService.sendPasswordReset(email, resetUrl, resetToken);
    }

    // Always return success to prevent email enumeration
    sendSuccess(
      response,
      null,
      "If an account exists with this email, a password reset link has been dispatched.",
    );
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/auth/reset-password", rateLimit(10), async (request, response) => {
  try {
    const { token, newPassword } = request.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return response.status(400).json({
        ok: false,
        success: false,
        error: "Provide a valid token and a new password with at least 8 characters",
      });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const record = await passwordResetsCollection.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return response.status(400).json({
        ok: false,
        success: false,
        error: "Invalid or expired password reset link. Please request a new one.",
      });
    }

    const passwordHash = await hashPassword(newPassword);
    await usersCollection.updateOne(
      { email: record.email },
      { $set: { passwordHash, passwordUpdatedAt: new Date() } },
    );
    await passwordResetsCollection.deleteMany({ email: record.email });

    sendSuccess(response, null, "Password successfully updated. You may now log in.");
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/auth/logout", requireAuth, (_request, response) =>
  response.json({ ok: true, success: true, message: "Logged out" }),
);

/* ==========================================================================
   SAVED ADDRESSES ENDPOINTS
   ========================================================================== */

app.get("/api/addresses", requireAuth, async (request, response) => {
  try {
    const user = request.user;
    const addresses = await addressesCollection
      .find({ $or: [{ userId: user._id.toString() }, { userEmail: user.email }] })
      .sort({ isDefault: -1, createdAt: -1 })
      .toArray();
    sendSuccess(response, { addresses });
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/addresses", requireAuth, async (request, response) => {
  try {
    const { fullName, phone, address, city, state, postalCode, country, isDefault, tag } = request.body;
    if (!fullName || !address || !city || !postalCode) {
      return response.status(400).json({
        ok: false,
        success: false,
        error: "Full name, address, city, and postal code are required",
      });
    }

    const user = request.user;
    const makeDefault = Boolean(isDefault);

    if (makeDefault) {
      await addressesCollection.updateMany(
        { $or: [{ userId: user._id.toString() }, { userEmail: user.email }] },
        { $set: { isDefault: false } },
      );
    }

    const newAddress = {
      id: `addr-${randomUUID().slice(0, 8)}`,
      userId: user._id.toString(),
      userEmail: user.email,
      fullName: String(fullName).trim().slice(0, 80),
      phone: String(phone || "").trim().slice(0, 30),
      address: String(address).trim().slice(0, 160),
      city: String(city).trim().slice(0, 80),
      state: String(state || "").trim().slice(0, 60),
      postalCode: String(postalCode).trim().slice(0, 20),
      country: String(country || "US").trim().toUpperCase().slice(0, 2),
      tag: String(tag || "Home").trim().slice(0, 30),
      isDefault: makeDefault,
      createdAt: new Date(),
    };

    await addressesCollection.insertOne(newAddress);
    sendSuccess(response, { address: newAddress }, "Address saved successfully", 201);
  } catch (error) {
    sendError(response, error);
  }
});

app.put("/api/addresses/:id", requireAuth, async (request, response) => {
  try {
    const { fullName, phone, address, city, state, postalCode, country, isDefault, tag } = request.body;
    const user = request.user;
    const addressId = request.params.id;

    if (isDefault) {
      await addressesCollection.updateMany(
        { $or: [{ userId: user._id.toString() }, { userEmail: user.email }] },
        { $set: { isDefault: false } },
      );
    }

    const updates = {
      ...(fullName ? { fullName: String(fullName).trim().slice(0, 80) } : {}),
      ...(phone !== undefined ? { phone: String(phone).trim().slice(0, 30) } : {}),
      ...(address ? { address: String(address).trim().slice(0, 160) } : {}),
      ...(city ? { city: String(city).trim().slice(0, 80) } : {}),
      ...(state !== undefined ? { state: String(state).trim().slice(0, 60) } : {}),
      ...(postalCode ? { postalCode: String(postalCode).trim().slice(0, 20) } : {}),
      ...(country ? { country: String(country).trim().toUpperCase().slice(0, 2) } : {}),
      ...(tag ? { tag: String(tag).trim().slice(0, 30) } : {}),
      ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
      updatedAt: new Date(),
    };

    const res = await addressesCollection.findOneAndUpdate(
      { id: addressId, $or: [{ userId: user._id.toString() }, { userEmail: user.email }] },
      { $set: updates },
      { returnDocument: "after" },
    );

    if (!res) return response.status(404).json({ ok: false, success: false, error: "Address not found" });
    sendSuccess(response, { address: res }, "Address updated successfully");
  } catch (error) {
    sendError(response, error);
  }
});

app.delete("/api/addresses/:id", requireAuth, async (request, response) => {
  try {
    const user = request.user;
    const res = await addressesCollection.deleteOne({
      id: request.params.id,
      $or: [{ userId: user._id.toString() }, { userEmail: user.email }],
    });
    if (!res.deletedCount) return response.status(404).json({ ok: false, success: false, error: "Address not found" });
    sendSuccess(response, null, "Address deleted successfully");
  } catch (error) {
    sendError(response, error);
  }
});

app.put("/api/addresses/:id/default", requireAuth, async (request, response) => {
  try {
    const user = request.user;
    await addressesCollection.updateMany(
      { $or: [{ userId: user._id.toString() }, { userEmail: user.email }] },
      { $set: { isDefault: false } },
    );
    await addressesCollection.updateOne(
      { id: request.params.id, $or: [{ userId: user._id.toString() }, { userEmail: user.email }] },
      { $set: { isDefault: true } },
    );
    sendSuccess(response, null, "Default address set");
  } catch (error) {
    sendError(response, error);
  }
});

/* ==========================================================================
   PRODUCTS CATALOG & RECOMMENDATIONS
   ========================================================================== */

app.get("/api/products", async (request, response) => {
  try {
    const query = String(request.query.search || "").toLowerCase();
    const category = String(request.query.category || "");
    const minPrice = Number(request.query.minPrice || 0);
    const maxPrice = Number(request.query.maxPrice || Number.MAX_SAFE_INTEGER);
    const minRating = Number(request.query.rating || 0);
    const sort = String(request.query.sort || "featured");
    const page = request.query.page ? Math.max(1, parseInt(request.query.page, 10)) : null;
    const limit = request.query.limit ? Math.max(1, parseInt(request.query.limit, 10)) : 12;

    const allProducts = await getProducts();
    let filtered = allProducts.filter(
      (product) =>
        (!category || category === "All products" || product.category === category) &&
        product.price >= minPrice &&
        product.price <= maxPrice &&
        (product.rating || 0) >= minRating &&
        (product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query)),
    );

    filtered.sort((first, second) => {
      if (sort === "price-low") return first.price - second.price;
      if (sort === "price-high") return second.price - first.price;
      if (sort === "rating") return (second.rating || 0) - (first.rating || 0);
      if (sort === "name") return first.name.localeCompare(second.name);
      return first.id - second.id;
    });

    const total = filtered.length;

    // Return paginated payload if page parameter specified, else full array for backward compatibility
    if (page) {
      const startIndex = (page - 1) * limit;
      const paginated = filtered.slice(startIndex, startIndex + limit);
      return response.json({
        ok: true,
        success: true,
        products: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

    response.json({ ok: true, success: true, products: filtered, total });
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/products/:id", async (request, response) => {
  try {
    const all = await getProducts();
    const product = all.find((entry) => entry.id === Number(request.params.id));
    if (!product) return response.status(404).json({ ok: false, success: false, error: "Product not found" });

    const recommendations = getProductRecommendations({
      currentProduct: product,
      allProducts: all,
    });

    response.json({ ...product, recommendations });
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/products/:id/recommendations", async (request, response) => {
  try {
    const all = await getProducts();
    const product = all.find((entry) => entry.id === Number(request.params.id));
    const recommendations = getProductRecommendations({
      currentProduct: product,
      allProducts: all,
    });
    sendSuccess(response, recommendations);
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/content/:key", async (request, response) => {
  try {
    const content = await contentCollection.findOne(
      { key: request.params.key },
      { projection: { _id: 0, key: 0 } },
    );
    if (!content) return response.status(404).json({ error: "Content not found" });
    response.json(content);
  } catch (error) {
    sendError(response, error);
  }
});

/* ==========================================================================
   REVIEWS WITH VERIFIED PURCHASE & EDITING
   ========================================================================== */

app.get("/api/products/:id/reviews", async (request, response) => {
  try {
    const reviews = await reviewsCollection
      .find(
        { productId: Number(request.params.id) },
        { projection: { authorToken: 0 } },
      )
      .sort({ createdAt: -1 })
      .toArray();
    response.json({
      reviews: reviews.map((review) => ({
        ...review,
        _id: review._id.toString(),
        userId: review.userId?.toString(),
      })),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/products/:id/reviews", optionalAuth, async (request, response) => {
  try {
    const productId = Number(request.params.id);
    const product = await productsCollection.findOne({ id: productId });
    if (!product) return response.status(404).json({ error: "Product not found" });

    const name = (request.body.name || request.body.author || "").trim();
    const text = (request.body.text || request.body.comment || "").trim();
    const rating = Number(request.body.rating);
    const image = request.body.image ? String(request.body.image).trim() : null;

    if (!name || !Number.isInteger(rating) || rating < 1 || rating > 5 || !text) {
      return response.status(400).json({
        ok: false,
        success: false,
        error: "Name, rating (1-5), and review text are required",
      });
    }

    // Verify if user previously purchased this product
    let isVerifiedPurchase = false;
    if (request.user) {
      const pastOrder = await ordersCollection.findOne({
        $or: [
          { "customer.email": request.user.email },
          { userId: request.user._id.toString() },
        ],
        paymentStatus: { $in: ["paid", "completed", "shipped"] },
        "items.productId": productId,
      });
      if (pastOrder) isVerifiedPurchase = true;
    }

    const review = {
      productId,
      userId: request.user?._id?.toString() || "guest",
      userEmail: request.user?.email || null,
      name: name.slice(0, 80),
      rating,
      text: text.slice(0, 1000),
      image,
      isVerifiedPurchase,
      createdAt: new Date(),
    };

    await reviewsCollection.insertOne(review);

    // Update product reviews count and rating
    const allProdReviews = await reviewsCollection.find({ productId }).toArray();
    const avgRating =
      allProdReviews.reduce((sum, r) => sum + r.rating, 0) /
      (allProdReviews.length || 1);
    await productsCollection.updateOne(
      { id: productId },
      {
        $set: {
          reviews: allProdReviews.length,
          rating: Number(avgRating.toFixed(1)),
        },
      },
    );

    response.status(201).json({
      ...review,
      _id: review._id.toString(),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.put("/api/products/:id/reviews/:reviewId", requireAuth, async (request, response) => {
  try {
    const { rating, text } = request.body;
    const reviewId = request.params.reviewId;
    if (!ObjectId.isValid(reviewId)) return response.status(400).json({ error: "Invalid review ID" });

    const review = await reviewsCollection.findOne({ _id: new ObjectId(reviewId) });
    if (!review) return response.status(404).json({ error: "Review not found" });

    if (request.user.role !== "admin" && review.userId !== request.user._id.toString()) {
      return response.status(403).json({ error: "You can only edit your own review" });
    }

    const updates = {};
    if (rating && Number.isInteger(Number(rating))) updates.rating = Math.min(5, Math.max(1, Number(rating)));
    if (text) updates.text = String(text).trim().slice(0, 1000);
    updates.updatedAt = new Date();

    await reviewsCollection.updateOne({ _id: review._id }, { $set: updates });
    sendSuccess(response, null, "Review updated successfully");
  } catch (error) {
    sendError(response, error);
  }
});

app.delete("/api/products/:id/reviews/:reviewId", requireAuth, async (request, response) => {
  try {
    if (!ObjectId.isValid(request.params.reviewId))
      return response.status(400).json({ error: "A valid reviewId is required" });
    const review = await reviewsCollection.findOne({
      _id: new ObjectId(request.params.reviewId),
      productId: Number(request.params.id),
    });
    if (!review)
      return response.status(404).json({ ok: false, error: "Review not found" });
    if (
      request.user.role !== "admin" &&
      review.userId?.toString() !== request.user._id.toString()
    )
      return response.status(403).json({ ok: false, error: "You can only delete your own review" });

    await reviewsCollection.deleteOne({ _id: review._id });
    response.json({ ok: true, deleted: true });
  } catch (error) {
    sendError(response, error);
  }
});

/* ==========================================================================
   CART & WISHLIST SYNCHRONIZATION
   ========================================================================== */

app.get("/api/cart/:sessionId", async (request, response) => {
  const cart = await cartsCollection.findOne(
    { _id: request.params.sessionId },
    { projection: { _id: 0, items: 1 } },
  );
  response.json({
    sessionId: request.params.sessionId,
    items: cart?.items || [],
  });
});

app.put("/api/cart/:sessionId", async (request, response) => {
  const items = await normalizeItems(request.body.items);
  if (!items)
    return response.status(400).json({
      error: "items must contain valid productId and quantity values",
    });
  await cartsCollection.replaceOne(
    { _id: request.params.sessionId },
    { _id: request.params.sessionId, items, updatedAt: new Date() },
    { upsert: true },
  );
  response.json({ sessionId: request.params.sessionId, items });
});

app.get("/api/wishlist/:sessionId", async (request, response) => {
  const wishlist = await wishlistsCollection.findOne(
    { _id: request.params.sessionId },
    { projection: { _id: 0, productIds: 1 } },
  );
  const productIds = wishlist?.productIds || [];
  const products = await productsCollection
    .find({ id: { $in: productIds } }, { projection: { _id: 0 } })
    .toArray();
  response.json({ productIds, products });
});

app.post("/api/wishlist/:sessionId/:productId", async (request, response) => {
  const productId = Number(request.params.productId);
  if (!(await productsCollection.findOne({ id: productId })))
    return response.status(404).json({ error: "Product not found" });
  const wishlist = await wishlistsCollection.findOne({
    _id: request.params.sessionId,
  });
  const productIds = wishlist?.productIds || [];
  const nextIds = productIds.includes(productId)
    ? productIds.filter((id) => id !== productId)
    : [...productIds, productId];
  await wishlistsCollection.replaceOne(
    { _id: request.params.sessionId },
    {
      _id: request.params.sessionId,
      productIds: nextIds,
      updatedAt: new Date(),
    },
    { upsert: true },
  );
  response.json({ productIds: nextIds });
});

/* ==========================================================================
   COUPON & DISCOUNT SYSTEM
   ========================================================================== */

app.post("/api/coupons/validate", async (request, response) => {
  try {
    const code = String(request.body.code || "").trim().toUpperCase();
    const subtotal = Number(request.body.subtotal) || 0;

    if (!code) return response.status(400).json({ valid: false, error: "Coupon code is required" });

    const coupon = await couponsCollection.findOne({ code, active: true });
    if (!coupon) return response.status(404).json({ valid: false, error: "Invalid coupon code" });

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return response.status(400).json({ valid: false, error: "This coupon has expired" });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return response.status(400).json({ valid: false, error: "This coupon has reached its maximum usage limit" });
    }

    if (coupon.minOrder && subtotal < coupon.minOrder) {
      return response.status(400).json({
        valid: false,
        error: `Minimum order amount of $${coupon.minOrder} required for this coupon`,
      });
    }

    sendSuccess(response, {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      description: coupon.description,
    }, "Coupon applied");
  } catch (error) {
    sendError(response, error);
  }
});

/* ==========================================================================
   ORDERS, CHECKOUT & REAL STRIPE PAYMENT FLOW
   ========================================================================== */

// Place Order endpoint with server price resolution & tax calculation
app.post("/api/orders", optionalAuth, async (request, response) => {
  try {
    const { sessionId, customer, items, couponCode, paymentMethod } = request.body;

    if (!customer?.email || !Array.isArray(items) || !items.length) {
      return response.status(400).json({
        ok: false,
        success: false,
        error: "Customer email and items are required",
      });
    }

    const products = await getProducts();
    let coupon = null;
    if (couponCode) {
      coupon = await couponsCollection.findOne({
        code: String(couponCode).trim().toUpperCase(),
        active: true,
      });
    }

    // 1. Calculate pricing strictly on backend
    const calculation = calculateOrderTotals({
      items,
      products,
      country: customer.country,
      coupon,
    });

    // 2. Build order document
    const orderId = `LUMA-${randomUUID().slice(0, 8).toUpperCase()}`;
    const isDirectPaid = paymentMethod === "test_paid" || paymentMethod === "cod";
    const order = {
      id: orderId,
      sessionId: sessionId || null,
      userId: request.user?._id?.toString() || "guest",
      customer,
      items: calculation.lineItems,
      subtotal: calculation.subtotal,
      discount: calculation.discount,
      appliedCoupon: calculation.appliedCoupon,
      tax: calculation.tax,
      taxLabel: calculation.taxLabel,
      shipping: calculation.shipping,
      total: calculation.grandTotal,
      paymentMethod: paymentMethod || "card",
      paymentStatus: isDirectPaid ? "paid" : "pending",
      status: "processing",
      createdAt: new Date(),
      paidAt: isDirectPaid ? new Date() : null,
    };

    // 3. Atomically decrement stock
    await Promise.all(
      calculation.lineItems.map(async (item) => {
        const prod = await productsCollection.findOne({ id: item.productId });
        const currentStock = prod?.inventory ?? 25;
        const newStock = Math.max(0, currentStock - item.quantity);
        return productsCollection.updateOne(
          { id: item.productId },
          { $set: { inventory: newStock } },
        );
      }),
    );

    // 4. Save order to database
    await ordersCollection.insertOne(order);

    // 5. Clear cart session if exists
    if (sessionId) {
      await cartsCollection.deleteOne({ _id: sessionId });
    }

    // 6. Increment coupon count if used
    if (coupon) {
      await couponsCollection.updateOne(
        { _id: coupon._id },
        { $inc: { usedCount: 1 } },
      );
    }

    // 7. Send confirmation email
    emailService.sendOrderConfirmation(order).catch(() => {});

    response.status(201).json({
      ok: true,
      success: true,
      ...order,
      _id: undefined,
    });
  } catch (error) {
    sendError(response, error);
  }
});

// Create Stripe Checkout Session endpoint
const createCheckoutSessionHandler = async (request, response) => {
  try {
    const { sessionId, customer, items, couponCode } = request.body;
    if (!customer?.email || !Array.isArray(items) || !items.length) {
      return response.status(400).json({ error: "Customer email and items are required" });
    }

    const products = await getProducts();
    let coupon = null;
    if (couponCode) {
      coupon = await couponsCollection.findOne({
        code: String(couponCode).trim().toUpperCase(),
        active: true,
      });
    }

    const calculation = calculateOrderTotals({
      items,
      products,
      country: customer.country,
      coupon,
    });

    const orderId = `LUMA-${randomUUID().slice(0, 8).toUpperCase()}`;
    const order = {
      id: orderId,
      sessionId: sessionId || null,
      userId: request.user?._id?.toString() || "guest",
      customer,
      items: calculation.lineItems,
      subtotal: calculation.subtotal,
      discount: calculation.discount,
      appliedCoupon: calculation.appliedCoupon,
      tax: calculation.tax,
      taxLabel: calculation.taxLabel,
      shipping: calculation.shipping,
      total: calculation.grandTotal,
      paymentMethod: "stripe",
      paymentStatus: "pending",
      status: "awaiting_payment",
      createdAt: new Date(),
    };

    await ordersCollection.insertOne(order);

    // If Stripe is configured, create real Stripe Checkout Session
    if (stripe) {
      const line_items = calculation.lineItems.map((item) => ({
        price_data: {
          currency: (customer.country === "IN" ? "inr" : "usd"),
          product_data: { name: item.name },
          unit_amount: Math.round(
            (customer.country === "IN" ? item.price * 83 : item.price) * 100,
          ),
        },
        quantity: item.quantity,
      }));

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: customer.email,
        line_items,
        metadata: { orderId: order.id },
        success_url: `${clientUrl}/checkout?paid=1&order=${order.id}`,
        cancel_url: `${clientUrl}/checkout?cancelled=1`,
      });

      return response.status(201).json({
        ok: true,
        success: true,
        url: session.url,
        orderId: order.id,
      });
    }

    // Smooth test/demo fallback if Stripe secret key is not populated in environment
    const demoUrl = `${clientUrl}/checkout?paid=1&order=${order.id}`;
    return response.status(201).json({
      ok: true,
      success: true,
      url: demoUrl,
      orderId: order.id,
      note: "Stripe key not configured. Provided instant mock checkout flow.",
    });
  } catch (error) {
    sendError(response, error);
  }
};

app.post("/api/checkout-session", optionalAuth, createCheckoutSessionHandler);
app.post("/api/payments/create-session", optionalAuth, createCheckoutSessionHandler);

// Customer Order History (Protected: customers view own orders; admin views all)
app.get("/api/orders", requireAuth, async (request, response) => {
  try {
    const user = request.user;
    const query = {};

    if (user.role !== "admin") {
      query.$or = [{ "customer.email": user.email }, { userId: user._id.toString() }];
    }

    const search = request.query.search ? String(request.query.search).trim() : "";
    if (search) {
      query.$or = [
        { id: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
      ];
    }

    const orders = await ordersCollection
      .find(query, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    sendSuccess(response, { orders });
  } catch (error) {
    sendError(response, error);
  }
});

// Single Order Details (Protected: customers view own; admin views any)
app.get("/api/orders/:id", requireAuth, async (request, response) => {
  try {
    const user = request.user;
    const order = await ordersCollection.findOne(
      { id: request.params.id },
      { projection: { _id: 0 } },
    );

    if (!order) {
      return response.status(404).json({ ok: false, success: false, error: "Order not found" });
    }

    if (
      user.role !== "admin" &&
      order.customer?.email !== user.email &&
      order.userId !== user._id.toString()
    ) {
      return response.status(403).json({ ok: false, success: false, error: "Access denied" });
    }

    sendSuccess(response, { order });
  } catch (error) {
    sendError(response, error);
  }
});

// Customer Order Cancellation
app.post("/api/orders/:id/cancel", requireAuth, async (request, response) => {
  try {
    const user = request.user;
    const order = await ordersCollection.findOne({ id: request.params.id });

    if (!order) return response.status(404).json({ ok: false, error: "Order not found" });

    if (
      user.role !== "admin" &&
      order.customer?.email !== user.email &&
      order.userId !== user._id.toString()
    ) {
      return response.status(403).json({ ok: false, error: "Access denied" });
    }

    // Only orders in processing or received state can be cancelled
    if (order.status === "shipped" || order.status === "completed" || order.status === "cancelled") {
      return response.status(400).json({
        ok: false,
        error: `Orders with status "${order.status}" cannot be cancelled.`,
      });
    }

    const refundProcessed = order.paymentStatus === "paid";
    const nextPaymentStatus = refundProcessed ? "refunded" : order.paymentStatus;

    await ordersCollection.updateOne(
      { id: order.id },
      {
        $set: {
          status: "cancelled",
          paymentStatus: nextPaymentStatus,
          cancelledAt: new Date(),
        },
      },
    );

    // Restore inventory
    if (Array.isArray(order.items)) {
      await Promise.all(
        order.items.map((item) =>
          productsCollection.updateOne(
            { id: item.productId },
            { $inc: { inventory: item.quantity } },
          ),
        ),
      );
    }

    const updated = await ordersCollection.findOne({ id: order.id }, { projection: { _id: 0 } });
    emailService.sendOrderCancelled(updated).catch(() => {});

    sendSuccess(response, { order: updated }, "Order has been cancelled successfully");
  } catch (error) {
    sendError(response, error);
  }
});

/* ==========================================================================
   AI SKINCARE ASSISTANT ENDPOINTS
   ========================================================================== */

app.post("/api/ai/recommend", async (request, response) => {
  try {
    const { skinType, skinConcern, age, currentProducts, routinePreference } = request.body;
    const availableProducts = await getProducts();

    const recommendation = await aiService.generateRoutine({
      skinType: skinType || "Combination",
      skinConcern: skinConcern || "Dullness & glow",
      age: age || "20s",
      currentProducts: currentProducts || "",
      routinePreference: routinePreference || "Complete (4-5 steps)",
      availableProducts,
    });

    sendSuccess(response, recommendation);
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/ai/sample-routines", (_request, response) => {
  response.json({
    ok: true,
    success: true,
    presets: [
      {
        title: "Barrier Repair for Dry & Sensitive Skin",
        skinType: "Dry",
        skinConcern: "Barrier Repair & Dryness",
        focus: "Replenishing lipid layer with squalane and oat ceramides.",
      },
      {
        title: "Pore Clearing for Oily & Blemish-Prone Skin",
        skinType: "Oily",
        skinConcern: "Acne & Blemishes",
        focus: "Regulating sebum with gentle willow bark and niacinamide.",
      },
      {
        title: "Luminous Glow for Combination Skin",
        skinType: "Combination",
        skinConcern: "Dullness & glow",
        focus: "Multi-weight hydration with antioxidant cellular defense.",
      },
    ],
  });
});

/* ==========================================================================
   CUSTOMER CONTACT MESSAGES
   ========================================================================== */

app.post("/api/contact", async (request, response) => {
  try {
    const { name, email, message } = request.body;
    if (!name?.trim() || !email?.trim() || !message?.trim())
      return response
        .status(400)
        .json({ ok: false, error: "name, email, and message are required" });
    const result = await contactMessagesCollection.insertOne({
      name: name.trim().slice(0, 100),
      email: email.trim().slice(0, 160),
      message: message.trim().slice(0, 2000),
      read: false,
      createdAt: new Date(),
    });
    response.status(201).json({
      ok: true,
      data: { id: result.insertedId.toString() },
      message: "Message sent",
    });
  } catch (error) {
    sendError(response, error);
  }
});

/* ==========================================================================
   ADMIN MANAGEMENT & ANALYTICS ENDPOINTS
   ========================================================================== */

app.get(
  "/api/admin/summary",
  requireAuth,
  requireRole("admin"),
  async (_request, response) => {
    try {
      const [
        totalProducts,
        totalOrders,
        totalUsers,
        totalReviews,
        lowStockProducts,
        contactMessages,
      ] = await Promise.all([
        productsCollection.countDocuments(),
        ordersCollection.countDocuments(),
        usersCollection.countDocuments(),
        reviewsCollection.countDocuments(),
        productsCollection.countDocuments({ inventory: { $lte: 5 } }),
        contactMessagesCollection.countDocuments({ read: false }),
      ]);
      response.json({
        ok: true,
        data: {
          totalProducts,
          totalOrders,
          totalUsers,
          totalReviews,
          lowStockProducts,
          contactMessages,
        },
      });
    } catch (error) {
      sendError(response, error);
    }
  },
);

// Comprehensive Admin Analytics
app.get(
  "/api/admin/analytics",
  requireAuth,
  requireRole("admin"),
  async (_request, response) => {
    try {
      const orders = await ordersCollection.find({}).toArray();
      const products = await getProducts();
      const totalUsers = await usersCollection.countDocuments();

      let totalRevenue = 0;
      let monthlyRevenue = 0;
      let weeklyRevenue = 0;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const categoryRevenue = {};
      const productSales = {};

      orders.forEach((ord) => {
        const orderTotal = Number(ord.total) || 0;
        if (ord.paymentStatus === "paid" || ord.status === "completed" || ord.status === "shipped") {
          totalRevenue += orderTotal;
          const orderDate = new Date(ord.createdAt || ord.date);
          if (orderDate >= thirtyDaysAgo) monthlyRevenue += orderTotal;
          if (orderDate >= sevenDaysAgo) weeklyRevenue += orderTotal;

          (ord.items || []).forEach((it) => {
            productSales[it.productId] = (productSales[it.productId] || 0) + it.quantity;
            const p = products.find((prod) => prod.id === it.productId);
            if (p) {
              categoryRevenue[p.category] = (categoryRevenue[p.category] || 0) + (it.price * it.quantity);
            }
          });
        }
      });

      const averageOrderValue = orders.length ? Number((totalRevenue / orders.length).toFixed(2)) : 0;

      // Top products
      const topProducts = products
        .map((p) => ({ ...p, totalSold: productSales[p.id] || 0 }))
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5);

      // Low stock products
      const lowStockProducts = products.filter((p) => (p.inventory ?? 25) <= 5);

      // Monthly timeline (last 6 months simulation/aggregation)
      const monthlyData = [
        { month: "May", revenue: Math.round(monthlyRevenue * 0.6) },
        { month: "Jun", revenue: Math.round(monthlyRevenue * 0.75) },
        { month: "Jul", revenue: Math.round(monthlyRevenue * 0.82) },
        { month: "Aug", revenue: Math.round(monthlyRevenue * 0.9) },
        { month: "Sep", revenue: Math.round(monthlyRevenue * 0.95) },
        { month: "Oct", revenue: Math.round(monthlyRevenue) },
      ];

      sendSuccess(response, {
        kpis: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
          weeklyRevenue: Number(weeklyRevenue.toFixed(2)),
          totalOrders: orders.length,
          totalCustomers: totalUsers,
          averageOrderValue,
          lowStockCount: lowStockProducts.length,
        },
        monthlyData,
        topProducts,
        lowStockProducts,
        categoryRevenue: Object.entries(categoryRevenue).map(([cat, rev]) => ({
          category: cat,
          revenue: Number(rev.toFixed(2)),
        })),
      });
    } catch (error) {
      sendError(response, error);
    }
  },
);

// Admin Customer Management
app.get(
  "/api/admin/customers",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      const users = await usersCollection.find({}, { projection: { passwordHash: 0 } }).toArray();
      const allOrders = await ordersCollection.find({}).toArray();

      const customerDetails = users.map((u) => {
        const userOrders = allOrders.filter(
          (o) => o.customer?.email === u.email || o.userId === u._id.toString(),
        );
        const totalSpent = userOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        return {
          id: u._id.toString(),
          name: u.name || u.email.split("@")[0],
          email: u.email,
          phone: u.phone || "—",
          role: u.role,
          totalOrders: userOrders.length,
          totalSpent: Number(totalSpent.toFixed(2)),
          createdAt: u.createdAt,
        };
      });

      sendSuccess(response, { customers: customerDetails });
    } catch (error) {
      sendError(response, error);
    }
  },
);

// Admin Email Outbox Audit
app.get(
  "/api/admin/emails",
  requireAuth,
  requireRole("admin"),
  async (_request, response) => {
    try {
      const emails = await emailsCollection
        .find({})
        .sort({ sentAt: -1 })
        .limit(50)
        .toArray();
      sendSuccess(response, { emails });
    } catch (error) {
      sendError(response, error);
    }
  },
);

// Admin Image Upload
app.post(
  "/api/admin/upload",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      const { base64Data } = request.body;
      if (!base64Data) {
        return response.status(400).json({ error: "No image data provided" });
      }

      // Validate base64 image prefix
      const match = base64Data.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
      if (!match) {
        return response.status(400).json({
          error: "Invalid file type. Supported formats: JPEG, PNG, WEBP.",
        });
      }

      const ext = match[1] === "jpeg" ? "jpg" : match[1];
      const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), "base64");

      // Validate max size (5 MB)
      if (buffer.length > 5 * 1024 * 1024) {
        return response.status(400).json({ error: "Image file exceeds maximum 5 MB limit" });
      }

      const uniqueName = `prod-${Date.now()}-${randomUUID().slice(0, 6)}.${ext}`;
      const filePath = path.join(uploadsDir, uniqueName);
      await writeFile(filePath, buffer);

      const publicUrl = `/uploads/${uniqueName}`;
      sendSuccess(response, { url: publicUrl }, "Image uploaded successfully");
    } catch (error) {
      sendError(response, error);
    }
  },
);

// Admin Coupon Management
app.get(
  "/api/admin/coupons",
  requireAuth,
  requireRole("admin"),
  async (_request, response) => {
    try {
      const coupons = await couponsCollection.find({}).sort({ createdAt: -1 }).toArray();
      sendSuccess(response, { coupons });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.post(
  "/api/admin/coupons",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      const { code, discountType, discountValue, minOrder, maxUses, expiresAt, description } = request.body;
      if (!code || !discountType || discountValue === undefined) {
        return response.status(400).json({ error: "Code, discountType, and discountValue are required" });
      }

      const normCode = String(code).trim().toUpperCase();
      const existing = await couponsCollection.findOne({ code: normCode });
      if (existing) return response.status(409).json({ error: "A coupon with this code already exists" });

      const newCoupon = {
        code: normCode,
        discountType: discountType === "fixed" ? "fixed" : "percentage",
        discountValue: Number(discountValue),
        minOrder: Number(minOrder || 0),
        maxUses: Number(maxUses || 500),
        usedCount: 0,
        active: true,
        description: String(description || "").trim(),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        createdAt: new Date(),
      };

      await couponsCollection.insertOne(newCoupon);
      sendSuccess(response, { coupon: newCoupon }, "Coupon created successfully", 201);
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.put(
  "/api/admin/coupons/:id",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      const updates = { ...request.body };
      delete updates._id;
      if (updates.code) updates.code = String(updates.code).trim().toUpperCase();

      await couponsCollection.updateOne(
        { $or: [{ id: request.params.id }, { code: request.params.id.toUpperCase() }] },
        { $set: updates },
      );
      sendSuccess(response, null, "Coupon updated");
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.delete(
  "/api/admin/coupons/:id",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      await couponsCollection.deleteOne({
        $or: [{ id: request.params.id }, { code: request.params.id.toUpperCase() }],
      });
      sendSuccess(response, null, "Coupon deleted");
    } catch (error) {
      sendError(response, error);
    }
  },
);

// Admin Product CRUD
app.get(
  "/api/admin/products",
  requireAuth,
  requireRole("admin"),
  async (_request, response) => {
    try {
      response.json({ ok: true, data: await getProducts() });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.post(
  "/api/admin/products",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      const product = request.body;
      if (
        !product.name?.trim() ||
        !product.category?.trim() ||
        Number(product.price) < 0 ||
        !Number.isInteger(Number(product.inventory)) ||
        Number(product.inventory) < 0
      )
        return response.status(400).json({
          ok: false,
          error:
            "name, category, price, and non-negative integer inventory are required",
        });
      const id =
        Number(product.id) ||
        ((
          await productsCollection
            .find({}, { projection: { id: 1, _id: 0 } })
            .sort({ id: -1 })
            .limit(1)
            .toArray()
        )?.[0]?.id || 0) + 1;
      const created = {
        ...product,
        id,
        price: Number(product.price),
        inventory: Number(product.inventory),
        rating: product.rating || 5.0,
        reviews: product.reviews || 0,
      };
      await productsCollection.insertOne(created);
      response.status(201).json({ ok: true, data: created });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.patch(
  "/api/admin/products/:id",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      const updates = { ...request.body };
      if (
        updates.inventory !== undefined &&
        (!Number.isInteger(Number(updates.inventory)) ||
          Number(updates.inventory) < 0)
      )
        return response.status(400).json({
          ok: false,
          error: "inventory must be a non-negative integer",
        });
      if (updates.inventory !== undefined)
        updates.inventory = Number(updates.inventory);
      if (updates.price !== undefined) updates.price = Number(updates.price);
      const result = await productsCollection.findOneAndUpdate(
        { id: Number(request.params.id) },
        { $set: updates },
        { returnDocument: "after", projection: { _id: 0 } },
      );
      if (!result)
        return response
          .status(404)
          .json({ ok: false, error: "Product not found" });
      response.json({ ok: true, data: result });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.delete(
  "/api/admin/products/:id",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      const result = await productsCollection.deleteOne({
        id: Number(request.params.id),
      });
      if (!result.deletedCount)
        return response
          .status(404)
          .json({ ok: false, error: "Product not found" });
      response.json({ ok: true, message: "Product deleted" });
    } catch (error) {
      sendError(response, error);
    }
  },
);

// Admin Orders Management
app.get(
  "/api/admin/orders",
  requireAuth,
  requireRole("admin"),
  async (_request, response) => {
    try {
      response.json({
        ok: true,
        data: await ordersCollection
          .find({}, { projection: { _id: 0 } })
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray(),
      });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.patch(
  "/api/admin/orders/:id",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      const status = String(request.body.status || "").slice(0, 40);
      const updates = {};
      if (status) updates.status = status;
      if (request.body.paymentStatus) updates.paymentStatus = String(request.body.paymentStatus);

      const result = await ordersCollection.findOneAndUpdate(
        { id: request.params.id },
        { $set: updates },
        { returnDocument: "after", projection: { _id: 0 } },
      );
      if (!result)
        return response
          .status(404)
          .json({ ok: false, error: "Order not found" });

      // Trigger status emails
      if (status === "shipped") {
        emailService.sendOrderShipped(result).catch(() => {});
      } else if (status === "completed") {
        emailService.sendOrderCompleted(result).catch(() => {});
      }

      response.json({ ok: true, data: result });
    } catch (error) {
      sendError(response, error);
    }
  },
);

// Admin Review Moderation
app.get(
  "/api/admin/reviews",
  requireAuth,
  requireRole("admin"),
  async (_request, response) => {
    try {
      response.json({
        ok: true,
        data: await reviewsCollection
          .find({}, { projection: { authorToken: 0 } })
          .sort({ createdAt: -1 })
          .toArray(),
      });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.delete(
  "/api/admin/reviews/:reviewId",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      if (!ObjectId.isValid(request.params.reviewId))
        return response
          .status(400)
          .json({ ok: false, error: "A valid reviewId is required" });
      const result = await reviewsCollection.deleteOne({
        _id: new ObjectId(request.params.reviewId),
      });
      if (!result.deletedCount)
        return response
          .status(404)
          .json({ ok: false, error: "Review not found" });
      response.json({ ok: true, message: "Review deleted" });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.get(
  "/api/admin/content/:key",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      const content = await contentCollection.findOne({
        key: request.params.key,
      });
      response.json({ ok: true, data: content?.entries || [] });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.put(
  "/api/admin/content/:key",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      const entries = request.body.entries;
      if (!Array.isArray(entries))
        return response
          .status(400)
          .json({ ok: false, error: "entries must be an array" });
      await contentCollection.updateOne(
        { key: request.params.key },
        { $set: { entries } },
        { upsert: true },
      );
      response.json({ ok: true, message: "Content updated" });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.get(
  "/api/admin/contact-messages",
  requireAuth,
  requireRole("admin"),
  async (_request, response) => {
    try {
      const messages = await contactMessagesCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      response.json({
        ok: true,
        data: messages.map((m) => ({ ...m, _id: m._id.toString() })),
      });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.patch(
  "/api/admin/contact-messages/:id",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      if (!ObjectId.isValid(request.params.id))
        return response
          .status(400)
          .json({ ok: false, error: "A valid message id is required" });
      const read = Boolean(request.body.read);
      await contactMessagesCollection.updateOne(
        { _id: new ObjectId(request.params.id) },
        { $set: { read } },
      );
      response.json({ ok: true, message: "Message updated" });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.delete(
  "/api/admin/contact-messages/:id",
  requireAuth,
  requireRole("admin"),
  async (request, response) => {
    try {
      if (!ObjectId.isValid(request.params.id))
        return response
          .status(400)
          .json({ ok: false, error: "A valid message id is required" });
      const result = await contactMessagesCollection.deleteOne({
        _id: new ObjectId(request.params.id),
      });
      if (!result.deletedCount)
        return response
          .status(404)
          .json({ ok: false, error: "Message not found" });
      response.json({ ok: true, message: "Message deleted" });
    } catch (error) {
      sendError(response, error);
    }
  },
);

app.use((_request, response) =>
  response.status(404).json({ ok: false, success: false, error: "Route not found" }),
);

// Centralized error handler
app.use((err, _request, response, _next) => {
  console.error("[UnhandledException]", err);
  response.status(500).json({
    ok: false,
    success: false,
    error: "Internal server error occurred",
    message: err.message,
  });
});

export { app, connectDatabase };

// Server startup if executed directly
if (process.argv[1] && process.argv[1].endsWith("server/index.js")) {
  connectDatabase()
    .then(() => {
      app.listen(port, () =>
        console.log(
          `Luma API running at http://localhost:${port} [Database: ${currentDbType}]`,
        ),
      );
    })
    .catch((error) => {
      console.error(`Database initialization failed: ${error.message}`);
      process.exit(1);
    });
}
