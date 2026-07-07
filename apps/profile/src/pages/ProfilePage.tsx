import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchFailure, fetchStart, fetchSuccess, type ProfileData } from "../store/profileSlice";
import { profileApi } from "../api/client";
import { sanitizeHtml } from "../utils/sanitizeHtml";
import type { ApiError } from "@mfe/http-client";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.session.userId);
  const { data, status, error } = useAppSelector((state) => state.profile);

  useEffect(() => {
    if (!userId) return;
    dispatch(fetchStart());
    profileApi
      .get<ProfileData>(`/${userId}`)
      .then((res) => dispatch(fetchSuccess(res.data)))
      .catch((err: ApiError) => dispatch(fetchFailure(err.message ?? "Failed to load profile")));
  }, [userId, dispatch]);

  if (!userId) {
    return (
      <div className="profile-max-w-md profile-mx-auto profile-mt-10 profile-p-6 profile-text-center profile-text-slate-600">
        <p>Please sign in to view your profile.</p>
        <a href="/auth/login" className="profile-underline profile-text-slate-900">
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="profile-max-w-md profile-mx-auto profile-mt-10 profile-p-6 profile-rounded-lg profile-border profile-border-slate-200 profile-shadow-sm profile-bg-white">
      <h1 className="profile-text-xl profile-font-semibold profile-mb-4 profile-text-slate-900">My Profile</h1>
      {status === "loading" && <p className="profile-text-slate-500">Loading…</p>}
      {error && <p className="profile-text-red-600 profile-text-sm">{error}</p>}
      {data && (
        <dl className="profile-flex profile-flex-col profile-gap-2 profile-text-sm profile-text-slate-700">
          <div>
            <dt className="profile-font-medium">Name</dt>
            <dd>{data.name}</dd>
          </div>
          <div>
            <dt className="profile-font-medium">Email</dt>
            <dd>{data.email}</dd>
          </div>
          <div>
            <dt className="profile-font-medium">Bio</dt>
            {/* Sanitized on purpose (3.2 XSS control, docs/07-security-architecture.md)
                — this is user-authored free text rendered as markup, not plain text. */}
            <dd dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.bio) }} />
          </div>
        </dl>
      )}
      <Link to="edit" className="profile-inline-block profile-mt-4 profile-underline profile-text-slate-900">
        Edit profile
      </Link>
    </div>
  );
}
