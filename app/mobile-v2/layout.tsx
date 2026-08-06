import React from 'react';

import { MobileV2TenantProvider } from '@/contexts/MobileV2TenantContext';

export default function MobileV2Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <MobileV2TenantProvider>
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="w-full max-w-[400px] h-[850px] bg-white rounded-[40px] shadow-2xl overflow-hidden relative border-8 border-gray-900 ring-1 ring-gray-900/5">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl z-50"></div>
                    <div className="h-full w-full overflow-y-auto scrollbar-hide bg-[#2563EB]">
                        {children}
                    </div>
                </div>
            </div>
        </MobileV2TenantProvider>
    );
}
