'use client';

import { useEffect, useRef, useState } from 'react';

const KONAMI_CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

export default function KonamiCamera() {
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);

  useEffect(() => {
    let index = 0;

    const triggerCamera = () => {
      if (activeRef.current) return;

      activeRef.current = true;
      setActive(true);

      window.setTimeout(() => {
        activeRef.current = false;
        setActive(false);
      }, 2800);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key =
        event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key === KONAMI_CODE[index]) {
        index += 1;

        if (index === KONAMI_CODE.length) {
          index = 0;
          triggerCamera();
        }
      } else {
        index = key === KONAMI_CODE[0] ? 1 : 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!active) return null;

  return (
    <div className='konami-camera-overlay' aria-hidden='true'>
      <div className='konami-camera-flash' />

      <div className='konami-camera-stage'>
        <div className='konami-camera'>
          <div className='konami-camera-top'>
            <div className='konami-camera-shutter' />
          </div>

          <div className='konami-camera-body'>
            <div className='konami-camera-viewfinder' />

            <div className='konami-camera-lens'>
              <div className='konami-camera-lens-middle'>
                <div className='konami-camera-lens-inner' />
              </div>
            </div>

            <div className='konami-camera-light' />
          </div>

          <div className='konami-photo'>
            <div className='konami-photo-image'>
              <span>proof</span>
              <strong>✓</strong>
            </div>

            <div className='konami-photo-label'>poidh</div>
          </div>
        </div>
      </div>
    </div>
  );
}
