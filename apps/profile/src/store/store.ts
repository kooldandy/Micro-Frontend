import { configureStore } from "@reduxjs/toolkit";
import profileReducer from "./profileSlice";
import sessionReducer from "./sessionSlice";

// Decoupled store: belongs to profile-app only. See docs/02-state-management.md.
export const store = configureStore({
  reducer: {
    profile: profileReducer,
    session: sessionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
