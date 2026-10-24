/**
 * アイコンの SVG を描くコンポーネントを作る。データは Lucide（https://lucide.dev）の SVG を
 * 手元に持ったもの（lucide-vue-next 0.553.0 から抽出）。追加するときは
 * https://lucide.dev/icons/ の SVG の子要素を同じ形で書き写す。
 *
 * Lucide License (ISC)
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT).
 * All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose with or
 * without fee is hereby granted, provided that the above copyright notice and this permission
 * notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS
 * SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE
 * AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
 * NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 */
import { h, type FunctionalComponent } from 'vue';

export type IconNode = [tag: string, attrs: Record<string, string>][];

export interface IconProps {
  size?: number | string;
}

export type Icon = FunctionalComponent<IconProps>;

export function icon(nodes: IconNode): Icon {
  const component: Icon = ({ size = 24 }) =>
    h(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 2,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      },
      nodes.map(([tag, attrs]) => h(tag, attrs))
    );
  component.props = ['size'];
  return component;
}
