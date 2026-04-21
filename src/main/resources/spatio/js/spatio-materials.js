// ═══════════════════════════════════════════
// MATERIAL PRESETS — Quick material styles for kids
// ═══════════════════════════════════════════

var MATERIAL_PRESETS = {
  default:  { name:'Default',  roughness:0.45, metalness:0.08, icon:'🎨' },
  shiny:    { name:'Shiny',    roughness:0.1,  metalness:0.1,  icon:'✨' },
  metallic: { name:'Metal',    roughness:0.25, metalness:0.9,  icon:'🔩' },
  rubber:   { name:'Rubber',   roughness:0.9,  metalness:0.0,  icon:'🏀' },
  glass:    { name:'Glass',    roughness:0.05, metalness:0.1,  transparent:true, opacity:0.4, icon:'🪟' },
  plastic:  { name:'Plastic',  roughness:0.35, metalness:0.0,  icon:'🧊' },
  wood:     { name:'Wood',     roughness:0.8,  metalness:0.0,  icon:'🪵' },
  glow:     { name:'Glow',     roughness:0.3,  metalness:0.0,  emissive:true, icon:'💡' },
  chrome:   { name:'Chrome',   roughness:0.05, metalness:1.0,  icon:'🪞' },
  matte:    { name:'Matte',    roughness:1.0,  metalness:0.0,  icon:'📦' },
};

var EXPANDED_PALETTE = [
  // Reds
  '#ef4444','#dc2626','#b91c1c','#f87171',
  // Oranges
  '#f97316','#ea580c','#fb923c',
  // Yellows
  '#eab308','#facc15','#fde047',
  // Greens
  '#22c55e','#16a34a','#4ade80','#86efac',
  // Teals
  '#06b6d4','#14b8a6','#2dd4bf',
  // Blues
  '#3b82f6','#2563eb','#60a5fa','#93c5fd',
  // Purples
  '#8b5cf6','#7c3aed','#a78bfa',
  // Pinks
  '#ec4899','#f472b6','#f9a8d4',
  // Neutrals
  '#f0f0f0','#d1d5db','#9ca3af','#6b7280','#374151','#1f2937','#111827',
];

function applyMaterialPreset(presetName) {
  if (!selectedRoot || selectedObjects.length === 0) {
    showToast('Select a shape first!', 'warning'); return;
  }

  var preset = MATERIAL_PRESETS[presetName];
  if (!preset) return;

  selectedObjects.forEach(function(obj) {
    obj.root.traverse(function(c) {
      if (!c.isMesh || c.userData.helper) return;

      var color = c.material.color.clone();
      c.material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: preset.roughness,
        metalness: preset.metalness,
        transparent: preset.transparent || false,
        opacity: preset.opacity || 1.0,
        side: preset.transparent ? THREE.DoubleSide : THREE.FrontSide,
      });

      if (preset.emissive) {
        c.material.emissive = color.clone().multiplyScalar(0.3);
        c.material.emissiveIntensity = 0.8;
      }

      c.material.needsUpdate = true;
    });
  });

  showToast(preset.icon + ' ' + preset.name + ' material applied!', 'success');
}

/**
 * Build material preset buttons in the properties panel
 */
function buildMaterialPresets() {
  var container = document.getElementById('material-presets');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(MATERIAL_PRESETS).forEach(function(key) {
    var p = MATERIAL_PRESETS[key];
    var btn = document.createElement('button');
    btn.className = 'mat-preset-btn';
    btn.innerHTML = p.icon + '<br>' + p.name;
    btn.title = p.name + ' (roughness:' + p.roughness + ', metalness:' + p.metalness + ')';
    btn.onclick = function() { applyMaterialPreset(key); };
    container.appendChild(btn);
  });
}

/**
 * Build expanded color palette
 */
function buildExpandedPalette() {
  var container = document.getElementById('expanded-palette');
  if (!container) return;
  container.innerHTML = '';

  EXPANDED_PALETTE.forEach(function(hex) {
    var s = document.createElement('div');
    s.className = 'sw';
    s.style.background = hex;
    s.dataset.c = hex;
    s.title = hex;
    s.onclick = function() {
      applyColor(hex);
      document.getElementById('cpick').value = hex;
    };
    container.appendChild(s);
  });
}
