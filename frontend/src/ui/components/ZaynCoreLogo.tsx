import React from 'react';
import { clsx } from 'clsx';

export interface ZaynCoreLogoProps {
  /**
   * Preset sizes for the logo image
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Whether to display the "ZaynCore" wordmark beside the icon
   */
  showWordmark?: boolean;
  /**
   * Optional badge text to display under or beside the wordmark (e.g. "ENTERPRISE EDITION")
   */
  subtitle?: string;
  /**
   * Optional version badge (e.g. "v2.0")
   */
  versionBadge?: string;
  /**
   * Additional container class names
   */
  className?: string;
  /**
   * Optional click handler
   */
  onClick?: () => void;
}

const sizeMap = {
  xs: { img: 'w-5 h-5', text: 'text-xs', sub: 'text-[8px]', gap: 'gap-1.5' },
  sm: { img: 'w-6 h-6', text: 'text-sm', sub: 'text-[9px]', gap: 'gap-2' },
  md: { img: 'w-8 h-8', text: 'text-base', sub: 'text-[10px]', gap: 'gap-2.5' },
  lg: { img: 'w-10 h-10', text: 'text-lg', sub: 'text-xs', gap: 'gap-3' },
  xl: { img: 'w-14 h-14', text: 'text-2xl', sub: 'text-sm', gap: 'gap-3.5' },
};

export const ZaynCoreLogo: React.FC<ZaynCoreLogoProps> = ({
  size = 'md',
  showWordmark = false,
  subtitle,
  versionBadge,
  className,
  onClick,
}) => {
  const dims = sizeMap[size];

  return (
    <div
      onClick={onClick}
      className={clsx(
        'inline-flex items-center select-none shrink-0',
        dims.gap,
        onClick && 'cursor-pointer hover:opacity-90 transition-opacity',
        className
      )}
    >
      {/* Authentic Official ZaynCore Logo Image */}
      <img
        src="/zayncore-logo.png"
        alt="ZaynCore"
        className={clsx(
          dims.img,
          'object-contain shrink-0'
        )}
        loading="eager"
      />

      {/* Wordmark & Subtitle */}
      {showWordmark && (
        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className={clsx('font-black tracking-tight text-foreground truncate', dims.text)}>
              ZaynCore
            </span>
            {versionBadge && (
              <span className="px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded-md shrink-0">
                {versionBadge}
              </span>
            )}
          </div>
          {subtitle && (
            <span className={clsx('font-mono font-semibold text-muted-foreground block truncate -mt-0.5', dims.sub)}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
