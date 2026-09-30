export const ROLES = ['admin', 'superAdmin', 'customer'] as const
export type Role = (typeof ROLES)[number]

/** DOM id of the "how it works" section — the audience cards scroll to it. */
export const HOW_SECTION_ID = 'como-funciona'
export const FAQ_SECTION_ID = 'faq'
