import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface CartState {
  quantityByProductId: Record<string, number>;
}

const initialState: CartState = {
  quantityByProductId: {},
};

// Cart state is local to product-app (decoupled store). The host learns
// about cart activity only through the "product:added-to-cart" event —
// it never reads this slice directly.
const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const { productId, quantity } = action.payload;
      state.quantityByProductId[productId] = (state.quantityByProductId[productId] ?? 0) + quantity;
    },
  },
});

export const { addToCart } = cartSlice.actions;
export default cartSlice.reducer;
