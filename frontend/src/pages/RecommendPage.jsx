import MLPanel from "../components/MLPanel";
import { Link } from "react-router-dom";

export default function RecommendPage() {
  return (
    <div className="h-screen w-full flex bg-black text-white">

      {/* LEFT INFO */}
      <div className="flex-1 p-10">

        <h1 className="text-4xl font-bold mb-6">
          AI Recommendations
        </h1>

        <p className="text-gray-300">
          Your ML model is running in MLPanel →
        </p>

        <Link
          to="/"
          className="inline-block mt-6 bg-green-500 px-4 py-2 rounded"
        >
          ← Back to Showroom
        </Link>

      </div>

      {/* RIGHT = YOUR ORIGINAL ML PANEL */}
      <div className="w-96 bg-white/10 p-5">
        <MLPanel />
      </div>

    </div>
  );
}