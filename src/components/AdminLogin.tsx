interface AdminLoginProps {
  onLogin: () => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h2>Admin Login</h2>
      <button onClick={onLogin}>Login as Admin</button>
    </div>
  );
}
