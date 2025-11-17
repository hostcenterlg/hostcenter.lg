/**
 * MOCK Prisma Client
 *
 * Este é um cliente Prisma mock criado porque não foi possível baixar
 * os binários do Prisma devido a restrições de rede (403 Forbidden).
 *
 * O banco de dados SQLite foi criado com sucesso em prisma/dev.db
 * com todas as tabelas do schema.
 *
 * Para usar o Prisma Client real, você precisará:
 * 1. Executar em um ambiente com acesso à internet sem restrições
 * 2. Rodar: npx prisma generate
 * 3. O cliente será gerado em node_modules/.prisma/client
 */

const Database = require('better-sqlite3');
const path = require('path');

class PrismaClientMock {
  constructor() {
    const dbPath = path.join(__dirname, 'dev.db');
    this.db = new Database(dbPath);

    // Create model proxies
    this.user = this._createModel('users');
    this.session = this._createModel('sessions');
    this.store = this._createModel('stores');
    this.storeSettings = this._createModel('store_settings');
    this.category = this._createModel('categories');
    this.product = this._createModel('products');
    this.customer = this._createModel('customers');
    this.order = this._createModel('orders');
    this.orderItem = this._createModel('order_items');
    this.promotion = this._createModel('promotions');
    this.promotionProduct = this._createModel('promotion_products');
    this.coupon = this._createModel('coupons');
    this.highlight = this._createModel('highlights');
    this.salesperson = this._createModel('salespeople');
  }

  _createModel(tableName) {
    return {
      findMany: (args) => {
        const stmt = this.db.prepare(`SELECT * FROM "${tableName}"`);
        return stmt.all();
      },
      findUnique: (args) => {
        // Simplified implementation
        return null;
      },
      create: (args) => {
        // Simplified implementation
        console.warn('Mock create not implemented');
        return null;
      },
      update: (args) => {
        console.warn('Mock update not implemented');
        return null;
      },
      delete: (args) => {
        console.warn('Mock delete not implemented');
        return null;
      }
    };
  }

  $disconnect() {
    this.db.close();
  }
}

module.exports = { PrismaClient: PrismaClientMock };
