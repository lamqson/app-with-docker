/** Map menu child keys to next-intl paths under the `nav` namespace. */
export function navChildLabelKey(key: string): `menu.${string}` | 'bookDemo' {
  if (key === 'bookDemo') {
    return 'bookDemo';
  }
  return `menu.${key}`;
}
