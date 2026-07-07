export function entityPath(type: string, slug: string): string {
  const map: Record<string, string> = {
    city: `/city/${slug}`,
    company: `/company/${slug}`,
    person: `/person/${slug}`,
    brand: `/brand/${slug}`,
    profession: `/profession/${slug}`,
  };
  return map[type] || `/company/${slug}`;
}

export function reportPath(type: string, slug: string): string {
  return `/report/${type}/${slug}`;
}
