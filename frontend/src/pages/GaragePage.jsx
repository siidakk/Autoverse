import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../lib/authContext";
import { myBuilds, removeBuild } from "../lib/garage";
import { describeError } from "../lib/api";
import { cars } from "../data/cars";
import { formatRupees } from "../data/accessories";
import { recentlyViewed } from "../lib/recent";

export default function GaragePage() {
  const { user, checking, authHeader } = useAuth();

  const [builds, setBuilds] = useState(null);
  const [error, setError] = useState(null);
  const [recent] = useState(() => recentlyViewed());

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    myBuilds(authHeader)
      .then((list) => {
        if (!cancelled) setBuilds(list);
      })
      .catch((requestError) => {
        if (!cancelled) setError(describeError(requestError));
      });

    return () => {
      cancelled = true;
    };
  }, [user, authHeader]);

  const drop = async (code) => {
    try {
      await removeBuild(code, authHeader);
      setBuilds((current) => current.filter((build) => build.code !== code));
    } catch (requestError) {
      setError(describeError(requestError));
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-14 md:px-8">

      <header>
        <p className="label">07 / Garage</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          Everything you have saved.
        </h1>
        <div className="tick-rule mt-8 opacity-70" />
      </header>

      {/* SAVED BUILDS */}
      <section className="mt-12">
        {!user && !checking && (
          <div className="grid-veil border border-line-soft p-10 text-center">
            <p className="label">Not signed in</p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-fog">
              Builds save without an account and a share code will always reopen
              one. Signing in keeps them together here.
            </p>
            <Link to="/account" className="btn btn-signal mt-6">
              Sign in
            </Link>
          </div>
        )}

        {user && (
          <>
            <div className="flex items-center justify-between">
              <p className="label">
                {builds === null ? "Loading" : `${builds.length} saved`}
              </p>
              <Link to="/customise" className="label hover:text-signal">
                Build another →
              </Link>
            </div>

            {error && (
              <p className="mt-4 border border-signal-deep bg-signal-deep/10 px-4 py-3 text-xs text-fog">
                {error}
              </p>
            )}

            {builds?.length === 0 && (
              <div className="mt-5 border border-line-soft p-10 text-center">
                <p className="text-sm text-fog">
                  Nothing saved yet. Build something and press save.
                </p>
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {builds?.map((build, index) => (
                <motion.article
                  key={build.code}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  className="panel hud-frame p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="label">{build.code}</p>
                      <h3 className="mt-1 text-lg font-medium tracking-tight">
                        {build.carName}
                      </h3>
                    </div>

                    <span
                      className="block h-8 w-8 shrink-0 border border-line"
                      style={{ background: build.spec?.color ?? "#d8dce1" }}
                    />
                  </div>

                  <dl className="mt-4 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-fog">Accessories</dt>
                      <dd className="readout text-signal">{formatRupees(build.total)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-fog">Wheels</dt>
                      <dd className="readout text-chalk capitalize">
                        {build.spec?.wheelType ?? "stock"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-fog">Saved</dt>
                      <dd className="readout text-chalk">
                        {new Date(build.savedAt).toLocaleDateString("en-IN")}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex gap-2">
                    <Link
                      to={`/customise?build=${build.code}`}
                      className="btn btn-ghost flex-1 text-[10px]"
                    >
                      Open
                    </Link>
                    <button
                      type="button"
                      onClick={() => drop(build.code)}
                      className="btn btn-ghost px-3 text-[10px]"
                    >
                      Delete
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* RECENTLY VIEWED, WHICH NEEDS NO ACCOUNT */}
      {recent.length > 0 && (
        <section className="mt-16">
          <p className="label">Recently viewed</p>
          <p className="mt-2 text-xs text-fog">
            Kept on this device only. Nothing about this is sent anywhere.
          </p>

          <div className="mt-5 border-t border-line-soft">
            {recent.map((entry) => {
              const car = cars.find((item) => item.id === entry.id);
              if (!car) return null;

              return (
                <Link
                  key={entry.id}
                  to={`/customise?car=${car.id}`}
                  className="group flex items-center justify-between border-b border-line-soft py-4 transition-colors hover:bg-panel"
                >
                  <span className="text-sm">{car.name}</span>
                  <span className="flex items-center gap-4">
                    <span className="label">{car.bodyStyle}</span>
                    <span className="text-fog transition-colors group-hover:text-signal">→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
