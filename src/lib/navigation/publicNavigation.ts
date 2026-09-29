export const SFI_PUBLIC_NAV = Object.freeze([
  { href:'/', label:'HOME' },
  { href:'/observatory', label:'OBSERVATORY' },
  { href:'/publications', label:'REGISTRY' },
  { href:'/login', label:'SIGN IN' },
] as const);

export type SfiPublicNavHref = (typeof SFI_PUBLIC_NAV)[number]['href'];
