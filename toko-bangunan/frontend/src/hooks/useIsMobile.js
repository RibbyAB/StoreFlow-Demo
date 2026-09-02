import { useState, useEffect } from 'react';

/**
 * Hook kecil buat deteksi apa layar sekarang termasuk "mobile" (<=768px) atau nggak.
 * Dipakai di komponen-komponen yang perlu nyesuain layout sendiri (sidebar, grid, dll)
 * karena project ini pakai inline style, bukan CSS class + media query.
 */
export default function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isMobile;
}