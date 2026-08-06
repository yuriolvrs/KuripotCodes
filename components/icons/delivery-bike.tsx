import type { SVGProps } from "react";

export function DeliveryBikeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="5" cy="19" r="2.3" />
      <circle cx="19" cy="19" r="2.3" />
      <path d="M7 19h5l3-6h2l4 6" />
      <path d="M15 13l1.5-2.5h1.5" />
      <rect x="1" y="8" width="6" height="5" rx="1" />
    </svg>
  );
}
