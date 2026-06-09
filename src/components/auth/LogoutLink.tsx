export function LogoutLink({ className }: { className?: string }) {
  return (
    <a
      href="/logout"
      className={className ?? 'border border-[#26221b] px-3 py-2 text-[#a89469] hover:border-[#b8924b] hover:text-[#ead8aa]'}
    >
      Cerrar sesión
    </a>
  )
}
