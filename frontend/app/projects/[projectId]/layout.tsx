import { ProjectNavigation } from "@/features/workspace/ProjectNavigation";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return <><ProjectNavigation /><div id="project-content" tabIndex={-1}>{children}</div></>;
}
