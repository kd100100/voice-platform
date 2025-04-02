import React from "react";
import Image from "next/image";

const TopBar = () => {
  return (
    <div className="flex justify-between items-center px-6 py-4 border-b bg-white">
      <div className="flex items-center gap-3">
        <Image 
          src="/piramal-logo.svg" 
          alt="Piramal Logo" 
          width={80} 
          height={40}
          className="h-8 w-auto"
        />
        <h1 className="text-xl font-semibold text-[#1e354a]">Piramal Voice Platform</h1>
      </div>
    </div>
  );
};

export default TopBar;
