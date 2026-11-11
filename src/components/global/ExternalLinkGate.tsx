'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@mui/material';
import { inspectLink } from '@/utils/linkSafety';

type PendingLink = {
  destination: string;
  hostname: string;
};

function isUserGeneratedLink(anchor: HTMLAnchorElement) {
  return (
    anchor.hasAttribute('data-poidh-ugc-link') ||
    anchor.closest('[data-poidh-ugc]') !== null
  );
}

export default function ExternalLinkGate() {
  const [pending, setPending] = useState<PendingLink | null>(null);

  useEffect(() => {
    // Adds missing attributes even on links that
    // have not yet migrated to the shared link utility.
    const updateAnchor = (anchor: HTMLAnchorElement) => {
      const info = inspectLink(anchor.getAttribute('href'));
      if (!info?.isExternal) return;

      const rel = new Set(
        (anchor.getAttribute('rel') ?? '')
          .split(/\s+/)
          .filter(Boolean)
      );

      rel.add('noopener');
      rel.add('noreferrer');
      rel.add('nofollow');

      if (isUserGeneratedLink(anchor)) {
        rel.add('ugc');
      }

      const nextRel = Array.from(rel).join(' ');

      if (anchor.getAttribute('rel') !== nextRel) {
        anchor.setAttribute('rel', nextRel);
      }
    };

    const updateLinksInside = (node: Node) => {
      if (!(node instanceof Element)) return;

      if (node instanceof HTMLAnchorElement) {
        updateAnchor(node);
      }

      node
        .querySelectorAll<HTMLAnchorElement>('a[href]')
        .forEach(updateAnchor);
    };

    // Existing links.
    updateLinksInside(document.body);

    // Links introduced by client-side navigation,
    // pagination, comments, modals, etc.
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          updateLinksInside(mutation.target);
          continue;
        }

        mutation.addedNodes.forEach(updateLinksInside);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });

    // Intercept ordinary and middle-click navigation
    // on external links inside user-generated content.
    const handleNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented) return;

      const isPrimaryClick =
        event.type === 'click' && event.button === 0;

      const isMiddleClick =
        event.type === 'auxclick' && event.button === 1;

      if (!isPrimaryClick && !isMiddleClick) return;

      const target = event.target;

      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>(
        'a[href]'
      );

      if (!anchor || !isUserGeneratedLink(anchor)) return;

      const info = inspectLink(anchor.getAttribute('href'));

      if (!info) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (!info.isExternal) return;

      event.preventDefault();
      event.stopPropagation();

      setPending({
        destination: info.destination,
        hostname: info.hostname,
      });
    };

    document.addEventListener('click', handleNavigation, true);
    document.addEventListener('auxclick', handleNavigation, true);

    return () => {
      observer.disconnect();

      document.removeEventListener(
        'click',
        handleNavigation,
        true
      );

      document.removeEventListener(
        'auxclick',
        handleNavigation,
        true
      );
    };
  }, []);

  const continueToSite = () => {
    if (!pending) return;

    const destination = pending.destination;
    setPending(null);

    // Invoked directly from the user's confirmation click.
    // No access to the original poidh window is granted.
    window.open(
      destination,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <Dialog
      open={pending !== null}
      onClose={() => setPending(null)}
      maxWidth='sm'
      fullWidth
      aria-labelledby='external-link-title'
      PaperProps={{
        className: 'bg-poidhBlue/95 dark:!bg-[#132b47]',
        sx: {
          borderRadius: '20px',
          color: 'white',
          border: '1px solid #D1ECFF',
          m: 2,
        },
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        <h2
          id='external-link-title'
          className='font-mono text-xl font-semibold'
        >
          you're leaving poidh
        </h2>

        <p className='mt-3 text-sm text-white/75'>
          you're about to visit an external website.
          check the destination before continuing.
        </p>

        <div className='mt-5 rounded-lg border border-white/25 bg-black/20 p-4'>
          <p className='text-xs text-white/60'>
            destination domain
          </p>

          <p className='mt-1 break-all text-base font-bold text-white'>
            {pending?.hostname}
          </p>

          <div className='my-4 border-t border-white/20' />

          <p className='text-xs text-white/60'>
            full URL
          </p>

          <p className='mt-2 max-h-40 overflow-y-auto break-all text-sm text-white/90'>
            {pending?.destination}
          </p>
        </div>

        <p className='mt-4 text-xs text-white/60'>
          poidh does not control external websites.
          only continue if you trust this destination.
        </p>

        <div className='mt-6 flex flex-wrap justify-end gap-3'>
          <button
            type='button'
            onClick={() => setPending(null)}
            className='rounded-md border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10'
          >
            cancel
          </button>

          <button
            type='button'
            onClick={continueToSite}
            className='rounded-md bg-poidhRed px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90'
          >
            continue to site ↗
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
