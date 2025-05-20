import { useState } from "react";

const AdminAdd = () => {
  const [form, setForm] = useState({
    name: "",
    price: "",
    size: "",
    category: "",
    image: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 這裡可以加上 API 請求，將商品資料送到後端
    alert("（範例）商品已送出：" + JSON.stringify(form));
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>新增商品</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>名稱：</label>
          <input name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <label>價格：</label>
          <input name="price" value={form.price} onChange={handleChange} required type="number" />
        </div>
        <div>
          <label>尺寸：</label>
          <input name="size" value={form.size} onChange={handleChange} required />
        </div>
        <div>
          <label>類別：</label>
          <input name="category" value={form.category} onChange={handleChange} required />
        </div>
        <button type="submit">送出</button>
      </form>
    </div>
  );
};

export default AdminAdd;