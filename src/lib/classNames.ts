/**
 * 用于条件性合并 CSS 类名的工具函数
 * 
 * @example
 * classNames('fixed', 'inset-0', isOpen ? 'opacity-100' : 'opacity-0')
 * // 如果 isOpen 为 true，返回 'fixed inset-0 opacity-100'
 * // 如果 isOpen 为 false，返回 'fixed inset-0 opacity-0'
 */
export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
} 