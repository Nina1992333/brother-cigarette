import { useState, useEffect } from "react";

interface Product {
  _id?: string;
  name: string;
  price: number;
  size: string;
  category: string;
  image?: string;
}

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(data => setProducts(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h2>商品管理</h2>
      {loading ? (
        <p>載入中...</p>
      ) : (
        <ul>
          {products.map(product => (
            <li key={product._id}>
              <strong>{product.name}</strong> - ${product.price} - {product.size} - {product.category}
              {product.image && <img src={product.image} alt={product.name} style={{ width: 50, marginLeft: 10 }} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminProducts;