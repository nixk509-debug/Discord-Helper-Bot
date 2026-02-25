import type { Embed } from "@shared/schema";

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface EmbedComponent {
  type: number;
  label?: string;
  style?: number;
  customId?: string;
  url?: string;
  emoji?: string;
  options?: { label: string; value: string; description?: string }[];
}

const BUTTON_STYLES: Record<number, string> = {
  1: "bg-[#5865F2] hover:bg-[#4752C4] text-white",
  2: "bg-[#4E5058] hover:bg-[#6D6F78] text-white",
  3: "bg-[#248046] hover:bg-[#1A6334] text-white",
  4: "bg-[#DA373C] hover:bg-[#A12D31] text-white",
  5: "bg-[#4E5058] hover:bg-[#6D6F78] text-white",
};

const BUTTON_STYLE_NAMES: Record<number, string> = {
  1: "Primary",
  2: "Secondary",
  3: "Success",
  4: "Danger",
  5: "Link",
};

export function EmbedPreview({ embed }: { embed: Partial<Embed> }) {
  const borderColor = embed.color || "#5865F2";
  const fields = (embed.fields || []) as EmbedField[];
  const components = (embed.components || []) as EmbedComponent[];

  const hasContent = embed.title || embed.description || embed.authorName || embed.footerText || fields.length > 0 || embed.imageUrl || embed.thumbnailUrl;

  if (!hasContent && components.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground/50">
        <p className="text-sm">Start building your embed to see a preview</p>
      </div>
    );
  }

  return (
    <div className="font-sans text-sm" data-testid="embed-preview">
      <div className="flex items-start gap-2 mb-1">
        <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-xs font-bold shrink-0">
          BOT
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-white text-sm">NexBot</span>
            <span className="bg-[#5865F2] text-white text-[10px] px-1 py-0.5 rounded font-medium">BOT</span>
            <span className="text-[#949BA4] text-xs">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {hasContent && (
            <div
              className="rounded bg-[#2B2D31] max-w-[520px] overflow-hidden flex"
              style={{ borderLeft: `4px solid ${borderColor}` }}
            >
              <div className="p-4 flex-1 min-w-0">
                {embed.authorName && (
                  <div className="flex items-center gap-2 mb-1">
                    {embed.authorIconUrl && (
                      <img src={embed.authorIconUrl} alt="" className="w-6 h-6 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    {embed.authorUrl ? (
                      <span className="text-white text-xs font-semibold hover:underline cursor-pointer">{embed.authorName}</span>
                    ) : (
                      <span className="text-white text-xs font-semibold">{embed.authorName}</span>
                    )}
                  </div>
                )}

                {embed.title && (
                  <div className="mb-1">
                    {embed.url ? (
                      <span className="text-[#00A8FC] font-bold hover:underline cursor-pointer">{embed.title}</span>
                    ) : (
                      <span className="text-white font-bold">{embed.title}</span>
                    )}
                  </div>
                )}

                {embed.description && (
                  <div className="text-[#DBDEE1] text-sm whitespace-pre-wrap mb-2 leading-relaxed">
                    {embed.description}
                  </div>
                )}

                {fields.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    <div className="grid gap-2" style={{
                      gridTemplateColumns: fields.some(f => f.inline)
                        ? 'repeat(3, 1fr)'
                        : '1fr'
                    }}>
                      {fields.map((field, i) => (
                        <div key={i} className={field.inline ? '' : 'col-span-full'}>
                          <div className="text-white text-xs font-semibold mb-0.5">{field.name || '\u200B'}</div>
                          <div className="text-[#DBDEE1] text-xs whitespace-pre-wrap">{field.value || '\u200B'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {embed.imageUrl && (
                  <div className="mt-3">
                    <img src={embed.imageUrl} alt="" className="max-w-full rounded max-h-[300px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}

                {(embed.footerText || embed.timestamp) && (
                  <div className="flex items-center gap-2 mt-3">
                    {embed.footerIconUrl && (
                      <img src={embed.footerIconUrl} alt="" className="w-5 h-5 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <span className="text-[#949BA4] text-xs">
                      {embed.footerText}
                      {embed.footerText && embed.timestamp && ' • '}
                      {embed.timestamp && new Date().toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {embed.thumbnailUrl && (
                <div className="p-4 pl-0 shrink-0">
                  <img src={embed.thumbnailUrl} alt="" className="w-20 h-20 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>
          )}

          {components.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1 max-w-[520px]">
              {components.map((comp, i) => {
                if (comp.type === 2) {
                  return (
                    <button
                      key={i}
                      className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${BUTTON_STYLES[comp.style || 1]} flex items-center gap-1.5`}
                      data-testid={`preview-button-${i}`}
                    >
                      {comp.emoji && <span>{comp.emoji}</span>}
                      {comp.label || "Button"}
                      {comp.style === 5 && (
                        <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                    </button>
                  );
                }
                if (comp.type === 3) {
                  return (
                    <div key={i} className="w-full max-w-[400px]" data-testid={`preview-select-${i}`}>
                      <div className="bg-[#1E1F22] text-[#949BA4] rounded px-3 py-2 text-sm flex items-center justify-between cursor-pointer hover:bg-[#2B2D31] border border-[#3F4147]">
                        <span>{comp.options?.[0]?.label || comp.label || "Select an option..."}</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { BUTTON_STYLES, BUTTON_STYLE_NAMES };
export type { EmbedField, EmbedComponent };
