'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Equipment {
  id: number;
  name: string;
  serialNumber?: string | null;
  qrCode?: string | null;
  equipmentType?: string | null;
}

export default function EquipmentQRModal({
  equipment,
  onClose,
}: {
  equipment: Equipment;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  // Payload encodes a stable identifier the warehouse staff can scan; the
  // current URL host lets a phone scan link straight to the equipment page.
  const payload = (() => {
    const base = typeof window !== 'undefined' ? `${window.location.origin}/dashboard/warehouse/equipment` : '/dashboard/warehouse/equipment';
    return `${base}?id=${equipment.id}${equipment.serialNumber ? `&sn=${encodeURIComponent(equipment.serialNumber)}` : ''}`;
  })();

  useEffect(() => {
    QRCode.toDataURL(payload, { width: 260, margin: 1 }).then(setDataUrl).catch(() => setDataUrl(null));
  }, [payload]);

  const handlePrint = () => {
    if (!dataUrl) return;
    const w = window.open('', '_blank', 'width=420,height=520');
    if (!w) return;
    w.document.write(`
      <html><head><title>QR — ${equipment.name}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:24px;}
      img{display:block;margin:12px auto;} h3{margin:0;font-size:14px;}
      p{font-size:11px;color:#555;margin:2px 0;}</style></head>
      <body>
        <h3>${equipment.name}</h3>
        <p>ID #${equipment.id}${equipment.serialNumber ? ' · S/N ' + equipment.serialNumber : ''}</p>
        <img src="${dataUrl}" width="240" height="240" />
        <p>${payload}</p>
        <script>setTimeout(()=>window.print(),200);</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">{equipment.name}</h3>
        <p className="text-xs text-gray-500 mb-4">
          ID #{equipment.id}{equipment.serialNumber ? ` · S/N ${equipment.serialNumber}` : ''}
        </p>
        <div className="flex items-center justify-center bg-white rounded-lg p-3 border border-gray-200 dark:border-gray-600 min-h-[260px]">
          {dataUrl
            ? <img src={dataUrl} alt="QR" width={240} height={240} />
            : <div className="text-sm text-gray-500">Генерация...</div>}
        </div>
        <p className="text-[10px] text-gray-400 break-all mt-3">{payload}</p>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            Закрыть
          </button>
          <button onClick={handlePrint} disabled={!dataUrl} className="px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg">
            Печать
          </button>
        </div>
      </div>
    </div>
  );
}
