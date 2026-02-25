import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Save, Play, Trash2, ZoomIn, ZoomOut, Plus, X, ChevronRight,
  Zap, GitBranch, Settings, MessageSquare, Users, Clock, Star,
  Shield, TrendingUp, Hash, Globe, Coins, AlignLeft, Pin, Trash
} from "lucide-react";
import type { AutomationFlow, AutomationNode, AutomationEdge } from "@shared/schema";

const NODE_WIDTH = 220;
const NODE_HEIGHT_BASE = 80;

interface NodeType {
  type: string;
  label: string;
  category: "trigger" | "condition" | "action" | "branch";
  icon: React.ElementType;
  color: string;
  defaultConfig: Record<string, unknown>;
}

const NODE_TYPES: NodeType[] = [
  { type: "trigger.message", label: "Message Matches", category: "trigger", icon: MessageSquare, color: "text-blue-400", defaultConfig: { pattern: "", matchType: "contains" } },
  { type: "trigger.memberJoin", label: "Member Joins", category: "trigger", icon: Users, color: "text-blue-400", defaultConfig: {} },
  { type: "trigger.memberLeave", label: "Member Leaves", category: "trigger", icon: Users, color: "text-blue-400", defaultConfig: {} },
  { type: "trigger.reactionAdd", label: "Reaction Added", category: "trigger", icon: Star, color: "text-blue-400", defaultConfig: { emoji: "", channelId: "" } },
  { type: "trigger.roleAssigned", label: "Role Assigned", category: "trigger", icon: Shield, color: "text-blue-400", defaultConfig: { roleId: "" } },
  { type: "trigger.levelUp", label: "Level Up", category: "trigger", icon: TrendingUp, color: "text-blue-400", defaultConfig: { level: 0 } },
  { type: "trigger.timeScheduled", label: "Time / Cron", category: "trigger", icon: Clock, color: "text-blue-400", defaultConfig: { cron: "0 9 * * *" } },
  { type: "trigger.commandUsed", label: "Command Used", category: "trigger", icon: Hash, color: "text-blue-400", defaultConfig: { command: "" } },

  { type: "condition.hasRole", label: "Has Role", category: "condition", icon: Shield, color: "text-yellow-400", defaultConfig: { roleId: "" } },
  { type: "condition.inChannel", label: "In Channel", category: "condition", icon: Hash, color: "text-yellow-400", defaultConfig: { channelId: "" } },
  { type: "condition.regex", label: "Regex Match", category: "condition", icon: AlignLeft, color: "text-yellow-400", defaultConfig: { pattern: "" } },
  { type: "condition.timeOfDay", label: "Time of Day", category: "condition", icon: Clock, color: "text-yellow-400", defaultConfig: { startHour: 9, endHour: 17 } },
  { type: "condition.random", label: "Random Chance", category: "condition", icon: Zap, color: "text-yellow-400", defaultConfig: { chance: 50 } },
  { type: "condition.variableCheck", label: "Variable Check", category: "condition", icon: Settings, color: "text-yellow-400", defaultConfig: { key: "", operator: "==", value: "" } },
  { type: "condition.userWarnings", label: "Warning Count", category: "condition", icon: Shield, color: "text-yellow-400", defaultConfig: { operator: ">", count: 0 } },
  { type: "condition.userLevel", label: "User Level", category: "condition", icon: TrendingUp, color: "text-yellow-400", defaultConfig: { operator: ">=", level: 1 } },

  { type: "action.reply", label: "Send Reply", category: "action", icon: MessageSquare, color: "text-green-400", defaultConfig: { content: "", embedEnabled: false } },
  { type: "action.dm", label: "Send DM", category: "action", icon: MessageSquare, color: "text-green-400", defaultConfig: { content: "" } },
  { type: "action.addRole", label: "Add Role", category: "action", icon: Shield, color: "text-green-400", defaultConfig: { roleId: "" } },
  { type: "action.removeRole", label: "Remove Role", category: "action", icon: Shield, color: "text-green-400", defaultConfig: { roleId: "" } },
  { type: "action.kick", label: "Kick Member", category: "action", icon: Users, color: "text-green-400", defaultConfig: { reason: "" } },
  { type: "action.ban", label: "Ban Member", category: "action", icon: Users, color: "text-green-400", defaultConfig: { reason: "", deleteMessages: 0 } },
  { type: "action.mute", label: "Mute Member", category: "action", icon: Users, color: "text-green-400", defaultConfig: { duration: 60, reason: "" } },
  { type: "action.wait", label: "Wait / Delay", category: "action", icon: Clock, color: "text-green-400", defaultConfig: { seconds: 5 } },
  { type: "action.setVariable", label: "Set Variable", category: "action", icon: Settings, color: "text-green-400", defaultConfig: { key: "", value: "", scope: "server" } },
  { type: "action.httpRequest", label: "HTTP Request", category: "action", icon: Globe, color: "text-green-400", defaultConfig: { url: "", method: "GET", headers: {}, body: "" } },
  { type: "action.addXP", label: "Add XP", category: "action", icon: TrendingUp, color: "text-green-400", defaultConfig: { amount: 100 } },
  { type: "action.addEconomyCoins", label: "Add Coins", category: "action", icon: Coins, color: "text-green-400", defaultConfig: { amount: 50 } },
  { type: "action.createThread", label: "Create Thread", category: "action", icon: MessageSquare, color: "text-green-400", defaultConfig: { name: "", channelId: "" } },
  { type: "action.deleteMessage", label: "Delete Message", category: "action", icon: Trash, color: "text-green-400", defaultConfig: {} },
  { type: "action.pinMessage", label: "Pin Message", category: "action", icon: Pin, color: "text-green-400", defaultConfig: {} },

  { type: "branch.ifElse", label: "If / Else", category: "branch", icon: GitBranch, color: "text-purple-400", defaultConfig: { condition: "" } },
];

const CATEGORY_LABELS: Record<string, string> = {
  trigger: "Triggers",
  condition: "Conditions",
  action: "Actions",
  branch: "Branch",
};

const CATEGORY_COLORS: Record<string, string> = {
  trigger: "border-blue-500/40 bg-blue-500/10",
  condition: "border-yellow-500/40 bg-yellow-500/10",
  action: "border-green-500/40 bg-green-500/10",
  branch: "border-purple-500/40 bg-purple-500/10",
};

const HANDLE_COLORS: Record<string, string> = {
  trigger: "bg-blue-500",
  condition: "bg-yellow-500",
  action: "bg-green-500",
  branch: "bg-purple-500",
};

function getNodeCategory(type: string) {
  return type.split(".")[0] as "trigger" | "condition" | "action" | "branch";
}

function getNodeType(type: string): NodeType | undefined {
  return NODE_TYPES.find((n) => n.type === type);
}

interface FlowBuilderProps {
  flow: AutomationFlow;
  onChange: (flow: AutomationFlow) => void;
  onSave: () => void;
  isSaving?: boolean;
  isEnabled?: boolean;
  onToggle?: () => void;
  onRunOnce?: () => void;
}

export function FlowBuilder({ flow, onChange, onSave, isSaving, isEnabled, onToggle, onRunOnce }: FlowBuilderProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [draggingOffset, setDraggingOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; handle: string } | null>(null);
  const [nodeRects, setNodeRects] = useState<Record<string, DOMRect>>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const selectedNode = flow.nodes.find((n) => n.id === selectedNodeId) ?? null;

  const addNode = useCallback(
    (nodeType: NodeType) => {
      const id = `node_${Date.now()}`;
      const centerX = (300 / zoom) - pan.x + 100;
      const centerY = (200 / zoom) - pan.y + 50;
      const newNode: AutomationNode = {
        id,
        type: nodeType.type,
        position: { x: Math.max(0, centerX), y: Math.max(0, centerY) },
        data: { label: nodeType.label, config: { ...nodeType.defaultConfig } },
      };
      onChange({ ...flow, nodes: [...flow.nodes, newNode] });
      setSelectedNodeId(id);
    },
    [flow, onChange, zoom, pan]
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      onChange({
        nodes: flow.nodes.filter((n) => n.id !== nodeId),
        edges: flow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      });
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [flow, onChange, selectedNodeId]
  );

  const updateNodeConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      onChange({
        ...flow,
        nodes: flow.nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, config } } : n
        ),
      });
    },
    [flow, onChange]
  );

  const removeEdge = useCallback(
    (edgeId: string) => {
      onChange({ ...flow, edges: flow.edges.filter((e) => e.id !== edgeId) });
    },
    [flow, onChange]
  );

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvas === "true") {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      setSelectedNodeId(null);
    }
  }, [pan]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      const dx = (e.clientX - panStart.current.x);
      const dy = (e.clientY - panStart.current.y);
      setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
    }
    if (draggingNodeId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newX = (e.clientX - rect.left - pan.x) / zoom - draggingOffset.x;
      const newY = (e.clientY - rect.top - pan.y) / zoom - draggingOffset.y;
      onChange({
        ...flow,
        nodes: flow.nodes.map((n) =>
          n.id === draggingNodeId
            ? { ...n, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }
            : n
        ),
      });
    }
  }, [draggingNodeId, draggingOffset, pan, zoom, flow, onChange]);

  const handleCanvasMouseUp = useCallback(() => {
    isPanning.current = false;
    setDraggingNodeId(null);
    if (connectingFrom) {
      setConnectingFrom(null);
    }
  }, [connectingFrom]);

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      setSelectedNodeId(nodeId);
      const rect = canvasRef.current?.getBoundingClientRect();
      const node = flow.nodes.find((n) => n.id === nodeId);
      if (!rect || !node) return;
      setDraggingNodeId(nodeId);
      setDraggingOffset({
        x: (e.clientX - rect.left - pan.x) / zoom - node.position.x,
        y: (e.clientY - rect.top - pan.y) / zoom - node.position.y,
      });
    },
    [flow, pan, zoom]
  );

  const handleOutputHandle = useCallback(
    (e: React.MouseEvent, nodeId: string, handle: string) => {
      e.stopPropagation();
      setConnectingFrom({ nodeId, handle });
    },
    []
  );

  const handleInputHandle = useCallback(
    (e: React.MouseEvent, targetNodeId: string, targetHandle: string) => {
      e.stopPropagation();
      if (!connectingFrom || connectingFrom.nodeId === targetNodeId) return;
      const edgeId = `edge_${Date.now()}`;
      const newEdge: AutomationEdge = {
        id: edgeId,
        source: connectingFrom.nodeId,
        target: targetNodeId,
        sourceHandle: connectingFrom.handle,
        targetHandle,
      };
      const alreadyExists = flow.edges.some(
        (e) => e.source === newEdge.source && e.target === newEdge.target && e.sourceHandle === newEdge.sourceHandle
      );
      if (!alreadyExists) {
        onChange({ ...flow, edges: [...flow.edges, newEdge] });
      }
      setConnectingFrom(null);
    },
    [connectingFrom, flow, onChange]
  );

  const getNodeCenter = (node: AutomationNode) => ({
    x: node.position.x * zoom + pan.x + (NODE_WIDTH * zoom) / 2,
    y: node.position.y * zoom + pan.y + (NODE_HEIGHT_BASE * zoom) / 2,
  });

  const getHandlePos = (node: AutomationNode, side: "right" | "left", handleY = 0.5) => ({
    x: side === "right"
      ? node.position.x * zoom + pan.x + NODE_WIDTH * zoom
      : node.position.x * zoom + pan.x,
    y: node.position.y * zoom + pan.y + NODE_HEIGHT_BASE * zoom * handleY,
  });

  const zoomIn = () => setZoom((z) => Math.min(2, z + 0.1));
  const zoomOut = () => setZoom((z) => Math.max(0.3, z - 0.1));

  const categorizedTypes = ["trigger", "condition", "action", "branch"].map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    types: NODE_TYPES.filter((n) => n.category === cat),
  }));

  return (
    <div className="flex h-full min-h-[700px] gap-0 overflow-hidden rounded-xl border border-white/5">
      <div className="w-56 shrink-0 bg-card/60 border-r border-white/5 flex flex-col">
        <div className="px-4 py-3 border-b border-white/5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Node Palette</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {categorizedTypes.map(({ category, label, types }) => (
              <div key={category}>
                <p className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium mb-1.5 px-1">{label}</p>
                <div className="space-y-1">
                  {types.map((nt) => {
                    const Icon = nt.icon;
                    return (
                      <button
                        key={nt.type}
                        onClick={() => addNode(nt)}
                        data-testid={`button-add-node-${nt.type}`}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                          "border hover-elevate",
                          CATEGORY_COLORS[category]
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5 shrink-0", nt.color)} />
                        <span className="truncate text-left">{nt.label}</span>
                        <Plus className="w-3 h-3 ml-auto shrink-0 opacity-50" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-card/40 flex-wrap gap-y-1">
          <Button size="sm" onClick={onSave} disabled={isSaving} data-testid="button-save-flow" className="gap-1.5">
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          {onToggle && (
            <Button size="sm" variant="outline" onClick={onToggle} data-testid="button-toggle-flow" className="gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              {isEnabled ? "Disable" : "Enable"}
            </Button>
          )}
          {onRunOnce && (
            <Button size="sm" variant="outline" onClick={onRunOnce} data-testid="button-run-flow" className="gap-1.5">
              <Play className="w-3.5 h-3.5" />
              Test Run
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onChange({ nodes: [], edges: [] })} data-testid="button-clear-flow" className="gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={zoomOut} data-testid="button-zoom-out">
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="outline" onClick={zoomIn} data-testid="button-zoom-in">
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-hidden cursor-default select-none"
            style={{ background: "radial-gradient(circle at 1px 1px, hsl(0 6% 14% / 0.4) 1px, transparent 0) 0 0 / 24px 24px" }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            data-canvas="true"
          >
            <svg
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}
            >
              {flow.edges.map((edge) => {
                const sourceNode = flow.nodes.find((n) => n.id === edge.source);
                const targetNode = flow.nodes.find((n) => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const isBranch = sourceNode.type === "branch.ifElse";
                const handleY = isBranch ? (edge.sourceHandle === "true" ? 0.35 : 0.65) : 0.5;
                const sp = getHandlePos(sourceNode, "right", handleY);
                const tp = getHandlePos(targetNode, "left", 0.5);
                const cp1x = sp.x + Math.abs(tp.x - sp.x) * 0.5;
                const cp2x = tp.x - Math.abs(tp.x - sp.x) * 0.5;
                const color = isBranch
                  ? (edge.sourceHandle === "true" ? "#22c55e" : "#ef4444")
                  : "hsl(0 72% 51%)";

                return (
                  <g key={edge.id}>
                    <path
                      d={`M ${sp.x} ${sp.y} C ${cp1x} ${sp.y} ${cp2x} ${tp.y} ${tp.x} ${tp.y}`}
                      stroke={color}
                      strokeWidth={2}
                      fill="none"
                      strokeOpacity={0.7}
                    />
                    <circle cx={sp.x} cy={sp.y} r={4} fill={color} />
                    <circle cx={tp.x} cy={tp.y} r={4} fill={color} />
                  </g>
                );
              })}
            </svg>

            <div
              style={{
                position: "absolute",
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
              }}
            >
              {flow.nodes.map((node) => {
                const nt = getNodeType(node.type);
                const category = getNodeCategory(node.type);
                const Icon = nt?.icon ?? Settings;
                const isSelected = selectedNodeId === node.id;
                const isBranch = node.type === "branch.ifElse";

                return (
                  <div
                    key={node.id}
                    data-testid={`node-${node.id}`}
                    style={{
                      position: "absolute",
                      left: node.position.x,
                      top: node.position.y,
                      width: NODE_WIDTH,
                      cursor: "grab",
                      userSelect: "none",
                    }}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    className={cn(
                      "rounded-lg border transition-all",
                      CATEGORY_COLORS[category],
                      isSelected ? "ring-2 ring-primary shadow-lg shadow-primary/20" : "hover:ring-1 hover:ring-white/20"
                    )}
                  >
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", nt?.color)} />
                      <span className="text-xs font-medium truncate flex-1">{node.data.label}</span>
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                        className="ml-auto opacity-50 hover:opacity-100 transition-opacity"
                        data-testid={`button-remove-node-${node.id}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      {Object.keys(node.data.config).length > 0 ? (
                        <span className="truncate block">{JSON.stringify(node.data.config).slice(0, 40)}...</span>
                      ) : (
                        <span className="italic">Click to configure</span>
                      )}
                    </div>

                    {isBranch ? (
                      <>
                        <div
                          style={{ position: "absolute", right: -8, top: "35%", transform: "translateY(-50%)" }}
                          className="w-4 h-4 rounded-full bg-green-500 border-2 border-background cursor-crosshair flex items-center justify-center"
                          onMouseDown={(e) => handleOutputHandle(e, node.id, "true")}
                          data-testid={`handle-out-true-${node.id}`}
                        />
                        <div
                          style={{ position: "absolute", right: -8, top: "65%", transform: "translateY(-50%)" }}
                          className="w-4 h-4 rounded-full bg-red-500 border-2 border-background cursor-crosshair"
                          onMouseDown={(e) => handleOutputHandle(e, node.id, "false")}
                          data-testid={`handle-out-false-${node.id}`}
                        />
                      </>
                    ) : (
                      category !== "trigger" && (
                        <div
                          style={{ position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)" }}
                          className={cn("w-4 h-4 rounded-full border-2 border-background cursor-crosshair", HANDLE_COLORS[category])}
                          onMouseDown={(e) => { e.stopPropagation(); handleInputHandle(e, node.id, "in"); }}
                          data-testid={`handle-in-${node.id}`}
                        />
                      )
                    )}
                    {category !== "action" && (
                      <div
                        style={{ position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)" }}
                        className={cn("w-4 h-4 rounded-full border-2 border-background cursor-crosshair", HANDLE_COLORS[category])}
                        onMouseDown={(e) => handleOutputHandle(e, node.id, "out")}
                        data-testid={`handle-out-${node.id}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {flow.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" data-canvas="true">
                <div className="text-center space-y-2">
                  <GitBranch className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                  <p className="text-muted-foreground/60 text-sm font-medium">Start by adding a trigger node from the palette</p>
                </div>
              </div>
            )}
          </div>

          {selectedNode && (
            <div className="w-72 shrink-0 border-l border-white/5 bg-card/60 flex flex-col">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium truncate flex-1" data-testid="text-selected-node-label">{selectedNode.data.label}</p>
                <button onClick={() => setSelectedNodeId(null)} className="opacity-50 hover:opacity-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ScrollArea className="flex-1">
                <NodeConfigPanel
                  node={selectedNode}
                  onConfigChange={(cfg) => updateNodeConfig(selectedNode.id, cfg)}
                />
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NodeConfigPanel({ node, onConfigChange }: { node: AutomationNode; onConfigChange: (cfg: Record<string, unknown>) => void }) {
  const cfg = node.data.config;
  const set = (key: string, val: unknown) => onConfigChange({ ...cfg, [key]: val });

  const renderField = (key: string, val: unknown) => {
    if (typeof val === "boolean") {
      return (
        <div key={key} className="flex items-center justify-between">
          <Label className="text-xs">{key}</Label>
          <button
            onClick={() => set(key, !val)}
            className={cn("w-10 h-5 rounded-full transition-colors", val ? "bg-primary" : "bg-muted")}
            data-testid={`config-toggle-${key}`}
          >
            <span className={cn("block w-4 h-4 rounded-full bg-white transition-transform mx-0.5", val ? "translate-x-5" : "translate-x-0")} />
          </button>
        </div>
      );
    }
    if (typeof val === "number") {
      return (
        <div key={key} className="space-y-1">
          <Label className="text-xs">{key}</Label>
          <Input
            type="number"
            value={val}
            onChange={(e) => set(key, parseFloat(e.target.value))}
            className="h-8 text-xs bg-background"
            data-testid={`config-input-${key}`}
          />
        </div>
      );
    }
    if (key === "method") {
      return (
        <div key={key} className="space-y-1">
          <Label className="text-xs">Method</Label>
          <Select value={val as string} onValueChange={(v) => set(key, v)}>
            <SelectTrigger className="h-8 text-xs bg-background" data-testid="config-select-method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (key === "operator") {
      return (
        <div key={key} className="space-y-1">
          <Label className="text-xs">Operator</Label>
          <Select value={val as string} onValueChange={(v) => set(key, v)}>
            <SelectTrigger className="h-8 text-xs bg-background" data-testid="config-select-operator">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["==", "!=", ">", ">=", "<", "<="].map((op) => (
                <SelectItem key={op} value={op}>{op}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (key === "scope") {
      return (
        <div key={key} className="space-y-1">
          <Label className="text-xs">Scope</Label>
          <Select value={val as string} onValueChange={(v) => set(key, v)}>
            <SelectTrigger className="h-8 text-xs bg-background" data-testid="config-select-scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="server">Server</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (key === "matchType") {
      return (
        <div key={key} className="space-y-1">
          <Label className="text-xs">Match Type</Label>
          <Select value={val as string} onValueChange={(v) => set(key, v)}>
            <SelectTrigger className="h-8 text-xs bg-background" data-testid="config-select-matchtype">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contains">Contains</SelectItem>
              <SelectItem value="startsWith">Starts with</SelectItem>
              <SelectItem value="exact">Exact match</SelectItem>
              <SelectItem value="regex">Regex</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (key === "content" || key === "body" || key === "condition") {
      return (
        <div key={key} className="space-y-1">
          <Label className="text-xs">{key}</Label>
          <Textarea
            value={val as string}
            onChange={(e) => set(key, e.target.value)}
            className="text-xs bg-background min-h-[60px] resize-none"
            data-testid={`config-textarea-${key}`}
          />
        </div>
      );
    }
    if (typeof val === "object" && val !== null) {
      return (
        <div key={key} className="space-y-1">
          <Label className="text-xs">{key} (JSON)</Label>
          <Textarea
            value={JSON.stringify(val, null, 2)}
            onChange={(e) => {
              try { set(key, JSON.parse(e.target.value)); } catch {}
            }}
            className="text-xs bg-background min-h-[60px] resize-none font-mono"
            data-testid={`config-json-${key}`}
          />
        </div>
      );
    }
    return (
      <div key={key} className="space-y-1">
        <Label className="text-xs">{key}</Label>
        <Input
          value={val as string}
          onChange={(e) => set(key, e.target.value)}
          className="h-8 text-xs bg-background"
          data-testid={`config-input-${key}`}
        />
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Node Type</Label>
        <Badge variant="outline" className="mt-1 text-xs block w-fit" data-testid="text-node-type">{node.type}</Badge>
      </div>
      <div className="space-y-3">
        {Object.entries(cfg).map(([key, val]) => renderField(key, val))}
      </div>
      {Object.keys(cfg).length === 0 && (
        <p className="text-xs text-muted-foreground italic">No configuration needed for this node.</p>
      )}
    </div>
  );
}
