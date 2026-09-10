"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createDashboard, listDashboards, listVisualizations } from "@/features/dashboard/api";
import { DashboardEditor } from "@/features/dashboard/DashboardEditor";

export default function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const client = useQueryClient();
  const dashboards = useQuery({ queryKey: ["dashboards", projectId], queryFn: () => listDashboards(projectId) });
  const visualizations = useQuery({ queryKey: ["visualizations", projectId], queryFn: () => listVisualizations(projectId) });
  const create = useMutation({ mutationFn: () => createDashboard(projectId, "Sales dashboard"), onSuccess: () => client.invalidateQueries({ queryKey: ["dashboards", projectId] }) });
  const error = dashboards.error ?? visualizations.error ?? create.error;
  if (dashboards.data?.[0] && visualizations.data) return <DashboardEditor key={dashboards.data[0].id} initial={dashboards.data[0]} visualizations={visualizations.data} />;
  return <main className="grid min-h-screen place-items-center bg-[#0b0f0a] p-6 text-white"><div className="text-center"><h1 className="text-3xl">Dashboard</h1>{error ? <p role="alert" className="mt-4 text-red-200">{error.message}</p> : null}{dashboards.isPending || visualizations.isPending ? <p className="mt-4">Loading…</p> : <button onClick={() => create.mutate()} disabled={create.isPending} className="mt-6 rounded-full bg-[#b7ff5a] px-5 py-3 text-black">Create dashboard</button>}<Link href={`/projects/${projectId}/workflow`} className="mt-5 block text-[#b7ff5a]">Workflow</Link></div></main>;
}
