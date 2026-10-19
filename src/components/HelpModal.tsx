import React from 'react';
import { X, Sparkles, Check, HelpCircle, ShieldCheck } from 'lucide-react';
import type { Language } from '../utils/i18n';
import { translations } from '../utils/i18n';

interface HelpModalProps {
  isOpen: boolean;
  lang: Language;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, lang, onClose }) => {
  const t = translations[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0e1422] border border-[#27364d] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl bg-[#162030] hover:bg-[#202d42] text-gray-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-[#dfbd61]" />
          <h3 className="text-lg font-bold text-white">{t.svgaHelpTitle}</h3>
        </div>

        <p className="text-gray-300 text-xs sm:text-sm leading-relaxed mb-4">
          {t.svgaHelpContent}
        </p>

        <div className="space-y-2.5 text-xs text-gray-300 mb-5">
          <div className="flex items-start gap-2 bg-[#121927] p-2.5 rounded-xl border border-[#222f42]">
            <Check className="w-4 h-4 text-[#dfbd61] flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">معدل الفريمات المثالي (20 FPS):</strong>
              معظم منصات البث مثل TikTok و Bigo Live توصي بمعدل 20 إطار في الثانية للحفاظ على سلاسة الحركة بدون استنزاف بطارية الهاتف أو حرارة الجهاز.
            </div>
          </div>

          <div className="flex items-start gap-2 bg-[#121927] p-2.5 rounded-xl border border-[#222f42]">
            <Check className="w-4 h-4 text-[#dfbd61] flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">المقاس القياسي لهدايا البث (750 × 1334):</strong>
              هذا المقاس هو المعيار المعتمد لشاشات الهواتف الرأسية لتظهر الهدية في كامل الشاشة بدقة فائقة.
            </div>
          </div>

          <div className="flex items-start gap-2 bg-[#121927] p-2.5 rounded-xl border border-[#222f42]">
            <Check className="w-4 h-4 text-[#dfbd61] flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">معالجة فورية بدون Worker Bug:</strong>
              تم بناء هذه النسخة لتعمل مباشرة داخل الكانفاس بدون أي تعارض مع الـ Web Workers أو قيود الـ Origin.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#1c2738] hover:bg-[#25344a] text-white font-semibold text-xs transition-all"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};
