import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicResearchLandingView } from '@/components/research/PublicResearchLandingView';
import { publicResearchLandingForSlug } from '@/lib/research/publicResearchLanding';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const landing = publicResearchLandingForSlug('PUBLICATION', slug);
  if (!landing) return {};
  const title = `${landing.node.title} · System Friction Institute`;
  return {
    title,
    description: landing.node.summary,
    alternates: { canonical: landing.canonicalUrl },
    openGraph: {
      type: 'article',
      url: landing.canonicalUrl,
      siteName: 'System Friction Institute',
      title,
      description: landing.node.summary,
    },
    other: {
      'sfi-canonical-object': landing.node.canonicalObjectId,
      'sfi-epistemic-state': landing.node.epistemicState,
      'sfi-publication-state': landing.node.publicationState,
    },
  };
}

export default async function PublicationLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const landing = publicResearchLandingForSlug('PUBLICATION', slug);
  if (!landing) notFound();
  return <PublicResearchLandingView landing={landing} />;
}
