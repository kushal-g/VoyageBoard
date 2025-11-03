import type { TOOL } from "./types"

interface Tool {
    id: TOOL,
    label: string,
    icon: string,
    color: string;
}

export const tools: Tool[] = [
    { id: "LOCATION_PIN", label: 'Location', icon: 'place', color: '#ff3b30' }, // Red location pin
    { id: "TRANSIT", label: 'Distance Measure', icon: 'straighten', color: '#000000' },
    { id: "DOODLE", label: 'Doodle', icon: 'draw', color: '#000000' },
    { id: "TEXT", label: 'Text', icon: 'text_fields', color: '#000000' },
    { id: "ERASER", label: 'Eraser', icon: 'clear', color: '#ff2d55' }, // Pink eraser
    { id: "GROUP", label: 'Group', icon: 'group', color: '#000000' },
]