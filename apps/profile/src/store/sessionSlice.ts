import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface SessionState {
  userId: string | null;
}

const initialState: SessionState = {
  userId: null,
};

// Mirrors auth session state locally via @mfe/event-bus — this is NOT a
// shared Redux store. profile-app decides for itself how to represent the
// "user is logged in" fact it learns about from auth-app's events.
const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<{ userId: string }>) {
      state.userId = action.payload.userId;
    },
    sessionEnded(state) {
      state.userId = null;
    },
  },
});

export const { sessionStarted, sessionEnded } = sessionSlice.actions;
export default sessionSlice.reducer;
