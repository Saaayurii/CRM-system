'use client';

import { useState } from 'react';

interface SidebarLinkGroupProps {
  children: (handleClick: () => void, open: boolean) => React.ReactNode;
  activecondition: boolean;
}

export default function SidebarLinkGroup({ children, activecondition }: SidebarLinkGroupProps) {
  const [open, setOpen] = useState(activecondition);

  const handleClick = () => {
    setOpen(!open);
  };

  return (
    <li
      className={`pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 bg-linear-to-r ${
        activecondition ? 'from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]' : ''
      }`}
    >
      {children(handleClick, open)}
    </li>
  );
}
