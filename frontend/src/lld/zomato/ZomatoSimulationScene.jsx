import './ZomatoSimulationScene.css';

export default function ZomatoSimulationScene({ order }) {
  const scooterLeft = ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order?.status) ? 720 : 150;
  return (
    <div className="zomato-sim-scene" aria-hidden="true">
      <svg width="100%" viewBox="0 0 1000 380">

          <rect x="0" y="0" width="1000" height="230" fill="#0f172a" />


          <circle cx="120" cy="40" r="1.5" fill="#ffffff" opacity="0.8" />
          <circle cx="340" cy="25" r="2" fill="#ffffff" opacity="0.6" />
          <circle cx="580" cy="50" r="1" fill="#ffffff" opacity="0.9" />
          <circle cx="790" cy="30" r="1.5" fill="#ffffff" opacity="0.7" />


          <g>

            <line x1="280" y1="160" x2="280" y2="230" stroke="#94a3b8" strokeWidth="4" />
            <circle cx="280" cy="160" r="6" fill="#fef08a" />
            <polygon points="280,160 230,230 330,230" fill="#fef08a" opacity="0.12" />


            <line x1="680" y1="160" x2="680" y2="230" stroke="#94a3b8" strokeWidth="4" />
            <circle cx="680" cy="160" r="6" fill="#fef08a" />
            <polygon points="680,160 630,230 730,230" fill="#fef08a" opacity="0.12" />
          </g>


          <g>
            <circle cx="220" cy="190" r="24" fill="#166534" />
            <rect x="216" y="195" width="8" height="35" fill="#78350f" />

            <circle cx="760" cy="190" r="24" fill="#166534" />
            <rect x="756" y="195" width="8" height="35" fill="#78350f" />
          </g>


          <g transform="translate(40, 50)">
            <rect x="0" y="0" width="150" height="180" fill="#e23744" rx="8" />
            <rect x="15" y="25" width="120" height="35" fill="#ffffff" rx="4" />
            <text x="75" y="47" fill="#e23744" fontSize="13" fontWeight="bold" textAnchor="middle">SPICE GARDEN</text>
            <rect x="25" y="90" width="40" height="50" fill="#fef08a" opacity="0.8" />
            <rect x="85" y="90" width="40" height="50" fill="#fef08a" opacity="0.8" />
            <rect x="60" y="130" width="30" height="50" fill="#7f1d1d" />


            {order?.status === 'PREPARING' && (
              <g className="zomato-sim-smoke">
                <circle cx="75" cy="-12" r="10" fill="#cbd5e1" opacity="0.7" />
                <circle cx="85" cy="-30" r="15" fill="#94a3b8" opacity="0.5" />
                <circle cx="70" cy="-52" r="20" fill="#64748b" opacity="0.3" />
              </g>
            )}
          </g>


          <g transform="translate(810, 60)">
            <polygon points="70,0 0,65 140,65" fill="#2563eb" />
            <rect x="15" y="65" width="110" height="105" fill="#1e3a8a" rx="4" />
            <rect x="50" y="105" width="40" height="65" fill="#60a5fa" />
            <circle cx="70" cy="35" r="12" fill="#fef08a" />


            <g transform="translate(70, -25)">
              <circle cx="0" cy="0" r="14" fill="#ef4444" />
              <circle cx="0" cy="0" r="6" fill="#ffffff" />
            </g>
          </g>


          <rect x="0" y="230" width="1000" height="15" fill="#475569" />


          <rect x="0" y="245" width="1000" height="100" fill="#1e293b" />


          <line x1="0" y1="292" x2="1000" y2="292" stroke="#facc15" strokeWidth="3" strokeDasharray="25,15" />
          <line x1="0" y1="298" x2="1000" y2="298" stroke="#facc15" strokeWidth="3" strokeDasharray="25,15" />


          <g opacity="0.4">
            <rect x="200" y="245" width="15" height="100" fill="#ffffff" />
            <rect x="230" y="245" width="15" height="100" fill="#ffffff" />
            <rect x="760" y="245" width="15" height="100" fill="#ffffff" />
            <rect x="790" y="245" width="15" height="100" fill="#ffffff" />
          </g>


          <g transform={`translate(${scooterLeft}, 260)`} style={{ transition: 'transform 2.5s cubic-bezier(0.25, 1, 0.5, 1)' }}>

            <polygon points="55,15 160,-15 160,45" fill="#fef08a" opacity="0.3" />


            <circle cx="12" cy="30" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="4" />
            <circle cx="52" cy="30" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="4" />


            <path d="M 12 30 Q 30 30 40 15 L 52 30" fill="none" stroke="#e23744" strokeWidth="6" />
            <rect x="0" y="5" width="24" height="20" fill="#e23744" rx="4" />
            <text x="12" y="18" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">Z</text>


            <circle cx="34" cy="5" r="8" fill="#e23744" />
            <rect x="30" y="13" width="12" height="15" fill="#334155" rx="2" />
          </g>
        </svg>
    </div>
  );
}
