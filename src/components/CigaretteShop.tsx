import { useState, useEffect } from "react";
import emailjs from '@emailjs/browser';

// 簡單的繁簡對照表
const simplifiedToTraditional: { [key: string]: string } = {
  '烟': '煙',
  '南': '南',
  '京': '京',
  '电': '電',
  '子': '子'
  // 可以根據需要添加更多
};

export const CigaretteShop = () => {
  const [step, setStep] = useState("welcome");
  const [region, setRegion] = useState("");
  const [preferences, setPreferences] = useState({
    types: [] as string[],
    sizes: [] as string[],
    budget: [] as string[],
    bead: [] as string[]
  });
  const [keyword, setKeyword] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [orderStep, setOrderStep] = useState<'shopping' | 'confirm' | 'complete' | 'payment'>('shopping');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [orderSummary, setOrderSummary] = useState<{
    orderNumber: string;
    items: Array<{name: string; quantity: number; price: number}>;
    subtotal: number;
    shipping: number;
    total: number;
    date: string;
  } | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);

  // 修改購物車的數據結構
  interface CartItem {
    name: string;
    quantity: number;
  }

  const togglePreference = (category: 'types' | 'sizes' | 'budget' | 'bead', value: string) => {
    setPreferences(prev => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const PreferenceButton = ({ 
    category, 
    value, 
    color 
  }: { 
    category: 'types' | 'sizes' | 'budget' | 'bead', 
    value: string, 
    color: string 
  }) => (
    <button 
      onClick={() => togglePreference(category, value)}
      style={{
        width: '100%',
        padding: '12px 24px',
        backgroundColor: preferences[category].includes(value) ? color : '#ffffff',
        color: preferences[category].includes(value) ? 'white' : '#333',
        borderRadius: '8px',
        border: '1px solid #ccc',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      {value}
    </button>
  );

  const convertToAllForms = (text: string) => {
    let result = [text.toLowerCase()];
    
    // 轉換每個字符
    for (let char of text) {
      if (simplifiedToTraditional[char]) {
        result.push(text.replace(char, simplifiedToTraditional[char]).toLowerCase());
      }
    }
    
    return result;
  };

  const handleSearch = () => {
    if (!keyword.trim()) return;

    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const searchTerm = keyword.toLowerCase()
      .replace(/[\uff01-\uff5e]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));

    const matchedProducts = products.filter((product: any) => {
      const productName = product.name.toLowerCase()
        .replace(/[\uff01-\uff5e]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
      return searchTerm.split('').some(char => productName.includes(char));
    });

    setSearchResults(matchedProducts);
    setSelectedItems(new Set()); // 重置選擇
  };

  // 修改添加到購物車的邏輯
  const handleAddToCart = () => {
    const newItems = Array.from(selectedItems);
    if (newItems.length > 0) {
      setCart(prev => {
        const updatedCart = [...prev];
        newItems.forEach(itemName => {
          const existingItemIndex = updatedCart.findIndex(item => item.name === itemName);
          if (existingItemIndex >= 0) {
            // 如果商品已存在，增加數量
            updatedCart[existingItemIndex].quantity += 1;
          } else {
            // 如果是新商品，添加到購物車
            updatedCart.push({ name: itemName, quantity: 1 });
          }
        });
        return updatedCart;
      });
      setSelectedItems(new Set()); // 清空選擇
      setSearchResults([]); // 清空搜索結果，但保留搜索關鍵字
    }
  };

  // 更新購物車商品數量
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity > 0) {
      setCart(prev => {
        const updated = [...prev];
        updated[index].quantity = newQuantity;
        return updated;
      });
    }
  };

  // 刪除購物車商品
  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}${month}${day}-${random}`;
  };

  const handleConfirmOrder = () => {
    const orderNumber = generateOrderNumber();
    const date = new Date().toLocaleString('zh-TW', { 
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const orderItems = cart.map(item => {
      const product = products.find((p: any) => p.name === item.name);
      return {
        name: item.name,
        quantity: item.quantity,
        price: product?.price || 0
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = calculateShippingFee(region, subtotal);
    const total = subtotal + shipping;

    const summary = {
      orderNumber,
      items: orderItems,
      subtotal,
      shipping,
      total,
      date
    };

    setOrderSummary(summary);
    setOrderStep('confirm');

    // 保存訂單到 localStorage
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push({
      ...summary,
      region,
      paymentMethod
    });
    localStorage.setItem('orders', JSON.stringify(orders));
  };

  const handleStartNewOrder = () => {
    setCart([]);
    setKeyword('');
    setSearchResults([]);
    setOrderStep('shopping');
    setOrderNumber('');
  };

  // 定義省份和運費信息
  const regions = {
    "多倫多": { fee: [10, 15], freeShipping: 120 },
    "安大略省其他地區": { fee: [15, 20], freeShipping: 200 },
    "魁北克省": { fee: [15, 20], freeShipping: 200 },
    "卑詩省": { fee: [20, 25], freeShipping: 250 },
    "新斯科舍省": { fee: [20, 25], freeShipping: 250 },
    "曼尼托巴省": { fee: [15, 20], freeShipping: 200 },
    "艾伯塔省": { fee: [20, 25], freeShipping: 250 }
  };

  // 更新運費計算邏輯
  const calculateShippingFee = (region: string, total: number) => {
    const regionInfo = regions[region as keyof typeof regions];
    if (!regionInfo) return 15;

    if (total >= regionInfo.freeShipping) {
      return 0;
    }
    
    const [min, max] = regionInfo.fee;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // 在購物車顯示部分更新運費說明
  const getShippingFeeDescription = (region: string) => {
    const regionInfo = regions[region as keyof typeof regions];
    if (!regionInfo) return "運費 $15-20";

    const [min, max] = regionInfo.fee;
    return `運費 $${min}-${max}`;
  };

  // 更新購物車總額
  useEffect(() => {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    let total = 0;
    
    cart.forEach(item => {
      const product = products.find((p: any) => p.name === item.name);
      if (product) {
        total += product.price * item.quantity;
      }
    });
    
    setSubtotal(total);
    const shipping = calculateShippingFee(region, total);
    setShippingFee(shipping);
  }, [cart, region]);

  // 定義芭比粉紅色系主題
  const theme = {
    primary: '#FF69B4', // 經典芭比粉
    secondary: '#FFB6C1', // 淺粉紅
    accent: '#FFC0CB', // 粉紅色
    light: '#FFF0F5', // 極淺粉紅
    text: '#4A4A4A', // 深灰色文字
    textLight: '#757575', // 淺灰色文字
    danger: '#FF69B4', // 深粉紅
    success: '#FF8FAB', // 中粉紅
    background: '#FFF5F7', // 淺粉背景
    white: '#FFFFFF',
    border: '#FFD1DC' // 邊框粉紅
  };

  // 更新按鈕懸停效果
  const buttonHoverStyle = {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(255, 105, 180, 0.2)'
  };

  // 背景漸變效果
  const pageBackground = {
    backgroundColor: theme.background,
    backgroundImage: `
      linear-gradient(45deg, ${theme.light} 25%, transparent 25%),
      linear-gradient(-45deg, ${theme.light} 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, ${theme.light} 75%),
      linear-gradient(-45deg, transparent 75%, ${theme.light} 75%)
    `,
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
  };

  // 按鈕基礎樣式
  const buttonBaseStyle = {
    background: theme.gradient,
    color: theme.white,
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: `0 4px 15px ${theme.shadowColor}`,
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 20px ${theme.shadowColor}`
    }
  };

  // 輸入框基礎樣式
  const inputBaseStyle = {
    backgroundColor: theme.white,
    border: `2px solid ${theme.border}`,
    borderRadius: '12px',
    padding: '12px 16px',
    color: theme.text,
    transition: 'all 0.3s ease',
    ':focus': {
      borderColor: theme.primary,
      boxShadow: `0 0 0 3px ${theme.shadowColor}`
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <div style={{
        marginBottom: '32px'
      }}>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索商品..."
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            marginBottom: '12px'
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            backgroundColor: theme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          搜索
        </button>
      </div>

      {searchResults.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0 }}>搜索結果</h3>
            {selectedItems.size > 0 && (
              <button
                onClick={handleAddToCart}
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                添加到購物車 ({selectedItems.size})
              </button>
            )}
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {searchResults.map((product, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedItems.has(product.name)}
                  onChange={(e) => {
                    const newSelected = new Set(selectedItems);
                    if (e.target.checked) {
                      newSelected.add(product.name);
                    } else {
                      newSelected.delete(product.name);
                    }
                    setSelectedItems(newSelected);
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer'
                  }}
                />
                {product.image && (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    style={{
                      width: '50px',
                      height: '50px',
                      objectFit: 'cover',
                      borderRadius: '6px'
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: 'bold',
                    marginBottom: '4px',
                    color: theme.text
                  }}>{product.name}</div>
                  <div style={{ 
                    fontSize: '14px',
                    color: theme.textLight
                  }}>
                    ${product.price} | {product.type} | {product.size}
                    {product.hasBead && ' | 爆珠'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        marginTop: '32px',
        textAlign: 'left'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{
            fontSize: '18px'
          }}>購物車</h3>
          {cart.length > 0 && (
            <button
              onClick={handleConfirmOrder}
              style={{
                padding: '8px 16px',
                backgroundColor: theme.success,
                color: theme.text,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                ':hover': {
                  backgroundColor: theme.secondary
                }
              }}
            >
              確認訂單
            </button>
          )}
        </div>

        {cart.length > 0 ? (
          <>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              marginBottom: '20px'
            }}>
              {cart.map((item, index) => {
                const product = JSON.parse(localStorage.getItem('products') || '[]')
                  .find((p: any) => p.name === item.name);
                const itemPrice = product?.price || 0;
                
                return (
                  <li key={index} style={{
                    padding: '12px',
                    backgroundColor: theme.white,
                    marginBottom: '8px',
                    borderRadius: '4px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                        <span style={{ 
                          marginLeft: '12px',
                          color: theme.textLight
                        }}>
                          ${itemPrice} × {item.quantity} = ${itemPrice * item.quantity}
                        </span>
                      </div>
                      <button
                        onClick={() => removeFromCart(index)}
                        style={{
                          backgroundColor: theme.danger,
                          color: theme.white,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          ':hover': {
                            backgroundColor: '#FF8080'
                          }
                        }}
                      >
                        刪除
                      </button>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: theme.white,
                          border: `1px solid ${theme.accent}`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: theme.text,
                          transition: 'all 0.2s',
                          ':hover': {
                            backgroundColor: theme.light
                          }
                        }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                        style={{
                          width: '60px',
                          padding: '4px',
                          textAlign: 'center',
                          border: `1px solid ${theme.accent}`,
                          borderRadius: '4px',
                          color: theme.text,
                          backgroundColor: theme.white,
                          '::placeholder': {
                            color: theme.textLight
                          }
                        }}
                        min="1"
                      />
                      <button
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: theme.white,
                          border: `1px solid ${theme.accent}`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: theme.text,
                          transition: 'all 0.2s',
                          ':hover': {
                            backgroundColor: theme.light
                          }
                        }}
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div style={{
              borderTop: '1px solid #ddd',
              paddingTop: '16px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span>小計：</span>
                <span>${subtotal}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span>運費：</span>
                <span>
                  {shippingFee === 0 ? '免運費' : `$${shippingFee}`}
                  <span style={{ 
                    color: theme.textLight, 
                    fontSize: '14px', 
                    marginLeft: '8px' 
                  }}>
                    {region === "多倫多" && subtotal < 120 && (
                      `(${getShippingFeeDescription(region)}, 滿$120免運費)`
                    )}
                    {region.includes("BC") && subtotal < 250 && (
                      `(${getShippingFeeDescription(region)}, 滿$250免運費)`
                    )}
                    {!region.includes("BC") && region !== "多倫多" && subtotal < 200 && (
                      `(${getShippingFeeDescription(region)}, 滿$200免運費)`
                    )}
                  </span>
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #ddd',
                fontWeight: 'bold'
              }}>
                <span>總計：</span>
                <span>${subtotal + shippingFee}</span>
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: theme.textLight, textAlign: 'center' }}>
            購物車是空的
          </p>
        )}
      </div>
    </div>
  );
};