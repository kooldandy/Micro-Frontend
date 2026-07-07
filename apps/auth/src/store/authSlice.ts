import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  status: "idle" | "loading" | "error";
  error: string | null;
  /** True once the initial GET /session bootstrap check has resolved. */
  bootstrapped: boolean;
}

// No token field, on purpose — the BFF pattern (docs/07-security-architecture.md)
// means the session lives in a backend-issued httpOnly cookie this app never
// reads. `user` is in-memory only; it's re-derived via /session on reload.
const initialState: AuthState = {
  user: null,
  status: "idle",
  error: null,
  bootstrapped: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart(state) {
      state.status = "loading";
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<{ user: AuthUser }>) {
      state.status = "idle";
      state.user = action.payload.user;
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.status = "error";
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.status = "idle";
      state.error = null;
    },
    sessionChecked(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.bootstrapped = true;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, sessionChecked } = authSlice.actions;
export default authSlice.reducer;
