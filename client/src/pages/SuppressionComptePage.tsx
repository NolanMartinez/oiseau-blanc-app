// Page publique de demande de suppression de compte (URL exigée par le Play Store
// et l'App Store). Accessible sans compte : https://app.friggo.fr/suppression-compte
export function SuppressionComptePage() {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '28px 0 8px' }}>{children}</h2>
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontSize: 15, lineHeight: 1.65, color: '#374151', margin: '0 0 10px' }}>{children}</p>
  );
  const Li = ({ children }: { children: React.ReactNode }) => (
    <li style={{ fontSize: 15, lineHeight: 1.6, color: '#374151', marginBottom: 6 }}>{children}</li>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', padding: '32px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '32px 28px' }}>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 4 }}>
          <span style={{ color: '#70C8F2' }}>Frig</span><span style={{ color: '#319966' }}>go</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '8px 0 4px' }}>Supprimer votre compte</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Application <strong>Friggo</strong> — éditée par L'Oiseau Blanc Traiteur</p>

        <H>Depuis l'application (immédiat)</H>
        <P>Vous pouvez supprimer votre compte vous-même, à tout moment :</P>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <Li>Ouvrez l'application <strong>Friggo</strong> et connectez-vous.</Li>
          <Li>Allez dans <strong>Profil</strong>.</Li>
          <Li>Appuyez sur <strong>« Supprimer mon compte »</strong> et confirmez.</Li>
        </ol>
        <P>Votre compte et vos données personnelles sont alors supprimés immédiatement.</P>

        <H>Par e-mail</H>
        <P>
          Si vous ne parvenez pas à accéder à l'application, envoyez une demande à
          <strong> contact@friggo.fr</strong> depuis l'adresse e-mail de votre compte, avec l'objet
          « Suppression de compte ». Nous traitons la demande sous 30 jours maximum.
        </P>

        <H>Données supprimées</H>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <Li>Votre adresse e-mail et votre numéro de téléphone (le cas échéant).</Li>
          <Li>Votre code de fidélité et votre solde de points.</Li>
          <Li>Vos avis, notes et réponses aux sondages.</Li>
          <Li>Vos consentements (email / notifications) et votre frigo favori.</Li>
        </ul>

        <H>Données conservées</H>
        <P>
          Les <strong>justificatifs de vente</strong> (tickets) peuvent être conservés de façon
          <strong> anonymisée</strong> pour répondre à nos obligations comptables et fiscales légales
          (durée légale en vigueur), sans lien avec votre identité. Aucune autre donnée n'est conservée.
        </P>

        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 28, borderTop: '1px solid #eee', paddingTop: 14 }}>
          L'Oiseau Blanc Traiteur — Friggo · contact@friggo.fr · <a href="/confidentialite" style={{ color: '#319966' }}>Politique de confidentialité</a>
        </p>
      </div>
    </div>
  );
}
