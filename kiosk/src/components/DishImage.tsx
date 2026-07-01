import { useEffect, useState } from "react";
import { useKiosk } from "../state/kiosk";
import { SETTING_KEYS } from "../db";
import { categoryEmoji } from "../utils/emoji";

/**
 * Image d'un plat, robuste : essaie d'abord le cache local (hors-ligne), puis
 * l'image servie par le backend si le blob local échoue, et retombe sur l'emoji
 * de la catégorie si aucune image n'est disponible.
 */
export function DishImage({
  dishId,
  category,
  localUrl,
  emojiSize = "text-8xl",
}: {
  dishId: string;
  category: string | null;
  localUrl: string | null;
  emojiSize?: string;
}) {
  const { setting } = useKiosk();
  const backend = setting(SETTING_KEYS.backendUrl, "").replace(/\/$/, "");
  const serverUrl = backend ? `${backend}/api/v1/public/dishes/${dishId}/image` : "";
  const sources = [localUrl, serverUrl].filter((s): s is string => !!s);

  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [dishId, localUrl]);

  const src = sources[idx];
  if (!src) {
    return (
      <div className={`flex h-full w-full items-center justify-center ${emojiSize}`}>
        {categoryEmoji(category)}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setIdx((i) => i + 1)}
    />
  );
}
