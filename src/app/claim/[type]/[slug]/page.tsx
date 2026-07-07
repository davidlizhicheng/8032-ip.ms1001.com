import { redirect } from "next/navigation";
import { getEntityBySlug } from "@/lib/services/entity";
import { entityPath } from "@/lib/utils/entity-paths";

type Props = { params: Promise<{ type: string; slug: string }> };

export default async function ClaimPage({ params }: Props) {
  const { slug } = await params;
  const entity = await getEntityBySlug(slug);
  if (!entity) redirect("/");
  redirect(`${entityPath(entity.type, entity.slug)}#claim`);
}
