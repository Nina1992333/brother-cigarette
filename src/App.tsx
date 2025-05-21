import { useState, useEffect } from "react";
import { AdminPanel } from './components/AdminPanel';
import emailjs from '@emailjs/browser';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import AdminProducts from "./components/AdminProducts";
import AdminAdd from "./components/AdminAdd";

// 簡單的繁簡對照表
const simplifiedToTraditional: { [key: string]: string } = {
  '烟': '煙',
  '南': '南',
  '京': '京',
  '电': '電',
  '子': '子'
  // 可以根據需要添加更多
};

function App() {
  const isAdmin = window.location.search.includes('admin');
  if (isAdmin) {
    return <AdminPanel />;
  }

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
      .replace(/[\uff01-\uff5e]/g, (ch: string) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));

    const matchedProducts = products.filter((product: any) => {
      const productName = product.name.toLowerCase()
        .replace(/[\uff01-\uff5e]/g, (ch: string) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
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
    primary: '#FF69B4',
    secondary: '#FFB6C1',
    accent: '#FFC0CB',
    light: '#FFF0F5',
    text: '#4A4A4A',
    textLight: '#757575',
    danger: '#FF69B4',
    success: '#FF8FAB',
    background: '#FFF5F7',
    white: '#FFFFFF',
    border: '#FFD1DC',
    gradient: 'linear-gradient(90deg, #FF69B4 0%, #FFB6C1 100%)',
    shadowColor: 'rgba(255, 105, 180, 0.2)'
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

  // 更新購物車顯示組件
  const CartSection = () => (
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
              transition: 'all 0.2s'
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
                        transition: 'all 0.2s'
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
                        transition: 'all 0.2s'
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
                        backgroundColor: theme.white
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
                        transition: 'all 0.2s'
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
  );

  const paymentOptions = {
    alipay: {
      name: '支付寶',
      description: '加收10%手續費',
      account: 'your-alipay-account'
    },
    etransfer: {
      name: 'E-transfer',
      description: '請使用訂單編號作為密碼',
      email: 'your-email@example.com'
    },
    cash: {
      name: '現金',
      description: '僅限多倫多地區',
      note: '面交時請出示訂單編號'
    }
  };

  const sendOrderEmail = async () => {
    const itemsList = orderSummary?.items.map(item => 
      `${item.name} x ${item.quantity} = $${item.price * item.quantity}`
    ).join('\n');

    const emailParams = {
      to_email: 'amy40128@gmail.com',
      order_number: orderSummary?.orderNumber,
      order_date: orderSummary?.date,
      region: region,
      items: itemsList,
      subtotal: orderSummary?.subtotal,
      shipping: orderSummary?.shipping,
      total: orderSummary?.total,
      payment_method: paymentOptions[paymentMethod as keyof typeof paymentOptions].name,
      payment_details: paymentOptions[paymentMethod as keyof typeof paymentOptions].description
    };

    try {
      await emailjs.send(
        'service_u60bj4b',
        'template_6b9g0gg',
        emailParams,
        'MbWcWagpzmIl0toI7'
      );
      setIsEmailSent(true);
    } catch (error) {
      console.error('郵件發送失敗:', error);
      alert('訂單提交失敗，請稍後重試');
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div style={{
              width: '100vw',
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.background,
              padding: '20px',
              backgroundImage: 'linear-gradient(45deg, #FFF5F7 25%, #FFF8FA 25%, #FFF8FA 50%, #FFF5F7 50%, #FFF5F7 75%, #FFF8FA 75%, #FFF8FA 100%)',
              backgroundSize: '40px 40px'
            }}>
              <div style={{
                width: '500px',
                padding: '40px',
                backgroundColor: theme.white,
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(255, 105, 180, 0.1)',
                textAlign: 'center'
              }}>
                {step === "welcome" && (
                  <div>
                    <h2 style={{ 
                      fontSize: '28px', 
                      fontWeight: 'bold',
                      marginBottom: '24px',
                      color: theme.text,
                      textShadow: '2px 2px 4px rgba(255, 105, 180, 0.1)'
                    }}>請選擇您的所在地</h2>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '16px',
                      marginBottom: '24px'
                    }}>
                      {Object.entries(regions).map(([name, info]) => (
                        <button
                          key={name}
                          onClick={() => {
                            setRegion(name);
                            setStep("preferences");
                          }}
                          style={{
                            padding: '20px',
                            backgroundColor: theme.white,
                            border: `2px solid ${theme.border}`,
                            borderRadius: '15px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <span style={{ 
                            fontWeight: 'bold',
                            color: theme.text,
                            fontSize: '16px'
                          }}>{name}</span>
                          <span style={{ 
                            fontSize: '14px',
                            color: theme.textLight
                          }}>
                            運費: ${info.fee[0]}-${info.fee[1]}
                          </span>
                          <span style={{ 
                            fontSize: '14px',
                            color: theme.primary,
                            fontWeight: '500'
                          }}>
                            滿${info.freeShipping}免運費
                          </span>
                        </button>
                      ))}
                    </div>

                    <p style={{ 
                      fontSize: '14px',
                      color: theme.textLight,
                      textAlign: 'center'
                    }}>
                      * 運費會根據訂單重量和距離在指定範圍內浮動
                    </p>
                  </div>
                )}

                {step === "preferences" && orderStep === 'shopping' && (
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '24px'
                    }}>
                      <button
                        onClick={() => setStep("welcome")}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: theme.white,
                          color: theme.text,
                          borderRadius: '8px',
                          border: `1px solid ${theme.accent}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        ← 返回
                      </button>
                      <h2 style={{ 
                        fontSize: '24px', 
                        fontWeight: 'bold',
                        color: theme.text
                      }}>選擇偏好</h2>
                      <div style={{ width: '70px' }}></div>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                      <h3 style={{ 
                        fontSize: '18px', 
                        marginBottom: '16px',
                        textAlign: 'left',
                        color: theme.text
                      }}>搜尋商品</h3>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '16px'
                      }}>
                        <input
                          type="text"
                          value={keyword}
                          onChange={(e) => setKeyword(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSearch();
                            }
                          }}
                          placeholder="輸入商品名稱"
                          style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: `1px solid ${theme.accent}`,
                            fontSize: '16px',
                            color: theme.text,
                            backgroundColor: theme.white
                          }}
                        />
                        <button 
                          onClick={handleSearch}
                          style={{
                            padding: '12px 24px',
                            backgroundColor: theme.primary,
                            color: theme.white,
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            fontWeight: '500'
                          }}
                        >
                          搜尋
                        </button>
                      </div>
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div style={{
                        marginTop: '16px',
                        padding: '16px',
                        backgroundColor: theme.white,
                        borderRadius: '8px'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '16px'
                        }}>
                          <h4 style={{
                            fontSize: '16px',
                            margin: 0,
                            color: theme.text
                          }}>搜索結果：</h4>
                          <button
                            onClick={handleAddToCart}
                            disabled={selectedItems.size === 0}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: selectedItems.size === 0 ? theme.textLight : theme.primary,
                              color: theme.text,
                              borderRadius: '6px',
                              border: 'none',
                              cursor: selectedItems.size === 0 ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            加入購物車 ({selectedItems.size})
                          </button>
                        </div>
                        {searchResults.map((product: any) => (
                          <div key={product.id} style={{
                            padding: '12px',
                            backgroundColor: theme.white,
                            marginBottom: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
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
                    )}

                    <div style={{ marginBottom: '32px' }}>
                      <h3 style={{ 
                        fontSize: '18px', 
                        marginBottom: '16px',
                        textAlign: 'left',
                        color: theme.text
                      }}>類型</h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px'
                      }}>
                        <PreferenceButton category="types" value="國煙" color="#3B82F6" />
                        <PreferenceButton category="types" value="日煙" color="#22C55E" />
                        <PreferenceButton category="types" value="韓煙" color="#F59E0B" />
                        <PreferenceButton category="types" value="電子煙" color="#8B5CF6" />
                        <PreferenceButton category="types" value="本地煙" color="#EC4899" />
                      </div>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                      <h3 style={{ 
                        fontSize: '18px', 
                        marginBottom: '16px',
                        textAlign: 'left',
                        color: theme.text
                      }}>尺寸</h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px'
                      }}>
                        <PreferenceButton category="sizes" value="粗支" color="#3B82F6" />
                        <PreferenceButton category="sizes" value="中支" color="#22C55E" />
                        <PreferenceButton category="sizes" value="細支" color="#F59E0B" />
                      </div>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                      <h3 style={{ 
                        fontSize: '18px', 
                        marginBottom: '16px',
                        textAlign: 'left',
                        color: theme.text
                      }}>預算</h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px'
                      }}>
                        <PreferenceButton category="budget" value="便宜" color="#3B82F6" />
                        <PreferenceButton category="budget" value="中等" color="#22C55E" />
                        <PreferenceButton category="budget" value="貴" color="#F59E0B" />
                      </div>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                      <h3 style={{ 
                        fontSize: '18px', 
                        marginBottom: '16px',
                        textAlign: 'left',
                        color: theme.text
                      }}>爆珠</h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px'
                      }}>
                        <PreferenceButton category="bead" value="要" color="#3B82F6" />
                        <PreferenceButton category="bead" value="不要" color="#22C55E" />
                      </div>
                    </div>

                    <CartSection />
                  </div>
                )}

                {step === "preferences" && orderStep === 'confirm' && (
                  <div style={{
                    padding: '24px',
                    backgroundColor: theme.white,
                    borderRadius: '16px',
                    boxShadow: `0 8px 24px ${theme.shadowColor}`
                  }}>
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '32px'
                    }}>
                      <h2 style={{
                        fontSize: '24px',
                        color: theme.text,
                        marginBottom: '8px'
                      }}>訂單確認</h2>
                      <div style={{
                        backgroundColor: theme.light,
                        padding: '16px',
                        borderRadius: '12px',
                        marginBottom: '16px'
                      }}>
                        <p style={{
                          fontSize: '18px',
                          color: theme.text,
                          marginBottom: '8px'
                        }}>您的訂單編號：</p>
                        <p style={{
                          fontSize: '28px',
                          fontWeight: 'bold',
                          color: theme.primary,
                          marginBottom: '8px'
                        }}>{orderSummary?.orderNumber}</p>
                        <p style={{
                          fontSize: '14px',
                          color: theme.textLight
                        }}>請保存此編號以便日後查詢</p>
                      </div>
                      <p style={{
                        fontSize: '14px',
                        color: theme.textLight
                      }}>訂單時間：{orderSummary?.date}</p>
                    </div>

                    <div style={{
                      marginBottom: '24px'
                    }}>
                      <h3 style={{
                        fontSize: '18px',
                        color: theme.text,
                        marginBottom: '16px'
                      }}>訂單明細</h3>
                      {orderSummary?.items.map((item, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '12px',
                          borderBottom: `1px solid ${theme.border}`,
                          color: theme.text
                        }}>
                          <div>
                            <span style={{marginRight: '8px'}}>{item.name}</span>
                            <span style={{color: theme.textLight}}>x{item.quantity}</span>
                          </div>
                          <span>${item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{
                      backgroundColor: theme.light,
                      padding: '16px',
                      borderRadius: '12px',
                      marginBottom: '24px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        color: theme.text
                      }}>
                        <span>小計</span>
                        <span>${orderSummary?.subtotal}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        color: theme.text
                      }}>
                        <span>運費</span>
                        <span>${orderSummary?.shipping}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: `1px solid ${theme.border}`,
                        fontWeight: 'bold',
                        fontSize: '18px',
                        color: theme.primary
                      }}>
                        <span>總計</span>
                        <span>${orderSummary?.total}</span>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: theme.light,
                      padding: '16px',
                      borderRadius: '12px',
                      marginBottom: '24px'
                    }}>
                      <h3 style={{
                        fontSize: '16px',
                        color: theme.text,
                        marginBottom: '8px'
                      }}>付款方式</h3>
                      <p style={{color: theme.text}}>{paymentMethod}</p>
                      {paymentMethod === 'alipay' && (
                        <p style={{color: theme.textLight, fontSize: '14px'}}>
                          請在支付寶備註欄填寫訂單編號
                        </p>
                      )}
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '16px'
                    }}>
                      <button
                        onClick={() => {
                          setOrderStep('shopping');
                          setOrderSummary(null);
                        }}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: theme.white,
                          border: `2px solid ${theme.border}`,
                          borderRadius: '12px',
                          color: theme.text,
                          cursor: 'pointer'
                        }}
                      >
                        返回修改
                      </button>
                      <button
                        onClick={() => {
                          setCart([]);
                          setOrderStep('complete');
                        }}
                        style={{
                          padding: '12px 24px',
                          background: theme.gradient,
                          border: 'none',
                          borderRadius: '12px',
                          color: theme.white,
                          cursor: 'pointer'
                        }}
                      >
                        確認付款
                      </button>
                    </div>
                  </div>
                )}

                {step === "preferences" && orderStep === 'complete' && (
                  <div>
                    <h2 style={{ 
                      fontSize: '24px', 
                      fontWeight: 'bold',
                      marginBottom: '24px',
                      color: theme.text
                    }}>訂單已送出</h2>
                    
                    <div style={{
                      backgroundColor: theme.white,
                      padding: '20px',
                      borderRadius: '8px',
                      marginBottom: '24px',
                      textAlign: 'center'
                    }}>
                      <p style={{ 
                        fontSize: '18px',
                        marginBottom: '12px',
                        color: theme.text
                      }}>您的訂單編號：</p>
                      <p style={{ 
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: theme.primary,
                        marginBottom: '24px'
                      }}>{orderNumber}</p>
                      <p style={{
                        color: theme.textLight,
                        fontSize: '14px'
                      }}>請保存此編號以便日後查詢</p>
                    </div>

                    <button
                      onClick={handleStartNewOrder}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: theme.primary,
                        color: theme.text,
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      開始新訂單
                    </button>
                  </div>
                )}

                {orderStep === 'payment' && (
                  <div style={{
                    padding: '24px',
                    backgroundColor: theme.white,
                    borderRadius: '16px',
                    boxShadow: `0 8px 24px ${theme.shadowColor}`
                  }}>
                    <h2 style={{
                      fontSize: '24px',
                      color: theme.text,
                      marginBottom: '24px',
                      textAlign: 'center'
                    }}>選擇付款方式</h2>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      marginBottom: '24px'
                    }}>
                      {Object.entries(paymentOptions).map(([key, value]) => (
                        <label
                          key={key}
                          style={{
                            display: key === 'cash' && region !== '多倫多' ? 'none' : 'flex',
                            padding: '16px',
                            backgroundColor: paymentMethod === key ? theme.light : theme.white,
                            border: `2px solid ${paymentMethod === key ? theme.primary : theme.border}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <input
                            type="radio"
                            name="payment"
                            value={key}
                            checked={paymentMethod === key}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            style={{ marginRight: '12px' }}
                          />
                          <div>
                            <div style={{ 
                              fontWeight: 'bold',
                              color: theme.text,
                              marginBottom: '4px'
                            }}>{value.name}</div>
                            <div style={{ 
                              fontSize: '14px',
                              color: theme.textLight
                            }}>{value.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {paymentMethod && (
                      <div style={{
                        backgroundColor: theme.light,
                        padding: '16px',
                        borderRadius: '12px',
                        marginBottom: '24px'
                      }}>
                        <h3 style={{
                          fontSize: '16px',
                          color: theme.text,
                          marginBottom: '8px'
                        }}>付款信息</h3>
                        {paymentMethod === 'alipay' && (
                          <>
                            <p>支付寶帳號：{paymentOptions.alipay.account}</p>
                            <p>總金額：${(orderSummary?.total || 0) * 1.1} (含手續費)</p>
                            <p style={{color: theme.textLight}}>請在備註填寫訂單編號：{orderSummary?.orderNumber}</p>
                          </>
                        )}
                        {paymentMethod === 'etransfer' && (
                          <>
                            <p>E-transfer 郵箱：{paymentOptions.etransfer.email}</p>
                            <p>金額：${orderSummary?.total}</p>
                            <p style={{color: theme.textLight}}>密碼請使用訂單編號：{orderSummary?.orderNumber}</p>
                          </>
                        )}
                        {paymentMethod === 'cash' && (
                          <>
                            <p>現金支付金額：${orderSummary?.total}</p>
                            <p style={{color: theme.textLight}}>面交時請出示訂單編號：{orderSummary?.orderNumber}</p>
                          </>
                        )}
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '16px'
                    }}>
                      <button
                        onClick={() => setOrderStep('confirm')}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: theme.white,
                          border: `2px solid ${theme.border}`,
                          borderRadius: '12px',
                          color: theme.text,
                          cursor: 'pointer'
                        }}
                      >
                        返回
                      </button>
                      <button
                        onClick={async () => {
                          if (paymentMethod) {
                            await sendOrderEmail();
                            setOrderStep('complete');
                          }
                        }}
                        disabled={!paymentMethod}
                        style={{
                          padding: '12px 24px',
                          background: theme.gradient,
                          border: 'none',
                          borderRadius: '12px',
                          color: theme.white,
                          cursor: 'pointer'
                        }}
                      >
                        確認付款方式
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          }
        />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/add" element={<AdminAdd />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
