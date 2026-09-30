export const SFI_PUBLIC_NAV = Object.freeze([
  { href:'/', label:'HOME' },
] as const);

export type SfiPublicNavHref = (typeof SFI_PUBLIC_NAV)[number]['href'];
