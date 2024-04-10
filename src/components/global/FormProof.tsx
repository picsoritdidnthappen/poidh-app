import { useState, useRef, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import {  createClaim } from '@/app/context/web3';
import { useDropzone } from 'react-dropzone';



interface FormProofProps {
  bountyId: string;
  showForm?: boolean;
}


const FormProof: React.FC<FormProofProps> = ({ bountyId }) => {


  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setFile(file);
    uploadFile(file);
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result) {
        setPreview(e.target.result.toString());
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop});
  const [preview, setPreview] = useState('');
  const { primaryWallet } = useDynamicContext();
  const [name, setName] = useState('');
  const [uri, setUri] = useState('');
  const [description, setDescription] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState("");
  const [uploading, setUploading] = useState(false);

  const inputFile = useRef<HTMLInputElement>(null);



  const uploadFile = async (fileToUpload: any) => {
    try {
      setUploading(true);
      const data = new FormData();
      data.set("file", fileToUpload);
      const res = await fetch("/api/files", {
        method: "POST",
        body: data,
      });
      const resData = await res.json();
      setCid(resData.IpfsHash);
      setUploading(false);
      console.log(resData)
      setUri(JSON.stringify({
        name: name,
        description: description,
        uri: `${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${cid}`
      }));

    } catch (e) {
      console.log(e);
      setUploading(false);
      alert("Trouble uploading file");
    }
  };






  const handleCreateClaim = async () => {
    if (!name || !uri || !description || !primaryWallet ) {
      alert("Please fill in all fields and connect wallet");
      return;
    }

    try {
      setUri(JSON.stringify({
        name: name,
        description: description,
        uri: `${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${cid}`
      }));
      console.log("setting uri")
      console.log(name)
      console.log(uri)
      console.log(description)
      console.log("doing create claim")

      await createClaim( primaryWallet, name, uri, description, bountyId);
      alert("Claim created successfully!" + bountyId);
      // Clear form fields
      setName('');
      setDescription('');
      setUri('');

    } catch (error) {
      console.error('Error creating claim:', error);
      alert("Failed to create claim.");
    }
  };

  

  return (
    <div className=' mt-10 flex text-left flex-col  text-white rounded-md border border-[#D1ECFF]  p-5 flex w-full lg:min-w-[400px]  justify-center backdrop-blur-sm bg-white/30'>
      
      <div {...getRootProps()} className=' flex items-center flex-col text-left text-white rounded-[30px] border border-[#D1ECFF] border-dashed p-5 w-full lg:min-w-[400px] justify-center  cursor-pointer'>
    <input {...getInputProps()} />
    {
      isDragActive ?
        <p>Drop the files here ...</p> :
       <p>drop the file here ...</p>
    }

{preview && <img src={preview} alt="Preview" style={{ width: '200px',height:'200px', marginTop: '10px' }} />}

    
  </div>




      <span>name</span>

      <input
        type="text"
        placeholder=""
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4"
      />


      <span>description</span>

      <textarea
        rows = {3}
        placeholder=""
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4"
      ></textarea>

      <input
        type="text"
        placeholder="URI"
        value={uri}
        onChange={(e) => setUri(e.target.value)}
        className="border hidden border-red-700 py-2 px-5 rounded-md mb-4"
      />

  


      

  <button disabled={uploading} onClick={() => inputFile.current?.click()}>
      {uploading ? "uploading..." : "upload"}
    </button>
    <div className='hidden'>{process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/{cid}</div>
    <button className='border border-white rounded-full px-5 py-2' onClick={handleCreateClaim}>create claim</button>
    </div>
  );
};

export default FormProof;
