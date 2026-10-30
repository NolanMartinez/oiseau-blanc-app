// Page d'assistance publique (URL de support requise par l'App Store et le
// Play Store). Accessible sans compte : https://app.friggo.fr/support
export function SupportPage() {
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '28px 0 8px' }}>{children}</h2>
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontSize: 15, lineHeight: 1.65, color: '#374151', margin: '0 0 10px' }}>{children}</p>
  );
  const Q = ({ q, children }: { q: string; children: React.ReactNode }) => (
    <div style={{ margin: '0 0 14px' }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{q}</p>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: '#374151', margin: 0 }}>{children}</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', padding: '32px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '32px 28px' }}>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 4 }}>
          <span style={{ color: '#70C8F2' }}>Frig</span><span style={{ color: '#319966' }}>go</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '8px 0 4px' }}>Assistance</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Application <strong>Friggo</strong> — éditée par L'Oiseau Blanc Traiteur</p>

        <H>Nous contacter</H>
        <P>
          Une question, un problème avec une commande ou votre compte ? Écrivez-nous à
          {' '}<a href="mailto:contact@friggo.fr" style={{ color: '#319966', fontWeight: 600 }}>contact@friggo.fr</a>.
          Nous répondons sous 48 h ouvrées.
        </P>

        <H>Questions fréquentes</H>
        <Q q="Comment je me connecte ?">
          Entrez votre adresse e-mail dans l'application : vous recevez un code ou un lien de connexion. Pas de mot de passe à retenir.
        </Q>
        <Q q="Où voir la carte de mon frigo ?">
          Dans l'onglet « Mon Frigo », après avoir sélectionné le frigo de votre entreprise. La carte (plats, prix, allergènes, disponibilité) est mise à jour en temps réel.
        </Q>
        <Q q="Comment fonctionne la fidélité ?">
          Saisissez votre code fidélité à la borne lors de chaque achat : vous cumulez des points et obtenez des repas offerts. Votre solde est visible dans l'onglet « Fidélité ».
        </Q>
        <Q q="Je n'ai pas reçu mon reçu par e-mail.">
          Vérifiez vos spams. Le reçu est envoyé à l'adresse de votre compte (ou saisie à la borne). Si besoin, contactez-nous à contact@friggo.fr avec la date et le frigo concernés.
        </Q>
        <Q q="Comment supprimer mon compte ?">
          Depuis l'application : Profil → « Supprimer mon compte ». Ou via la page{' '}
          <a href="/suppression-compte" style={{ color: '#319966', fontWeight: 600 }}>suppression de compte</a>.
        </Q>

        <H>Liens utiles</H>
        <P>
          <a href="/confidentialite" style={{ color: '#319966', fontWeight: 600 }}>Politique de confidentialité</a>
          {' · '}
          <a href="/suppression-compte" style={{ color: '#319966', fontWeight: 600 }}>Supprimer mon compte</a>
        </P>

        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 28, borderTop: '1px solid #eee', paddingTop: 14 }}>
          L'Oiseau Blanc Traiteur — Friggo · <a href="mailto:contact@friggo.fr" style={{ color: '#319966' }}>contact@friggo.fr</a>
        </p>
      </div>
    </div>
  );
}
