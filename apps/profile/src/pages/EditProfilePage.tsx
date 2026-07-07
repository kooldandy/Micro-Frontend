import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { emit } from "@mfe/event-bus";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { updateSuccess, type ProfileData } from "../store/profileSlice";
import { profileApi } from "../api/client";
import type { ApiError } from "@mfe/http-client";

export default function EditProfilePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const userId = useAppSelector((state) => state.session.userId);
  const current = useAppSelector((state) => state.profile.data);
  const [name, setName] = useState(current?.name ?? "");
  const [bio, setBio] = useState(current?.bio ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!userId) return;
    try {
      const { data } = await profileApi.put<ProfileData>(`/${userId}`, { name, bio });
      dispatch(updateSuccess(data));
      emit("profile:updated", { userId, changes: { name, bio } });
      navigate("..", { relative: "path" });
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to update profile");
    }
  }

  if (!userId) {
    return (
      <p className="profile-text-center profile-mt-10 profile-text-slate-600">
        Please sign in to edit your profile.
      </p>
    );
  }

  return (
    <div className="profile-max-w-md profile-mx-auto profile-mt-10 profile-p-6 profile-rounded-lg profile-border profile-border-slate-200 profile-shadow-sm profile-bg-white">
      <h1 className="profile-text-xl profile-font-semibold profile-mb-4 profile-text-slate-900">Edit Profile</h1>
      <form onSubmit={handleSubmit} className="profile-flex profile-flex-col profile-gap-3">
        <label className="profile-flex profile-flex-col profile-gap-1 profile-text-sm profile-text-slate-700">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="profile-border profile-border-slate-300 profile-rounded profile-px-3 profile-py-2"
          />
        </label>
        <label className="profile-flex profile-flex-col profile-gap-1 profile-text-sm profile-text-slate-700">
          Bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="profile-border profile-border-slate-300 profile-rounded profile-px-3 profile-py-2"
          />
        </label>
        {error && <p className="profile-text-sm profile-text-red-600">{error}</p>}
        <button
          type="submit"
          className="profile-bg-slate-900 profile-text-white profile-rounded profile-py-2 profile-mt-2"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
