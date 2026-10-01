'use client';

import Link from 'next/link';
import { RefObject, useEffect, useRef, useState } from 'react';

import { preloadClaimMedia } from '@/hooks/useClaimMedia';
import { ALBUMS } from '@/utils/constants';
import ClaimSpread, {
  FADE_MS,
  useSpreadDeck,
} from '@/components/feed/ClaimSpread';

// How long each deal (hero word + polaroids) stays up before the next.
const CYCLE_MS = 5000;

// Whether the element is in the viewport and its tab is in the foreground.
function useIsOnScreen(ref: RefObject<HTMLElement>) {
  const [isInView, setIsInView] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) =>
      setIsInView(entry.isIntersecting)
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    const update = () =>
      setIsTabVisible(document.visibilityState === 'visible');

    update();
    document.addEventListener('visibilitychange', update);

    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  return isInView && isTabVisible;
}

/*
 * The homepage hero: "social bounties for <album>" over the polaroid spread.
 * Owns the one clock both run on: every CYCLE_MS the album word turns over and
 * the polaroids are re-dealt together. Pauses while a polaroid or the album
 * link is hovered or focused, and while off-screen or in a background tab.
 */
export default function Hero() {
  const deck = useSpreadDeck();

  // How many deals in; 0 = the first album and the newest cards.
  const [step, setStep] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const isOnScreen = useIsOnScreen(heroRef);
  const isPaused = isHovered || hasFocus || !isOnScreen;

  const album = ALBUMS[step % ALBUMS.length];

  /*
   * Preload the next deal's media while this one is up, so the crossfade
   * lands on loaded images. Waits past CYCLE_MS if they're slow.
   */
  useEffect(() => {
    if (deck.isLoading || isPaused) {
      return;
    }

    const preloaded = deck.canCycle
      ? Promise.all(
          deck
            .deal(step + 1)
            .map((card) => card && preloadClaimMedia(card.mediaSourceUrl))
        )
      : Promise.resolve();

    let cancelled = false;
    const timer = setTimeout(() => {
      preloaded.then(() => {
        if (!cancelled) {
          setStep(step + 1);
        }
      });
    }, CYCLE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, isPaused, deck]);

  return (
    <section
      ref={heroRef}
      // Paused only while a polaroid or the album link is under the pointer,
      // not the heading text or the gaps between cards.
      onPointerOver={(event) =>
        setIsHovered(!!(event.target as Element).closest('a'))
      }
      onPointerLeave={() => setIsHovered(false)}
      // The links are all that can take focus in here.
      onFocus={() => setHasFocus(true)}
      onBlur={(event) => {
        // Still paused while focus moves between the links.
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setHasFocus(false);
        }
      }}
    >
      <div className='flex flex-col items-center text-center px-6 pt-6 pb-2 lg:pt-14'>
        <h3 className='font-mono mt-4 mb-2 text-2xl sm:text-3xl md:text-4xl'>
          <span className='block'>social bounties for</span>
          {/* Always its own line, so the heading never reflows between words. */}
          <Link
            href={`/a/${album.slug}`}
            className='block mx-auto w-fit h-fit overflow-hidden no-underline'
          >
            <span
              key={step}
              className='block motion-reduce:![animation:none]'
              style={{ animation: `turnstile ${FADE_MS}ms ease-in-out` }}
            >
              {album.name}
            </span>
          </Link>
        </h3>
      </div>
      <ClaimSpread slots={deck.deal(step)} isLoading={deck.isLoading} />
    </section>
  );
}
