import React from 'react';
import Image from 'next/image';

const Logo: React.FC = () => {
  return (
    <div className="relative h-8 w-auto">
      <Image 
        src="https://assets.co.dev/aff91ec6-0d31-4a32-ad90-44b87fbbf8dc/fully-transparent-logo-0e7b719.svg" 
        alt="Budget Visualization Logo" 
        width={100} 
        height={32} 
        className="object-contain" 
        priority
      />
    </div>
  );
};

export default Logo;