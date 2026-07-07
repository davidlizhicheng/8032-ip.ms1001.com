import { notFound } from "next/navigation";
import { GroupPageView } from "@/components/groups/GroupPageView";
import { getOrganizationGroupBySlug } from "@/lib/services/organization-group";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function GroupDetailPage({ params }: Props) {
  const { slug } = await params;
  let group: Awaited<ReturnType<typeof getOrganizationGroupBySlug>> = null;
  try {
    group = await getOrganizationGroupBySlug(slug);
  } catch (error) {
    console.warn(`[groups/${slug}] unavailable:`, error);
  }

  if (!group) notFound();

  return <GroupPageView group={group} />;
}
