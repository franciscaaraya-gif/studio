import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  // Colors from globals.css
  const primaryColor = 'hsl(231, 48%, 48%)';
  const primaryForegroundColor = 'hsl(0, 0%, 98%)';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%' }}
        >
          <path
            d="M10 30H90V80C90 85.5228 85.5228 90 80 90H20C14.4772 90 10 85.5228 10 80V30Z"
            fill={primaryColor}
          />
          <path
            d="M10 30H90"
            stroke={primaryColor}
            strokeOpacity={0.8}
            strokeWidth="4"
          />
          <rect
            x="10"
            y="20"
            width="80"
            height="10"
            rx="2"
            fill={primaryColor}
          />
          <path
            d="M35 55L48.5 68.5L70 45"
            stroke={primaryForegroundColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="45"
            y="10"
            width="10"
            height="20"
            fill={primaryColor}
            fillOpacity={0.5}
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
