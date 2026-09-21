import React, { useState } from 'react';

export const DRIVE_FOLDER_URL = 'https://drive.google.com/drive/u/0/folders/1ug3olhhWiIbAwqGjwaqrh1tcjEow_SLD';

export const LogoDkiJakarta: React.FC<{ className?: string; src?: string }> = ({ 
  className = 'w-16 h-20',
  src
}) => {
  const [imgError, setImgError] = useState(false);
  const primarySrc = src || '/images/logo-dki.png';

  if (!imgError) {
    return (
      <img 
        src={primarySrc} 
        alt="Lambang Jaya Raya DKI Jakarta" 
        className={`${className} object-contain`}
        crossOrigin="anonymous"
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src.endsWith('.png')) {
            target.src = '/images/logo-dki.svg';
          } else {
            setImgError(true);
          }
        }}
      />
    );
  }

  return (
    <svg 
      viewBox="0 0 200 240" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      role="img"
      aria-label="Lambang Jaya Raya DKI Jakarta"
    >
      {/* Perisai Segilima Emas Kuning */}
      <path 
        d="M10 22 H190 L180 168 C180 206 100 234 100 234 C100 234 20 206 20 168 Z" 
        fill="#FFCC00" 
        stroke="#E6B800" 
        strokeWidth="2"
      />
      
      {/* Telinga Atas Perisai */}
      <polygon points="10,22 2,10 24,22" fill="#FFCC00"/>
      <polygon points="190,22 198,10 176,22" fill="#FFCC00"/>

      {/* Kepala Perisai Merah Resmi (Red Chief) untuk Semboyan JAYA RAYA */}
      <path d="M20 26 H180 V64 H20 Z" fill="#DC2626"/>
      <text 
        x="100" 
        y="51" 
        textAnchor="middle" 
        fill="#FFD700" 
        fontSize="21" 
        fontWeight="900" 
        fontFamily="'Arial Black', 'Impact', sans-serif" 
        letterSpacing="3"
      >
        JAYA RAYA
      </text>

      {/* Bingkai Pintu Gerbang Candi Emas */}
      <path d="M26 66 H174 V166 C174 198 100 222 100 222 C100 222 26 198 26 166 Z" fill="#FFCC00"/>
      
      {/* Lapangan Biru Tua di Dalam Gerbang */}
      <path d="M34 94 H52 V78 H80 V68 C80 68 100 58 100 58 C100 58 120 68 120 68 V78 H148 V94 H166 V162 C166 190 100 214 100 214 C100 214 34 190 34 162 Z" fill="#004F9E"/>

      {/* Monumen Nasional (Monas) */}
      <polygon points="74,148 126,148 120,140 80,140" fill="#FFFFFF"/>
      <rect x="80" y="148" width="40" height="4" fill="#E2E8F0"/>
      <rect x="74" y="152" width="52" height="6" fill="#CBD5E1"/>
      
      <polygon points="95,140 105,140 103,72 97,72" fill="#FFFFFF"/>
      <rect x="94" y="70" width="12" height="3" fill="#FFFFFF"/>
      
      <polygon points="92,70 108,70 106,66 94,66" fill="#FFFFFF"/>
      
      {/* Lidah Api Kemerdekaan Emas & Merah */}
      <path d="M100 52 C95 58 96 62 97 66 H103 C104 62 105 58 100 52 Z" fill="#DC2626"/>
      <path d="M100 55 C98 59 98 62 99 66 H101 C102 62 102 59 100 55 Z" fill="#FFCC00"/>

      {/* Padi Kuning Emas di Kiri */}
      <g fill="#FFCC00" stroke="#B8860B" strokeWidth="0.8">
        <path d="M96 182 C70 180 44 150 44 110" stroke="#FFCC00" strokeWidth="2.5" fill="none"/>
        <ellipse cx="44" cy="112" rx="4" ry="7" transform="rotate(-20 44 112)"/>
        <ellipse cx="47" cy="122" rx="4" ry="7" transform="rotate(-10 47 122)"/>
        <ellipse cx="52" cy="132" rx="4.5" ry="7.5" transform="rotate(5 52 132)"/>
        <ellipse cx="58" cy="142" rx="4.5" ry="7.5" transform="rotate(20 58 142)"/>
        <ellipse cx="66" cy="152" rx="5" ry="8" transform="rotate(35 66 152)"/>
        <ellipse cx="76" cy="162" rx="5" ry="8" transform="rotate(50 76 162)"/>
        <ellipse cx="86" cy="172" rx="5" ry="8" transform="rotate(65 86 172)"/>
        <ellipse cx="53" cy="116" rx="4" ry="7" transform="rotate(15 53 116)"/>
        <ellipse cx="58" cy="126" rx="4" ry="7" transform="rotate(30 58 126)"/>
        <ellipse cx="65" cy="136" rx="4.5" ry="7.5" transform="rotate(45 65 136)"/>
        <ellipse cx="74" cy="146" rx="4.5" ry="7.5" transform="rotate(60 74 146)"/>
      </g>

      {/* Kapas Hijau & Putih di Kanan */}
      <g>
        <path d="M104 182 C130 180 156 150 156 110" stroke="#008000" strokeWidth="2.5" fill="none"/>
        <circle cx="156" cy="112" r="5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8"/>
        <path d="M152 115 L156 110 L160 115 Z" fill="#008000"/>
        
        <circle cx="153" cy="123" r="5.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8"/>
        <path d="M149 126 L153 121 L157 126 Z" fill="#008000"/>
        
        <circle cx="147" cy="135" r="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8"/>
        <path d="M143 138 L147 133 L151 138 Z" fill="#008000"/>
        
        <circle cx="140" cy="147" r="6.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8"/>
        <path d="M136 150 L140 145 L144 150 Z" fill="#008000"/>
        
        <circle cx="130" cy="159" r="6.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8"/>
        <path d="M126 162 L130 157 L134 162 Z" fill="#008000"/>
        
        <circle cx="118" cy="170" r="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8"/>
        <path d="M114 173 L118 168 L122 173 Z" fill="#008000"/>
      </g>

      {/* Pita Emas Pengikat Padi & Kapas */}
      <g fill="#FFCC00" stroke="#B8860B" strokeWidth="1.2">
        <circle cx="100" cy="178" r="6"/>
        <path d="M95 178 C86 172 82 186 94 184 Z"/>
        <path d="M105 178 C114 172 118 186 106 184 Z"/>
        <path d="M96 183 L90 196 L98 193 Z"/>
        <path d="M104 183 L110 196 L102 193 Z"/>
      </g>

      {/* Gelombang Air Laut Putih di Bawah */}
      <g stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M72 200 Q86 194 100 200 T128 200"/>
        <path d="M80 208 Q90 203 100 208 T120 208"/>
      </g>
    </svg>
  );
};

export const LogoPuskesmas: React.FC<{ className?: string; src?: string }> = ({ 
  className = 'w-16 h-20',
  src
}) => {
  const [imgError, setImgError] = useState(false);
  const primarySrc = src || '/images/logo-puskesmas.svg';

  if (!imgError) {
    return (
      <img 
        src={primarySrc} 
        alt="Logo Puskesmas Kesehatan" 
        className={`${className} object-contain`}
        crossOrigin="anonymous"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <svg 
      viewBox="0 0 200 240" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      role="img"
      aria-label="Lambang Puskesmas Indonesia"
    >
      {/* Outer Hexagon Border */}
      <polygon points="100,6 186,54 186,186 100,234 14,186 14,54" stroke="#046A28" strokeWidth="12" fill="#ffffff" strokeLinejoin="round"/>
      
      {/* Green Greek Cross */}
      <g fill="#046A28">
        <rect x="74" y="44" width="52" height="152" rx="3"/>
        <rect x="24" y="94" width="152" height="52" rx="3"/>
      </g>
      
      {/* House Outline (Roof & Structure) on lower-right */}
      <path d="M60 148 L126 82 L192 148" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <polygon points="68,144 126,86 184,144 184,148 68,148" fill="#035420"/>
      
      {/* Interlocking White Circles in House Roof */}
      <circle cx="114" cy="130" r="14" stroke="#ffffff" strokeWidth="4.5" fill="none"/>
      <circle cx="134" cy="130" r="14" stroke="#ffffff" strokeWidth="4.5" fill="none"/>
    </svg>
  );
};
