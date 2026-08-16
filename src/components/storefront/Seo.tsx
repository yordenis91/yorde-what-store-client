interface SeoProps {
  title: string
  description?: string | null
  /** Absolute URL of the sharing image. */
  image?: string | null
  type?: 'website' | 'product'
  siteName?: string
  /** Structured data for rich results, serialised as JSON-LD. */
  jsonLd?: Record<string, unknown>
  /** For pages with nothing to rank — a cart holds one visitor's basket. */
  noIndex?: boolean
}

/**
 * Per-page document metadata.
 *
 * React 19 hoists `<title>`, `<meta>` and `<link>` out of the tree and into
 * `<head>` on its own, so this needs no helmet library and no effects.
 *
 * Worth knowing what this does and does not buy: Google executes JavaScript, so
 * it sees these tags. Link unfurlers — WhatsApp, Facebook, Telegram, iMessage —
 * read the raw HTML response and do not, so shared links still preview from the
 * static index.html. Fixing that needs HTML rendered per-URL on the server.
 */
export function Seo({ title, description, image, type = 'website', siteName, jsonLd, noIndex }: SeoProps) {
  const url = `${window.location.origin}${window.location.pathname}`

  return (
    <>
      <title>{title}</title>
      {noIndex ? <meta name="robots" content="noindex" /> : <link rel="canonical" href={url} />}
      {description && <meta name="description" content={description} />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:url" content={url} />
      {siteName && <meta property="og:site_name" content={siteName} />}
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      {image && <meta name="twitter:image" content={image} />}

      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
    </>
  )
}
