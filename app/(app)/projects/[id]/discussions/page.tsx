import { requireProjectModule } from "@/lib/projects/guard";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { DiscussionsClient } from "@/components/discussions/DiscussionsClient";
import { can } from "@/lib/access/permissions";
import { getMemberRole } from "@/lib/projects/access";
import { fetchProjects } from "@/lib/projects/server";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDiscussionsPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "prospects");

  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const projects = await fetchProjects(supabase, user.id, true);
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();

  const role = await getMemberRole(supabase, id, user.id);
  if (!role) notFound();

  return (
    <DiscussionsClient
      projectId={id}
      projectName={project.name}
      currentUserId={user.id}
      canWrite={can(role, "records.comment")}
    />
  );
}
