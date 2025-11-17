-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Users
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "password" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "sessionToken" TEXT NOT NULL UNIQUE,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Stores
CREATE TABLE IF NOT EXISTS "stores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "logo" TEXT,
    "banner" TEXT,
    "slogan" TEXT,
    "about" TEXT,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "onboardingCompleted" INTEGER NOT NULL DEFAULT 0,
    "onboardingData" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("ownerId") REFERENCES "users"("id")
);

-- Store Settings
CREATE TABLE IF NOT EXISTS "store_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL UNIQUE,
    "showOutOfStock" INTEGER NOT NULL DEFAULT 0,
    "productOrder" TEXT NOT NULL DEFAULT 'alphabetical',
    "ageRestriction" INTEGER NOT NULL DEFAULT 0,
    "shippingType" TEXT NOT NULL DEFAULT 'free',
    "shippingValue" REAL NOT NULL DEFAULT 0,
    "freeShippingAbove" REAL,
    "paymentMethods" TEXT NOT NULL DEFAULT '[]',
    "qrCodeColors" TEXT,
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE
);

-- Categories
CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE,
    UNIQUE ("storeId", "name")
);

-- Products
CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "price" REAL NOT NULL,
    "comparePrice" REAL,
    "cost" REAL,
    "images" TEXT NOT NULL DEFAULT '[]',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "trackStock" INTEGER NOT NULL DEFAULT 1,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "isFeatured" INTEGER NOT NULL DEFAULT 0,
    "slug" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "aiGenerated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE,
    FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL,
    UNIQUE ("storeId", "slug")
);

-- Customers
CREATE TABLE IF NOT EXISTS "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "cpf" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "birthDate" DATETIME,
    "specialDates" TEXT NOT NULL DEFAULT '[]',
    "buyingBehavior" TEXT,
    "preferences" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE,
    UNIQUE ("storeId", "email"),
    UNIQUE ("storeId", "phone")
);

-- Salespeople
CREATE TABLE IF NOT EXISTS "salespeople" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "catalogUrl" TEXT UNIQUE,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE,
    UNIQUE ("storeId", "email")
);

-- Orders
CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salespersonId" TEXT,
    "code" TEXT NOT NULL UNIQUE,
    "subtotal" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "shipping" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "couponId" TEXT,
    "couponCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "shippingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "shippingMethod" TEXT,
    "trackingCode" TEXT,
    "notes" TEXT,
    "customerNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE,
    FOREIGN KEY ("customerId") REFERENCES "customers"("id"),
    FOREIGN KEY ("salespersonId") REFERENCES "salespeople"("id"),
    FOREIGN KEY ("couponId") REFERENCES "coupons"("id")
);

-- Order Items
CREATE TABLE IF NOT EXISTS "order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "price" REAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" REAL NOT NULL,
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
    FOREIGN KEY ("productId") REFERENCES "products"("id")
);

-- Promotions
CREATE TABLE IF NOT EXISTS "promotions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" REAL NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'SITEWIDE',
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE
);

-- Promotion Products (junction table)
CREATE TABLE IF NOT EXISTS "promotion_products" (
    "promotionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    PRIMARY KEY ("promotionId", "productId"),
    FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE,
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
);

-- Coupons
CREATE TABLE IF NOT EXISTS "coupons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" REAL NOT NULL,
    "minPurchase" REAL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "perCustomer" INTEGER NOT NULL DEFAULT 1,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE,
    UNIQUE ("storeId", "code")
);

-- Highlights
CREATE TABLE IF NOT EXISTS "highlights" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT,
    "showPrice" INTEGER NOT NULL DEFAULT 1,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE,
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
    UNIQUE ("storeId", "position")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_sessions_userId" ON "sessions"("userId");
CREATE INDEX IF NOT EXISTS "idx_stores_ownerId" ON "stores"("ownerId");
CREATE INDEX IF NOT EXISTS "idx_categories_storeId" ON "categories"("storeId");
CREATE INDEX IF NOT EXISTS "idx_products_storeId" ON "products"("storeId");
CREATE INDEX IF NOT EXISTS "idx_products_categoryId" ON "products"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_customers_storeId" ON "customers"("storeId");
CREATE INDEX IF NOT EXISTS "idx_orders_storeId" ON "orders"("storeId");
CREATE INDEX IF NOT EXISTS "idx_orders_customerId" ON "orders"("customerId");
CREATE INDEX IF NOT EXISTS "idx_order_items_orderId" ON "order_items"("orderId");
CREATE INDEX IF NOT EXISTS "idx_promotions_storeId" ON "promotions"("storeId");
CREATE INDEX IF NOT EXISTS "idx_coupons_storeId" ON "coupons"("storeId");
CREATE INDEX IF NOT EXISTS "idx_highlights_storeId" ON "highlights"("storeId");
CREATE INDEX IF NOT EXISTS "idx_salespeople_storeId" ON "salespeople"("storeId");
