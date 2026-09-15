import { toolMonthlyNTD } from './calc.js';

const BRAND_HUES = { chatgpt: 155, gemini: 220, claude: 25, perplexity: 185, dreamina: 275, magnific: 335 };

// 保留品牌原本的出現順序，同品牌按每席實際月費排序。
export function presentTools(tools, usdRate) {
  const brands = new Map();
  for (const tool of tools) {
    const name = tool.name.trim().toLowerCase();
    const brand = Object.keys(BRAND_HUES).find(key => name === key || name.startsWith(key + ' ')) || name;
    if (!brands.has(brand)) brands.set(brand, []);
    brands.get(brand).push(tool);
  }
  return [...brands.entries()].flatMap(([brand, entries]) => {
    const hue = BRAND_HUES[brand] ?? [...brand].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 360, 0);
    return [...entries]
      .sort((a, b) => toolMonthlyNTD(a, usdRate) - toolMonthlyNTD(b, usdRate) || (a.plan || '').localeCompare(b.plan || ''))
      .map((tool, index) => ({
        ...tool,
        displayColor: `hsl(${hue} 65% ${entries.length === 1 ? 38 : 46 - index * 18 / (entries.length - 1)}%)`,
        displayTint: `hsl(${hue} 65% 94%)`,
      }));
  });
}
