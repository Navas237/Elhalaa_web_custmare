import Link from 'next/link'

export type LegalSection = { heading: string; paragraphs?: string[]; items?: string[] }

export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}) {
  return (
    <main style={{ background: '#F8F5FB', minHeight: '100vh', color: '#2A1238' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 72px', lineHeight: 1.9 }}>
        <Link href="/" style={{ color: '#2A1238', fontWeight: 700, textDecoration: 'none' }}>
          الحلاق
        </Link>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '24px 0 4px' }}>{title}</h1>
        <p style={{ color: '#6B5A78', margin: '0 0 24px', fontSize: 14 }}>آخر تحديث: {updated}</p>
        <p style={{ margin: '0 0 8px' }}>{intro}</p>
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '28px 0 6px' }}>{s.heading}</h2>
            {s.paragraphs?.map((p) => (
              <p key={p} style={{ margin: '0 0 8px' }}>{p}</p>
            ))}
            {s.items && (
              <ul style={{ margin: 0, paddingInlineStart: 22 }}>
                {s.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <p style={{ marginTop: 40, fontSize: 14 }}>
          <Link href="/privacy" style={{ color: '#2A1238' }}>سياسة الخصوصية</Link>
          {' · '}
          <Link href="/terms" style={{ color: '#2A1238' }}>شروط الاستخدام</Link>
        </p>
      </div>
    </main>
  )
}
