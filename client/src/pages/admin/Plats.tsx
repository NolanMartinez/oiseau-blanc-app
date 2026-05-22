import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, UtensilsCrossed, ImagePlus, Languages } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import api from '../../services/api';
import { ALLERGENS, DISH_CATEGORIES, dishImageUrl, type CatalogDish } from '../../types/dish';
import { resizeImageToBase64, type ResizedImage } from '../../utils/image';
import axios from 'axios';

// ─── Modal création / édition ──────────────────────────────────────────────────

// newImage : undefined = inchangée · null = supprimée · objet = nouvelle image
type ImageChange = ResizedImage | null | undefined;

function DishModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: CatalogDish | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [allergens, setAllergens] = useState<string[]>(initial?.allergens ?? []);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [newImage, setNewImage] = useState<ImageChange>(undefined);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleAllergen(a: string) {
    setAllergens((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setImageProcessing(true);
    try {
      const resized = await resizeImageToBase64(file);
      setNewImage(resized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de traiter l'image.");
    } finally {
      setImageProcessing(false);
    }
  }

  // Source de l'aperçu courant
  const previewSrc =
    newImage && typeof newImage === 'object'
      ? `data:${newImage.imageMimeType};base64,${newImage.imageBase64}`
      : newImage === null
        ? null
        : initial?.hasImage
          ? dishImageUrl(initial.id) + '?v=' + encodeURIComponent(initial.updatedAt)
          : null;

  async function handleSave() {
    setError('');
    if (!name.trim()) { setError('Le nom est requis.'); return; }
    if (!category.trim()) { setError('La catégorie est requise.'); return; }
    const priceNum = Number(price.replace(',', '.'));
    if (!price.trim() || Number.isNaN(priceNum) || priceNum < 0) {
      setError('Le prix doit être un nombre positif.'); return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        category: category.trim(),
        price: priceNum,
        description: description.trim() || null,
        allergens,
        isActive,
      };
      if (newImage !== undefined) payload.image = newImage;

      if (initial) {
        await api.patch(`/admin/dishes/${initial.id}`, payload);
      } else {
        await api.post('/admin/dishes', payload);
      }
      onSaved();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 413) {
        setError('Image trop lourde pour le serveur. Choisissez une image plus légère.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="font-semibold text-gray-800">
            {initial ? 'Modifier le plat' : 'Nouveau plat'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {previewSrc ? (
                  <img src={previewSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UtensilsCrossed size={26} className="text-gray-300" />
                )}
              </div>
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-2 rounded-lg cursor-pointer transition-colors">
                  <ImagePlus size={15} />
                  {imageProcessing ? 'Traitement…' : 'Choisir une image'}
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={imageProcessing} />
                </label>
                {previewSrc && (
                  <button
                    type="button"
                    onClick={() => setNewImage(null)}
                    className="block text-xs text-red-500 hover:text-red-600 transition-colors"
                  >
                    Retirer l'image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Poulet rôti aux herbes"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Catégorie + Prix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
              <input
                type="text"
                list="dish-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex : Plat chaud"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="dish-categories">
                {DISH_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€) *</label>
              <input
                type="number"
                min="0"
                step="0.10"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="8.50"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Quelques mots sur le plat, sa composition…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Allergènes */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Allergènes</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALLERGENS.map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allergens.includes(a)}
                    onChange={() => toggleAllergen(a)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="capitalize">{a}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Statut */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIsActive((v) => !v)}
              className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span
                className={`block w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </div>
            <span className="text-sm text-gray-700">Plat actif (visible dans les frigos)</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 flex-shrink-0 gap-3">
          {error ? <p className="text-sm text-red-600">{error}</p> : <span />}
          <div className="flex gap-3 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={loading || imageProcessing}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function Plats() {
  const [dishes, setDishes] = useState<CatalogDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDish, setEditingDish] = useState<CatalogDish | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateResult, setTranslateResult] = useState<string | null>(null);

  async function fetchDishes() {
    setLoading(true);
    try {
      const res = await api.get('/admin/dishes');
      setDishes(res.data.dishes);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDishes(); }, []);

  async function handleDelete(dish: CatalogDish) {
    const label = dish._count.fridgeStocks > 0
      ? `« ${dish.name} » est présent dans ${dish._count.fridgeStocks} frigo(s). Le désactiver ? Il n'apparaîtra plus dans les frigos.`
      : `Désactiver « ${dish.name} » ?`;
    if (!confirm(label)) return;
    await api.delete(`/admin/dishes/${dish.id}`);
    fetchDishes();
  }

  function openCreate() {
    setEditingDish(null);
    setShowModal(true);
  }

  function openEdit(dish: CatalogDish) {
    setEditingDish(dish);
    setShowModal(true);
  }

  function handleSaved() {
    setShowModal(false);
    fetchDishes();
  }

  async function handleTranslateAll() {
    if (!confirm('Générer (ou régénérer) les traductions EN / ES / PT / DE / IT pour tous les plats ?')) return;
    setTranslating(true);
    setTranslateResult(null);
    try {
      const res = await api.post('/admin/dishes/translate-all');
      setTranslateResult(`${res.data.translated} plat(s) traduits.${res.data.errors > 0 ? ` ${res.data.errors} erreur(s).` : ''}`);
    } catch {
      setTranslateResult('Erreur — vérifiez que DEEPL_API_KEY est configurée.');
    } finally {
      setTranslating(false);
    }
  }

  return (
    <AdminLayout title="Plats">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{dishes.length} plat{dishes.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          {translateResult && (
            <span className="text-xs text-gray-500">{translateResult}</span>
          )}
          <button
            onClick={handleTranslateAll}
            disabled={translating}
            title="Générer les traductions automatiques (EN, ES, PT, DE, IT)"
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Languages size={15} />
            {translating ? 'Traduction…' : 'Traduire'}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Nouveau plat
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Chargement…</div>
        ) : dishes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <UtensilsCrossed size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Aucun plat</p>
            <p className="text-xs text-gray-400 mt-1">Créez votre premier plat pour l'affecter ensuite à un frigo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Catégorie</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prix</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Frigos</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dishes.map((dish) => (
                  <tr key={dish.id} className={`hover:bg-gray-50 transition-colors ${dish.isActive ? '' : 'opacity-55'}`}>
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                        {dish.hasImage ? (
                          <img
                            src={dishImageUrl(dish.id) + '?v=' + encodeURIComponent(dish.updatedAt)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UtensilsCrossed size={15} className="text-gray-300" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{dish.name}</p>
                      {dish.allergens.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{dish.allergens.join(', ')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{dish.category}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{dish.price.toFixed(2)} €</td>
                    <td className="px-4 py-3 text-gray-500">{dish._count.fridgeStocks}</td>
                    <td className="px-4 py-3">
                      {dish.isActive ? (
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Actif</span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Inactif</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(dish)}
                          title="Modifier"
                          className="text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        {dish.isActive && (
                          <button
                            onClick={() => handleDelete(dish)}
                            title="Désactiver"
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <DishModal initial={editingDish} onClose={() => setShowModal(false)} onSaved={handleSaved} />
      )}
    </AdminLayout>
  );
}
