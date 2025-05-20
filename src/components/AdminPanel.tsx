import { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';

interface Product {
  // ... 現有的 interface 保持不變 ...
}

export function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newProduct, setNewProduct] = useState<Product>({
    // ... 現有的 state 保持不變 ...
  });

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    setIsAuthenticated(isAdmin);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  // 如果未登入，顯示登入頁面
  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  // 以下是原有的 AdminPanel 代碼
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... 現有的代碼保持不變 ...
  };

  // ... 其餘現有代碼保持不變 ...

  return (
    <div style={{ 
      width: '100vw', 
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: 'rgb(243 244 246)'
    }}>
      {/* 添加登出按鈕 */}
      <button
        onClick={() => {
          localStorage.removeItem('isAdmin');
          setIsAuthenticated(false);
        }}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '8px 16px',
          backgroundColor: '#EF4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        登出
      </button>

      {/* 原有的 UI 保持不變 */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
      }}>
        {/* ... 現有的表單和列表代碼保持不變 ... */}
      </div>
    </div>
  );
}
