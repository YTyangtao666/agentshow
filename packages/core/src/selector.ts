/**
 * 为DOM元素生成唯一CSS选择器。
 * 优先级: id > tag.uniqueClass > DOM路径:nth-of-type
 * Browser-only (依赖 HTMLElement / document)
 */
export function generateSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;

  if (el.className && typeof el.className === 'string') {
    const classes = el.className.split(/\s+/).filter(Boolean);
    if (classes.length > 0) {
      const selector = `${el.tagName.toLowerCase()}.${classes.join('.')}`;
      try {
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      } catch {
        // class可能含特殊字符，跳过
      }
    }
  }

  const parts: string[] = [];
  let current: HTMLElement | null = el;
  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`#${current.id}`);
      break;
    }
    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c: Element) => c.tagName === current!.tagName,
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    parts.unshift(selector);
    current = parent;
  }
  return parts.join(' > ');
}
