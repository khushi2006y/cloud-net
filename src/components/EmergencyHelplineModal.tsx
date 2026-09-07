import React from 'react';
import { 
  X, 
  PhoneCall, 
  ShieldAlert, 
  AlertTriangle, 
  HeartHandshake, 
  ExternalLink,
  Flame,
  CloudRain,
  Zap,
  Wind
} from 'lucide-react';

interface EmergencyHelplineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NATIONAL_HELPLINES = [
  { name: 'National Emergency Response (All in One)', number: '112', desc: 'Unified pan-India emergency number for Police, Fire & Medical' },
  { name: 'NDRF Disaster Helpline (HQ)', number: '1078 / 011-24363260', desc: 'National Disaster Response Force rescue & evacuation operations' },
  { name: 'IMD National Weather Helpline', number: '1800-180-1717', desc: 'Toll-free 24/7 meteorological advisory & cyclone warning line' },
  { name: 'Emergency Medical & Ambulance', number: '108 / 102', desc: 'Free emergency ambulance & critical care transport' },
  { name: 'State Disaster Control Room', number: '1070', desc: 'State disaster management authority emergency operations' },
  { name: 'District Disaster Control Room', number: '1077', desc: 'Local district magistrate disaster emergency line' },
];

const SAFETY_PROTOCOLS = [
  {
    icon: <CloudRain className="w-4 h-4 text-sky-600" />,
    title: 'Severe Rainfall & Floods',
    tips: ['Never drive or walk through moving flood water.', 'Disconnect electrical mains before water enters homes.', 'Store drinking water & keep battery power banks charged.']
  },
  {
    icon: <Zap className="w-4 h-4 text-purple-600" />,
    title: 'Lightning & Thunderstorms',
    tips: ['Follow the 30-30 rule: If thunder is heard within 30s of lightning, stay indoors.', 'Avoid open fields, elevated ground, and metal fencing.', 'Unplug desktop computers, TVs, and wired devices.']
  },
  {
    icon: <Flame className="w-4 h-4 text-orange-600" />,
    title: 'Extreme Heatwave (Loo)',
    tips: ['Avoid direct sun exposure between 11:00 AM – 4:00 PM.', 'Drink ORS, coconut water, and lime juice regularly.', 'Never leave children or pets inside parked vehicles.']
  },
  {
    icon: <Wind className="w-4 h-4 text-teal-600" />,
    title: 'Cyclone & High Gale Winds',
    tips: ['Secure loose roof sheets, solar panels, and outdoor items.', 'Stay away from glass windows and power transmission lines.', 'Keep emergency radio / battery lights ready.']
  }
];

export const EmergencyHelplineModal: React.FC<EmergencyHelplineModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 via-amber-50 to-sky-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-700">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                National Disaster & Weather Emergency Helplines
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Official Government of India (NDMA & IMD) emergency contacts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white text-slate-500 hover:text-slate-900 shadow-xs transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
          
          {/* Helplines Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center">
              <PhoneCall className="w-4 h-4 text-rose-600 mr-1.5" />
              24/7 Toll-Free Emergency Contact Numbers
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NATIONAL_HELPLINES.map((h, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-rose-200 transition-all flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-800">{h.name}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{h.desc}</p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="font-mono text-sm font-extrabold text-rose-600">{h.number}</span>
                    <a
                      href={`tel:${h.number.split('/')[0].trim()}`}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors shadow-xs"
                    >
                      Call Now
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Protocols */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center">
              <AlertTriangle className="w-4 h-4 text-amber-600 mr-1.5" />
              IMD & NDMA Disaster Safety Directives
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SAFETY_PROTOCOLS.map((prot, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-slate-900">
                    {prot.icon}
                    <span>{prot.title}</span>
                  </div>

                  <ul className="space-y-1 text-[11px] text-slate-600 pl-4 list-disc">
                    {prot.tips.map((tip, tIdx) => (
                      <li key={tIdx} className="leading-snug">{tip}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
