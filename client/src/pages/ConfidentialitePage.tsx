// Politique de confidentialité — page publique (URL requise par l'App Store et le
// Play Store). Accessible sans compte : https://app.friggo.fr/confidentialite
export function ConfidentialitePage() {
  const maj = '9 juillet 2026';
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
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '8px 0 4px' }}>Politique de confidentialité</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Dernière mise à jour : {maj}</p>

        <H>1. Responsable du traitement</H>
        <P>
          L'application Friggo est éditée par <strong>L'Oiseau Blanc Traiteur</strong> (SAS), 59 rue Roger Salengro,
          59770 Marly, France. Pour toute question relative à vos données : <strong>contact@friggo.fr</strong>.
        </P>

        <H>2. Données que nous collectons</H>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <Li><strong>Compte</strong> : adresse email et, si vous le fournissez, numéro de téléphone.</Li>
          <Li><strong>Fidélité</strong> : votre code fidélité, votre solde de points et l'historique associé.</Li>
          <Li><strong>Achats</strong> : plats achetés, montant, date et frigo concerné (justificatifs d'achat).</Li>
          <Li><strong>Avis et sondages</strong> : notes, commentaires et réponses que vous déposez volontairement.</Li>
          <Li><strong>Notifications</strong> : jeton de notification (push) et vos consentements email / push.</Li>
          <Li><strong>Frigo favori</strong> : le frigo que vous sélectionnez pour personnaliser l'affichage.</Li>
        </ul>
        <P>Nous ne collectons pas de données bancaires : les paiements sont traités directement par le terminal de paiement sur le frigo.</P>

        <H>3. Finalités</H>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <Li>Fournir le service : consultation des plats, achats, ouverture des casiers, justificatifs par email.</Li>
          <Li>Gérer le programme de fidélité et vos avantages.</Li>
          <Li>Vous envoyer, avec votre consentement, des notifications (nouveautés, promotions).</Li>
          <Li>Améliorer le service via vos avis et sondages.</Li>
        </ul>

        <H>4. Base légale</H>
        <P>Le traitement repose sur l'exécution du service que vous demandez (contrat) et, pour les communications marketing, sur votre <strong>consentement</strong>, que vous pouvez retirer à tout moment dans votre profil.</P>

        <H>5. Destinataires et sous-traitants</H>
        <P>
          Vos données sont hébergées chez <strong>OVHcloud</strong> (France). Les emails sont acheminés via le service de messagerie
          d'OVHcloud. Les notifications push transitent par le service de messagerie du navigateur/appareil.
          Nous <strong>ne vendons ni ne louons</strong> vos données à des tiers.
        </P>

        <H>6. Durée de conservation</H>
        <P>Vos données sont conservées tant que votre compte est actif. Vous pouvez supprimer votre compte à tout moment ; vos données personnelles sont alors effacées.</P>

        <H>7. Vos droits</H>
        <P>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et
          d'opposition. Depuis l'application (rubrique <em>Profil</em>), vous pouvez <strong>exporter vos données</strong> et
          <strong> supprimer votre compte</strong>. Pour toute demande : <strong>contact@friggo.fr</strong>. Vous pouvez également
          introduire une réclamation auprès de la CNIL (www.cnil.fr).
        </P>

        <H>8. Sécurité</H>
        <P>Les échanges sont chiffrés (HTTPS), les mots de passe sont hachés et l'accès à l'administration est protégé. Les secrets ne sont jamais exposés côté application.</P>

        <H>9. Modifications</H>
        <P>Cette politique peut être mise à jour. La date de dernière mise à jour figure en haut de cette page.</P>

        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 28, borderTop: '1px solid #eee', paddingTop: 14 }}>
          L'Oiseau Blanc Traiteur — Friggo · contact@friggo.fr
        </p>
      </div>
    </div>
  );
}
