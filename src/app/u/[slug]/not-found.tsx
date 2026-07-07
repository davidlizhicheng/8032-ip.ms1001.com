import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
      <h1 className="text-6xl font-bold text-amber-400">404</h1>
      <p className="mt-4 text-lg text-zinc-400">名片未找到</p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-zinc-900"
      >
        返回首页
      </Link>
    </div>
  );
}
