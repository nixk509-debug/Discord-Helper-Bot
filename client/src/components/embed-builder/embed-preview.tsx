import type { Embed } from "@shared/schema";
import type { EmbedComponentType, EmbedMediaItem } from "@shared/schema";

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface EmbedComponent extends EmbedComponentType {}

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

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`(.+?)`/g, '<code class="bg-[#1E1F22] px-1 py-0.5 rounded text-xs">$1</code>')
    .replace(/\n/g, '<br/>');
}

function ComponentRenderer({ component, depth = 0 }: { component: EmbedComponent; depth?: number }) {
  switch (component.type) {
    case 1: {
      return (
        <div className="text-white text-lg font-bold py-1" data-testid="preview-header">
          {component.content || "Header"}
        </div>
      );
    }

    case 9: {
      return (
        <div className="flex items-start gap-3 py-2" data-testid="preview-section">
          <div className="flex-1 min-w-0 space-y-1">
            {(component.components || []).map((child, i) => (
              <ComponentRenderer key={i} component={child} depth={depth + 1} />
            ))}
          </div>
          {component.accessory && (
            <div className="shrink-0">
              {component.accessory.type === 7 && component.accessory.url && (
                <img
                  src={component.accessory.url}
                  alt={component.accessory.description || ""}
                  className="w-16 h-16 rounded object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              {component.accessory.type === 2 && (
                <button className={`px-3 py-1.5 rounded text-sm font-medium ${BUTTON_STYLES[component.accessory.style || 1]} flex items-center gap-1.5`}>
                  {component.accessory.emoji && <span>{component.accessory.emoji}</span>}
                  {component.accessory.label || "Button"}
                </button>
              )}
            </div>
          )}
        </div>
      );
    }

    case 10: {
      return (
        <div
          className="text-[#DBDEE1] text-sm whitespace-pre-wrap py-0.5 leading-relaxed"
          data-testid="preview-text-display"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(component.content || "") }}
        />
      );
    }

    case 11: {
      const filename = component.url ? component.url.split('/').pop() || 'file' : 'file';
      return (
        <div className="flex items-center gap-2 bg-[#2B2D31] rounded p-2 my-1 border border-[#3F4147]" data-testid="preview-file">
          <svg className="w-6 h-6 text-[#949BA4] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <div className="min-w-0">
            <div className="text-[#00A8FC] text-sm truncate hover:underline cursor-pointer">{filename}</div>
            {component.description && <div className="text-[#949BA4] text-xs truncate">{component.description}</div>}
          </div>
        </div>
      );
    }

    case 12: {
      const items = component.items || [];
      const cols = items.length === 1 ? 1 : items.length === 2 ? 2 : items.length >= 3 ? 3 : 1;
      return (
        <div className={`grid gap-1 my-1 grid-cols-${cols}`} data-testid="preview-media-gallery" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {items.map((item, i) => (
            <div key={i} className="relative rounded overflow-hidden bg-[#1E1F22] aspect-video">
              {item.spoiler ? (
                <div className="w-full h-full flex items-center justify-center text-[#949BA4] text-xs">SPOILER</div>
              ) : (
                <img
                  src={item.url}
                  alt={item.description || ""}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>
          ))}
        </div>
      );
    }

    case 14: {
      return (
        <div
          className={`${component.spacing === "large" ? "my-4" : "my-2"}`}
          data-testid="preview-separator"
        >
          {component.divider !== false && <div className="border-t border-[#3F4147]" />}
        </div>
      );
    }

    case 17: {
      const accentColor = component.accentColor || "#5865F2";
      return (
        <div
          className="rounded-lg overflow-hidden my-1"
          style={{
            borderLeft: `4px solid ${accentColor}`,
            backgroundColor: `${accentColor}10`,
          }}
          data-testid="preview-container"
        >
          <div className="p-3 space-y-1">
            {(component.components || []).map((child, i) => (
              <ComponentRenderer key={i} component={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      );
    }

    case 2: {
      return (
        <button className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${BUTTON_STYLES[component.style || 1]} flex items-center gap-1.5 inline-flex`}>
          {component.emoji && <span>{component.emoji}</span>}
          {component.label || "Button"}
          {component.style === 5 && (
            <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          )}
        </button>
      );
    }

    case 3: {
      return (
        <div className="w-full max-w-[400px]">
          <div className="bg-[#1E1F22] text-[#949BA4] rounded px-3 py-2 text-sm flex items-center justify-between cursor-pointer hover:bg-[#2B2D31] border border-[#3F4147]">
            <span>{component.placeholder || component.options?.[0]?.label || component.label || "Select an option..."}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      );
    }

    case 7: {
      return (
        <div className="shrink-0" data-testid="preview-thumbnail">
          {component.url && (
            <img
              src={component.url}
              alt={component.description || ""}
              className="w-16 h-16 rounded object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

export function EmbedPreview({ embed }: { embed: Partial<Embed> }) {
  const borderColor = embed.color || "#5865F2";
  const fields = (embed.fields || []) as EmbedField[];
  const components = (embed.components || []) as EmbedComponent[];

  const hasEmbedContent = embed.title || embed.description || embed.authorName || embed.footerText || fields.length > 0 || embed.imageUrl || embed.thumbnailUrl;
  const hasV2Components = components.some(c => [1, 9, 10, 11, 12, 14, 17, 7].includes(c.type));
  const legacyComponents = components.filter(c => c.type === 2 || c.type === 3);
  const v2Components = components.filter(c => ![2, 3].includes(c.type) || [1, 9, 10, 11, 12, 14, 17, 7].includes(c.type));

  if (!hasEmbedContent && components.length === 0) {
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
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-white text-sm">Archivist</span>
            <span className="bg-[#5865F2] text-white text-[10px] px-1 py-0.5 rounded font-medium">BOT</span>
            <span className="text-[#949BA4] text-xs">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {hasEmbedContent && (
            <div
              className="rounded bg-[#2B2D31] max-w-[520px] overflow-hidden flex"
              style={{ borderLeft: `4px solid ${borderColor}` }}
            >
              <div className="p-4 flex-1 min-w-0">
                {embed.authorName && (
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {embed.footerIconUrl && (
                      <img src={embed.footerIconUrl} alt="" className="w-5 h-5 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <span className="text-[#949BA4] text-xs">
                      {embed.footerText}
                      {embed.footerText && embed.timestamp && ' \u2022 '}
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
            <div className="mt-1 max-w-[520px] space-y-1">
              {components.map((comp, i) => {
                if (comp.type === 2 || comp.type === 3) {
                  return (
                    <div key={i} className="inline-flex mr-2 mb-1">
                      <ComponentRenderer component={comp} />
                    </div>
                  );
                }
                return <ComponentRenderer key={i} component={comp} />;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { BUTTON_STYLES, BUTTON_STYLE_NAMES, ComponentRenderer };
