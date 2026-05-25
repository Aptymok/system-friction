export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060605] px-4 py-10 text-paper">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,rgba(200,169,81,0.035)_1px,transparent_1px),linear-gradient(rgba(200,169,81,0.022)_1px,transparent_1px)] bg-[length:56px_56px] opacity-25" />
      <div className="scanline fixed inset-0" />
      <div className="relative mx-auto flex min-h-[calc(100vh-80px)] max-w-4xl items-center justify-center">
        {children}
      </div>
    </main>
  )
}
