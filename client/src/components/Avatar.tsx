import React, { useState } from 'react';

interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  url,
  name,
  size = 'sm',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    xs: { dim: 'w-4 h-4', text: 'text-xs' },
    sm: { dim: 'w-5 h-5', text: 'text-sm' },
    md: { dim: 'w-7 h-7', text: 'text-base' },
    lg: { dim: 'w-9 h-9', text: 'text-xl' },
    xl: { dim: 'w-10 h-10', text: 'text-2xl' },
  };

  const { dim, text } = sizeMap[size] || sizeMap.sm;

  // If it's a URL (e.g. Google profile picture)
  const isHttpImage =
    url &&
    (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) &&
    !imgError;

  if (isHttpImage) {
    return (
      <img
        src={url}
        alt={name || 'Avatar'}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setImgError(true)}
        className={`${dim} rounded-full object-cover shrink-0 border border-white/20 shadow-xs ${className}`}
      />
    );
  }

  // Fallback to emoji or default silhouette icon
  const isEmoji = url && !url.startsWith('http');

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none ${text} ${className}`}
      aria-hidden="true"
    >
      {isEmoji ? url : '👤'}
    </span>
  );
};
