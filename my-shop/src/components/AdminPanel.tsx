import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  size: string;
  hasBead: boolean;
  image: string;
}

export function AdminPanel() {
  const [newProduct, setNewProduct] = useState<Product>({
    id: '',
    name: '',
    type: '',
    price: 0,
    size: '',
    hasBead: false,
    image: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({...newProduct, image: reader.result as string});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const productToSave = {
      ...newProduct,
      id: Date.now().toString()
    };
    products.push(productToSave);
    localStorage.setItem('products', JSON.stringify(products));
    
    // 重置表單
    setNewProduct({
      id: '',
      name: '',
      type: '',
      price: 0,
      size: '',
      hasBead: false,
      image: ''
    });
  };

  return (
    <div style={{ 
      width: '100vw', 
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: 'rgb(243 244 246)'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
      }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          marginBottom: '24px',
          textAlign: 'center'
        }}>新增商品</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>商品圖片</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ width: '100%' }}
            />
            {newProduct.image && (
              <img 
                src={newProduct.image} 
                alt="預覽" 
                style={{ 
                  width: '200px', 
                  height: '200px', 
                  objectFit: 'cover',
                  marginTop: '10px',
                  borderRadius: '8px'
                }} 
              />
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>商品名稱</label>
            <input
              type="text"
              value={newProduct.name}
              onChange={e => setNewProduct({...newProduct, name: e.target.value})}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>類型</label>
            <select
              value={newProduct.type}
              onChange={e => setNewProduct({...newProduct, type: e.target.value})}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
              required
            >
              <option value="">請選擇類型</option>
              <option value="國煙">國煙</option>
              <option value="日煙">日煙</option>
              <option value="韓煙">韓煙</option>
              <option value="電子煙">電子煙</option>
              <option value="本地煙">本地煙</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>價格</label>
            <input
              type="number"
              value={newProduct.price}
              onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>尺寸</label>
            <select
              value={newProduct.size}
              onChange={e => setNewProduct({...newProduct, size: e.target.value})}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
              required
            >
              <option value="">請選擇尺寸</option>
              <option value="粗支">粗支</option>
              <option value="中支">中支</option>
              <option value="細支">細支</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={newProduct.hasBead}
                onChange={e => setNewProduct({...newProduct, hasBead: e.target.checked})}
              />
              有爆珠
            </label>
          </div>

          <button 
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            新增商品
          </button>
        </form>

        <div style={{ marginTop: '40px' }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold',
            marginBottom: '16px'
          }}>現有商品列表</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {JSON.parse(localStorage.getItem('products') || '[]').map((product: Product) => (
              <div 
                key={product.id} 
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '12px',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  alignItems: 'center'
                }}
              >
                {product.image && (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '4px'
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{product.name}</div>
                  <div>類型：{product.type}</div>
                  <div>價格：${product.price}</div>
                  <div>尺寸：{product.size}</div>
                  <div>爆珠：{product.hasBead ? '有' : '無'}</div>
                </div>
                <button
                  onClick={() => {
                    const products = JSON.parse(localStorage.getItem('products') || '[]');
                    localStorage.setItem(
                      'products', 
                      JSON.stringify(products.filter((p: Product) => p.id !== product.id))
                    );
                    window.location.reload();
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  刪除
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
