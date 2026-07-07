import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";

// Decoupled store: this instance belongs to auth-app ONLY. It is created
// fresh wherever App.tsx is rendered (standalone or federated into the
// host) and is never shared with other apps. Cross-app updates travel
// through @mfe/event-bus, not through this store. See docs/02.
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
