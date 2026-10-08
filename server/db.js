import { MongoClient, ObjectId } from "mongodb";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

class JSONCollection {
  constructor(name, getDocs, saveFn) {
    this.name = name;
    this.getDocs = getDocs;
    this.saveFn = saveFn;
  }

  _match(doc, query) {
    if (!query || typeof query !== "object") return true;
    if (query.$or && Array.isArray(query.$or)) {
      if (!query.$or.some((subQ) => this._match(doc, subQ))) return false;
    }
    for (const [key, val] of Object.entries(query)) {
      if (key === "$or") continue;
      if (key === "_id") {
        if (!doc._id) return false;
        if (doc._id.toString() !== val?.toString()) return false;
        continue;
      }
      if (val && typeof val === "object" && !(val instanceof RegExp)) {
        if ("$lte" in val && doc[key] > val.$lte) return false;
        if ("$lt" in val && doc[key] >= val.$lt) return false;
        if ("$gte" in val && doc[key] < val.$gte) return false;
        if ("$gt" in val && doc[key] <= val.$gt) return false;
        if ("$in" in val && (!Array.isArray(val.$in) || !val.$in.includes(doc[key]))) return false;
        if ("$nin" in val && Array.isArray(val.$nin) && val.$nin.includes(doc[key])) return false;
        if ("$ne" in val && doc[key] === val.$ne) return false;
        if ("$exists" in val) {
          const exists = doc[key] !== undefined;
          if (exists !== Boolean(val.$exists)) return false;
        }
        if ("$regex" in val) {
          const reg = new RegExp(val.$regex, val.$options || "i");
          if (!reg.test(String(doc[key] ?? ""))) return false;
        }
        continue;
      }
      if (val instanceof RegExp) {
        if (!val.test(String(doc[key] ?? ""))) return false;
        continue;
      }
      if (doc[key] !== val) return false;
    }
    return true;
  }

  find(query = {}) {
    const docs = this.getDocs();
    let matches = docs.filter((d) => this._match(d, query));
    let skipCount = 0;
    let limitCount = Infinity;

    const cursor = {
      sort: (sortObj) => {
        const [field, order] = Object.entries(sortObj)[0] || [];
        if (field) {
          matches.sort((a, b) => {
            if (a[field] < b[field]) return order === 1 ? -1 : 1;
            if (a[field] > b[field]) return order === 1 ? 1 : -1;
            return 0;
          });
        }
        return cursor;
      },
      skip: (n) => {
        skipCount = Number(n) || 0;
        return cursor;
      },
      limit: (n) => {
        limitCount = Number(n) || Infinity;
        return cursor;
      },
      count: async () => matches.length,
      toArray: async () => matches.slice(skipCount, skipCount + limitCount).map((m) => ({ ...m })),
    };
    return cursor;
  }

  async findOne(query = {}) {
    const docs = this.getDocs();
    const found = docs.find((d) => this._match(d, query));
    return found ? { ...found } : null;
  }

  async insertOne(doc) {
    const docs = this.getDocs();
    const toInsert = {
      ...doc,
      _id: doc._id || new ObjectId().toString(),
    };
    docs.push(toInsert);
    await this.saveFn();
    return { insertedId: toInsert._id, acknowledged: true };
  }

  async insertMany(docArray) {
    const docs = this.getDocs();
    for (const doc of docArray) {
      docs.push({
        ...doc,
        _id: doc._id || new ObjectId().toString(),
      });
    }
    await this.saveFn();
    return { acknowledged: true, insertedCount: docArray.length };
  }

  async updateOne(query, update, options = {}) {
    const docs = this.getDocs();
    const index = docs.findIndex((d) => this._match(d, query));
    if (index === -1) {
      if (options.upsert) {
        const newDoc = {
          _id: new ObjectId().toString(),
          ...query,
          ...(update.$setOnInsert || {}),
          ...(update.$set || {}),
        };
        docs.push(newDoc);
        await this.saveFn();
        return { modifiedCount: 0, upsertedCount: 1, upsertedId: newDoc._id };
      }
      return { modifiedCount: 0 };
    }

    const doc = docs[index];
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    if (update.$inc) {
      for (const [key, amt] of Object.entries(update.$inc)) {
        doc[key] = (doc[key] || 0) + amt;
      }
    }
    await this.saveFn();
    return { modifiedCount: 1 };
  }

  async replaceOne(query, replacement, options = {}) {
    const docs = this.getDocs();
    const index = docs.findIndex((d) => this._match(d, query));
    if (index === -1) {
      if (options.upsert) {
        const newDoc = {
          _id: replacement._id || query._id || new ObjectId().toString(),
          ...replacement,
        };
        docs.push(newDoc);
        await this.saveFn();
        return { modifiedCount: 0, upsertedCount: 1, upsertedId: newDoc._id };
      }
      return { modifiedCount: 0 };
    }

    const originalId = docs[index]._id;
    docs[index] = { ...replacement, _id: originalId };
    await this.saveFn();
    return { modifiedCount: 1 };
  }

  async findOneAndUpdate(query, update, options = {}) {
    const docs = this.getDocs();
    const index = docs.findIndex((d) => this._match(d, query));
    if (index === -1) {
      if (options.upsert) {
        const newDoc = {
          _id: new ObjectId().toString(),
          ...query,
          ...(update.$setOnInsert || {}),
          ...(update.$set || {}),
        };
        docs.push(newDoc);
        await this.saveFn();
        return { ...newDoc };
      }
      return null;
    }

    const doc = docs[index];
    const before = { ...doc };
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    if (update.$inc) {
      for (const [key, amt] of Object.entries(update.$inc)) {
        doc[key] = (doc[key] || 0) + amt;
      }
    }
    await this.saveFn();
    return options.returnDocument === "before" ? before : { ...doc };
  }

  async deleteOne(query) {
    const docs = this.getDocs();
    const index = docs.findIndex((d) => this._match(d, query));
    if (index === -1) return { deletedCount: 0 };
    docs.splice(index, 1);
    await this.saveFn();
    return { deletedCount: 1 };
  }

  async deleteMany(query) {
    const docs = this.getDocs();
    let count = 0;
    for (let i = docs.length - 1; i >= 0; i--) {
      if (this._match(docs[i], query)) {
        docs.splice(i, 1);
        count++;
      }
    }
    if (count > 0) await this.saveFn();
    return { deletedCount: count };
  }

  async countDocuments(query = {}) {
    const docs = this.getDocs();
    if (!Object.keys(query).length) return docs.length;
    return docs.filter((d) => this._match(d, query)).length;
  }

  async createIndex() {
    return "index_ok";
  }
}

export async function initDatabase({
  mongoUri,
  databaseName = "luma_store",
  storePath,
  adminEmail,
  adminPassword,
  hashPassword,
}) {
  let collections = {};

  // Try MongoDB Atlas / Native connection if URI provided
  if (mongoUri) {
    try {
      const client = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 2500,
        connectTimeoutMS: 2500,
      });
      await client.connect();
      const database = client.db(databaseName);
      console.log(`[DB] Connected to MongoDB Atlas: ${databaseName}`);

      collections = {
        productsCollection: database.collection("products"),
        cartsCollection: database.collection("carts"),
        wishlistsCollection: database.collection("wishlists"),
        ordersCollection: database.collection("orders"),
        reviewsCollection: database.collection("reviews"),
        contentCollection: database.collection("content"),
        usersCollection: database.collection("users"),
        contactMessagesCollection: database.collection("contactMessages"),
        couponsCollection: database.collection("coupons"),
        addressesCollection: database.collection("addresses"),
        passwordResetsCollection: database.collection("passwordResets"),
        emailsCollection: database.collection("emails"),
      };

      // Seed admin user
      if (
        adminEmail &&
        adminPassword &&
        !(await collections.usersCollection.findOne({
          email: adminEmail.toLowerCase(),
        }))
      ) {
        await collections.usersCollection.insertOne({
          email: adminEmail.toLowerCase(),
          passwordHash: await hashPassword(adminPassword),
          role: "admin",
          createdAt: new Date(),
        });
      }

      // Seed demo admin (admin@luma.skin)
      if (
        !(await collections.usersCollection.findOne({
          email: "admin@luma.skin",
        }))
      ) {
        await collections.usersCollection.insertOne({
          email: "admin@luma.skin",
          passwordHash: await hashPassword("admin123"),
          role: "admin",
          name: "Luma Admin",
          createdAt: new Date(),
        });
      }

      // Seed demo customer (alia@luma.skin)
      if (
        !(await collections.usersCollection.findOne({
          email: "alia@luma.skin",
        }))
      ) {
        await collections.usersCollection.insertOne({
          email: "alia@luma.skin",
          passwordHash: await hashPassword("password123"),
          role: "customer",
          name: "Alia Stone",
          phone: "+1 (555) 349-2810",
          createdAt: new Date(),
        });
      }

      await seedStoreData(collections);

      return { collections, dbType: "mongodb" };
    } catch (err) {
      console.warn(
        `[DB] MongoDB Atlas connection unreachable (${err.message}). Using local JSON storage fallback.`,
      );
    }
  }

  // Fallback: Local JSON Store
  let store = {
    products: [],
    carts: [],
    wishlists: [],
    orders: [],
    reviews: [],
    users: [],
    contactMessages: [],
    content: [],
    coupons: [],
    addresses: [],
    passwordResets: [],
    emails: [],
  };

  if (existsSync(storePath)) {
    try {
      const raw = await readFile(storePath, "utf8");
      store = { ...store, ...JSON.parse(raw) };
    } catch (err) {
      console.error("[DB] Could not parse existing store file:", err);
    }
  }

  // Ensure default sub-arrays exist
  for (const key of [
    "products",
    "carts",
    "wishlists",
    "orders",
    "reviews",
    "users",
    "contactMessages",
    "content",
    "coupons",
    "addresses",
    "passwordResets",
    "emails",
  ]) {
    if (!Array.isArray(store[key])) store[key] = [];
  }

  let saveTimer = null;
  const saveFn = async () => {
    if (saveTimer) clearTimeout(saveTimer);
    return new Promise((resolve) => {
      saveTimer = setTimeout(async () => {
        try {
          await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
        } catch (e) {
          console.error("[DB] Error saving JSON store:", e);
        }
        resolve();
      }, 50);
    });
  };

  collections = {
    productsCollection: new JSONCollection("products", () => store.products, saveFn),
    cartsCollection: new JSONCollection("carts", () => store.carts, saveFn),
    wishlistsCollection: new JSONCollection("wishlists", () => store.wishlists, saveFn),
    ordersCollection: new JSONCollection("orders", () => store.orders, saveFn),
    reviewsCollection: new JSONCollection("reviews", () => store.reviews, saveFn),
    contentCollection: new JSONCollection("content", () => store.content, saveFn),
    usersCollection: new JSONCollection("users", () => store.users, saveFn),
    contactMessagesCollection: new JSONCollection(
      "contactMessages",
      () => store.contactMessages,
      saveFn,
    ),
    couponsCollection: new JSONCollection("coupons", () => store.coupons, saveFn),
    addressesCollection: new JSONCollection("addresses", () => store.addresses, saveFn),
    passwordResetsCollection: new JSONCollection(
      "passwordResets",
      () => store.passwordResets,
      saveFn,
    ),
    emailsCollection: new JSONCollection("emails", () => store.emails, saveFn),
  };

  // Ensure admin user exists
  const adminEmailNorm = (adminEmail || "admin@luma.skin").toLowerCase();
  const existingAdmin = await collections.usersCollection.findOne({
    email: adminEmailNorm,
  });
  if (!existingAdmin) {
    await collections.usersCollection.insertOne({
      email: adminEmailNorm,
      passwordHash: await hashPassword(adminPassword || "admin123"),
      role: "admin",
      createdAt: new Date(),
    });
  }

  // Ensure customer demo user exists
  const custEmailNorm = "alia@luma.skin";
  const existingCust = await collections.usersCollection.findOne({
    email: custEmailNorm,
  });
  if (!existingCust) {
    await collections.usersCollection.insertOne({
      email: custEmailNorm,
      passwordHash: await hashPassword("password123"),
      role: "customer",
      name: "Alia Stone",
      phone: "+1 (555) 349-2810",
      createdAt: new Date(),
    });
  }

  await seedStoreData(collections);

  console.log(`[DB] Local JSON database initialized from ${storePath}`);
  return { collections, dbType: "local_json" };
}

async function seedStoreData(collections) {
  // Seed initial coupons
  const defaultCoupons = [
    {
      code: "LUMA10",
      discountType: "percentage",
      discountValue: 10,
      minOrder: 0,
      maxUses: 500,
      usedCount: 0,
      active: true,
      description: "10% off your entire botanical order",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      code: "LUMA20",
      discountType: "percentage",
      discountValue: 20,
      minOrder: 50,
      maxUses: 200,
      usedCount: 0,
      active: true,
      description: "20% off orders over $50",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      code: "WELCOME5",
      discountType: "fixed",
      discountValue: 5,
      minOrder: 25,
      maxUses: 1000,
      usedCount: 0,
      active: true,
      description: "Flat $5 / ₹400 off your welcome ritual",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const coup of defaultCoupons) {
    const existing = await collections.couponsCollection.findOne({ code: coup.code });
    if (!existing) {
      await collections.couponsCollection.insertOne({
        ...coup,
        createdAt: new Date(),
      });
    }
  }

  // Seed demo addresses for alia@luma.skin
  const demoAddresses = [
    {
      id: "addr-home-1",
      userEmail: "alia@luma.skin",
      tag: "Home",
      fullName: "Alia Stone",
      phone: "+1 (555) 349-2810",
      address: "742 Evergreen Terrace",
      city: "San Francisco",
      state: "CA",
      postalCode: "94102",
      country: "US",
      isDefault: true,
      createdAt: new Date(),
    },
    {
      id: "addr-office-2",
      userEmail: "alia@luma.skin",
      tag: "Studio",
      fullName: "Alia Stone",
      phone: "+1 (555) 349-2810",
      address: "100 Botanical Way, Suite 4B",
      city: "San Francisco",
      state: "CA",
      postalCode: "94107",
      country: "US",
      isDefault: false,
      createdAt: new Date(),
    },
  ];

  for (const addr of demoAddresses) {
    const existing = await collections.addressesCollection.findOne({ id: addr.id });
    if (!existing) {
      await collections.addressesCollection.insertOne(addr);
    }
  }
}
