export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-white dark:bg-gray-900">
      <div className="relative md:flex">
        {/* Content */}
        <div className="md:w-1/2">
          <div className="min-h-[100dvh] h-full flex items-center justify-center px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>

        {/* Decorative panel (hidden on mobile) */}
        <div className="hidden md:block absolute top-0 bottom-0 right-0 md:w-1/2" aria-hidden="true">
          <div className="h-full bg-violet-500 flex items-center justify-center">
            <div className="text-center px-8">
              <svg className="fill-white mx-auto mb-6" xmlns="http://www.w3.org/2000/svg" width={64} height={64}>
                <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
              </svg>
              <h1 className="text-3xl font-bold text-white mb-2">CRM Система</h1>
              <p className="text-violet-200 text-lg">Управление строительными проектами</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
