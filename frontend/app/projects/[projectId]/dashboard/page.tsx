import Link from "next/link";

export default async function DashboardPlaceholder({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <main className="grid min-h-screen place-items-center bg-[#0b0f0a] text-white"><div className="text-center"><h1 className="text-3xl">Dashboard</h1><p className="mt-3 text-white/40">Dashboard editing is scheduled for M13.</p><Link className="mt-6 inline-block text-[#b7ff5a]" href={`/projects/${projectId}`}>← Project</Link></div></main>;
}
