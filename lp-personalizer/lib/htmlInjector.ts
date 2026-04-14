import * as cheerio from 'cheerio';
import type { Modification, AppliedChange } from './types';

interface InjectionResult {
  modifiedHtml: string;
  appliedChanges: AppliedChange[];
  failedSelectors: string[];
}

export function injectModifications(
  html: string,
  modifications: Modification[]
): InjectionResult {
  const $ = cheerio.load(html);
  const appliedChanges: AppliedChange[] = [];
  const failedSelectors: string[] = [];

  for (const mod of modifications) {
    try {
      // Try the exact selector from the plan
      let target = $(mod.selector);

      // Fallback: try fuzzy match by tag + text similarity
      if (target.length === 0) {
        const tag = mod.element || mod.selector.split(':')[0];
        $(tag).each((_, el) => {
          const elText = $(el).text().trim();
          if (elText === mod.original.trim() || elText.includes(mod.original.substring(0, 40))) {
            target = $(el);
            return false; // break
          }
        });
      }

      if (target.length === 0) {
        failedSelectors.push(mod.selector);
        continue;
      }

      const el = target.first();
      const originalText = el.text().trim();

      // Only modify text nodes — preserve child elements (icons, spans, etc.)
      const hasChildElements = el.children('*').length > 0;
      if (hasChildElements) {
        // Replace only the first direct text node
        el.contents().each((_, node) => {
          if (node.type === 'text' && (node as { data: string }).data.trim()) {
            (node as { data: string }).data = mod.new_content;
            return false; // stop after first text node
          }
        });
      } else {
        el.text(mod.new_content);
      }

      appliedChanges.push({
        selector: mod.selector,
        original: originalText || mod.original,
        modified: mod.new_content,
        reason: mod.reason,
        cro_principle: mod.cro_principle,
      });
    } catch (err) {
      console.error(`Injection failed for selector "${mod.selector}":`, err);
      failedSelectors.push(mod.selector);
    }
  }

  // Inject a small banner to indicate this is a personalized preview
  $('body').prepend(`
    <div id="__lp_preview_banner" style="
      position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      color: white; text-align: center;
      padding: 8px 16px; font-size: 13px; font-family: sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    ">
      ✨ AI-Personalized Preview — ${appliedChanges.length} change${appliedChanges.length !== 1 ? 's' : ''} applied to match your ad creative
    </div>
    <div style="height: 38px;"></div>
  `);

  return {
    modifiedHtml: $.html(),
    appliedChanges,
    failedSelectors,
  };
}
