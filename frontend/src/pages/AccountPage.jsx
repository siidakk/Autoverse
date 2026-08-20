import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/authContext";
import { describeError } from "../lib/api";

export default function AccountPage() {
  const { user, register, login, signOut } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === "register") {
        await register({ email, password, name });
      } else {
        await login({ email, password });
      }
      navigate("/garage");
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ?? describeError(requestError)
      );
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <div className="mx-auto max-w-[600px] px-5 py-20 md:px-8">
        <p className="label">06 / Account</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Signed in as {user.name || user.email}
        </h1>

        <div className="panel mt-8 p-6">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-fog">Email</dt>
              <dd className="readout text-chalk">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fog">Wishlist</dt>
              <dd className="readout text-chalk">{user.wishlist?.length ?? 0} cars</dd>
            </div>
          </dl>

          <div className="tick-rule-dense mt-5 opacity-60" />

          <div className="mt-5 flex gap-3">
            <Link to="/garage" className="btn btn-signal flex-1">
              My garage
            </Link>
            <button type="button" onClick={signOut} className="btn btn-ghost flex-1">
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[600px] px-5 py-20 md:px-8">
      <p className="label">06 / Account</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        {mode === "login" ? "Sign in" : "Make an account"}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-fog">
        Builds already save without one, and a share code will always reopen a
        build. An account is for keeping them together in one place.
      </p>

      <form onSubmit={submit} className="panel mt-8 space-y-5 p-6">
        {mode === "register" && (
          <label className="block">
            <span className="label">Name, if you like</span>
            <input
              className="field mt-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
          </label>
        )}

        <label className="block">
          <span className="label">Email</span>
          <input
            type="email"
            required
            className="field mt-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="label">Password</span>
          <input
            type="password"
            required
            minLength={8}
            className="field mt-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          {mode === "register" && (
            <span className="mt-2 block text-xs text-fog">
              Eight characters or more.
            </span>
          )}
        </label>

        {error && (
          <p className="border border-signal-deep bg-signal-deep/10 px-3 py-2 text-xs leading-relaxed text-fog">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-signal w-full disabled:opacity-60">
          {busy ? "Working…" : mode === "login" ? "Sign in" : "Create the account"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="label w-full text-center hover:text-signal"
        >
          {mode === "login"
            ? "No account yet? Make one"
            : "Already have one? Sign in"}
        </button>
      </form>
    </div>
  );
}
