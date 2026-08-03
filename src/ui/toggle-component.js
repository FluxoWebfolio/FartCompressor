/**
 * Toggle Component
 * Inlines both Toggle_Off.svg and Toggle_On.svg into a wrapper.
 * Shows/hides each using visibility toggling on the top-level group IDs.
 */
import svgOffRaw from '../assets/Toggle_Off.svg?raw';
import svgOnRaw from '../assets/Toggle_On.svg?raw';
import { namespaceSvgIds } from './svg-utils.js';

// Ambos os SVGs (e o botão COMPRIMIR) traziam ids iguais do Illustrator
// ("linear-gradient"). Tornar os ids únicos evita que um roube o gradiente ao outro.
const svgOff = namespaceSvgIds(svgOffRaw);
const svgOn = namespaceSvgIds(svgOnRaw);

/**
 * Initialise an SVG toggle inside a container element.
 *
 * @param {string}   containerId   ID of the host <div>
 * @param {boolean}  initialState  true = ON, false = OFF
 * @param {Function} onChange      callback(isOn: boolean)
 */
export function initToggle(containerId, initialState, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // We render BOTH SVGs stacked so gradients/blend-modes work natively.
    // Only the active state is visible via opacity.
    const wrapper = document.createElementNS ? container : container;
    wrapper.innerHTML = `
    <div class="toggle-svg-wrap" style="position:relative;width:100%;height:100%;cursor:pointer;user-select:none;">
      <div class="toggle-off-layer" style="position:absolute;inset:0;transition:opacity 0.15s ease;">${svgOff}</div>
      <div class="toggle-on-layer"  style="position:absolute;inset:0;transition:opacity 0.15s ease;">${svgOn}</div>
    </div>
  `;

    const offLayer = wrapper.querySelector('.toggle-off-layer');
    const onLayer = wrapper.querySelector('.toggle-on-layer');

    // Make SVGs fill their container
    [offLayer, onLayer].forEach(layer => {
        const svg = layer.querySelector('svg');
        if (svg) {
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.display = 'block';
        }
    });

    let isOn = initialState;

    function applyState() {
        offLayer.style.opacity = isOn ? '0' : '1';
        onLayer.style.opacity = isOn ? '1' : '0';
        container.dataset.state = isOn ? 'on' : 'off';
    }

    applyState();

    wrapper.querySelector('.toggle-svg-wrap').addEventListener('click', () => {
        isOn = !isOn;
        applyState();
        if (onChange) onChange(isOn);
    });

    // Expose getter for external reads
    container.getToggleState = () => isOn;
}
