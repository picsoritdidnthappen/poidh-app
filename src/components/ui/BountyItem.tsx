import Link from "next/link";
import React from 'react';
import {  ethers } from "ethers";


import Button from "@/components/ui/Button"

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
    <div className='p-5 border-white border rounded-xl lg:col-span-4' >
      <h3>{title}</h3>
      <p className="my-5">{shortDescription}</p>

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
