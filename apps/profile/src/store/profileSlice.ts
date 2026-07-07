import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  bio: string;
}

interface ProfileState {
  data: ProfileData | null;
  status: "idle" | "loading" | "error";
  error: string | null;
}

const initialState: ProfileState = {
  data: null,
  status: "idle",
  error: null,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    fetchStart(state) {
      state.status = "loading";
      state.error = null;
    },
    fetchSuccess(state, action: PayloadAction<ProfileData>) {
      state.status = "idle";
      state.data = action.payload;
    },
    fetchFailure(state, action: PayloadAction<string>) {
      state.status = "error";
      state.error = action.payload;
    },
    updateSuccess(state, action: PayloadAction<ProfileData>) {
      state.status = "idle";
      state.data = action.payload;
    },
  },
});

export const { fetchStart, fetchSuccess, fetchFailure, updateSuccess } = profileSlice.actions;
export default profileSlice.reducer;
