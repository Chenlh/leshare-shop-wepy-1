import wepy from 'wepy';

/**
 * 购物车视图类
 */
export default class Cart {
  constructor () {
    // 数据加载
    this.init();
  }

  /**
   * 静态方法，构造单例对象
   */
  static create() {
    if (this._self == null) {
      this._self = new Cart();
    }
    return this._self;
  }

  /**
   * 保存数据
   */
  save() {
    this.cpomuteCart();
    wepy.setStorage({
      key: 'carts',
      data: this
    });
  }

  /**
   * 导出数据
   */
  export () {
    // 增加计数器对象
    this.carts.forEach((cart, index) => {
      cart.quantity = {
        componentId: index,
        num: cart.goodsNum,
        min: 1,
        max: 99
      };
    });
    return {
      carts: this.carts,
      price: this.price,
      num: this.num,
      all: this.all,
      reload: this.reload,
      batch: this.batch,
      limitPrice: this.limitPrice,
      open: this.open,
      // buy: Number(this.price) >= Number(this.limitPrice) && this.num > 0 && this.open
      buy: this.num > 0
    };
  }

  /**
   * 是否为空
   */
  empty () {
    return this.num == 0;
  }

  /**
   * 是否满足限制
   */
  limit () {
    return Number(this.price) < Number(this.limitPrice);
  }

  /**
   * 初始化数据
   */
  init () {
    // 从存储中加载数据
    const carts = wepy.getStorageSync('carts');
    if (carts == null || carts == '') {
      // 变量初始化
      this.carts = [];
      this.price = 0;
      this.num = 0;
      this.all = false;
      this.reload = false;
      this.batch = false;
    } else {
      Object.assign(this, carts);
    }
  }

  /**
   * 新增购物车数据
   */
  add(goods, skuText, num) {
    // TODO 库存校验
    // 找到原有对象
    const cart = this.find(goods.id, skuText);
    if (cart) {
      // 购物车中已存在, 修改价格
      cart.goodsNum = cart.goodsNum + num;
      cart.totalPrice = (cart.goodsNum * cart.goodsPrice).toFixed(2);
    } else {
      // 购物车中不存在，新增对象
      let goodsPrice, originalPrice;
      if (skuText) {
        // 商品有规格的情况
        const skuInfo = goods.goodsSkuInfo.goodsSkuDetails.find(item => item.sku == skuText);
        goodsPrice = skuInfo.goodsSkuDetailBase.price;
        originalPrice = skuInfo.goodsSkuDetailBase.originalPrice;
      } else {
        // 商品没有规格的情况
        goodsPrice = goods.sellPrice;
        originalPrice = goods.originalPrice;
      }
      // TODO 折扣的情况需要处理
      // 新增对象
      this.carts.push({
        goodsId: goods.id,
        goodsSku: skuText,
        goodsName: goods.name,
        innerCid: goods.innerCid,
        goodsImage: goods.imageUrl,
        goodsPrice: goodsPrice,
        goodsNum: num,
        totalPrice: goodsPrice,
        originalPrice: originalPrice,
        // 购物车相关属性
        check: true,
        // 折扣相关属性
        discount: goods.discount,
        discountRate: goods.discountRate,
        discountText: goods.discountText
      });
    }
    // 保存
    this.save();
  }
  /**
   * 移除一个购物车项目
   */
  remove (index) {
    if (this.carts.length >= index + 1) {
      this.carts.splice(index, 1);
      this.save();
    }
  }

  /**
   * 移除所有被选中的项目
   */
  removeChecked() {
    this.carts = this.carts.filter(item => item.check == false);
    this.save();
  }
  /**
   * 更新商品数量
   */
  updateNum (index, num) {
    const cart = this.carts[index];
    if (cart) {
      cart.goodsNum = num;
    }
    this.save();
  }
  /**
   * 切换一个商品的选择
   */
  toggleCartCheck(index) {
    const cart = this.carts[index];
    if (cart) {
      cart.check = !cart.check;
    }
    this.save();
  }

  /**
   * 切换全部商品的选择
   */
  toggleAllCheck () {
    this.all = !this.all;
    this.updateAllCheck(this.all);
    this.save();
  }
  /**
   * 切换批量操作
   */
  toggleBatch () {
    this.batch = !this.batch;
    if (this.batch) {
      this.unselectAll();
    } else {
      this.selectAll();
    }
    this.save();
  }

  // #############################
  // 工具方法
  // #############################
  /**
   * 切换全部选择
   */
  updateAllCheck (check) {
    this.carts.forEach(cart => {
      cart.check = check;
    });
    this.save();
  }
  /**
   * 计算价格和数量
   */
  cpomuteCart () {
    // 价格计算
    let all = this.carts.length > 0;
    let price = 0;
    let num = 0;
    for (let i in this.carts) {
      const cart = this.carts[i];
      if (!cart.check) {
        all = false;
        continue;
      }
      num += cart.goodsNum;
      price += cart.goodsPrice * cart.goodsNum;
    }
    price = price.toFixed(2);
    this.all = all;
    this.num = num;
    this.price = price;
    // 购物车为空的情况处理
    if (this.carts.length == 0) {
      this.batch = false;
    }
  }

  /**
   * 选择全部
   */
  selectAll () {
    this.all = true;
    this.updateAllCheck(this.all);
  }

  /**
   * 取消选择全部
   */
  unselectAll () {
    this.all = false;
    this.updateAllCheck(this.all);
  }
  /**
   * 根据商品信息查找
   */
  find (goodsId, sku) {
    return this.carts.find(item => item.goodsId == goodsId && item.goodsSku == sku);
  }
  // #############################
  // TODO 方法梳理中
  // #############################
  /**
   * 获取已选择商品
   */
  getCheckedCarts () {
    return this.carts.filter(cart => cart.check);
  }

  /**
   * 检查库存
   */
  checkGoodsStock () {
    const goods = this.carts.find(item => item.goodsNum > item.stock || item.stock == 0);
    if (goods == null) {
      // return;
    } else if (goods.stock == 0) {
      return `${goods.goodsName} 无货`;
    } else {
      return `${goods.goodsName} 库存不足`;
    }
  }
}
