import { useState } from "react";
import { findLoginUser } from "../constants/users.js";

export default function LoginPage({ onLogin }) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const user = findLoginUser(id.trim(), password);

    if (!user) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    setError("");
    onLogin(user);
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <span>L</span>
          <div>
            <strong>Lalendar</strong>
            <small>private family calendar</small>
          </div>
        </div>

        <label>
          아이디
          <input value={id} onChange={(event) => setId(event.target.value)} autoComplete="username" autoFocus />
        </label>

        <label>
          비밀번호
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </label>

        {error && <p className="login-error">{error}</p>}

        <button type="submit">로그인</button>
      </form>
    </main>
  );
}
