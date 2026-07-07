import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  userId: string | null;
  cartCount: number;
}

const initialState: UiState = {
  userId: null,
  cartCount: 0,
};

// Decoupled store: belongs to host-app only. It mirrors facts learned from
// other apps' @mfe/event-bus events purely for nav/header display — it is
// never passed into a remote and never reads a remote's store.
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<{ userId: string }>) {
      state.userId = action.payload.userId;
    },
    sessionEnded(state) {
      state.userId = null;
    },
    cartItemAdded(state, action: PayloadAction<{ quantity: number }>) {
      state.cartCount += action.payload.quantity;
    },
  },
});

export const { sessionStarted, sessionEnded, cartItemAdded } = uiSlice.actions;
export default uiSlice.reducer;
