import { lazy, Suspense, useMemo, type ComponentType } from "react";
import { RemoteErrorBoundary } from "./RemoteErrorBoundary";

interface RemoteAppProps {
  name: string;
  loader: () => Promise<{ default: ComponentType }>;
}

/**
 * Generic wrapper that lazy-loads a federated remote's exposed `App` and
 * mounts it under the current route. `loader` must be a stable, module-level
 * function reference (see App.tsx) so React.lazy isn't re-created every render.
 */
export function RemoteApp({ name, loader }: RemoteAppProps) {
  const LazyRemote = useMemo(() => lazy(loader), [loader]);

  return (
    <RemoteErrorBoundary name={name}>
      <Suspense fallback={<div className="host-p-6 host-text-center host-text-slate-500">Loading {name}…</div>}>
        <LazyRemote />
      </Suspense>
    </RemoteErrorBoundary>
  );
}
