import type { TOOL } from "./types"

interface Tool {
    id: TOOL,
    label: string,
    icon: string,
    color: string;
}

export const tools: Tool[] = [
    { id: "LOCATION_PIN", label: 'Location', icon: 'place', color: '#ff3b30' },
    { id: "TRANSIT", label: 'Transit', icon: 'directions_bus', color: '#000000' },
    { id: "DOODLE", label: 'Doodle', icon: 'draw', color: '#000000' },
    { id: "TEXT", label: 'Text', icon: 'text_fields', color: '#000000' },
    { id: "ERASER", label: 'Eraser', icon: 'ink_eraser', color: '#ff6d88ff' },
    { id: "GROUP", label: 'Group', icon: 'group', color: '#000000' },
]