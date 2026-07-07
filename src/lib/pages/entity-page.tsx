import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEntityBySlug } from "@/lib/services/entity";
import { EntityPageView } from "@/components/entity/EntityPageView";
import { PrivatePageGate } from "@/components/visibility/PrivatePageGate";
import { isPublicVisibility } from "@/lib/visibility";
import { discoverImagesForEntityPage } from "@/lib/search/discover-brand-images-server";
import { getAdSlotConfig } from "@/lib/services/ad-slot";

type Props = { params: Promise<{ slug: string }> };

async function loadEntity(slug: string, type?: string) {
  const entity = await getEntityBySlug(slug);
  if (!entity) return null;
  if (type && entity.type !== type) return null;
  if (entity.visibility === "admin_hidden" || entity.status === "hidden") return null;
  return entity;
}

export async function generateEntityMetadata(
  slug: string,
  type?: string,
): Promise<Metadata> {
  const entity = await getEntityBySlug(slug);
  if (!entity || entity.visibility === "admin_hidden") return { title: "页面未找到" };
  return {
    title: entity.profile?.seoTitle || `${entity.name} | AI品牌档案`,
    description: entity.profile?.seoDescription || entity.profile?.summary || undefined,
  };
}

export function createEntityPage(type?: string) {
  return async function EntityPage({ params }: Props) {
    const { slug } = await params;
    const entity = await loadEntity(slug, type);
    if (!entity) notFound();

    if (!isPublicVisibility(entity.visibility)) {
      return (
        <PrivatePageGate
          kind="entity"
          slug={slug}
          name={entity.name}
          visibility={entity.visibility}
        />
      );
    }

    const galleryCount = entity.mediaAssets.filter((m) => m.type !== "cover").length;
    const discoveredBrandImages = await discoverImagesForEntityPage(
      entity.name,
      entity.type,
      galleryCount,
    );

    const adSlot = await getAdSlotConfig();

    return (
      <EntityPageView entity={entity} discoveredBrandImages={discoveredBrandImages} adSlot={adSlot} />
    );
  };
}
