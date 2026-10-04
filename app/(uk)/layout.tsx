import { RootShell } from '@/components/pomme/root-shell'
import { baseMetadata, baseViewport } from '@/lib/site-metadata'

export const metadata = baseMetadata
export const viewport = baseViewport

export default function UkLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootShell lang="en-GB">{children}</RootShell>
}
