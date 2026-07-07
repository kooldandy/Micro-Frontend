import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface ProductState {
  items: Product[];
  status: "idle" | "loading" | "error";
  error: string | null;
}

const initialState: ProductState = {
  items: [],
  status: "idle",
  error: null,
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    fetchStart(state) {
      state.status = "loading";
      state.error = null;
    },
    fetchSuccess(state, action: PayloadAction<Product[]>) {
      state.status = "idle";
      state.items = action.payload;
    },
    fetchFailure(state, action: PayloadAction<string>) {
      state.status = "error";
      state.error = action.payload;
    },
  },
});

export const { fetchStart, fetchSuccess, fetchFailure } = productSlice.actions;
export default productSlice.reducer;
