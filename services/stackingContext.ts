/**
 * Stacking Context Tracker
 * 
 * Implements CSS stacking context rules to determine element render order.
 * This ensures elements are extracted and rendered in the correct visual order.
 */

export interface StackingContext {
  element: HTMLElement;
  zIndex: number;
  order: number;
  isRoot: boolean;
  parent: StackingContext | null;
  children: StackingContext[];
}

/**
 * Checks if an element creates a new stacking context
 * Based on CSS stacking context rules
 */
const createsStackingContext = (element: HTMLElement, styles: CSSStyleDeclaration): boolean => {
  // Root element
  if (element === document.documentElement) return true;
  
  // Position with z-index
  const position = styles.position;
  const zIndex = styles.zIndex;
  if ((position === 'absolute' || position === 'relative' || position === 'fixed' || position === 'sticky') 
      && zIndex !== 'auto') {
    return true;
  }
  
  // Opacity less than 1
  const opacity = parseFloat(styles.opacity);
  if (!isNaN(opacity) && opacity < 1) return true;
  
  // Transform
  if (styles.transform !== 'none') return true;
  
  // Filter
  if (styles.filter !== 'none') return true;
  
  // Perspective
  if (styles.perspective !== 'none') return true;
  
  // Clip-path
  if (styles.clipPath !== 'none') return true;
  
  // Mask
  if (styles.mask !== 'none' && (styles as any).webkitMask !== 'none') return true;
  
  // Isolation
  if (styles.isolation === 'isolate') return true;
  
  // Mix-blend-mode
  if (styles.mixBlendMode !== 'normal') return true;
  
  // Will-change with certain values
  const willChange = styles.willChange;
  if (willChange === 'opacity' || willChange === 'transform' || willChange === 'filter') return true;
  
  // Contain with layout or paint
  const contain = styles.contain;
  if (contain.includes('layout') || contain.includes('paint') || contain === 'strict' || contain === 'content') {
    return true;
  }
  
  return false;
};

/**
 * Gets the numeric z-index value, defaulting to 0 for 'auto'
 */
const getZIndex = (styles: CSSStyleDeclaration): number => {
  const zIndex = styles.zIndex;
  if (zIndex === 'auto') return 0;
  const parsed = parseInt(zIndex, 10);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Builds the stacking context tree for a container
 */
export const buildStackingContextTree = (container: HTMLElement): StackingContext => {
  let orderCounter = 0;
  
  const buildContext = (
    element: HTMLElement, 
    parent: StackingContext | null
  ): StackingContext => {
    const styles = window.getComputedStyle(element);
    const isNewContext = createsStackingContext(element, styles);
    
    const context: StackingContext = {
      element,
      zIndex: getZIndex(styles),
      order: orderCounter++,
      isRoot: parent === null,
      parent,
      children: [],
    };
    
    // If this element creates a stacking context, use it as the parent for children
    // Otherwise, children belong to the same stacking context as this element
    const contextForChildren = isNewContext ? context : parent;
    
    // Process children
    for (const child of Array.from(element.children)) {
      if (child instanceof HTMLElement) {
        const childStyles = window.getComputedStyle(child);
        if (childStyles.display === 'none') continue;
        
        const childContext = buildContext(child, contextForChildren);
        if (isNewContext) {
          context.children.push(childContext);
        } else if (parent) {
          parent.children.push(childContext);
        }
      }
    }
    
    return context;
  };
  
  return buildContext(container, null);
};

/**
 * Flattens the stacking context tree into paint order (bottom to top)
 */
export const getPaintOrder = (root: StackingContext): HTMLElement[] => {
  const result: HTMLElement[] = [];
  
  const processContext = (context: StackingContext) => {
    // Sort children by z-index, then by DOM order
    const sortedChildren = [...context.children].sort((a, b) => {
      if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
      return a.order - b.order;
    });
    
    // Add background/borders of this element first
    result.push(context.element);
    
    // Process negative z-index children
    for (const child of sortedChildren.filter(c => c.zIndex < 0)) {
      processContext(child);
    }
    
    // Process zero/auto z-index in DOM order
    for (const child of sortedChildren.filter(c => c.zIndex === 0)) {
      processContext(child);
    }
    
    // Process positive z-index children
    for (const child of sortedChildren.filter(c => c.zIndex > 0)) {
      processContext(child);
    }
  };
  
  processContext(root);
  return result;
};

/**
 * Gets the global z-order for an element (higher = renders on top)
 */
export const getGlobalZOrder = (
  element: HTMLElement, 
  paintOrder: HTMLElement[]
): number => {
  return paintOrder.indexOf(element);
};
