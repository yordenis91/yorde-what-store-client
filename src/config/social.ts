import {
  FacebookIcon,
  InstagramIcon,
  TiktokIcon,
  WebsiteIcon,
  WhatsappIcon,
  XIcon,
  YoutubeIcon,
} from '@/components/ui/icons'

/**
 * Social networks a store can link to, in the order they render in the
 * storefront header and in the settings form.
 *
 * Stored on the tenant as `socialLinks`, a free-form JSON object — this list is
 * what the UI knows how to render, so an unrecognised key is simply ignored.
 */
export const SOCIAL_NETWORKS = [
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon, placeholder: 'https://instagram.com/tutienda' },
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon, placeholder: 'https://facebook.com/tutienda' },
  { key: 'whatsapp', label: 'WhatsApp', Icon: WhatsappIcon, placeholder: 'https://wa.me/15551234567' },
  { key: 'tiktok', label: 'TikTok', Icon: TiktokIcon, placeholder: 'https://tiktok.com/@tutienda' },
  { key: 'youtube', label: 'YouTube', Icon: YoutubeIcon, placeholder: 'https://youtube.com/@tutienda' },
  { key: 'x', label: 'X', Icon: XIcon, placeholder: 'https://x.com/tutienda' },
  { key: 'website', label: 'Website', Icon: WebsiteIcon, placeholder: 'https://tutienda.com' },
] as const

export type SocialNetworkKey = (typeof SOCIAL_NETWORKS)[number]['key']
