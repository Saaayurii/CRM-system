'use client';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-gradient-to-b from-white to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="relative md:flex  md:min-h-screen">
        {/* Content */}
        <div className="md:w-1/2 flex items-center justify-center min-h-screen md:min-h-0 px-4 sm:px-6 lg:px-12">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 sm:p-10 animate-fadeInSoft">
            {children}
          </div>
        </div>

        {/* Decorative panel (hidden on mobile) */}
        <div className="hidden md:block md:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-violet-500 flex flex-col items-center justify-center text-center p-8">
            <div className="animate-pulseSoft">
              <svg
                className="fill-white w-20 h-20 mx-auto mb-6 transform transition-transform duration-700 hover:scale-105"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 64 64"
              >
                <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-3 drop-shadow-md animate-fadeInUpSoft">
              CRM Система
            </h1>
            <p className="text-violet-200 text-lg sm:text-xl animate-fadeInUpSoft animate-delaySoft">
              Управление строительными проектами
            </p>

            {/* Floating circles for dynamic effect */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full animate-spinSlowSoft"></div>
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/5 rounded-full animate-pulseSlowSoft"></div>
          </div>
        </div>
      </div>

      {/* Tailwind animation utilities */}
      <style jsx global>{`
        /* Content fade in */
        @keyframes fadeInSoft {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInSoft {
          animation: fadeInSoft 1.2s ease-in-out forwards;
        }

        /* Titles/text fade in */
        @keyframes fadeInUpSoft {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUpSoft {
          animation: fadeInUpSoft 1.1s ease-in-out forwards;
        }
        .animate-delaySoft {
          animation-delay: 0.25s;
        }

        /* Slow spinning circle */
        @keyframes spinSlowSoft {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spinSlowSoft {
          animation: spinSlowSoft 60s linear infinite;
        }

        /* Soft pulsing circle */
        @keyframes pulseSlowSoft {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.25; }
        }
        .animate-pulseSlowSoft {
          animation: pulseSlowSoft 10s ease-in-out infinite;
        }

        /* Soft pulse for logo */
        @keyframes pulseSoft {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
        .animate-pulseSoft {
          animation: pulseSoft 3s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
