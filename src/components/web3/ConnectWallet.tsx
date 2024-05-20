import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ConnectWallet = () => {
  const { isAuthenticated, handleLogOut } = useDynamicContext();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);
  return (
    <div className='flex flex-col z-10'>
      <DynamicWidget
        innerButtonComponent={
          <div>
            connect
            {/* <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.00016 2.2795C5.78015 2.2795 3.84088 3.48484 2.80244 5.27998C2.61808 5.59869 2.21026 5.7076 1.89155 5.52324C1.57285 5.33888 1.46394 4.93106 1.6483 4.61235C2.91526 2.42215 5.28495 0.946167 8.00016 0.946167C12.0502 0.946167 15.3335 4.22941 15.3335 8.2795C15.3335 12.3296 12.0502 15.6128 8.00016 15.6128C5.28495 15.6128 2.91526 14.1368 1.6483 11.9466C1.46394 11.6279 1.57285 11.2201 1.89155 11.0358C2.21026 10.8514 2.61808 10.9603 2.80244 11.279C3.84088 13.0742 5.78015 14.2795 8.00016 14.2795C11.3139 14.2795 14.0002 11.5932 14.0002 8.2795C14.0002 4.96579 11.3139 2.2795 8.00016 2.2795Z" fill="black"/>
        <path d="M7.52876 5.14143C7.78911 4.88108 8.21122 4.88108 8.47157 5.14143L11.1382 7.8081C11.3986 8.06845 11.3986 8.49055 11.1382 8.7509L8.47157 11.4176C8.21122 11.6779 7.78911 11.6779 7.52876 11.4176C7.26841 11.1572 7.26841 10.7351 7.52876 10.4748L9.05735 8.94617H2.00016C1.63197 8.94617 1.3335 8.64769 1.3335 8.2795C1.3335 7.91131 1.63197 7.61283 2.00016 7.61283H9.05735L7.52876 6.08424C7.26841 5.82389 7.26841 5.40178 7.52876 5.14143Z" fill="black"/>
        </svg> */}
          </div>
        }
        variant='modal'
      />
    </div>
  );
};

export default ConnectWallet;
