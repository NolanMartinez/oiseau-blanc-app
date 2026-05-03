import { useState, type FormEvent } from 'react';
import { Star, CheckCircle, Mail, Phone } from 'lucide-react';
import api from '../../services/api';
import { MOCK_DISHES } from '../../utils/mockDishes';

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={32}
            className={
              star <= (hovered || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: 'Mauvais',
  2: 'Moyen',
  3: 'Bien',
  4: 'Très bien',
  5: 'Excellent !',
};

export function Review() {
  const [dishId, setDishId] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!dishId) { setError('Veuillez sélectionner un plat.'); return; }
    if (rating === 0) { setError('Veuillez attribuer une note.'); return; }
    if (!email && !phone) { setError('Veuillez renseigner votre email ou téléphone.'); return; }

    setLoading(true);
    try {
      await api.post('/public/reviews', {
        dish_id: dishId,
        rating,
        comment: comment || undefined,
        email: email || undefined,
        phone: phone || undefined,
      });
      setSuccess(true);
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Merci pour votre avis !</h2>
          <p className="text-sm text-gray-500 mb-6">
            Votre retour nous aide à améliorer nos plats.
          </p>
          <button
            onClick={() => { setSuccess(false); setDishId(''); setRating(0); setComment(''); }}
            className="text-sm text-blue-600 hover:underline"
          >
            Donner un autre avis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Déposer un avis</h1>
          <p className="text-sm text-gray-500 mt-1">L'Oiseau Blanc Traiteur</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Sélection du plat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quel plat avez-vous goûté ?
            </label>
            <select
              value={dishId}
              onChange={(e) => setDishId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Sélectionner un plat…</option>
              {MOCK_DISHES.map((dish) => (
                <option key={dish.id} value={dish.id}>
                  {dish.name} — {dish.category}
                </option>
              ))}
            </select>
          </div>

          {/* Note étoiles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Votre note
            </label>
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="text-sm text-yellow-600 font-medium mt-1">{RATING_LABELS[rating]}</p>
            )}
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commentaire <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Partagez votre expérience…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{comment.length}/500</p>
          </div>

          {/* Identification */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Votre contact</p>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 00 00 00 00"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-400">Au moins un des deux est requis.</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Envoi...' : 'Envoyer mon avis'}
          </button>
        </form>
      </div>
    </div>
  );
}
