// ProofItem.tsx
import Button from "@/components/ui/Button"
import Link from "next/link";
import React from 'react';

interface ProofItemProps {
  id: string;
  title: string;
  description: string;
}

const ProofItem: React.FC<ProofItemProps> = ({ id, title, description }) => {
  return (
    <div className='p-[2px] border text-white bg-[#F15E5F] border-[#F15E5F] border-2 rounded-xl lg:col-span-4' >
      <div className="bg-[#12AAFF] w-full h-[40vh] rounded-[8px]">
      </div>
      <div className="p-3">
      <div className="flex flex-col">
      <p className="">{title}</p>
      <p className="" >{description}</p>
      </div>
      <div className="mt-2 py-2 flex flex-row justify-between text-sm border-t border-dashed">
        <span className="">
          issuer
        </span>
        <span>
          0x0000000000000000000000000
        </span>
      </div>
      </div>
    </div>
  );
};

export default ProofItem;
