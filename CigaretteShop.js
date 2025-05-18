const handleSubmit = () => {
  // 添加表单验证
  if (!region || !typePref || !size || !budget) {
    alert("請填寫所有必填項目");
    return;
  }

  const base = "https://tally.so/r/your-form-id";
  const params = new URLSearchParams({
    'answers[居住地區]': region,
    'answers[偏好品項]': typePref,
    'answers[喜好尺寸]': size,
    'answers[預算範圍]': budget,
    'answers[搜尋關鍵字]': keyword,
    'answers[購物車內容]': cart.join(", ")
  });
  window.open(`${base}?${params.toString()}`, "_blank");
};

const handleAddToCart = (item) => {
  if (!item.trim()) {
    alert("請輸入關鍵字");
    return;
  }
  setCart([...cart, item.trim()]);
  setKeyword(""); // 清空输入框
};

const handleRemoveFromCart = (index) => {
  setCart(cart.filter((_, idx) => idx !== index));
};

return (
  <div className="p-6 max-w-xl mx-auto">
    {step !== "welcome" && (
      <button 
        onClick={() => setStep("welcome")} 
        className="mb-4 text-gray-600 hover:text-gray-800 flex items-center"
      >
        ← 返回上一步
      </button>
    )}

    {step === "welcome" && (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <h2 className="text-2xl font-bold">你好，阿弟休假中 😴</h2>
        <p className="text-lg">請問你住在哪裡？</p>
        <div className="space-y-4">
          <button 
            onClick={() => { setRegion("多倫多"); setStep("preferences"); }} 
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-lg"
          >
            多倫多
          </button>
          <button 
            onClick={() => { setRegion("多倫多以外"); setStep("preferences"); }} 
            className="w-full bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg text-lg"
          >
            多倫多以外
          </button>
        </div>
      </div>
    )}

    {step === "preferences" && (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center mb-8">請選擇你的偏好</h2>
        
        // ... existing preferences form code ...
      </div>
    )}
  </div>
); 