import { useEffect, useState } from 'react';

/** Fixed 4px gradient bar tracking document scroll progress. */
export default function ScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setPct(max > 0 ? (doc.scrollTop / max) * 100 : 0);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  if (pct <= 0) return null;
  return <div className="scroll-progress" style={{ width: `${pct}%` }} role="presentation" />;
}
