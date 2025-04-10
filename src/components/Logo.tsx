import React from 'react';
import Image from 'next/image';

const Logo: React.FC = () => {
  return (
    <div className="relative h-10 w-auto">
      <Image 
        src="https://assets.co.dev/aff91ec6-0d31-4a32-ad90-44b87fbbf8dc/simplified-logo-on-black-3d2d74c.svg" 
        alt="Budget Visualization Logo" 
        width={120} 
        height={40} 
        className="object-contain" 
        priority
      />
    </div>
  );
};

export default Logo;
