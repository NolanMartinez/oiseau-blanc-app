import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, X, UtensilsCrossed, ImagePlus, Languages, Sparkles,
  Star, TrendingUp, Tag, ChevronUp, ChevronDown,
} from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import api from '../../services/api';
import { ALLERGENS, dishImageUrl, type CatalogDish, type Category } from '../../types/dish';
import { resizeImageToBase64, type ResizedImage } from '../../utils/image';
import axios from 'axios';

// ─── Modal création / édition ──────────────────────────────────────────────────

// newImage : undefined = inchangée · null = supprimée · objet = nouvelle image
type ImageChange = ResizedImage | null | undefined;

function DishModal({
  initial,
  categories,
  onClose,
  onSaved,
}: {
  initial: CatalogDish | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [costPrice, setCostPrice] = useState(initial?.costPrice != null ? String(initial.costPrice) : '');
  const [dlcDays, setDlcDays] = useState(initial?.dlcDays != null ? String(initial.dlcDays) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [allergens, setAllergens] = useState<string[]>(initial?.allergens ?? []);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [newImage, setNewImage] = useState<ImageChange>(undefined);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
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

  async function handleSuggestDescription() {
    if (!name.trim()) return;
    setSuggesting(true);
    try {
      const res = await api.post('/admin/dishes/suggest-description', { name: name.trim(), category: category.trim() || undefined });
      setDescription(res.data.description);
    } catch {
      // silencieux — l'admin peut toujours saisir manuellement
    } finally {
      setSuggesting(false);
    }
  }

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
      const costNum = costPrice.trim() ? Number(costPrice.replace(',', '.')) : null;
      if (costNum !== null && (Number.isNaN(costNum) || costNum < 0)) {
        setError('Le coût de revient doit être un nombre positif.'); setLoading(false); return;
      }
      const payload: Record<string, unknown> = {
        name: name.trim(),
        category: category.trim(),
        price: priceNum,
        costPrice: costNum,
        dlcDays: dlcDays.trim() ? Math.round(Number(dlcDays.replace(',', '.'))) : null,
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
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Choisir une catégorie —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
                {/* Catégorie héritée non présente dans la liste gérée */}
                {category && !categories.some((c) => c.name === category) && (
                  <option value={category}>{category} (ancienne)</option>
                )}
              </select>
              {categories.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Créez d'abord des catégories en haut de la page Carte.</p>
              )}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coût de revient (€)</label>
              <input
                type="number"
                min="0"
                step="0.10"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="Ex : 3.20"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Sert au calcul de la marge. Non visible par les clients.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DLC (jours)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={dlcDays}
                onChange={(e) => setDlcDays(e.target.value)}
                placeholder="Ex : 5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Durée de conservation. Pré-remplit la date limite à la borne.</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <button
                type="button"
                onClick={handleSuggestDescription}
                disabled={!name.trim() || suggesting}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed text-purple-700 font-medium transition-colors"
              >
                <Sparkles size={12} />
                {suggesting ? 'Génération…' : 'Suggérer'}
              </button>
            </div>
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

// ─── Gestion des catégories ─────────────────────────────────────────────────

function CategoryManager({
  categories,
  onClose,
  onChanged,
}: {
  categories: Category[];
  onClose: () => void;
  onChanged: (cats: Category[]) => void;
}) {
  const [items, setItems] = useState<Category[]>(categories);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function reload() {
    const res = await api.get('/admin/categories');
    setItems(res.data.categories);
    onChanged(res.data.categories);
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true); setError('');
    try {
      await api.post('/admin/categories', { name });
      setNewName('');
      await reload();
    } catch (e) {
      setError(axios.isAxiosError(e) && e.response?.status === 409 ? 'Cette catégorie existe déjà.' : 'Une erreur est survenue.');
    } finally { setBusy(false); }
  }

  async function rename(c: Category) {
    const name = prompt('Renommer la catégorie', c.name)?.trim();
    if (!name || name === c.name) return;
    setBusy(true); setError('');
    try {
      await api.patch(`/admin/categories/${c.id}`, { name });
      await reload();
    } catch { setError('Impossible (nom déjà utilisé ?).'); } finally { setBusy(false); }
  }

  async function remove(c: Category) {
    if (!confirm(`Supprimer la catégorie « ${c.name} » ? Les plats existants conservent leur libellé.`)) return;
    setBusy(true);
    try { await api.delete(`/admin/categories/${c.id}`); await reload(); } finally { setBusy(false); }
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const reordered = [...items];
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    setItems(reordered);
    setBusy(true);
    try {
      await api.put('/admin/categories/reorder', { ids: reordered.map((c) => c.id) });
      onChanged(reordered);
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Catégories</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto p-6 space-y-2">
          {items.length === 0 && <p className="text-sm text-gray-400">Aucune catégorie. Ajoutez-en une ci-dessous.</p>}
          {items.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <div className="flex flex-col">
                <button disabled={i === 0 || busy} onClick={() => move(i, -1)} className="text-gray-300 hover:text-gray-600 disabled:opacity-30"><ChevronUp size={14} /></button>
                <button disabled={i === items.length - 1 || busy} onClick={() => move(i, 1)} className="text-gray-300 hover:text-gray-600 disabled:opacity-30"><ChevronDown size={14} /></button>
              </div>
              <span className="flex-1 text-sm font-medium text-gray-800">{c.name}</span>
              <button onClick={() => rename(c)} title="Renommer" className="text-gray-400 hover:text-gray-700"><Pencil size={15} /></button>
              <button onClick={() => remove(c)} title="Supprimer" className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
              placeholder="Nouvelle catégorie…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={add} disabled={busy || !newName.trim()} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-2 rounded-lg">
              <Plus size={15} /> Ajouter
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [showCatManager, setShowCatManager] = useState(false);
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

  async function fetchCategories() {
    try {
      const res = await api.get('/admin/categories');
      setCategories(res.data.categories);
    } catch { /* silencieux */ }
  }

  useEffect(() => { fetchDishes(); fetchCategories(); }, []);

  // Plats filtrés par la catégorie sélectionnée.
  const visibleDishes = filterCat === 'all' ? dishes : dishes.filter((d) => d.category === filterCat);
  // Meilleures ventes : les 3 plats les plus vendus (ventes > 0) → badge « Top ».
  const topSellerIds = new Set(
    [...dishes].filter((d) => d.salesCount > 0).sort((a, b) => b.salesCount - a.salesCount).slice(0, 3).map((d) => d.id),
  );

  async function handleDelete(dish: CatalogDish) {
    const label = dish._count.fridgeStocks > 0
      ? `« ${dish.name} » est présent dans ${dish._count.fridgeStocks} frigo(s). Le désactiver ? Il n'apparaîtra plus dans les frigos.`
      : `Désactiver « ${dish.name} » ?`;
    if (!confirm(label)) return;
    await api.delete(`/admin/dishes/${dish.id}`);
    fetchDishes();
  }

  // Bascule actif/inactif directement depuis la liste (item Frédéric).
  async function toggleActive(dish: CatalogDish) {
    // Optimiste : on met à jour l'UI tout de suite, puis on persiste.
    setDishes((prev) => prev.map((d) => (d.id === dish.id ? { ...d, isActive: !d.isActive } : d)));
    try {
      await api.patch(`/admin/dishes/${dish.id}`, { isActive: !dish.isActive });
    } catch {
      // rollback en cas d'échec
      setDishes((prev) => prev.map((d) => (d.id === dish.id ? { ...d, isActive: dish.isActive } : d)));
    }
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

      {/* Barre catégories : filtre + gestion (item Frédéric) */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterCat('all')}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filterCat === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Tous
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilterCat(c.name)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filterCat === c.name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {c.name}
          </button>
        ))}
        <button
          onClick={() => setShowCatManager(true)}
          className="ml-auto shrink-0 flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-full px-3 py-1.5 transition-colors"
        >
          <Tag size={14} /> Gérer les catégories
        </button>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Note</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ventes</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prix</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Frigos</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleDishes.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Aucun plat dans cette catégorie.</td></tr>
                )}
                {visibleDishes.map((dish) => (
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
                    <td className="px-4 py-3">
                      {dish.ratingCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                          <span className="font-medium text-gray-700">{dish.rating?.toFixed(1)}</span>
                          <span className="text-xs text-gray-400">({dish.ratingCount})</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-medium text-gray-700">{dish.salesCount}</span>
                        {topSellerIds.has(dish.id) && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                            <TrendingUp size={11} /> Top
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{dish.price.toFixed(2)} €</td>
                    <td className="px-4 py-3 text-gray-500">{dish._count.fridgeStocks}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(dish)}
                        title={dish.isActive ? 'Rendre inactif' : 'Rendre actif'}
                        className="inline-flex items-center gap-2"
                      >
                        <span
                          className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${dish.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span
                            className={`block w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${dish.isActive ? 'translate-x-4' : 'translate-x-0.5'}`}
                          />
                        </span>
                        <span className={`text-xs font-medium ${dish.isActive ? 'text-green-700' : 'text-gray-500'}`}>
                          {dish.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </button>
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
        <DishModal initial={editingDish} categories={categories} onClose={() => setShowModal(false)} onSaved={handleSaved} />
      )}
      {showCatManager && (
        <CategoryManager categories={categories} onClose={() => setShowCatManager(false)} onChanged={setCategories} />
      )}
    </AdminLayout>
  );
}
