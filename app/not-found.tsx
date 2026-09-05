import Link from "next/link";
import { ArrowLeft, FileQuestion, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 lg:p-10 shadow-xl border border-slate-100 relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <FileQuestion className="w-8 h-8 text-indigo-600" />
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-slate-100 text-slate-600 mb-3 inline-block">
          Error 404
        </span>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          Page or Request Not Found
        </h1>

        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          The request or page you are looking for does not exist, has been removed, or you do not have permission to view it.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/team"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4" />
            Team Dashboard
          </Link>
          <Link
            href="/team/requests"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            My Requests
          </Link>
        </div>
      </div>
    </div>
  );
}
