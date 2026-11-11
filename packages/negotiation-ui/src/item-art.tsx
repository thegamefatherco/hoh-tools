import type { PoolItem } from "@hoh-tools/negotiation/data";
import {
  formatCount,
  formatFactor,
  letterOf,
} from "@hoh-tools/negotiation/format";
import { cn } from "@hoh-tools/ui/lib/utils";

const BREAK_AFTER = /(?<separator>[._])/gu;
const ZERO_WIDTH_SPACE = "\u200B";

/** Lets long labels wrap after "." or "_" instead of mid-word. */
export const breakable = (label: string): string =>
  label.replaceAll(BREAK_AFTER, `$<separator>${ZERO_WIDTH_SPACE}`);

/** "2,000 · ×1.55" */
export const amountText = (item: PoolItem): string =>
  `${formatCount(item.amount)} · ${formatFactor(item.factor)}`;

const ICON_FILE_NAME = /\/(?<name>[^/]+)\.webp$/u;

/**
 * Icon URLs by icon name. The bundler of whichever app renders the solver emits the
 * files and hands back their final URLs, so no app has to copy them into `public/`.
 */
const ICON_URLS: ReadonlyMap<string, string> = new Map(
  Object.entries(
    import.meta.glob<string>("./assets/icons/*.webp", {
      eager: true,
      import: "default",
      query: "?url",
    })
  ).map(([file, url]) => [
    file.match(ICON_FILE_NAME)?.groups?.name ?? file,
    url,
  ])
);

export const iconUrl = (item: PoolItem): string | null =>
  item.iconName === null ? null : (ICON_URLS.get(item.iconName) ?? null);

export const LetterBadge = ({
  item,
  className,
}: {
  className?: string;
  item: number;
}) => (
  <span
    className={cn(
      "bg-secondary text-secondary-foreground inline-grid size-5 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold",
      className
    )}
  >
    {letterOf(item)}
  </span>
);

/** Decorative item icon; renders nothing when the item has no icon. */
export const ItemIcon = ({
  item,
  size,
  className,
}: {
  className?: string;
  item: PoolItem;
  size: number;
}) => {
  const url = iconUrl(item);
  if (url === null) {
    return null;
  }
  return (
    <img
      alt=""
      className={cn("shrink-0 object-contain", className)}
      height={size}
      loading="lazy"
      src={url}
      width={size}
    />
  );
};
