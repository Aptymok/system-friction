export const dynamic = 'force-dynamic';

export default function ScoreFrictionPage() {
  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', background: '#060605' }}>
      <iframe
        title="ScoreFriction Operational Observatory"
        src="/scorefriction-operational.html"
        style={{
          width: '100vw',
          height: '100vh',
          border: 0,
          display: 'block',
          background: '#060605',
        }}
      />
    </main>
  );
}
