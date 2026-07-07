import { createEntityPage, generateEntityMetadata } from "@/lib/pages/entity-page";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return generateEntityMetadata(slug, "company");
}

export default createEntityPage("company");
