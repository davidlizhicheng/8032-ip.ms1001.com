import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCardBySlug } from "@/lib/services/card";
import { PublicCardView } from "@/components/card/PublicCardView";
import { PrivatePageGate } from "@/components/visibility/PrivatePageGate";
import { isPublicVisibility } from "@/lib/visibility";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const card = await getCardBySlug(slug, { includePrivate: true });
  if (!card || card.visibility === "admin_hidden") return { title: "名片未找到" };

  return {
    title: `${card.name} | 个人品牌名片`,
    description: card.brandSlogan || card.bio || `${card.name}的个人品牌网页名片`,
  };
}

export default async function PublicCardPage({ params }: Props) {
  const { slug } = await params;
  const card = await getCardBySlug(slug, { includePrivate: true });

  if (!card || card.visibility === "admin_hidden") {
    notFound();
  }

  if (!isPublicVisibility(card.visibility)) {
    return (
      <PrivatePageGate
        kind="card"
        slug={slug}
        name={card.name}
        visibility={card.visibility}
      />
    );
  }

  return <PublicCardView card={card} />;
}
