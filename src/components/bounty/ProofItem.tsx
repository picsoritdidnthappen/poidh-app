import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";

import { useBountyContext } from "@/components/bounty/BountyProvider";

import { acceptClaim, getURI, submitClaimForVote } from "@/app/context/web3";

interface ProofItemProps {
	id: string;
	title: string;
	description: string;
	issuer: string;
	bountyId: string;
	youOwner: boolean;
	accepted: boolean;
	isAccepted: boolean;
	openBounty: boolean | null;
}

const ISSUER_URL = "https://degen.poidh.xyz/account/";

const ProofItem: React.FC<ProofItemProps> = ({
	openBounty,
	id,
	title,
	description,
	issuer,
	bountyId,
	accepted,
	isAccepted,
}) => {
	const { user, primaryWallet } = useDynamicContext();
	const [claimsURI, setClaimsURI] = useState("");
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const {
		isMultiplayer,
		isOwner,
		bountyData,
		isBountyClaimed,
		isOwnerContributor,
	} = useBountyContext()!;

	useEffect(() => {
		if (id) {
			getURI(id)
				.then((data) => setClaimsURI(data))
				.catch(console.error);
		}
	}, [id]);

	const fetchImageUrl = async (uri: string) => {
		try {
			const response = await fetch(uri);
			const data = await response.json();
			console.log("@@@@@@@@@@ data:", data);
			setImageUrl(data.image);
		} catch (error) {
			console.error("Error fetching image:", error);
			setImageUrl(null);
		}
	};

	useEffect(() => {
		if (claimsURI) {
			console.log("@@@@@@@@@@ claimsURI:", claimsURI);
			fetchImageUrl(claimsURI);
		}
	}, [claimsURI]);

	const handleAcceptClaim = async () => {
		if (!id || !bountyId || !primaryWallet) {
			alert("Please check connection");
			return;
		}
		try {
			await acceptClaim(primaryWallet, bountyId, id);
		} catch (error) {
			console.error("Error accepting claim:", error);
			alert("Failed to accept claim.");
		}
	};

	const handleSubmitClaimForVote = async () => {
		if (!id || !bountyId || !primaryWallet) {
			alert("Please check connection");
			return;
		}
		try {
			await submitClaimForVote(primaryWallet, bountyId, id);
		} catch (error) {
			console.error("Error accepting claim:", error);
			alert("Failed to accept claim.");
		}
	};

	return (
		<div className="p-[2px] border text-white relative bg-[#F15E5F] border-[#F15E5F] border-2 rounded-xl ">
			<div className="left-5 top-5 absolute  flex flex-col text-white">
				{isMultiplayer && isOwner && !isOwnerContributor ? (
					<button
						className=" submitForVote cursor-pointer text-[#F15E5F] hover:text-white hover:bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5  "
						onClick={handleSubmitClaimForVote}
					>
						submit for vote
					</button>
				) : null}

				{isOwner && !isBountyClaimed && primaryWallet && isOwnerContributor ? (
					<div
						onClick={handleAcceptClaim}
						className=" acceptButton cursor-pointer mt-5 text-[#F15E5F] hover:text-white hover:bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5  "
					>
						accept
					</div>
				) : null}
			</div>

			{accepted ? (
				<div className="left-5 top-5 text-white bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5 absolute ">
					accepted
				</div>
			) : null}

			<div
				style={{ backgroundImage: `url(${imageUrl})` }}
				className="bg-[#12AAFF] bg-cover bg-center w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden"
			>
				{/* {imageUrl && (
    //   <Image
    //   className="object-cover w-full"
    //   src={imageUrl}
    //   width={259}
    //   height={259}
    //   alt="claim image"
    // />
     )} */}
			</div>
			<div className="p-3">
				<div className="flex flex-col">
					<p className="">{title}</p>
					<p className="break-all	">{description}</p>
				</div>
				<div className="mt-2 py-2 flex flex-row justify-between text-sm border-t border-dashed">
					<span className="">issuer</span>
					<span>
						<a
							href={`${ISSUER_URL}${issuer}`}
							rel="noopener noreferrer"
						>
							{issuer.slice(0, 5)}...{issuer.slice(-6)}
						</a>
					</span>
				</div>
				<div>claim id: {id}</div>
			</div>
		</div>
	);
};

export default ProofItem;
