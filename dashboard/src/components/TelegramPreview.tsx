'use client';

interface TelegramPreviewProps {
  imageUrl: string;
  headline: string;
  body: string;
  preCta: string;
  cta: string;
  buttonText: string;
  buttonUrl: string;
}

export default function TelegramPreview({
  imageUrl,
  headline,
  body,
  preCta,
  cta,
  buttonText,
  buttonUrl,
}: TelegramPreviewProps) {
  return (
    <div className="max-w-md mx-auto bg-[#0e1621] rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
      {/* Telegram Header */}
      <div className="bg-[#212d3b] px-4 py-3 flex items-center space-x-3 border-b border-gray-800">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
          P
        </div>
        <div className="flex-1">
          <div className="text-white font-medium text-sm">Previass Bot</div>
          <div className="text-gray-400 text-xs">online</div>
        </div>
      </div>

      {/* Message Container */}
      <div className="p-4">
        <div className="bg-[#182533] rounded-2xl overflow-hidden shadow-lg">
          {/* Image */}
          <div className="relative">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-auto object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESem Imagem%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Headline */}
            <div className="text-white font-bold text-lg leading-tight mb-3">
              {headline}
            </div>

            {/* Body */}
            <div className="text-gray-300 text-sm whitespace-pre-line leading-relaxed mb-3">
              {body}
            </div>

            {/* Pre-CTA */}
            {preCta && (
              <div className="text-gray-400 text-sm whitespace-pre-line leading-relaxed mb-3">
                {preCta}
              </div>
            )}

            {/* CTA - sem espaço entre linhas */}
            <div className="text-white text-sm font-medium whitespace-pre-line leading-tight">
              {cta}
            </div>

            {/* Button - only show if buttonText exists */}
            {buttonText && (
              <div className="pt-2">
                <a
                  href={buttonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-[#2ea6ff] hover:bg-[#1e96ef] text-white font-medium py-3 rounded-lg transition-colors duration-200"
                >
                  {buttonText}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-gray-500 text-xs mt-2 text-right">
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
