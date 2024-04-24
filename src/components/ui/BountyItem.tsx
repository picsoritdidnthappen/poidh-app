import {  ethers } from "ethers";
import Link from "next/link";
import React from 'react';

import Button from "@/components/ui/Button"


interface BountyItemProps {
  id: string;
  title: string;
  description: string;
  amount: string | number | bigint ;
}

const BountyItem: React.FC<BountyItemProps> = ({ id, title, description, amount }) => {
  const shortDescription = description.length > 50 ? `${description.substring(0, 50)}...` : description;
  const amountETH = ethers.formatEther(amount);





  return (
    <div className='p-5 relative  lg:col-span-4' >
      <div className="z-[-1] absolute w-full h-full left-0 top-0 borderBox  bg-blur "></div>
      <h3>{title}</h3>
      <p className="my-5 break-all	 ">{shortDescription}</p>

      <div className="flex items-end justify-between mt-5">
        <div>{Number(amountETH)} degen</div>
        <Button>
          <Link href={`/bounty/${id}`}>see bounty</Link>
        </Button>
      </div>
    </div>
  );
};

export default BountyItem;
